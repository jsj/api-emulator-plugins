import type { RouteContext, Store } from "@emulators/core";

const APNS_FAILURE_REASONS = new Set([
  "BadDeviceToken",
  "BadExpirationDate",
  "BadPriority",
  "BadPushType",
  "BadTopic",
  "ExpiredProviderToken",
  "Forbidden",
  "DeviceTokenNotForTopic",
  "InvalidProviderToken",
  "PayloadEmpty",
  "TopicDisallowed",
  "TooManyRequests",
  "Unregistered",
]);

interface APNSDevice {
  token: string;
  topic: string;
  status: "registered" | "offline" | "unregistered";
}

interface APNSPendingDelivery {
  id: string;
  deviceToken: string;
  topic: string;
  payload: unknown;
  headers: Record<string, string | undefined>;
  receivedAt: string;
  expiresAt: number | null;
  collapseId: string | null;
}

interface APNSState {
  teams: Record<string, { teamId: string }>;
  keys: Record<string, { teamId: string; keyId: string }>;
  devices: Record<string, APNSDevice>;
  topics: Record<string, { topic: string }>;
  collapsed: Record<string, APNSPendingDelivery>;
  pending: APNSPendingDelivery[];
  throttles: Record<string, boolean>;
}

interface APNSFailure {
  reason: string;
  status: number;
}

function now(): string {
  return new Date().toISOString();
}

function apnsState(store: Store): APNSState {
  const current = store.getData<APNSState>("apple:apns-state");
  if (current) return current;
  const initial: APNSState = {
    teams: {},
    keys: {},
    devices: {},
    topics: {},
    collapsed: {},
    pending: [],
    throttles: {},
  };
  store.setData("apple:apns-state", initial);
  return initial;
}

function saveApnsState(store: Store, state: APNSState): void {
  store.setData("apple:apns-state", state);
}

function apnsDeliveries(store: Store): APNSPendingDelivery[] {
  return store.getData<APNSPendingDelivery[]>("apple:apns-deliveries") ?? [];
}

function saveApnsDelivery(store: Store, delivery: APNSPendingDelivery & { deliveredAt?: string }): void {
  const deliveries = [delivery, ...apnsDeliveries(store)];
  store.setData("apple:apns-deliveries", deliveries);
  store.setData("apple:apns-last-delivery", delivery);
  store.setData("asc.apns_notifications", deliveries.map((item) => ({
    id: item.id,
    token: item.deviceToken,
    topic: item.topic,
    push_type: item.headers["apns-push-type"] ?? null,
    priority: item.headers["apns-priority"] ?? null,
    payload: item.payload,
    received_at: item.receivedAt,
  })));
}

function apnsFailures(store: Store): Record<string, APNSFailure> {
  return store.getData<Record<string, APNSFailure>>("apple:apns-failures") ?? {};
}

function readExpiration(value: string | undefined): number | null | "invalid" {
  if (!value || value === "0") return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return "invalid";
  return parsed;
}

function validationFailure(reason: string, status: number): APNSFailure {
  return { reason, status };
}

function validateApnsRequest(
  store: Store,
  request: {
    token: string;
    payload: unknown;
    headers: Record<string, string | undefined>;
    expiresAt: number | null | "invalid";
  },
): APNSFailure | null {
  const state = apnsState(store);
  const topic = request.headers["apns-topic"];
  const pushType = request.headers["apns-push-type"];
  const priority = request.headers["apns-priority"];
  const teamId = request.headers["apns-team-id"];
  const keyId = request.headers["apns-key-id"];
  const device = state.devices[request.token];

  if (request.expiresAt === "invalid") return validationFailure("BadExpirationDate", 400);
  if (!request.payload || typeof request.payload !== "object" || Array.isArray(request.payload)) return validationFailure("BadPayload", 400);
  if (topic && Object.keys(state.topics).length > 0 && !state.topics[topic]) return validationFailure("BadTopic", 400);
  if (device?.status === "unregistered") return validationFailure("Unregistered", 410);
  if (device && topic && device.topic !== topic) return validationFailure("DeviceTokenNotForTopic", 400);
  if (pushType && !["alert", "background", "voip", "complication", "fileprovider", "mdm", "liveactivity"].includes(pushType)) return validationFailure("BadPushType", 400);
  if (priority && !["5", "10"].includes(priority)) return validationFailure("BadPriority", 400);
  if (teamId && Object.keys(state.teams).length > 0 && !state.teams[teamId]) return validationFailure("Forbidden", 403);
  if (keyId && teamId && Object.keys(state.keys).length > 0 && !state.keys[`${teamId}:${keyId}`]) return validationFailure("InvalidProviderToken", 403);
  if (state.throttles[request.token] || (topic && state.throttles[topic])) return validationFailure("TooManyRequests", 429);
  return null;
}

function createDelivery(input: {
  token: string;
  payload: unknown;
  headers: Record<string, string | undefined>;
  expiresAt: number | null;
}): APNSPendingDelivery {
  const topic = input.headers["apns-topic"] ?? "";
  return {
    id: input.headers["apns-id"] ?? crypto.randomUUID(),
    deviceToken: input.token,
    topic,
    payload: input.payload,
    headers: input.headers,
    receivedAt: now(),
    expiresAt: input.expiresAt,
    collapseId: input.headers["apns-collapse-id"] ?? null,
  };
}

