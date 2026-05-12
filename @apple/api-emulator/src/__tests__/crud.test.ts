import { describe, it, expect } from "vitest";
import { Store } from "@emulators/core";
import { Hono } from "hono";
import type { AppEnv } from "@emulators/core";
import { ascPlugin, seedFromConfig } from "../index.js";

function createTestApp() {
  const app = new Hono<AppEnv>();
  const store = new Store();
  const baseUrl = "http://localhost:4000";
  const webhooks = { dispatch: () => {}, subscribe: () => () => {} } as never;
  ascPlugin.register(app, store, webhooks, baseUrl);
  return { app, store };
}

describe("CRUD-backed services", () => {
  it("certificates: create, list, get, delete", async () => {
    const { app } = createTestApp();

    // Create
    const createRes = await app.request("/v1/certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { type: "certificates", attributes: { certificateType: "IOS_DISTRIBUTION", displayName: "My Cert" } },
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    const certId = created.data.id;
    expect(created.data.attributes.certificateType).toBe("IOS_DISTRIBUTION");

    // List
    const listRes = await app.request("/v1/certificates");
    expect(listRes.status).toBe(200);
    const list = await listRes.json();
    expect(list.data).toHaveLength(1);

    // Get
    const getRes = await app.request(`/v1/certificates/${certId}`);
    expect(getRes.status).toBe(200);
    const got = await getRes.json();
    expect(got.data.attributes.displayName).toBe("My Cert");

    // Delete
    const delRes = await app.request(`/v1/certificates/${certId}`, { method: "DELETE" });
    expect(delRes.status).toBe(204);

    // Verify gone
    const listRes2 = await app.request("/v1/certificates");
    const list2 = await listRes2.json();
    expect(list2.data).toHaveLength(0);
  });

  it("devices: register and list", async () => {
    const { app } = createTestApp();

    const createRes = await app.request("/v1/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          type: "devices",
          attributes: { name: "iPhone 15", udid: "ABC123", platform: "IOS", status: "ENABLED" },
        },
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.data.attributes.name).toBe("iPhone 15");
    expect(created.data.attributes.udid).toBe("ABC123");

    const listRes = await app.request("/v1/devices");
    const list = await listRes.json();
    expect(list.data).toHaveLength(1);
  });

  it("subscriptionGroups: CRUD with nested subscriptions", async () => {
    const { app, store } = createTestApp();

    // Create group
    const groupRes = await app.request("/v1/subscriptionGroups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { type: "subscriptionGroups", attributes: { referenceName: "Premium" } },
      }),
    });
    expect(groupRes.status).toBe(201);
    const group = await groupRes.json();
    const groupId = group.data.id;

    // Create subscription in the group
    const subRes = await app.request("/v1/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          type: "subscriptions",
          attributes: { name: "Monthly", productId: "com.example.monthly", subscriptionPeriod: "ONE_MONTH" },
          relationships: { subscriptionGroup: { data: { type: "subscriptionGroups", id: groupId } } },
        },
      }),
    });
    expect(subRes.status).toBe(201);
    const sub = await subRes.json();
    expect(sub.data.attributes.name).toBe("Monthly");

    // List subscriptions in group
    const listRes = await app.request(`/v1/subscriptionGroups/${groupId}/subscriptions`);
    expect(listRes.status).toBe(200);
    const list = await listRes.json();
    expect(list.data).toHaveLength(1);

    // Delete subscription
    const delRes = await app.request(`/v1/subscriptions/${sub.data.id}`, { method: "DELETE" });
    expect(delRes.status).toBe(204);

    // Delete group
    const delGroupRes = await app.request(`/v1/subscriptionGroups/${groupId}`, { method: "DELETE" });
    expect(delGroupRes.status).toBe(204);
  });

  it("nested lists only match the configured parent field", async () => {
    const { app } = createTestApp();

    const matchingGroupRes = await app.request("/v1/subscriptionGroups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { type: "subscriptionGroups", attributes: { referenceName: "Matching" } },
      }),
    });
    const matchingGroup = await matchingGroupRes.json();

    const unrelatedGroupRes = await app.request("/v1/subscriptionGroups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { type: "subscriptionGroups", attributes: { referenceName: "Unrelated" } },
      }),
    });
    const unrelatedGroup = await unrelatedGroupRes.json();

    await app.request("/v1/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          type: "subscriptions",
          attributes: { name: "Monthly", productId: "com.example.monthly", subscriptionPeriod: "ONE_MONTH" },
          relationships: {
            subscriptionGroup: { data: { type: "subscriptionGroups", id: matchingGroup.data.id } },
            app: { data: { type: "apps", id: unrelatedGroup.data.id } },
          },
        },
      }),
    });

    const matchingListRes = await app.request(`/v1/subscriptionGroups/${matchingGroup.data.id}/subscriptions`);
    const matchingList = await matchingListRes.json();
    expect(matchingList.data).toHaveLength(1);

    const unrelatedListRes = await app.request(`/v1/subscriptionGroups/${unrelatedGroup.data.id}/subscriptions`);
    const unrelatedList = await unrelatedListRes.json();
    expect(unrelatedList.data).toHaveLength(0);
  });

  it("profiles: create and update", async () => {
    const { app } = createTestApp();

    const createRes = await app.request("/v1/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          type: "profiles",
          attributes: { name: "Dev Profile", profileType: "IOS_APP_DEVELOPMENT", profileState: "ACTIVE" },
        },
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    const profileId = created.data.id;

    // Update
    const updateRes = await app.request(`/v1/profiles/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { type: "profiles", id: profileId, attributes: { name: "Updated Profile" } },
      }),
    });
    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.data.attributes.name).toBe("Updated Profile");
    // Untouched fields preserved
    expect(updated.data.attributes.profileType).toBe("IOS_APP_DEVELOPMENT");
  });

  it("gameCenterAchievements: CRUD", async () => {
    const { app } = createTestApp();

    const createRes = await app.request("/v1/gameCenterAchievements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          type: "gameCenterAchievements",
          attributes: {
            referenceName: "First Win",
            vendorIdentifier: "com.example.firstwin",
            points: 10,
            showBeforeEarned: true,
            repeatable: false,
          },
        },
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.data.attributes.referenceName).toBe("First Win");
    expect(created.data.attributes.points).toBe(10);

    // Get
    const getRes = await app.request(`/v1/gameCenterAchievements/${created.data.id}`);
    expect(getRes.status).toBe(200);

    // Delete
    const delRes = await app.request(`/v1/gameCenterAchievements/${created.data.id}`, { method: "DELETE" });
    expect(delRes.status).toBe(204);
  });

  it("appEvents: nested under app", async () => {
    const { app, store } = createTestApp();

    // Seed an event via store (simulating admin seed)
    store.setData("asc.crud.appEvents", [
      { asc_id: "evt-1", app_id: "app-1", referenceName: "Launch Day", badge: "NEW", reference_name: "Launch Day" },
      { asc_id: "evt-2", app_id: "app-2", referenceName: "Other", reference_name: "Other" },
    ]);

    // List events for app-1
    const listRes = await app.request("/v1/apps/app-1/appEvents");
    expect(listRes.status).toBe(200);
    const list = await listRes.json();
    expect(list.data).toHaveLength(1);
    expect(list.data[0].id).toBe("evt-1");
  });

  it("notary submissions", async () => {
    const { app } = createTestApp();

    const createRes = await app.request("/notary/v2/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { type: "submissions", attributes: { sha256: "abc123", submissionName: "MyApp.dmg" } },
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    const subId = created.data.id;

    const getRes = await app.request(`/notary/v2/submissions/${subId}`);
    expect(getRes.status).toBe(200);

    const listRes = await app.request("/notary/v2/submissions");
    const list = await listRes.json();
    expect(list.data).toHaveLength(1);
  });

  it("admin reset clears CRUD data", async () => {
    const { app } = createTestApp();

    // Create some data
    await app.request("/v1/certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { type: "certificates", attributes: { certificateType: "IOS_DISTRIBUTION" } },
      }),
    });
    await app.request("/v1/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { type: "devices", attributes: { name: "Test", udid: "123", platform: "IOS" } },
      }),
    });

    // Verify data exists
    let certs = await (await app.request("/v1/certificates")).json();
    expect(certs.data).toHaveLength(1);

    // Reset
    const resetRes = await app.request("/_admin/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(resetRes.status).toBe(200);

    // Verify cleared
    certs = await (await app.request("/v1/certificates")).json();
    expect(certs.data).toHaveLength(0);
    const devices = await (await app.request("/v1/devices")).json();
    expect(devices.data).toHaveLength(0);
  });
});
