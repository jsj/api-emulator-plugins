type Entity = { id: number; created_at: string; updated_at: string };
type CollectionLike<T extends Entity> = { all(): T[]; insert(data: Omit<T, "id" | "created_at" | "updated_at">): T; update(id: number, data: Partial<T>): T | undefined; delete(id: number): boolean; findOneBy(field: keyof T, value: string | number): T | undefined };
type StoreLike = { collection<T extends Entity>(name: string, indexes: string[]): CollectionLike<T> };
type ContextLike = { req: { param(n: string): string; query(n: string): string | undefined; header(n: string): string | undefined; json(): Promise<Record<string, unknown>>; parseBody?(): Promise<Record<string, unknown>> }; json(p: unknown, s?: number): Response; text(p: string, s?: number): Response; redirect(url: string, status?: number): Response };
type AppLike = { get(path: string, h: (c: ContextLike) => Response): void; post(path: string, h: (c: ContextLike) => Promise<Response> | Response): void; patch(path: string, h: (c: ContextLike) => Promise<Response> | Response): void; delete(path: string, h: (c: ContextLike) => Response): void };

type Auth0User = Entity & { user_id: string; email: string; password?: string; name: string; email_verified: boolean; blocked: boolean; app_metadata: Record<string, unknown>; user_metadata: Record<string, unknown> };
type Auth0Client = Entity & { client_id: string; client_secret: string; name: string; redirect_uris: string[]; grant_types: string[] };
type Auth0Role = Entity & { role_id: string; name: string; description: string };
type Auth0Connection = Entity & { connection_id: string; name: string; strategy: string; enabled_clients: string[] };
type Auth0Org = Entity & { org_id: string; name: string; display_name: string; members: string[] };
type Auth0Code = Entity & { code: string; client_id: string; redirect_uri: string; user_id: string; audience?: string; scope: string };
type Auth0Token = Entity & { token: string; user_id?: string; client_id: string; scope: string; audience?: string; type: "access" | "refresh" };
type Auth0Event = Entity & { type: string; description: string; user_id?: string; client_id?: string };

export interface Auth0SeedConfig {
  auth0?: {
    issuer?: string;
    clients?: Array<{ client_id: string; client_secret?: string; name?: string; redirect_uris?: string[]; grant_types?: string[] }>;
    users?: Array<{ user_id?: string; email: string; password?: string; name?: string; email_verified?: boolean; blocked?: boolean }>;
    roles?: Array<{ id?: string; name: string; description?: string }>;
    organizations?: Array<{ id?: string; name: string; display_name?: string; members?: string[] }>;
    connections?: Array<{ id?: string; name: string; strategy?: string; enabled_clients?: string[] }>;
  };
}

function store(store: StoreLike) {
  return {
    users: store.collection<Auth0User>("auth0.users", ["user_id", "email"]),
    clients: store.collection<Auth0Client>("auth0.clients", ["client_id"]),
    roles: store.collection<Auth0Role>("auth0.roles", ["role_id", "name"]),
    connections: store.collection<Auth0Connection>("auth0.connections", ["connection_id", "name"]),
    orgs: store.collection<Auth0Org>("auth0.organizations", ["org_id", "name"]),
    codes: store.collection<Auth0Code>("auth0.codes", ["code"]),
    tokens: store.collection<Auth0Token>("auth0.tokens", ["token"]),
    events: store.collection<Auth0Event>("auth0.events", ["type"]),
  };
}
function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`;
}
async function body(c: ContextLike): Promise<Record<string, unknown>> {
  return c.req.parseBody ? c.req.parseBody().catch(() => ({})) : c.req.json().catch(() => ({}));
}
function baseUrl(c: ContextLike) {
  const proto = c.req.header("x-forwarded-proto") ?? "http";
  const host = c.req.header("host") ?? "localhost";
  return `${proto}://${host}`;
}
function userJson(user: Auth0User) {
  return { user_id: user.user_id, sub: user.user_id, email: user.email, name: user.name, email_verified: user.email_verified, blocked: user.blocked, app_metadata: user.app_metadata, user_metadata: user.user_metadata, created_at: user.created_at, updated_at: user.updated_at };
}
function bearer(c: ContextLike) {
  return c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
}
function issueToken(storeLike: StoreLike, input: { user_id?: string; client_id: string; scope?: string; audience?: string; refresh?: boolean }) {
  const s = store(storeLike);
  const access = s.tokens.insert({ token: `auth0-access-${crypto.randomUUID()}`, type: "access", user_id: input.user_id, client_id: input.client_id, scope: input.scope ?? "openid profile email", audience: input.audience });
  const refresh = input.refresh ? s.tokens.insert({ token: `auth0-refresh-${crypto.randomUUID()}`, type: "refresh", user_id: input.user_id, client_id: input.client_id, scope: input.scope ?? "", audience: input.audience }) : undefined;
  return { access_token: access.token, token_type: "Bearer", expires_in: 86400, scope: access.scope, ...(refresh ? { refresh_token: refresh.token } : {}), id_token: `auth0-id-${input.user_id ?? input.client_id}` };
}
function event(storeLike: StoreLike, type: string, description: string, extra: Partial<Auth0Event> = {}) {
  store(storeLike).events.insert({ type, description, ...extra });
}

