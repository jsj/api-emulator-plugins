import { describe, it, expect } from "vitest";
import { Store } from "@emulators/core";
import { Hono } from "hono";
import type { AppEnv } from "@emulators/core";
import { ascPlugin, seedFromConfig } from "../index.js";
import type { ReviewScenario } from "../entities.js";

function createTestApp(scenario: ReviewScenario = "approve", rejectionReasons: string[] = [], reviewerNotes?: string) {
  const app = new Hono<AppEnv>();
  const store = new Store();
  const baseUrl = "http://localhost:4000";

  // Seed scenario config
  store.setData<ReviewScenario>("asc.review_scenario", scenario);
  store.setData<string[]>("asc.rejection_reasons", rejectionReasons);
  store.setData<string | null>("asc.reviewer_notes", reviewerNotes ?? null);

  // Seed a test app
  seedFromConfig(store, baseUrl, {
    apps: [{ id: "123456789", name: "HN Sample", bundle_id: "com.example.hnsample" }],
    builds: [{ id: "build-001", app_id: "123456789", version: "42", processing_state: "VALID" }],
    versions: [{ id: "version-001", app_id: "123456789", version_string: "1.0.0", platform: "IOS" }],
  });

  // Register plugin routes (pass empty webhooks)
  const webhooks = { dispatch: () => {}, subscribe: () => () => {} } as never;
  ascPlugin.register(app, store, webhooks, baseUrl);

  return { app, store };
}

