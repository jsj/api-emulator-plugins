import type { RouteContext } from "@api-emulator/core";

interface CKRecord {
  recordName: string;
  recordType: string;
  fields: Record<string, unknown>;
  zoneID?: Record<string, unknown>;
  created?: Record<string, unknown>;
  modified?: Record<string, unknown>;
  deleted?: boolean;
}

interface CKZone {
  zoneID: { zoneName: string; ownerRecordName?: string };
  syncToken?: string;
}

interface CKSubscription {
  subscriptionID: string;
  subscriptionType?: string;
  recordType?: string;
  zoneID?: Record<string, unknown>;
  firesOn?: string[];
}

const now = () => new Date().toISOString();
const token = () => `ck-${Math.random().toString(36).slice(2, 12)}`;

function recordKey(container: string, environment: string, database: string) {
  return `icloud.cloudkit.${container}.${environment}.${database}.records`;
}

function zoneKey(container: string, environment: string, database: string) {
  return `icloud.cloudkit.${container}.${environment}.${database}.zones`;
}

function subscriptionKey(container: string, environment: string, database: string) {
  return `icloud.cloudkit.${container}.${environment}.${database}.subscriptions`;
}

function getArray<T>(store: RouteContext["store"], key: string): T[] {
  let items = store.getData<T[]>(key);
  if (!items) {
    items = [];
    store.setData(key, items);
  }
  return items;
}

function normalizeRecord(input: Partial<CKRecord>): CKRecord {
  const timestamp = now();
  return {
    recordName: input.recordName ?? token(),
    recordType: input.recordType ?? "Item",
    fields: input.fields ?? {},
    zoneID: input.zoneID,
    created: input.created ?? { timestamp },
    modified: { timestamp },
  };
}

export function cloudKitRoutes({ app, store }: RouteContext): void {
  app.get("/database/1/:container/:environment/:database/users/current", (c) =>
    c.json({ userRecordName: "_defaultUser", firstName: "Test", lastName: "User" }),
  );

  app.post("/database/1/:container/:environment/:database/records/lookup", async (c) => {
    const { container, environment, database } = c.req.param();
    const body = await c.req.json().catch(() => ({}));
    const records = getArray<CKRecord>(store, recordKey(container, environment, database));
    const requested = Array.isArray(body.records) ? body.records : [];
    return c.json({
      records: requested.map((r: { recordName?: string }) => {
        const found = records.find((record) => record.recordName === r.recordName && !record.deleted);
        return found ?? { recordName: r.recordName, serverErrorCode: "NOT_FOUND" };
      }),
    });
  });

  app.post("/database/1/:container/:environment/:database/records/query", async (c) => {
    const { container, environment, database } = c.req.param();
    const body = await c.req.json().catch(() => ({}));
    const records = getArray<CKRecord>(store, recordKey(container, environment, database)).filter((record) => !record.deleted);
    const recordType = body.query?.recordType;
    const filtered = recordType ? records.filter((record) => record.recordType === recordType) : records;
    const limit = Math.max(1, Math.min(Number(body.resultsLimit ?? 200), 200));
    return c.json({ records: filtered.slice(0, limit) });
  });

  app.post("/database/1/:container/:environment/:database/records/modify", async (c) => {
    const { container, environment, database } = c.req.param();
    const body = await c.req.json().catch(() => ({}));
    const records = getArray<CKRecord>(store, recordKey(container, environment, database));
    const operations = Array.isArray(body.operations) ? body.operations : [];

    const results = operations.map((op: { operationType?: string; record?: Partial<CKRecord>; recordName?: string }) => {
      if (op.operationType === "delete") {
        const name = op.recordName ?? op.record?.recordName;
        const idx = records.findIndex((record) => record.recordName === name);
        if (idx === -1) return { recordName: name, serverErrorCode: "NOT_FOUND" };
        const [deleted] = records.splice(idx, 1);
        return { recordName: deleted.recordName, deleted: true };
      }

      const next = normalizeRecord(op.record ?? {});
      const idx = records.findIndex((record) => record.recordName === next.recordName);
      if (idx === -1) {
        records.push(next);
      } else {
        records[idx] = { ...records[idx], ...next, created: records[idx].created };
      }
      return idx === -1 ? next : records[idx];
    });

    store.setData(recordKey(container, environment, database), records);
    return c.json({ records: results });
  });

  app.post("/database/1/:container/:environment/:database/zones/list", (c) => {
    const { container, environment, database } = c.req.param();
    const zones = getArray<CKZone>(store, zoneKey(container, environment, database));
    if (zones.length === 0) zones.push({ zoneID: { zoneName: "_defaultZone" }, syncToken: token() });
    return c.json({ zones });
  });

  app.post("/database/1/:container/:environment/:database/zones/modify", async (c) => {
    const { container, environment, database } = c.req.param();
    const body = await c.req.json().catch(() => ({}));
    const zones = getArray<CKZone>(store, zoneKey(container, environment, database));
    const operations = Array.isArray(body.operations) ? body.operations : [];
    const results = operations.map((op: { operationType?: string; zone?: CKZone; zoneID?: CKZone["zoneID"] }) => {
      const zoneID = op.zone?.zoneID ?? op.zoneID;
      const zoneName = zoneID?.zoneName;
      if (!zoneName) return { serverErrorCode: "BAD_REQUEST" };
      const idx = zones.findIndex((zone) => zone.zoneID.zoneName === zoneName);
      if (op.operationType === "delete") {
        if (idx !== -1) zones.splice(idx, 1);
        return { zoneID, deleted: true };
      }
      const zone = { zoneID, syncToken: token() };
      if (idx === -1) zones.push(zone);
      else zones[idx] = zone;
      return zone;
    });
    store.setData(zoneKey(container, environment, database), zones);
    return c.json({ zones: results });
  });

  app.post("/database/1/:container/:environment/:database/subscriptions/list", (c) => {
    const { container, environment, database } = c.req.param();
    return c.json({ subscriptions: getArray<CKSubscription>(store, subscriptionKey(container, environment, database)) });
  });

  app.post("/database/1/:container/:environment/:database/subscriptions/modify", async (c) => {
    const { container, environment, database } = c.req.param();
    const body = await c.req.json().catch(() => ({}));
    const subscriptions = getArray<CKSubscription>(store, subscriptionKey(container, environment, database));
    const operations = Array.isArray(body.operations) ? body.operations : [];
    const results = operations.map((op: { operationType?: string; subscription?: CKSubscription; subscriptionID?: string }) => {
      const id = op.subscription?.subscriptionID ?? op.subscriptionID;
      if (!id) return { serverErrorCode: "BAD_REQUEST" };
      const idx = subscriptions.findIndex((subscription) => subscription.subscriptionID === id);
      if (op.operationType === "delete") {
        if (idx !== -1) subscriptions.splice(idx, 1);
        return { subscriptionID: id, deleted: true };
      }
      const subscription = { ...op.subscription, subscriptionID: id };
      if (idx === -1) subscriptions.push(subscription);
      else subscriptions[idx] = subscription;
      return subscription;
    });
    store.setData(subscriptionKey(container, environment, database), subscriptions);
    return c.json({ subscriptions: results });
  });
}
