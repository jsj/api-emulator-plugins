import type { RouteContext, Store } from "@api-emulator/core";
import { ascId, jsonApiResource, jsonApiList, jsonApiError, parseCursor } from "../jsonapi.js";

// Auth entities stored in the generic store data (not collections)
// since they're singleton-like config.

interface ASCUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
}

interface ASCActor {
  id: string;
  actor_type: string;
  user_id: string | null;
}

interface OAuthClient {
  client_id: string;
  redirect_uris: string[];
}

function getUsers(store: Store): ASCUser[] {
  return store.getData<ASCUser[]>("asc.users") ?? [];
}

function getActors(store: Store): ASCActor[] {
  return store.getData<ASCActor[]>("asc.actors") ?? [];
}

function getAuthStatus(store: Store): { authenticated: boolean } {
  return store.getData<{ authenticated: boolean }>("asc.auth_status") ?? { authenticated: true };
}

function now(): string {
  return new Date().toISOString();
}

function getOAuthClients(store: Store): OAuthClient[] {
  return store.getData<OAuthClient[]>("apple.oauth.clients") ?? [
    { client_id: "com.example.app", redirect_uris: ["https://example.com/callback", "http://localhost/callback"] },
  ];
}

function base64Url(input: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(input)).toString("base64url");
}

function idToken(clientId: string, subject = "apple-emulator-user"): string {
  return [
    base64Url({ alg: "RS256", kid: "apple-emulator-key", typ: "JWT" }),
    base64Url({
      iss: "https://appleid.apple.com",
      aud: clientId,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      sub: subject,
      email: "demo@apple-emulator.local",
      email_verified: "true",
      is_private_email: "false",
    }),
    "emulator-signature",
  ].join(".");
}

function fakeSignedHeaders(body: Record<string, unknown> = {}) {
  const request = (body.request ?? {}) as { url?: unknown; method?: unknown };
  return {
    headers: {
      "X-Apple-MD": "fake-md",
      "X-Apple-MD-M": "fake-md-m",
      "X-Apple-MD-RINFO": "17106176",
      "X-Apple-MD-LU": "fake-lu",
      "X-VPhone-Apple-Emulator": "1",
    },
    mescalSignature: "fake-mescal-signature",
    request: {
      url: typeof request.url === "string" ? request.url : null,
      method: typeof request.method === "string" ? request.method : null,
    },
    issuedAt: now(),
  };
}

