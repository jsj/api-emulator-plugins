type Entity = { id: number; created_at: string; updated_at: string };
type CollectionLike<T extends Entity> = { all(): T[]; insert(data: Omit<T, "id" | "created_at" | "updated_at">): T; update(id: number, data: Partial<T>): T | undefined; delete(id: number): boolean; clear(): void; findOneBy(field: keyof T, value: string | number): T | undefined };
type StoreLike = { collection<T extends Entity>(name: string, indexes: string[]): CollectionLike<T> };
type ContextLike = { req: { param(n: string): string; query(n: string): string | undefined; json(): Promise<Record<string, unknown>>; parseBody?(): Promise<Record<string, unknown>> }; json(p: unknown, s?: number): Response; text(p: string, s?: number): Response };
type AppLike = { get(path: string, h: (c: ContextLike) => Response): void; post(path: string, h: (c: ContextLike) => Promise<Response> | Response): void; delete(path: string, h: (c: ContextLike) => Response): void };

type TelegramBot = Entity & { token: string; bot_id: number; username: string; first_name: string; webhook_url?: string; commands: Array<{ command: string; description: string }> };
type TelegramUser = Entity & { user_id: number; first_name: string; username?: string; is_bot: boolean };
type TelegramChat = Entity & { chat_id: number; type: string; title?: string; username?: string; members: number[] };
type TelegramMessage = Entity & { message_id: number; chat_id: number; from_id?: number; text?: string; date: number; media?: Record<string, unknown>; reply_markup?: unknown; reactions?: unknown[] };
type TelegramUpdate = Entity & { update_id: number; bot_token: string; payload: Record<string, unknown>; consumed: boolean };
type TelegramFile = Entity & { file_id: string; file_unique_id: string; file_path: string; content: string };
type TelegramCallback = Entity & { callback_id: string; chat_id: number; from_id: number; data?: string; message_id?: number; answered: boolean };
type TelegramFault = Entity & { method: string; status: number; body: Record<string, unknown> };

export interface TelegramSeedConfig {
  telegram?: {
    bots?: Array<{ token: string; username?: string; first_name?: string }>;
    users?: Array<{ id?: number; first_name: string; username?: string }>;
    chats?: Array<{ id?: number; type?: string; title?: string; members?: number[] }>;
  };
}

function ts(store: StoreLike) {
  return {
    bots: store.collection<TelegramBot>("telegram.bots", ["token", "bot_id", "username"]),
    users: store.collection<TelegramUser>("telegram.users", ["user_id", "username"]),
    chats: store.collection<TelegramChat>("telegram.chats", ["chat_id"]),
    messages: store.collection<TelegramMessage>("telegram.messages", ["message_id", "chat_id"]),
    updates: store.collection<TelegramUpdate>("telegram.updates", ["update_id", "bot_token"]),
    files: store.collection<TelegramFile>("telegram.files", ["file_id", "file_path"]),
    callbacks: store.collection<TelegramCallback>("telegram.callbacks", ["callback_id"]),
    faults: store.collection<TelegramFault>("telegram.faults", ["method"]),
  };
}
async function body(c: ContextLike): Promise<Record<string, unknown>> {
  return c.req.parseBody ? c.req.parseBody().catch(() => ({})) : c.req.json().catch(() => ({}));
}
function ok(result: unknown) {
  return { ok: true, result };
}
function fail(description: string, error_code = 400) {
  return { ok: false, error_code, description };
}
function nextInt(items: Array<{ [key: string]: unknown }>, field: string, start: number) {
  return Math.max(start - 1, ...items.map((i) => Number(i[field]) || 0)) + 1;
}
function botByToken(store: StoreLike, token: string) {
  return ts(store).bots.findOneBy("token", token);
}
function botJson(bot: TelegramBot) {
  return { id: bot.bot_id, is_bot: true, first_name: bot.first_name, username: bot.username, can_join_groups: true, can_read_all_group_messages: false, supports_inline_queries: false };
}
function chatJson(chat: TelegramChat) {
  return { id: chat.chat_id, type: chat.type, title: chat.title, username: chat.username };
}
function messageJson(msg: TelegramMessage, store: StoreLike) {
  const chat = ts(store).chats.findOneBy("chat_id", msg.chat_id);
  const from = msg.from_id ? ts(store).users.findOneBy("user_id", msg.from_id) : undefined;
  return { message_id: msg.message_id, date: msg.date, chat: chat ? chatJson(chat) : { id: msg.chat_id, type: "private" }, from, text: msg.text, reply_markup: msg.reply_markup, ...(msg.media ?? {}) };
}
function enqueue(store: StoreLike, token: string, payload: Record<string, unknown>) {
  ts(store).updates.insert({ update_id: nextInt(ts(store).updates.all(), "update_id", 1), bot_token: token, payload, consumed: false });
}
function ensureChat(store: StoreLike, chatId: number): TelegramChat {
  return ts(store).chats.findOneBy("chat_id", chatId) ?? ts(store).chats.insert({ chat_id: chatId, type: chatId < 0 ? "group" : "private", members: [] });
}
function send(store: StoreLike, token: string, input: Record<string, unknown>, media?: Record<string, unknown>) {
  const chatId = Number(input.chat_id);
  ensureChat(store, chatId);
  const msg = ts(store).messages.insert({ message_id: nextInt(ts(store).messages.all().filter((m) => m.chat_id === chatId), "message_id", 1), chat_id: chatId, text: typeof input.text === "string" ? input.text : undefined, date: Math.floor(Date.now() / 1000), media, reply_markup: input.reply_markup });
  const json = messageJson(msg, store);
  enqueue(store, token, { message: json });
  return json;
}

