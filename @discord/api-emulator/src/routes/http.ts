type Entity = { id: number; created_at: string; updated_at: string };
type CollectionLike<T extends Entity> = {
  all(): T[];
  insert(data: Omit<T, "id" | "created_at" | "updated_at">): T;
  update(id: number, data: Partial<T>): T | undefined;
  delete(id: number): boolean;
  findOneBy(field: keyof T, value: string | number): T | undefined;
};
type StoreLike = { collection<T extends Entity>(name: string, indexes: string[]): CollectionLike<T> };
type ContextLike = { req: { param(n: string): string; query(n: string): string | undefined; json(): Promise<Record<string, unknown>>; header(n: string): string | undefined }; json(p: unknown, s?: number): Response; redirect(url: string, status?: number): Response; html?(p: string, s?: number): Response };
type AppLike = { get(path: string, h: (c: ContextLike) => Response): void; post(path: string, h: (c: ContextLike) => Promise<Response> | Response): void; put(path: string, h: (c: ContextLike) => Promise<Response> | Response): void; patch(path: string, h: (c: ContextLike) => Promise<Response> | Response): void; delete(path: string, h: (c: ContextLike) => Response): void };

type DiscordUser = Entity & { discord_id: string; username: string; discriminator: string; bot: boolean };
type DiscordGuild = Entity & { guild_id: string; name: string; owner_id: string };
type DiscordChannel = Entity & { channel_id: string; guild_id: string; name: string; type: number };
type DiscordMessage = Entity & { message_id: string; channel_id: string; author_id: string; content: string; timestamp: string };
type DiscordMember = Entity & { guild_id: string; user_id: string; nick?: string; roles: string[] };
type DiscordRole = Entity & { role_id: string; guild_id: string; name: string; color: number; permissions: string };
type DiscordApplication = Entity & { client_id: string; client_secret: string; name: string; redirect_uris: string[]; bot_token: string };
type DiscordCode = Entity & { code: string; client_id: string; user_id: string; redirect_uri: string; scope: string };

export interface DiscordSeedConfig {
  discord?: {
    bot_token?: string;
    application?: { client_id?: string; client_secret?: string; name?: string; redirect_uris?: string[] };
    guilds?: Array<{ id?: string; name: string; channels?: Array<{ name: string; type?: number }> }>;
  };
}

function ds(store: StoreLike) {
  return {
    users: store.collection<DiscordUser>("discord.users", ["discord_id"]),
    guilds: store.collection<DiscordGuild>("discord.guilds", ["guild_id"]),
    channels: store.collection<DiscordChannel>("discord.channels", ["channel_id", "guild_id"]),
    messages: store.collection<DiscordMessage>("discord.messages", ["message_id", "channel_id"]),
    members: store.collection<DiscordMember>("discord.members", ["guild_id", "user_id"]),
    roles: store.collection<DiscordRole>("discord.roles", ["role_id", "guild_id"]),
    apps: store.collection<DiscordApplication>("discord.apps", ["client_id"]),
    codes: store.collection<DiscordCode>("discord.codes", ["code"]),
  };
}
function snowflake(): string {
  return String((BigInt(Date.now() - 1420070400000) << 22n) + BigInt(Math.floor(Math.random() * 4194304)));
}
function me(store: StoreLike): DiscordUser {
  return ds(store).users.all()[0] ?? ds(store).users.insert({ discord_id: snowflake(), username: "emulator", discriminator: "0001", bot: false });
}
async function body(c: ContextLike) {
  return c.req.json().catch(() => ({}));
}
function userJson(user: DiscordUser) {
  return { id: user.discord_id, username: user.username, discriminator: user.discriminator, bot: user.bot };
}
function guildJson(g: DiscordGuild) {
  return { id: g.guild_id, name: g.name, owner_id: g.owner_id };
}
function channelJson(ch: DiscordChannel) {
  return { id: ch.channel_id, guild_id: ch.guild_id, name: ch.name, type: ch.type };
}
function messageJson(m: DiscordMessage, store: StoreLike) {
  const author = ds(store).users.findOneBy("discord_id", m.author_id) ?? me(store);
  return { id: m.message_id, channel_id: m.channel_id, content: m.content, timestamp: m.timestamp, author: userJson(author) };
}

