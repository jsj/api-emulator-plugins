type Entity = { id: number; created_at: string; updated_at: string };
type CollectionLike<T extends Entity> = {
  all(): T[];
  insert(data: Omit<T, "id" | "created_at" | "updated_at">): T;
  update(id: number, data: Partial<T>): T | undefined;
  findOneBy(field: keyof T, value: string | number): T | undefined;
  clear(): void;
};
type StoreLike = { collection<T extends Entity>(name: string, indexes: string[]): CollectionLike<T> };
type ContextLike = {
  req: {
    param(name: string): string;
    query(name: string): string | undefined;
    header(name: string): string | undefined;
    json(): Promise<Record<string, unknown>>;
    parseBody?(): Promise<Record<string, unknown>>;
  };
  json(payload: unknown, status?: number): Response;
  text(payload: string, status?: number): Response;
};
type AppLike = {
  get(path: string, handler: (c: ContextLike) => Response): void;
  post(path: string, handler: (c: ContextLike) => Promise<Response> | Response): void;
};

interface TwilioMessage extends Entity {
  sid: string;
  account_sid: string;
  from: string;
  to: string;
  body: string;
  status: string;
  direction: string;
  date_created: string;
}
interface TwilioCall extends Entity {
  sid: string;
  account_sid: string;
  from: string;
  to: string;
  status: string;
  duration: string;
  date_created: string;
  url?: string;
}
interface TwilioVerifyService extends Entity {
  sid: string;
  friendly_name: string;
  code_length: number;
}
interface TwilioVerification extends Entity {
  sid: string;
  service_sid: string;
  to: string;
  channel: string;
  status: "pending" | "approved" | "canceled";
  code: string;
  expires_at: string;
}
interface TwilioAccount extends Entity {
  sid: string;
  auth_token: string;
  phone_numbers: string[];
}

export interface TwilioSeedConfig {
  twilio?: {
    account_sid?: string;
    auth_token?: string;
    phone_numbers?: string[];
    verify_services?: Array<{ sid?: string; friendly_name?: string; code_length?: number }>;
  };
}

function twilioStore(store: StoreLike) {
  return {
    accounts: store.collection<TwilioAccount>("twilio.accounts", ["sid"]),
    messages: store.collection<TwilioMessage>("twilio.messages", ["sid", "account_sid", "to"]),
    calls: store.collection<TwilioCall>("twilio.calls", ["sid", "account_sid", "to"]),
    services: store.collection<TwilioVerifyService>("twilio.verify_services", ["sid"]),
    verifications: store.collection<TwilioVerification>("twilio.verifications", ["sid", "service_sid", "to"]),
  };
}

function sid(prefix: string): string {
  return `${prefix}${crypto.randomUUID().replaceAll("-", "").slice(0, 32)}`;
}

function timestamp(): string {
  return new Date().toUTCString();
}

async function body(c: ContextLike): Promise<Record<string, string>> {
  const parsed = c.req.parseBody ? await c.req.parseBody().catch(() => ({})) : await c.req.json().catch(() => ({}));
  return Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v ?? "")]));
}

function publicMessage(message: TwilioMessage) {
  return {
    sid: message.sid,
    account_sid: message.account_sid,
    from: message.from,
    to: message.to,
    body: message.body,
    status: message.status,
    direction: message.direction,
    date_created: message.date_created,
    date_updated: message.updated_at,
    uri: `/2010-04-01/Accounts/${message.account_sid}/Messages/${message.sid}.json`,
  };
}

function publicCall(call: TwilioCall) {
  return {
    sid: call.sid,
    account_sid: call.account_sid,
    from: call.from,
    to: call.to,
    status: call.status,
    duration: call.duration,
    date_created: call.date_created,
    date_updated: call.updated_at,
    url: call.url,
    uri: `/2010-04-01/Accounts/${call.account_sid}/Calls/${call.sid}.json`,
  };
}

function publicVerification(verification: TwilioVerification, includeCode = false) {
  return {
    sid: verification.sid,
    service_sid: verification.service_sid,
    to: verification.to,
    channel: verification.channel,
    status: verification.status,
    date_created: verification.created_at,
    date_updated: verification.updated_at,
    ...(includeCode ? { code: verification.code, expires_at: verification.expires_at } : {}),
  };
}

export function seedDefaults(store: StoreLike): void {
  seedFromConfig(store, "", {
    twilio: {
      account_sid: "AC00000000000000000000000000000000",
      auth_token: "twilio-emulator-token",
      phone_numbers: ["+15555550100"],
      verify_services: [{ sid: "VA00000000000000000000000000000000", friendly_name: "Default Verify Service" }],
    },
  });
}