export function seedDefaults(store: StoreLike): void {
  seedFromConfig(store, "", { telegram: { bots: [{ token: "telegram-emulator-token", username: "emulator_bot" }], users: [{ id: 1001, first_name: "Test", username: "tester" }], chats: [{ id: 1001, type: "private", members: [1001] }] } });
}
export function seedFromConfig(store: StoreLike, _baseUrl: string, config: TelegramSeedConfig): void {
  const s = ts(store);
  for (const bot of config.telegram?.bots ?? [{ token: "telegram-emulator-token", username: "emulator_bot" }]) if (!s.bots.findOneBy("token", bot.token)) s.bots.insert({ token: bot.token, bot_id: nextInt(s.bots.all(), "bot_id", 900000001), username: bot.username ?? "emulator_bot", first_name: bot.first_name ?? "Telegram Emulator", commands: [] });
  for (const user of config.telegram?.users ?? []) if (!s.users.findOneBy("user_id", user.id ?? 0)) s.users.insert({ user_id: user.id ?? nextInt(s.users.all(), "user_id", 1001), first_name: user.first_name, username: user.username, is_bot: false });
  for (const chat of config.telegram?.chats ?? []) if (!s.chats.findOneBy("chat_id", chat.id ?? 0)) s.chats.insert({ chat_id: chat.id ?? -nextInt(s.chats.all(), "id", 1001), type: chat.type ?? "group", title: chat.title, members: chat.members ?? [] });
}