describe("review submissions", () => {
  it("creates a submission in READY_FOR_REVIEW state", async () => {
    const { app } = createTestApp();

    const res = await app.request("/v1/reviewSubmissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          type: "reviewSubmissions",
          attributes: { platform: "IOS" },
          relationships: { app: { data: { type: "apps", id: "123456789" } } },
        },
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.type).toBe("reviewSubmissions");
    expect(json.data.attributes.state).toBe("READY_FOR_REVIEW");
    expect(json.data.attributes.platform).toBe("IOS");
  });

  it("approve scenario: submit transitions to COMPLETE", async () => {
    const { app } = createTestApp("approve");

    // Create
    const createRes = await app.request("/v1/reviewSubmissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          type: "reviewSubmissions",
          attributes: { platform: "IOS" },
          relationships: { app: { data: { type: "apps", id: "123456789" } } },
        },
      }),
    });
    const created = await createRes.json();
    const id = created.data.id;

    // Submit for review
    const submitRes = await app.request(`/v1/reviewSubmissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          type: "reviewSubmissions",
          id,
          attributes: { state: "WAITING_FOR_REVIEW" },
        },
      }),
    });

    expect(submitRes.status).toBe(200);
    const submitted = await submitRes.json();
    expect(submitted.data.attributes.state).toBe("COMPLETE");
    expect(submitted.data.attributes.submittedDate).toBeTruthy();
  });

  it("reject scenario: submit transitions to UNRESOLVED_ISSUES with reasons", async () => {
    const { app } = createTestApp("reject", ["METADATA_REJECTED"], "Description does not match");

    // Create
    const createRes = await app.request("/v1/reviewSubmissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          type: "reviewSubmissions",
          attributes: { platform: "IOS" },
          relationships: { app: { data: { type: "apps", id: "123456789" } } },
        },
      }),
    });
    const created = await createRes.json();
    const id = created.data.id;

    // Submit
    const submitRes = await app.request(`/v1/reviewSubmissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { type: "reviewSubmissions", id, attributes: { state: "WAITING_FOR_REVIEW" } },
      }),
    });

    expect(submitRes.status).toBe(200);
    const submitted = await submitRes.json();
    expect(submitted.data.attributes.state).toBe("UNRESOLVED_ISSUES");
    expect(submitted.data.attributes.rejectionReasons).toEqual(["METADATA_REJECTED"]);
    expect(submitted.data.attributes.reviewerNotes).toBe("Description does not match");
  });

  it("timeout scenario: submit transitions to IN_REVIEW", async () => {
    const { app } = createTestApp("timeout");

    const createRes = await app.request("/v1/reviewSubmissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          type: "reviewSubmissions",
          attributes: { platform: "IOS" },
          relationships: { app: { data: { type: "apps", id: "123456789" } } },
        },
      }),
    });
    const created = await createRes.json();
    const id = created.data.id;

    const submitRes = await app.request(`/v1/reviewSubmissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { type: "reviewSubmissions", id, attributes: { state: "WAITING_FOR_REVIEW" } },
      }),
    });

    expect(submitRes.status).toBe(200);
    const submitted = await submitRes.json();
    expect(submitted.data.attributes.state).toBe("IN_REVIEW");
  });

  it("resubmit after rejection transitions based on scenario", async () => {
    const { app, store } = createTestApp("reject", ["METADATA_REJECTED"]);

    // Create + submit (rejected)
    const createRes = await app.request("/v1/reviewSubmissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          type: "reviewSubmissions",
          attributes: { platform: "IOS" },
          relationships: { app: { data: { type: "apps", id: "123456789" } } },
        },
      }),
    });
    const created = await createRes.json();
    const id = created.data.id;

    await app.request(`/v1/reviewSubmissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { type: "reviewSubmissions", id, attributes: { state: "WAITING_FOR_REVIEW" } },
      }),
    });

    // Switch scenario to approve and resubmit
    store.setData("asc.review_scenario", "approve");

    const resubmitRes = await app.request(`/v1/reviewSubmissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { type: "reviewSubmissions", id, attributes: { state: "WAITING_FOR_REVIEW" } },
      }),
    });

    expect(resubmitRes.status).toBe(200);
    const resubmitted = await resubmitRes.json();
    expect(resubmitted.data.attributes.state).toBe("COMPLETE");
  });

  it("cancel deletes the submission", async () => {
    const { app } = createTestApp();

    const createRes = await app.request("/v1/reviewSubmissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          type: "reviewSubmissions",
          attributes: { platform: "IOS" },
          relationships: { app: { data: { type: "apps", id: "123456789" } } },
        },
      }),
    });
    const created = await createRes.json();
    const id = created.data.id;

    const deleteRes = await app.request(`/v1/reviewSubmissions/${id}`, { method: "DELETE" });
    expect(deleteRes.status).toBe(204);

    const getRes = await app.request(`/v1/reviewSubmissions/${id}`);
    expect(getRes.status).toBe(404);
  });

  it("list filters by app ID", async () => {
    const { app } = createTestApp();

    // Create two submissions for different apps
    await app.request("/v1/reviewSubmissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          type: "reviewSubmissions",
          attributes: { platform: "IOS" },
          relationships: { app: { data: { type: "apps", id: "123456789" } } },
        },
      }),
    });
    await app.request("/v1/reviewSubmissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          type: "reviewSubmissions",
          attributes: { platform: "IOS" },
          relationships: { app: { data: { type: "apps", id: "other-app" } } },
        },
      }),
    });

    const listRes = await app.request("/v1/reviewSubmissions?filter[app]=123456789");
    const list = await listRes.json();
    expect(list.data).toHaveLength(1);
  });

  it("rejects submit from invalid state", async () => {
    const { app } = createTestApp("approve");

    // Create and submit (goes to COMPLETE)
    const createRes = await app.request("/v1/reviewSubmissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          type: "reviewSubmissions",
          attributes: { platform: "IOS" },
          relationships: { app: { data: { type: "apps", id: "123456789" } } },
        },
      }),
    });
    const created = await createRes.json();
    const id = created.data.id;

    await app.request(`/v1/reviewSubmissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { type: "reviewSubmissions", id, attributes: { state: "WAITING_FOR_REVIEW" } },
      }),
    });

    // Try to submit again from COMPLETE state
    const resubmitRes = await app.request(`/v1/reviewSubmissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { type: "reviewSubmissions", id, attributes: { state: "WAITING_FOR_REVIEW" } },
      }),
    });

    expect(resubmitRes.status).toBe(409);
  });
});