function enqueueOrDeliver(store: Store, delivery: APNSPendingDelivery): { queued: boolean; delivery: APNSPendingDelivery } {
  const state = apnsState(store);
  const device = state.devices[delivery.deviceToken];
  if (device?.status === "offline") {
    if (delivery.collapseId) state.collapsed[`${delivery.deviceToken}:${delivery.collapseId}`] = delivery;
    else state.pending.push(delivery);
    saveApnsState(store, state);
    return { queued: true, delivery };
  }
  saveApnsDelivery(store, { ...delivery, deliveredAt: now() });
  return { queued: false, delivery };
}

function flushPendingDeliveries(store: Store, token?: string): Array<APNSPendingDelivery & { deliveredAt: string }> {
  const state = apnsState(store);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const collapsed = Object.values(state.collapsed);
  state.collapsed = {};
  const pending = [...state.pending, ...collapsed];
  const deliverable: Array<APNSPendingDelivery & { deliveredAt: string }> = [];
  const retained: APNSPendingDelivery[] = [];
  for (const item of pending) {
    if (token && item.deviceToken !== token) {
      retained.push(item);
      continue;
    }
    if (item.expiresAt && item.expiresAt <= nowSeconds) continue;
    deliverable.push({ ...item, deliveredAt: now() });
  }
  state.pending = retained;
  saveApnsState(store, state);
  for (const delivery of deliverable) saveApnsDelivery(store, delivery);
  return deliverable;
}

function parseLimit(value: string | undefined): number {
  if (!value) return 50;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 50;
  return Math.min(parsed, 500);
}

async function parseBody(c: { req: { json: () => Promise<unknown> } }): Promise<unknown> {
  return c.req.json().catch(() => null);
}