export function appleIdentityRoutes({ app, store }: RouteContext): void {
  app.get("/bag.xml", (c) => c.json({
    status: 0,
    bag: {
      profile: "AMSCore",
      profileVersion: "1",
      environment: "emulator",
    },
    issuedAt: now(),
  }));

  app.post("/v1/signSapSetup", async (c) => {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const response = fakeSignedHeaders(body);
    store.setData("apple:last-sign-sap-setup", body);
    store.setData("apple:last-sign-sap-setup-response", response);
    return c.json(response);
  });

  app.post("/auth/signin", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    store.setData("apple:last-signin", body);
    return c.json({
      ok: true,
      user: {
        id: "apple-emulator-user",
        email: "demo@apple-emulator.local",
      },
      token: "apple-emulator-token",
      issuedAt: now(),
    });
  });

  app.get("/auth/authorize", (c) => {
    const clientId = c.req.query("client_id") ?? "";
    const redirectUri = c.req.query("redirect_uri") ?? "";
    const responseMode = c.req.query("response_mode") ?? "query";
    const state = c.req.query("state");
    const clients = getOAuthClients(store);
    const client = clients.find((item) => item.client_id === clientId);
    if (client && redirectUri && !client.redirect_uris.includes(redirectUri)) {
      return c.json({ error: "invalid_request", error_description: "redirect_uri is not registered" }, 400);
    }
    const code = `apple-code-${Math.random().toString(36).slice(2, 10)}`;
    store.setData(`apple.oauth.code.${code}`, { client_id: clientId, redirect_uri: redirectUri, issued_at: now() });

    if (!redirectUri) {
      return c.json({ code, state: state ?? null, id_token: idToken(clientId || "com.example.app") });
    }

    const url = new URL(redirectUri);
    url.searchParams.set("code", code);
    if (state) url.searchParams.set("state", state);
    if (responseMode === "form_post") {
      return c.html(`<!doctype html><form method="post" action="${redirectUri}"><input name="code" value="${code}"><input name="state" value="${state ?? ""}"></form>`);
    }
    return c.redirect(url.toString(), 302);
  });

  app.post("/auth/token", async (c) => {
    const contentType = c.req.header("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await c.req.json().catch(() => ({}))
      : Object.fromEntries((await c.req.formData().catch(() => new FormData())).entries());
    const grantType = String(body.grant_type ?? "authorization_code");
    const clientId = String(body.client_id ?? "com.example.app");
    const code = String(body.code ?? "");

    if (grantType === "authorization_code" && code && !store.getData(`apple.oauth.code.${code}`)) {
      return c.json({ error: "invalid_grant" }, 400);
    }

    return c.json({
      access_token: `apple-access-${Math.random().toString(36).slice(2, 12)}`,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: `apple-refresh-${Math.random().toString(36).slice(2, 12)}`,
      id_token: idToken(clientId),
    });
  });

  app.post("/auth/revoke", async (c) => {
    const body = await c.req.parseBody().catch(() => ({}));
    store.setData("apple:last-revoked-token", body.token ?? null);
    return c.body(null, 200);
  });

  app.get("/auth/keys", (c) => c.json({
    keys: [
      {
        kty: "RSA",
        kid: "apple-emulator-key",
        use: "sig",
        alg: "RS256",
        n: "0vx7agoebGcQSuuPiLJXZptN27jA",
        e: "AQAB",
      },
    ],
  }));

  app.get("/inspect/last-sign-sap-setup", (c) => c.json(store.getData("apple:last-sign-sap-setup") ?? null));
  app.get("/inspect/last-sign-sap-setup-response", (c) => c.json(store.getData("apple:last-sign-sap-setup-response") ?? null));
  app.get("/inspect/last-signin", (c) => c.json(store.getData("apple:last-signin") ?? null));
}

export function ascUserRoutes({ app, store, baseUrl }: RouteContext): void {
  // List users
  app.get("/v1/users", (c) => {
    const users = getUsers(store);
    const { cursor, limit } = parseCursor(c);
    const page = users.slice(cursor, cursor + limit);

    return c.json(
      jsonApiList(
        baseUrl,
        "users",
        page.map((u) => ({
          id: u.id,
          attributes: {
            username: u.email,
            firstName: u.first_name,
            lastName: u.last_name,
            email: u.email,
            roles: u.roles,
          },
        })),
        cursor,
        limit,
        users.length,
      ),
    );
  });

  // Get user
  app.get("/v1/users/:id", (c) => {
    const id = c.req.param("id");
    const users = getUsers(store);
    const user = users.find((u) => u.id === id);
    if (!user) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `User ${id} not found`), 404);
    }
    return c.json(
      jsonApiResource(baseUrl, "users", user.id, {
        username: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        roles: user.roles,
      }),
    );
  });

  // List actors
  app.get("/v1/ciProducts/:productId/additionalRepositories", (_c) => {
    // Stub — not all routes need behavior
    return _c.json({ data: [], links: { self: `${baseUrl}/v1/ciProducts` }, meta: { paging: { total: 0, limit: 50 } } });
  });

  // User invitations
  app.get("/v1/userInvitations", (c) => {
    return c.json(jsonApiList(baseUrl, "userInvitations", [], 0, 50, 0));
  });
}

export function authRoutes(ctx: RouteContext): void {
  appleIdentityRoutes(ctx);
  ascUserRoutes(ctx);
}