export function seedDefaults(storeLike: StoreLike): void {
  seedFromConfig(storeLike, "", { auth0: { clients: [{ client_id: "auth0-test-client", client_secret: "auth0-test-secret", redirect_uris: ["http://localhost:3000/callback"] }], users: [{ email: "user@example.com", password: "password", name: "Example User" }] } });
}
export function seedFromConfig(storeLike: StoreLike, _baseUrl: string, config: Auth0SeedConfig): void {
  const s = store(storeLike);
  for (const client of config.auth0?.clients ?? [{ client_id: "auth0-test-client", client_secret: "auth0-test-secret" }]) {
    if (!s.clients.findOneBy("client_id", client.client_id)) s.clients.insert({ client_id: client.client_id, client_secret: client.client_secret ?? "", name: client.name ?? "Auth0 Emulator App", redirect_uris: client.redirect_uris ?? ["http://localhost:3000/callback"], grant_types: client.grant_types ?? ["authorization_code", "refresh_token", "client_credentials", "password", "http://auth0.com/oauth/grant-type/password-realm"] });
  }
  for (const user of config.auth0?.users ?? [{ email: "user@example.com", password: "password" }]) {
    if (!s.users.findOneBy("email", user.email)) s.users.insert({ user_id: user.user_id ?? `auth0|${crypto.randomUUID()}`, email: user.email, password: user.password ?? "password", name: user.name ?? user.email, email_verified: user.email_verified ?? true, blocked: user.blocked ?? false, app_metadata: {}, user_metadata: {} });
  }
  for (const role of config.auth0?.roles ?? []) if (!s.roles.findOneBy("name", role.name)) s.roles.insert({ role_id: role.id ?? id("rol"), name: role.name, description: role.description ?? "" });
  for (const conn of config.auth0?.connections ?? [{ name: "Username-Password-Authentication", strategy: "auth0" }]) if (!s.connections.findOneBy("name", conn.name)) s.connections.insert({ connection_id: conn.id ?? id("con"), name: conn.name, strategy: conn.strategy ?? "auth0", enabled_clients: conn.enabled_clients ?? [] });
  for (const org of config.auth0?.organizations ?? []) if (!s.orgs.findOneBy("name", org.name)) s.orgs.insert({ org_id: org.id ?? id("org"), name: org.name, display_name: org.display_name ?? org.name, members: org.members ?? [] });
}