export function registerRoutes(app: AppLike, store: StoreLike): void {
  app.get("/file/bot:token/:filePath", (c) => {
    const file = ts(store).files.findOneBy("file_path", c.req.param("filePath"));
    return file ? c.text(file.content) : c.json(fail("Not found", 404), 404);
  });
  app.get("/bot:token/:method", (c) => dispatch(c, c.req.param("token"), c.req.param("method"), store));
  app.post("/bot:token/:method", async (c) => dispatch(c, c.req.param("token"), c.req.param("method"), store, await body(c)));

  app.post("/_emu/telegram/reset", (c) => {
    Object.values(ts(store)).forEach((collection) => collection.clear());
    seedDefaults(store);
    return c.json({ ok: true });
  });
  app.post("/_emu/telegram/bots", async (c) => {
    const input = await body(c);
    const bot = ts(store).bots.insert({ token: String(input.token ?? crypto.randomUUID()), bot_id: Number(input.id ?? nextInt(ts(store).bots.all(), "bot_id", 900000001)), username: String(input.username ?? "bot"), first_name: String(input.first_name ?? "Bot"), commands: [] });
    return c.json(bot);
  });
  app.get("/_emu/telegram/bots", (c) => c.json(ts(store).bots.all()));
  app.post("/_emu/telegram/users", async (c) => {
    const input = await body(c);
    return c.json(ts(store).users.insert({ user_id: Number(input.id ?? nextInt(ts(store).users.all(), "user_id", 1001)), first_name: String(input.first_name ?? "User"), username: input.username ? String(input.username) : undefined, is_bot: false }));
  });
  const createChat = async (c: ContextLike, type: string) => {
    const input = await body(c);
    return c.json(ts(store).chats.insert({ chat_id: Number(input.id ?? (type === "private" ? nextInt(ts(store).chats.all(), "chat_id", 1001) : -nextInt(ts(store).chats.all(), "id", 1001))), type, title: String(input.title ?? type), members: Array.isArray(input.members) ? input.members as number[] : [] }));
  };
  app.post("/_emu/telegram/chats/private", (c) => createChat(c, "private"));
  app.post("/_emu/telegram/chats/group", (c) => createChat(c, "group"));
  app.post("/_emu/telegram/chats/supergroup", (c) => createChat(c, "supergroup"));
  app.post("/_emu/telegram/chats/channel", (c) => createChat(c, "channel"));
  app.post("/_emu/telegram/chats/:chatId/messages", async (c) => {
    const msg = send(store, ts(store).bots.all()[0]?.token ?? "telegram-emulator-token", { ...(await body(c)), chat_id: c.req.param("chatId") });
    return c.json(msg);
  });
  app.get("/_emu/telegram/chats/:chatId/messages", (c) => c.json(ts(store).messages.all().filter((m) => m.chat_id === Number(c.req.param("chatId"))).map((m) => messageJson(m, store))));
  app.post("/_emu/telegram/chats/:chatId/callbacks", async (c) => {
    const input = await body(c);
    const cb = ts(store).callbacks.insert({ callback_id: crypto.randomUUID(), chat_id: Number(c.req.param("chatId")), from_id: Number(input.from_id ?? 1001), data: String(input.data ?? ""), message_id: input.message_id ? Number(input.message_id) : undefined, answered: false });
    enqueue(store, ts(store).bots.all()[0]?.token ?? "telegram-emulator-token", { callback_query: { id: cb.callback_id, from: ts(store).users.findOneBy("user_id", cb.from_id), data: cb.data, message: cb.message_id } });
    return c.json(cb);
  });
  app.post("/_emu/telegram/faults", async (c) => {
    const input = await body(c);
    return c.json(ts(store).faults.insert({ method: String(input.method), status: Number(input.status ?? 500), body: input.body as Record<string, unknown> ?? fail("emulated fault", 500) }));
  });
  app.delete("/_emu/telegram/faults", (c) => {
    ts(store).faults.clear();
    return c.json({ ok: true });
  });
  app.get("/_emu/telegram/callbacks/:id", (c) => c.json(ts(store).callbacks.findOneBy("callback_id", c.req.param("id")) ?? null));
  app.get("/", (c) => c.json({ bots: ts(store).bots.all(), users: ts(store).users.all(), chats: ts(store).chats.all(), messages: ts(store).messages.all().map((m) => messageJson(m, store)), updates: ts(store).updates.all() }));
}