export function seedDefaults(store: StoreLike): void {
  seedFromConfig(store, "", { discord: { bot_token: "discord-emulator-bot-token", application: { client_id: "discord-test-client", client_secret: "discord-test-secret" }, guilds: [{ name: "Emulator Guild", channels: [{ name: "general" }] }] } });
}
export function seedFromConfig(store: StoreLike, _baseUrl: string, config: DiscordSeedConfig): void {
  const s = ds(store);
  const owner = me(store);
  const app = config.discord?.application ?? {};
  if (!s.apps.findOneBy("client_id", app.client_id ?? "discord-test-client")) {
    s.apps.insert({ client_id: app.client_id ?? "discord-test-client", client_secret: app.client_secret ?? "discord-test-secret", name: app.name ?? "Discord Emulator", redirect_uris: app.redirect_uris ?? ["http://localhost:3000/callback"], bot_token: config.discord?.bot_token ?? "discord-emulator-bot-token" });
  }
  for (const seed of config.discord?.guilds ?? [{ name: "Emulator Guild", channels: [{ name: "general" }] }]) {
    const guild = s.guilds.insert({ guild_id: seed.id ?? snowflake(), name: seed.name, owner_id: owner.discord_id });
    const role = s.roles.insert({ role_id: guild.guild_id, guild_id: guild.guild_id, name: "@everyone", color: 0, permissions: "0" });
    s.members.insert({ guild_id: guild.guild_id, user_id: owner.discord_id, roles: [role.role_id] });
    for (const ch of seed.channels ?? [{ name: "general" }]) s.channels.insert({ channel_id: snowflake(), guild_id: guild.guild_id, name: ch.name, type: ch.type ?? 0 });
  }
}