export function registerRoutes(app: AppLike, storeLike: StoreLike): void {
  app.get("/.well-known/openid-configuration", (c) => c.json({ issuer: baseUrl(c) + "/", authorization_endpoint: `${baseUrl(c)}/authorize`, token_endpoint: `${baseUrl(c)}/oauth/token`, userinfo_endpoint: `${baseUrl(c)}/userinfo`, jwks_uri: `${baseUrl(c)}/.well-known/jwks.json`, end_session_endpoint: `${baseUrl(c)}/v2/logout`, response_types_supported: ["code"], grant_types_supported: ["authorization_code", "refresh_token", "client_credentials", "password"] }));
  app.get("/.well-known/jwks.json", (c) => c.json({ keys: [{ kty: "oct", kid: "auth0-emulator", alg: "HS256", use: "sig", k: "YXV0aDAtZW11bGF0b3I" }] }));
  app.get("/_emulate/public-key.pem", (c) => c.text("-----BEGIN PUBLIC KEY-----\nAUTH0 EMULATOR\n-----END PUBLIC KEY-----\n"));
  app.get("/authorize", (c) => c.json({ login: true, client_id: c.req.query("client_id"), redirect_uri: c.req.query("redirect_uri"), scope: c.req.query("scope") ?? "openid profile email" }));
  app.get("/oauth/authorize", (c) => c.redirect(`/authorize?client_id=${encodeURIComponent(c.req.query("client_id") ?? "")}`));
  app.get("/u/login", (c) => c.json({ login: true, client_id: c.req.query("client_id") }));
  app.post("/u/login/callback", async (c) => {
    const input = await body(c);
    const user = store(storeLike).users.findOneBy("email", String(input.username ?? input.email));
    if (!user || user.blocked || (user.password && user.password !== input.password)) {
      event(storeLike, "fp", "Failed login", { user_id: user?.user_id });
      return c.json({ error: "invalid_grant", error_description: "Wrong email or password." }, 403);
    }
    const code = id("code");
    store(storeLike).codes.insert({ code, client_id: String(input.client_id ?? "auth0-test-client"), redirect_uri: String(input.redirect_uri ?? ""), user_id: user.user_id, audience: String(input.audience ?? ""), scope: String(input.scope ?? "openid profile email") });
    event(storeLike, "s", "Successful login", { user_id: user.user_id });
    return c.json({ code, state: input.state });
  });
  app.get("/u/consent", (c) => c.json({ consent: true }));
  app.post("/u/consent/callback", (c) => c.json({ consent: true }));
  app.get("/authorize/callback", (c) => c.json({ code: c.req.query("code"), state: c.req.query("state") }));
  app.post("/oauth/token", async (c) => {
    const input = await body(c);
    const client = store(storeLike).clients.findOneBy("client_id", String(input.client_id));
    if (!client || (client.client_secret && input.client_secret && client.client_secret !== input.client_secret)) return c.json({ error: "invalid_client" }, 401);
    if (input.grant_type === "client_credentials") return c.json(issueToken(storeLike, { client_id: client.client_id, scope: String(input.scope ?? ""), audience: String(input.audience ?? "") }));
    if (input.grant_type === "refresh_token") {
      const refresh = store(storeLike).tokens.findOneBy("token", String(input.refresh_token));
      if (!refresh || refresh.type !== "refresh") return c.json({ error: "invalid_grant" }, 400);
      store(storeLike).tokens.delete(refresh.id);
      return c.json(issueToken(storeLike, { client_id: refresh.client_id, user_id: refresh.user_id, scope: refresh.scope, audience: refresh.audience, refresh: true }));
    }
    if (input.grant_type === "password" || input.grant_type === "http://auth0.com/oauth/grant-type/password-realm") {
      const user = store(storeLike).users.findOneBy("email", String(input.username));
      if (!user || user.password !== input.password || user.blocked) return c.json({ error: "invalid_grant" }, 403);
      return c.json(issueToken(storeLike, { client_id: client.client_id, user_id: user.user_id, scope: String(input.scope ?? "openid profile email"), audience: String(input.audience ?? ""), refresh: String(input.scope ?? "").includes("offline_access") }));
    }
    const code = store(storeLike).codes.findOneBy("code", String(input.code));
    if (!code) return c.json({ error: "invalid_grant" }, 400);
    return c.json(issueToken(storeLike, { client_id: code.client_id, user_id: code.user_id, scope: code.scope, audience: code.audience, refresh: code.scope.includes("offline_access") }));
  });
  app.post("/oauth/revoke", async (c) => {
    const token = store(storeLike).tokens.findOneBy("token", String((await body(c)).token));
    if (token) store(storeLike).tokens.delete(token.id);
    return c.json({});
  });
  app.get("/userinfo", (c) => {
    const token = store(storeLike).tokens.findOneBy("token", bearer(c) ?? "");
    const user = token?.user_id ? store(storeLike).users.findOneBy("user_id", token.user_id) : undefined;
    return user ? c.json(userJson(user)) : c.json({ error: "invalid_token" }, 401);
  });
  app.get("/v2/logout", (c) => c.json({ logout: true, returnTo: c.req.query("returnTo") }));

  app.get("/api/v2/users", (c) => c.json(store(storeLike).users.all().map(userJson)));
  app.post("/api/v2/users", async (c) => {
    const input = await body(c);
    const user = store(storeLike).users.insert({ user_id: String(input.user_id ?? `auth0|${crypto.randomUUID()}`), email: String(input.email), password: String(input.password ?? "password"), name: String(input.name ?? input.email), email_verified: Boolean(input.email_verified ?? false), blocked: Boolean(input.blocked ?? false), app_metadata: {}, user_metadata: {} });
    event(storeLike, "ss", "User created", { user_id: user.user_id });
    return c.json(userJson(user), 201);
  });
  app.get("/api/v2/users-by-email", (c) => c.json(store(storeLike).users.all().filter((u) => u.email === c.req.query("email")).map(userJson)));
  app.get("/api/v2/users/:userId", (c) => {
    const user = store(storeLike).users.findOneBy("user_id", c.req.param("userId"));
    return user ? c.json(userJson(user)) : c.json({ statusCode: 404, error: "Not Found", message: "User not found" }, 404);
  });
  app.patch("/api/v2/users/:userId", async (c) => {
    const user = store(storeLike).users.findOneBy("user_id", c.req.param("userId"));
    return user ? c.json(userJson(store(storeLike).users.update(user.id, await body(c)) ?? user)) : c.json({ statusCode: 404, error: "Not Found" }, 404);
  });
  app.delete("/api/v2/users/:userId", (c) => {
    const user = store(storeLike).users.findOneBy("user_id", c.req.param("userId"));
    if (user) store(storeLike).users.delete(user.id);
    return c.json({});
  });
  app.get("/api/v2/users/:userId/roles", (c) => c.json(store(storeLike).roles.all()));
  app.post("/api/v2/users/:userId/roles", (c) => c.json({ assigned: true }));

  const crud = <T extends Entity>(collection: CollectionLike<T>, idField: keyof T, defaults: (input: Record<string, unknown>) => Omit<T, "id" | "created_at" | "updated_at">) => ({
    list: (c: ContextLike) => c.json(collection.all()),
    create: async (c: ContextLike) => c.json(collection.insert(defaults(await body(c))), 201),
    get: (c: ContextLike) => {
      const item = collection.findOneBy(idField, c.req.param("id"));
      return item ? c.json(item) : c.json({ statusCode: 404, error: "Not Found" }, 404);
    },
    patch: async (c: ContextLike) => {
      const item = collection.findOneBy(idField, c.req.param("id"));
      return item ? c.json(collection.update(item.id, await body(c)) ?? item) : c.json({ statusCode: 404, error: "Not Found" }, 404);
    },
    del: (c: ContextLike) => {
      const item = collection.findOneBy(idField, c.req.param("id"));
      if (item) collection.delete(item.id);
      return c.json({});
    },
  });
  const roles = crud(store(storeLike).roles, "role_id", (i) => ({ role_id: String(i.id ?? id("rol")), name: String(i.name), description: String(i.description ?? "") }));
  app.get("/api/v2/roles", roles.list); app.post("/api/v2/roles", roles.create); app.get("/api/v2/roles/:id", roles.get); app.patch("/api/v2/roles/:id", roles.patch); app.delete("/api/v2/roles/:id", roles.del);
  const clients = crud(store(storeLike).clients, "client_id", (i) => ({ client_id: String(i.client_id ?? id("cli")), client_secret: String(i.client_secret ?? ""), name: String(i.name ?? "Application"), redirect_uris: Array.isArray(i.redirect_uris) ? i.redirect_uris as string[] : [], grant_types: Array.isArray(i.grant_types) ? i.grant_types as string[] : [] }));
  app.get("/api/v2/applications", clients.list); app.post("/api/v2/applications", clients.create); app.get("/api/v2/applications/:id", clients.get); app.patch("/api/v2/applications/:id", clients.patch); app.delete("/api/v2/applications/:id", clients.del);
  const connections = crud(store(storeLike).connections, "connection_id", (i) => ({ connection_id: String(i.id ?? id("con")), name: String(i.name), strategy: String(i.strategy ?? "auth0"), enabled_clients: Array.isArray(i.enabled_clients) ? i.enabled_clients as string[] : [] }));
  app.get("/api/v2/connections", connections.list); app.post("/api/v2/connections", connections.create); app.get("/api/v2/connections/:id", connections.get); app.patch("/api/v2/connections/:id", connections.patch); app.delete("/api/v2/connections/:id", connections.del);
  const orgs = crud(store(storeLike).orgs, "org_id", (i) => ({ org_id: String(i.id ?? id("org")), name: String(i.name), display_name: String(i.display_name ?? i.name), members: Array.isArray(i.members) ? i.members as string[] : [] }));
  app.get("/api/v2/organizations", orgs.list); app.post("/api/v2/organizations", orgs.create); app.get("/api/v2/organizations/:id", orgs.get); app.patch("/api/v2/organizations/:id", orgs.patch); app.delete("/api/v2/organizations/:id", orgs.del);
  app.get("/api/v2/organizations/:id/members", (c) => {
    const org = store(storeLike).orgs.findOneBy("org_id", c.req.param("id"));
    return c.json((org?.members ?? []).map((userId) => store(storeLike).users.findOneBy("user_id", userId)).filter(Boolean).map(userJson));
  });
  app.post("/api/v2/tickets/email-verification", async (c) => c.json({ ticket: `${baseUrl(c)}/tickets/email-verification?ticket=${id("ticket")}`, ...(await body(c)) }));
  app.get("/tickets/email-verification", (c) => c.json({ verified: true, ticket: c.req.query("ticket") }));
  app.post("/_emulate/hook-sink", async (c) => c.json({ received: await body(c) }));
  app.get("/_emulate/events", (c) => c.json(store(storeLike).events.all()));
  app.get("/", (c) => c.json({ users: store(storeLike).users.all().map(userJson), clients: store(storeLike).clients.all(), roles: store(storeLike).roles.all(), organizations: store(storeLike).orgs.all(), events: store(storeLike).events.all() }));
}