export function seedFromConfig(store: StoreLike, _baseUrl: string, config: TwilioSeedConfig): void {
  const ts = twilioStore(store);
  const cfg = config.twilio ?? {};
  if (!ts.accounts.findOneBy("sid", cfg.account_sid ?? "AC00000000000000000000000000000000")) {
    ts.accounts.insert({
      sid: cfg.account_sid ?? "AC00000000000000000000000000000000",
      auth_token: cfg.auth_token ?? "twilio-emulator-token",
      phone_numbers: cfg.phone_numbers ?? ["+15555550100"],
    });
  }
  for (const service of cfg.verify_services ?? [{ sid: "VA00000000000000000000000000000000" }]) {
    const serviceSid = service.sid ?? sid("VA");
    if (!ts.services.findOneBy("sid", serviceSid)) {
      ts.services.insert({ sid: serviceSid, friendly_name: service.friendly_name ?? "Verify Service", code_length: service.code_length ?? 6 });
    }
  }
}

export function registerRoutes(app: AppLike, store: StoreLike): void {
  app.post("/2010-04-01/Accounts/:accountSid/Messages.json", async (c) => {
    const input = await body(c);
    if (!input.To || !input.From) return c.json({ code: 21604, message: "To and From are required" }, 400);
    const message = twilioStore(store).messages.insert({
      sid: sid("SM"),
      account_sid: c.req.param("accountSid"),
      from: input.From,
      to: input.To,
      body: input.Body ?? "",
      status: "queued",
      direction: "outbound-api",
      date_created: timestamp(),
    });
    return c.json(publicMessage(message), 201);
  });

  app.get("/2010-04-01/Accounts/:accountSid/Messages.json", (c) => {
    const messages = twilioStore(store).messages.all().filter((m) => m.account_sid === c.req.param("accountSid"));
    return c.json({ messages: messages.map(publicMessage), page: 0, page_size: messages.length });
  });

  app.get("/2010-04-01/Accounts/:accountSid/Messages/:messageSid.json", (c) => {
    const message = twilioStore(store).messages.findOneBy("sid", c.req.param("messageSid"));
    return message ? c.json(publicMessage(message)) : c.json({ code: 20404, message: "Message not found" }, 404);
  });

  app.post("/2010-04-01/Accounts/:accountSid/Calls.json", async (c) => {
    const input = await body(c);
    if (!input.To || !input.From) return c.json({ code: 21201, message: "To and From are required" }, 400);
    const call = twilioStore(store).calls.insert({
      sid: sid("CA"),
      account_sid: c.req.param("accountSid"),
      from: input.From,
      to: input.To,
      status: "completed",
      duration: "0",
      date_created: timestamp(),
      url: input.Url,
    });
    return c.json(publicCall(call), 201);
  });

  app.get("/2010-04-01/Accounts/:accountSid/Calls.json", (c) => {
    const calls = twilioStore(store).calls.all().filter((m) => m.account_sid === c.req.param("accountSid"));
    return c.json({ calls: calls.map(publicCall), page: 0, page_size: calls.length });
  });

  app.post("/v2/Services/:serviceSid/Verifications", async (c) => {
    const input = await body(c);
    const service = twilioStore(store).services.findOneBy("sid", c.req.param("serviceSid"));
    if (!service) return c.json({ code: 20404, message: "Verify service not found" }, 404);
    const code = String(Math.floor(Math.random() * 10 ** service.code_length)).padStart(service.code_length, "0");
    const verification = twilioStore(store).verifications.insert({
      sid: sid("VE"),
      service_sid: service.sid,
      to: input.To,
      channel: input.Channel || "sms",
      status: "pending",
      code,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    return c.json(publicVerification(verification), 201);
  });

  app.post("/v2/Services/:serviceSid/VerificationCheck", async (c) => {
    const input = await body(c);
    const verification = twilioStore(store).verifications
      .all()
      .filter((v) => v.service_sid === c.req.param("serviceSid") && v.to === input.To)
      .at(-1);
    if (!verification) return c.json({ code: 20404, message: "Verification not found" }, 404);
    const approved = verification.code === input.Code && new Date(verification.expires_at).getTime() > Date.now();
    const updated = twilioStore(store).verifications.update(verification.id, { status: approved ? "approved" : "pending" }) ?? verification;
    return c.json(publicVerification(updated));
  });

  app.get("/", (c) => c.json({
    messages: twilioStore(store).messages.all().map(publicMessage),
    calls: twilioStore(store).calls.all().map(publicCall),
    verifications: twilioStore(store).verifications.all().map((v) => publicVerification(v, true)),
  }));
}