export function apnsRoutes({ app, store }: RouteContext): void {
  app.post("/3/device/:token", async (c) => {
    const token = c.req.param("token");
    const headers = {
      "apns-id": c.req.header("apns-id"),
      "apns-topic": c.req.header("apns-topic"),
      "apns-push-type": c.req.header("apns-push-type"),
      "apns-collapse-id": c.req.header("apns-collapse-id"),
      "apns-priority": c.req.header("apns-priority"),
      "apns-expiration": c.req.header("apns-expiration"),
      "apns-team-id": c.req.header("apns-team-id"),
      "apns-key-id": c.req.header("apns-key-id"),
      authorization: c.req.header("authorization"),
    };
    const payload = await parseBody(c);
    const expiresAt = readExpiration(headers["apns-expiration"]);
    const failure = apnsFailures(store)[token] ?? apnsFailures(store)["*"] ?? validateApnsRequest(store, { token, payload, headers, expiresAt });
    if (failure) return c.json({ reason: failure.reason }, failure.status as any);

    const delivery = createDelivery({ token, payload, headers, expiresAt: expiresAt === "invalid" ? null : expiresAt });
    enqueueOrDeliver(store, delivery);
    c.header("apns-id", delivery.id);
    return c.body(null, 200);
  });

  app.post("/apns/send", async (c) => {
    const body = await c.req.json().catch(() => ({})) as {
      deviceToken?: string;
      payload?: unknown;
      topic?: string;
      pushType?: string;
      priority?: string | number;
      expiration?: string | number;
      collapseId?: string;
      teamId?: string;
      keyId?: string;
    };
    const token = body.deviceToken ?? "";
    const headers = {
      "apns-id": crypto.randomUUID(),
      "apns-topic": body.topic,
      "apns-push-type": body.pushType,
      "apns-collapse-id": body.collapseId,
      "apns-priority": body.priority === undefined ? undefined : String(body.priority),
      "apns-expiration": body.expiration === undefined ? undefined : String(body.expiration),
      "apns-team-id": body.teamId,
      "apns-key-id": body.keyId,
      authorization: undefined,
    };
    const expiresAt = readExpiration(headers["apns-expiration"]);
    const failure = apnsFailures(store)[token] ?? apnsFailures(store)["*"] ?? validateApnsRequest(store, {
      token,
      payload: body.payload,
      headers,
      expiresAt,
    });
    if (failure) return c.json({ reason: failure.reason }, failure.status as any);
    const delivery = createDelivery({ token, payload: body.payload, headers, expiresAt: expiresAt === "invalid" ? null : expiresAt });
    const result = enqueueOrDeliver(store, delivery);
    return c.json({ ok: true, queued: result.queued, delivery });
  });

  app.post("/apns/control/register-team", async (c) => {
    const body = await c.req.json().catch(() => ({})) as { teamId?: string };
    if (!body.teamId) return c.json({ error: "teamId required" }, 400);
    const state = apnsState(store);
    state.teams[body.teamId] = { teamId: body.teamId };
    saveApnsState(store, state);
    return c.json(state.teams[body.teamId]);
  });

  app.post("/apns/control/register-key", async (c) => {
    const body = await c.req.json().catch(() => ({})) as { teamId?: string; keyId?: string };
    if (!body.teamId || !body.keyId) return c.json({ error: "teamId and keyId required" }, 400);
    const state = apnsState(store);
    state.keys[`${body.teamId}:${body.keyId}`] = { teamId: body.teamId, keyId: body.keyId };
    saveApnsState(store, state);
    return c.json(state.keys[`${body.teamId}:${body.keyId}`]);
  });

  app.post("/apns/control/register-topic", async (c) => {
    const body = await c.req.json().catch(() => ({})) as { topic?: string };
    if (!body.topic) return c.json({ error: "topic required" }, 400);
    const state = apnsState(store);
    state.topics[body.topic] = { topic: body.topic };
    saveApnsState(store, state);
    return c.json(state.topics[body.topic]);
  });

  app.post("/apns/control/register-device", async (c) => {
    const body = await c.req.json().catch(() => ({})) as { deviceToken?: string; topic?: string; status?: APNSDevice["status"] };
    if (!body.deviceToken || !body.topic) return c.json({ error: "deviceToken and topic required" }, 400);
    const state = apnsState(store);
    state.devices[body.deviceToken] = { token: body.deviceToken, topic: body.topic, status: body.status ?? "registered" };
    saveApnsState(store, state);
    return c.json(state.devices[body.deviceToken]);
  });

  app.post("/apns/control/unregister-device", async (c) => {
    const body = await c.req.json().catch(() => ({})) as { deviceToken?: string };
    if (!body.deviceToken) return c.json({ error: "deviceToken required" }, 400);
    const state = apnsState(store);
    const device = state.devices[body.deviceToken] ?? { token: body.deviceToken, topic: "", status: "registered" as const };
    device.status = "unregistered";
    state.devices[body.deviceToken] = device;
    saveApnsState(store, state);
    return c.json(device);
  });

  app.post("/apns/control/set-device-status", async (c) => {
    const body = await c.req.json().catch(() => ({})) as { deviceToken?: string; status?: APNSDevice["status"] };
    if (!body.deviceToken || !body.status) return c.json({ error: "deviceToken and status required" }, 400);
    const state = apnsState(store);
    const device = state.devices[body.deviceToken];
    if (!device) return c.json({ error: "device not registered" }, 404);
    device.status = body.status;
    saveApnsState(store, state);
    const flushed = body.status === "registered" ? flushPendingDeliveries(store, body.deviceToken) : [];
    return c.json({ device, flushed });
  });

  app.post("/apns/control/throttle", async (c) => {
    const body = await c.req.json().catch(() => ({})) as { key?: string; enabled?: boolean };
    if (!body.key) return c.json({ error: "key required" }, 400);
    const state = apnsState(store);
    if (body.enabled === false) delete state.throttles[body.key];
    else state.throttles[body.key] = true;
    saveApnsState(store, state);
    return c.json({ key: body.key, enabled: state.throttles[body.key] === true });
  });

  app.post("/apns/control/flush-pending", async (c) => {
    const body = await c.req.json().catch(() => ({})) as { deviceToken?: string };
    return c.json({ flushed: flushPendingDeliveries(store, body.deviceToken) });
  });

  app.post("/apns/control/fail", async (c) => {
    const body = await c.req.json().catch(() => ({})) as { deviceToken?: string; reason?: string; status?: number };
    if (!body.reason || !APNS_FAILURE_REASONS.has(body.reason)) return c.json({ error: "valid reason required" }, 400);
    const failures = apnsFailures(store);
    failures[body.deviceToken ?? "*"] = { reason: body.reason, status: body.status ?? 400 };
    store.setData("apple:apns-failures", failures);
    return c.json(failures);
  });

  app.post("/apns/control/reset", (c) => {
    store.setData("apple:apns-state", undefined);
    store.setData("apple:apns-deliveries", []);
    store.setData("apple:apns-last-delivery", null);
    store.setData("apple:apns-failures", {});
    store.setData("asc.apns_notifications", []);
    return c.json({ ok: true });
  });

  app.get("/inspect/apns/state", (c) => c.json(apnsState(store)));
  app.get("/inspect/apns/collapsed", (c) => c.json(apnsState(store).collapsed));
  app.get("/inspect/apns/pending", (c) => c.json(apnsState(store).pending));
  app.get("/inspect/apns/unregistered", (c) => c.json(Object.values(apnsState(store).devices).filter((device) => device.status === "unregistered")));
  app.get("/inspect/apns/deliveries", (c) => c.json(apnsDeliveries(store)));
  app.get("/inspect/apns/last-delivery", (c) => c.json(store.getData("apple:apns-last-delivery") ?? null));
  app.get("/inspect/apns/failures", (c) => c.json(apnsFailures(store)));
  app.get("/inspect/apns/notifications", (c) => {
    const limit = parseLimit(c.req.query("limit"));
    const token = c.req.query("token");
    const notifications = (store.getData<Array<{ token: string }>>("asc.apns_notifications") ?? [])
      .filter((notification) => !token || notification.token === token)
      .slice(0, limit);
    return c.json({ data: notifications, meta: { limit, total: notifications.length } });
  });
}