export function registerRoutes(app: AppLike, store: StoreLike): void {
  app.get("/api/v10/users/@me", (c) => c.json(userJson(me(store))));
  app.get("/api/users/@me", (c) => c.json(userJson(me(store))));
  app.get("/api/v10/guilds", (c) => c.json(ds(store).guilds.all().map(guildJson)));
  app.post("/api/v10/guilds", async (c) => {
    const input = await body(c);
    const guild = ds(store).guilds.insert({ guild_id: snowflake(), name: String(input.name ?? "New Guild"), owner_id: me(store).discord_id });
    ds(store).members.insert({ guild_id: guild.guild_id, user_id: guild.owner_id, roles: [] });
    return c.json(guildJson(guild), 201);
  });
  app.get("/api/v10/guilds/:guildId", (c) => {
    const guild = ds(store).guilds.findOneBy("guild_id", c.req.param("guildId"));
    return guild ? c.json(guildJson(guild)) : c.json({ message: "Unknown Guild", code: 10004 }, 404);
  });
  app.patch("/api/v10/guilds/:guildId", async (c) => {
    const guild = ds(store).guilds.findOneBy("guild_id", c.req.param("guildId"));
    if (!guild) return c.json({ message: "Unknown Guild", code: 10004 }, 404);
    return c.json(guildJson(ds(store).guilds.update(guild.id, { name: String((await body(c)).name ?? guild.name) }) ?? guild));
  });
  app.delete("/api/v10/guilds/:guildId", (c) => {
    const guild = ds(store).guilds.findOneBy("guild_id", c.req.param("guildId"));
    if (!guild) return c.json({ message: "Unknown Guild", code: 10004 }, 404);
    ds(store).guilds.delete(guild.id);
    return c.json({});
  });
  app.get("/api/v10/guilds/:guildId/channels", (c) => c.json(ds(store).channels.all().filter((ch) => ch.guild_id === c.req.param("guildId")).map(channelJson)));
  app.post("/api/v10/guilds/:guildId/channels", async (c) => {
    const input = await body(c);
    const ch = ds(store).channels.insert({ channel_id: snowflake(), guild_id: c.req.param("guildId"), name: String(input.name ?? "channel"), type: Number(input.type ?? 0) });
    return c.json(channelJson(ch), 201);
  });
  app.get("/api/v10/channels/:channelId", (c) => {
    const ch = ds(store).channels.findOneBy("channel_id", c.req.param("channelId"));
    return ch ? c.json(channelJson(ch)) : c.json({ message: "Unknown Channel", code: 10003 }, 404);
  });
  app.patch("/api/v10/channels/:channelId", async (c) => {
    const ch = ds(store).channels.findOneBy("channel_id", c.req.param("channelId"));
    if (!ch) return c.json({ message: "Unknown Channel", code: 10003 }, 404);
    return c.json(channelJson(ds(store).channels.update(ch.id, { name: String((await body(c)).name ?? ch.name) }) ?? ch));
  });
  app.delete("/api/v10/channels/:channelId", (c) => {
    const ch = ds(store).channels.findOneBy("channel_id", c.req.param("channelId"));
    if (!ch) return c.json({ message: "Unknown Channel", code: 10003 }, 404);
    ds(store).channels.delete(ch.id);
    return c.json(channelJson(ch));
  });
  app.get("/api/v10/channels/:channelId/messages", (c) => c.json(ds(store).messages.all().filter((m) => m.channel_id === c.req.param("channelId")).map((m) => messageJson(m, store))));
  app.post("/api/v10/channels/:channelId/messages", async (c) => {
    const m = ds(store).messages.insert({ message_id: snowflake(), channel_id: c.req.param("channelId"), author_id: me(store).discord_id, content: String((await body(c)).content ?? ""), timestamp: new Date().toISOString() });
    return c.json(messageJson(m, store), 201);
  });
  app.get("/api/v10/channels/:channelId/messages/:messageId", (c) => {
    const m = ds(store).messages.findOneBy("message_id", c.req.param("messageId"));
    return m ? c.json(messageJson(m, store)) : c.json({ message: "Unknown Message", code: 10008 }, 404);
  });
  app.patch("/api/v10/channels/:channelId/messages/:messageId", async (c) => {
    const m = ds(store).messages.findOneBy("message_id", c.req.param("messageId"));
    if (!m) return c.json({ message: "Unknown Message", code: 10008 }, 404);
    return c.json(messageJson(ds(store).messages.update(m.id, { content: String((await body(c)).content ?? m.content) }) ?? m, store));
  });
  app.delete("/api/v10/channels/:channelId/messages/:messageId", (c) => {
    const m = ds(store).messages.findOneBy("message_id", c.req.param("messageId"));
    if (!m) return c.json({ message: "Unknown Message", code: 10008 }, 404);
    ds(store).messages.delete(m.id);
    return c.json({});
  });
  app.get("/api/v10/guilds/:guildId/members", (c) => c.json(ds(store).members.all().filter((m) => m.guild_id === c.req.param("guildId"))));
  app.get("/api/v10/guilds/:guildId/members/:userId", (c) => {
    const member = ds(store).members.all().find((m) => m.guild_id === c.req.param("guildId") && m.user_id === c.req.param("userId"));
    return member ? c.json(member) : c.json({ message: "Unknown Member", code: 10007 }, 404);
  });
  app.put("/api/v10/guilds/:guildId/members/:userId", async (c) => c.json(ds(store).members.insert({ guild_id: c.req.param("guildId"), user_id: c.req.param("userId"), roles: ((await body(c)).roles as string[]) ?? [] }), 201));
  app.patch("/api/v10/guilds/:guildId/members/:userId", async (c) => {
    const member = ds(store).members.all().find((m) => m.guild_id === c.req.param("guildId") && m.user_id === c.req.param("userId"));
    return member ? c.json(ds(store).members.update(member.id, await body(c)) ?? member) : c.json({ message: "Unknown Member", code: 10007 }, 404);
  });
  app.delete("/api/v10/guilds/:guildId/members/:userId", (c) => {
    const member = ds(store).members.all().find((m) => m.guild_id === c.req.param("guildId") && m.user_id === c.req.param("userId"));
    if (member) ds(store).members.delete(member.id);
    return c.json({});
  });
  app.get("/api/v10/guilds/:guildId/roles", (c) => c.json(ds(store).roles.all().filter((r) => r.guild_id === c.req.param("guildId"))));
  app.post("/api/v10/guilds/:guildId/roles", async (c) => {
    const input = await body(c);
    return c.json(ds(store).roles.insert({ role_id: snowflake(), guild_id: c.req.param("guildId"), name: String(input.name ?? "new role"), color: Number(input.color ?? 0), permissions: String(input.permissions ?? "0") }), 201);
  });
  app.patch("/api/v10/guilds/:guildId/roles/:roleId", async (c) => {
    const role = ds(store).roles.findOneBy("role_id", c.req.param("roleId"));
    return role ? c.json(ds(store).roles.update(role.id, await body(c)) ?? role) : c.json({ message: "Unknown Role", code: 10011 }, 404);
  });
  app.delete("/api/v10/guilds/:guildId/roles/:roleId", (c) => {
    const role = ds(store).roles.findOneBy("role_id", c.req.param("roleId"));
    if (role) ds(store).roles.delete(role.id);
    return c.json({});
  });
  app.get("/oauth2/authorize", (c) => c.json({ authorize: true, client_id: c.req.query("client_id"), redirect_uri: c.req.query("redirect_uri") }));
  app.post("/oauth2/authorize/callback", async (c) => {
    const input = await body(c);
    const code = crypto.randomUUID();
    ds(store).codes.insert({ code, client_id: String(input.client_id), redirect_uri: String(input.redirect_uri), scope: String(input.scope ?? "identify"), user_id: me(store).discord_id });
    return c.json({ code, state: input.state });
  });
  const token = async (c: ContextLike) => {
    const input = await body(c);
    const code = ds(store).codes.findOneBy("code", String(input.code));
    if (input.grant_type === "authorization_code" && !code) return c.json({ error: "invalid_grant" }, 400);
    return c.json({ access_token: `discord-access-${crypto.randomUUID()}`, token_type: "Bearer", expires_in: 604800, scope: code?.scope ?? input.scope ?? "identify" });
  };
  app.post("/oauth2/token", token);
  app.post("/api/oauth2/token", token);
  app.post("/api/v10/oauth2/token", token);
  app.get("/", (c) => c.json({ users: ds(store).users.all().map(userJson), guilds: ds(store).guilds.all().map(guildJson), channels: ds(store).channels.all().map(channelJson), messages: ds(store).messages.all().map((m) => messageJson(m, store)) }));
}