function dispatch(c: ContextLike, token: string, method: string, store: StoreLike, input: Record<string, unknown> = {}): Response {
  const fault = ts(store).faults.findOneBy("method", method);
  if (fault) return c.json(fault.body, fault.status);
  const bot = botByToken(store, token);
  if (!bot) return c.json(fail("Unauthorized", 401), 401);
  switch (method) {
    case "getMe":
      return c.json(ok(botJson(bot)));
    case "getUpdates": {
      const offset = Number(input.offset ?? c.req.query("offset") ?? 0);
      const updates = ts(store).updates.all().filter((u) => u.bot_token === token && !u.consumed && u.update_id >= offset).slice(0, Number(input.limit ?? 100));
      for (const update of updates) ts(store).updates.update(update.id, { consumed: true });
      return c.json(ok(updates.map((u) => ({ update_id: u.update_id, ...u.payload }))));
    }
    case "setWebhook":
      ts(store).bots.update(bot.id, { webhook_url: String(input.url ?? "") });
      return c.json(ok(true));
    case "deleteWebhook":
      ts(store).bots.update(bot.id, { webhook_url: "" });
      return c.json(ok(true));
    case "getWebhookInfo":
      return c.json(ok({ url: bot.webhook_url ?? "", has_custom_certificate: false, pending_update_count: ts(store).updates.all().filter((u) => !u.consumed).length }));
    case "sendMessage":
    case "sendPhoto":
    case "sendDocument":
    case "sendVideo":
    case "sendAudio":
    case "sendVoice":
    case "sendAnimation":
    case "sendSticker":
      return c.json(ok(send(store, token, input, method === "sendMessage" ? undefined : { [method.replace("send", "").toLowerCase()]: input[method.replace("send", "").toLowerCase()] ?? { file_id: crypto.randomUUID() } })));
    case "editMessageText": {
      const msg = ts(store).messages.findOneBy("message_id", Number(input.message_id));
      return msg ? c.json(ok(messageJson(ts(store).messages.update(msg.id, { text: String(input.text ?? "") }) ?? msg, store))) : c.json(fail("message not found", 404), 404);
    }
    case "deleteMessage": {
      const msg = ts(store).messages.findOneBy("message_id", Number(input.message_id));
      if (msg) ts(store).messages.delete(msg.id);
      return c.json(ok(true));
    }
    case "sendChatAction":
      return c.json(ok(true));
    case "getFile": {
      const file = ts(store).files.findOneBy("file_id", String(input.file_id));
      return c.json(ok(file ?? ts(store).files.insert({ file_id: String(input.file_id ?? crypto.randomUUID()), file_unique_id: crypto.randomUUID(), file_path: `files/${input.file_id ?? crypto.randomUUID()}`, content: "" })));
    }
    case "setMessageReaction":
      return c.json(ok(true));
    case "getChat": {
      const chat = ts(store).chats.findOneBy("chat_id", Number(input.chat_id));
      return chat ? c.json(ok(chatJson(chat))) : c.json(fail("chat not found", 404), 404);
    }
    case "getChatMember":
      return c.json(ok({ user: ts(store).users.findOneBy("user_id", Number(input.user_id)) ?? { id: Number(input.user_id), is_bot: false, first_name: "User" }, status: "member" }));
    case "getChatAdministrators":
      return c.json(ok([]));
    case "getChatMemberCount":
      return c.json(ok(ensureChat(store, Number(input.chat_id)).members.length));
    case "createForumTopic":
    case "editForumTopic":
    case "closeForumTopic":
    case "reopenForumTopic":
    case "deleteForumTopic":
      return c.json(ok({ message_thread_id: Number(input.message_thread_id ?? Date.now()) }));
    case "setMyCommands":
      ts(store).bots.update(bot.id, { commands: Array.isArray(input.commands) ? input.commands as Array<{ command: string; description: string }> : [] });
      return c.json(ok(true));
    case "getMyCommands":
      return c.json(ok(bot.commands));
    case "answerCallbackQuery": {
      const cb = ts(store).callbacks.findOneBy("callback_id", String(input.callback_query_id));
      if (cb) ts(store).callbacks.update(cb.id, { answered: true });
      return c.json(ok(true));
    }
    case "sendMessageDraft":
      return c.json(ok({ draft_id: crypto.randomUUID(), ...input }));
    default:
      return c.json(fail(`Method ${method} is not implemented`, 404), 404);
  }
}
