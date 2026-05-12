import { describe, it, expect } from "vitest";
import { Store } from "@emulators/core";
import { Hono } from "hono";
import type { AppEnv } from "@emulators/core";
import { ascPlugin, seedFromConfig } from "../index.js";

function createTestApp() {
  const app = new Hono<AppEnv>();
  const store = new Store();
  const baseUrl = "http://localhost:4000";

  seedFromConfig(store, baseUrl, {
    apps: [{ id: "123456789", name: "Test App", bundle_id: "com.example.test" }],
    builds: [{ id: "build-001", app_id: "123456789", version: "42" }],
    versions: [{ id: "version-001", app_id: "123456789", version_string: "1.0.0" }],
  });

  // Seed CI data
  store.setData("asc.ci_products", [
    { id: "prod-1", name: "Test App", product_type: "APP" },
  ]);
  store.setData("asc.ci_workflows", [
    { id: "wf-1", product_id: "prod-1", name: "CI", description: null, is_enabled: true, is_locked_for_editing: false },
  ]);

  // Seed TestFlight data
  store.setData("asc.beta_groups", [
    { id: "bg-1", app_id: "123456789", name: "Internal", is_internal_group: true, public_link_enabled: false, created_date: null },
  ]);
  store.setData("asc.beta_testers", [
    { id: "bt-1", email: "tester@example.com", first_name: "Test", last_name: "User", invite_type: null, state: null },
  ]);

  // Seed users
  store.setData("asc.users", [
    { id: "user-1", email: "admin@example.com", first_name: "Admin", last_name: "User", roles: ["ADMIN"] },
  ]);

  const webhooks = { dispatch: () => {}, subscribe: () => () => {} } as never;
  ascPlugin.register(app, store, webhooks, baseUrl);

  return { app, store };
}

describe("smoke tests", () => {
  it("lists CI products", async () => {
    const { app } = createTestApp();
    const res = await app.request("/v1/ciProducts");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].attributes.name).toBe("Test App");
  });

  it("lists workflows for a product", async () => {
    const { app } = createTestApp();
    const res = await app.request("/v1/ciProducts/prod-1/workflows");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].attributes.name).toBe("CI");
  });

  it("triggers a build run", async () => {
    const { app } = createTestApp();
    const res = await app.request("/v1/ciBuildRuns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          type: "ciBuildRuns",
          relationships: { workflow: { data: { type: "ciWorkflows", id: "wf-1" } } },
        },
      }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.attributes.executionProgress).toBe("COMPLETE");
    expect(json.data.attributes.completionStatus).toBe("SUCCEEDED");
  });

  it("lists beta groups", async () => {
    const { app } = createTestApp();
    const res = await app.request("/v1/betaGroups");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].attributes.name).toBe("Internal");
  });

  it("lists beta testers", async () => {
    const { app } = createTestApp();
    const res = await app.request("/v1/betaTesters");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].attributes.email).toBe("tester@example.com");
  });

  it("creates a beta group", async () => {
    const { app } = createTestApp();
    const res = await app.request("/v1/betaGroups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          type: "betaGroups",
          attributes: { name: "External", isInternalGroup: false, publicLinkEnabled: true },
          relationships: { app: { data: { type: "apps", id: "123456789" } } },
        },
      }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.attributes.name).toBe("External");
  });

  it("lists users", async () => {
    const { app } = createTestApp();
    const res = await app.request("/v1/users");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].attributes.email).toBe("admin@example.com");
  });

  it("uploads an IPA", async () => {
    const { app } = createTestApp();
    const res = await app.request("/v1/builds/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appId: "123456789",
        fileName: "App.ipa",
        fileSize: 1024,
        version: "1.2.3",
        buildNumber: "45",
        platform: "IOS",
      }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.fileName).toBe("App.ipa");
    expect(json.version).toBe("1.2.3");
  });

  it("returns build actions for a run", async () => {
    const { app } = createTestApp();
    const res = await app.request("/v1/ciBuildRuns/run-1/actions");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].attributes.actionType).toBe("BUILD");
  });

  it("returns macOS and Xcode versions", async () => {
    const { app } = createTestApp();
    const [macRes, xcodeRes] = await Promise.all([
      app.request("/v1/ciMacOsVersions"),
      app.request("/v1/ciXcodeVersions"),
    ]);
    expect(macRes.status).toBe(200);
    expect(xcodeRes.status).toBe(200);
    const mac = await macRes.json();
    const xcode = await xcodeRes.json();
    expect(mac.data[0].attributes.name).toBe("macOS Sonoma");
    expect(xcode.data[0].attributes.name).toBe("Xcode 15");
  });

  it("beta build localization CRUD", async () => {
    const { app } = createTestApp();

    // Create
    const createRes = await app.request("/v1/betaBuildLocalizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          type: "betaBuildLocalizations",
          attributes: { locale: "en-US", whatsNew: "Bug fixes" },
          relationships: { build: { data: { type: "builds", id: "build-001" } } },
        },
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    const locId = created.data.id;

    // Update
    const updateRes = await app.request(`/v1/betaBuildLocalizations/${locId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { type: "betaBuildLocalizations", id: locId, attributes: { whatsNew: "Major improvements" } },
      }),
    });
    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.data.attributes.whatsNew).toBe("Major improvements");

    // List
    const listRes = await app.request("/v1/builds/build-001/betaBuildLocalizations");
    expect(listRes.status).toBe(200);
    const list = await listRes.json();
    expect(list.data).toHaveLength(1);

    // Delete
    const deleteRes = await app.request(`/v1/betaBuildLocalizations/${locId}`, { method: "DELETE" });
    expect(deleteRes.status).toBe(204);
  });

  it("customer review response lifecycle", async () => {
    const { app, store } = createTestApp();

    // Seed a customer review
    store.setData("asc.customer_reviews", [
      { id: "review-1", rating: 5, title: "Great app", body: "Love it", reviewer_nickname: "User1", territory: "USA", created_date: "2026-01-01T00:00:00Z" },
    ]);

    // List reviews
    const listRes = await app.request("/v1/apps/123456789/customerReviews");
    expect(listRes.status).toBe(200);
    const list = await listRes.json();
    expect(list.data).toHaveLength(1);
    expect(list.data[0].attributes.rating).toBe(5);

    // Create response
    const createRes = await app.request("/v1/customerReviewResponses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          type: "customerReviewResponses",
          attributes: { responseBody: "Thanks for your feedback!" },
          relationships: { review: { data: { type: "customerReviews", id: "review-1" } } },
        },
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.data.attributes.responseBody).toBe("Thanks for your feedback!");

    // Delete response
    const deleteRes = await app.request(`/v1/customerReviewResponses/${created.data.id}`, { method: "DELETE" });
    expect(deleteRes.status).toBe(204);
  });
});
