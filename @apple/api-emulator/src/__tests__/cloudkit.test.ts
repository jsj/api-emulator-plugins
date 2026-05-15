import { describe, expect, it } from "vitest";
import { Store } from "@api-emulator/core";
import { Hono } from "hono";
import type { AppEnv } from "@api-emulator/core";
import { plugin } from "../index.js";

function createCloudKitApp() {
  const app = new Hono<AppEnv>();
  const store = new Store();
  const webhooks = { dispatch: () => {}, subscribe: () => () => {} } as never;
  plugin.register(app, store, webhooks, "http://localhost:4000");
  return app;
}

describe("CloudKit Web Services", () => {
  const base = "/database/1/iCloud.com.example.app/development/public";

  it("creates, queries, looks up, and deletes records", async () => {
    const app = createCloudKitApp();

    const createRes = await app.request(`${base}/records/modify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operations: [
          {
            operationType: "create",
            record: {
              recordName: "note-1",
              recordType: "Note",
              fields: { title: { value: "Hello" } },
            },
          },
        ],
      }),
    });
    expect(createRes.status).toBe(200);
    const created = await createRes.json();
    expect(created.records[0].recordName).toBe("note-1");

    const queryRes = await app.request(`${base}/records/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: { recordType: "Note" } }),
    });
    expect(queryRes.status).toBe(200);
    const queried = await queryRes.json();
    expect(queried.records).toHaveLength(1);
    expect(queried.records[0].fields.title.value).toBe("Hello");

    const lookupRes = await app.request(`${base}/records/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: [{ recordName: "note-1" }] }),
    });
    const lookedUp = await lookupRes.json();
    expect(lookedUp.records[0].recordType).toBe("Note");

    const deleteRes = await app.request(`${base}/records/modify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operations: [{ operationType: "delete", recordName: "note-1" }] }),
    });
    const deleted = await deleteRes.json();
    expect(deleted.records[0]).toMatchObject({ recordName: "note-1", deleted: true });
  });

  it("manages zones and subscriptions", async () => {
    const app = createCloudKitApp();

    const zoneRes = await app.request(`${base}/zones/modify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operations: [{ operationType: "create", zone: { zoneID: { zoneName: "private-notes" } } }] }),
    });
    expect(zoneRes.status).toBe(200);
    const zone = await zoneRes.json();
    expect(zone.zones[0].zoneID.zoneName).toBe("private-notes");

    const subRes = await app.request(`${base}/subscriptions/modify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operations: [
          {
            operationType: "create",
            subscription: { subscriptionID: "sub-1", subscriptionType: "query", recordType: "Note", firesOn: ["create"] },
          },
        ],
      }),
    });
    expect(subRes.status).toBe(200);

    const listRes = await app.request(`${base}/subscriptions/list`, { method: "POST" });
    const list = await listRes.json();
    expect(list.subscriptions[0].subscriptionID).toBe("sub-1");
  });

  it("returns the current CloudKit user", async () => {
    const app = createCloudKitApp();
    const res = await app.request(`${base}/users/current`);
    expect(res.status).toBe(200);
    const user = await res.json();
    expect(user.userRecordName).toBe("_defaultUser");
  });
});
