import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import {
  Store,
  WebhookDispatcher,
  authMiddleware,
  createApiErrorHandler,
  createErrorHandler,
  type TokenMap,
} from "@api-emulator/core";
import { notionPlugin, seedFromConfig } from "../index.js";

const base = "http://localhost:4000";

function createTestApp() {
  const store = new Store();
  const webhooks = new WebhookDispatcher();
  const tokenMap: TokenMap = new Map();
  tokenMap.set("secret_test", { login: "user_default", id: 1, scopes: ["workspace"] });

  const app = new Hono();
  app.onError(createApiErrorHandler());
  app.use("*", createErrorHandler());
  app.use("*", authMiddleware(tokenMap));
  notionPlugin.register(app as any, store, webhooks, base, tokenMap);
  notionPlugin.seed?.(store, base);
  seedFromConfig(store, base, {
    databases: [{ id: "database_tasks", title: "Tasks" }],
    pages: [{ id: "page_task", title: "Task", parent: { type: "database_id", database_id: "database_tasks" } }],
  });

  return { app };
}

function authHeaders(): Record<string, string> {
  return { Authorization: "Bearer secret_test", "Content-Type": "application/json", "Notion-Version": "2022-06-28" };
}

describe("Notion plugin", () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp().app;
  });

  it("returns the current user", async () => {
    const res = await app.request(`${base}/v1/users/me`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.object).toBe("user");
    expect(body.id).toBe("user_default");
  });

  it("searches pages and databases", async () => {
    const res = await app.request(`${base}/v1/search`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ query: "task" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.object).toBe("list");
    expect(body.results.length).toBeGreaterThan(0);
  });

  it("creates and updates a page", async () => {
    const createRes = await app.request(`${base}/v1/pages`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        parent: { type: "database_id", database_id: "database_tasks" },
        properties: { Name: { title: [{ type: "text", text: { content: "New task" }, plain_text: "New task" }] } },
      }),
    });
    expect(createRes.status).toBe(200);
    const created = (await createRes.json()) as any;
    expect(created.object).toBe("page");

    const patchRes = await app.request(`${base}/v1/pages/${created.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ archived: true }),
    });
    expect(patchRes.status).toBe(200);
    const updated = (await patchRes.json()) as any;
    expect(updated.archived).toBe(true);
  });

  it("queries a database", async () => {
    const res = await app.request(`${base}/v1/databases/database_tasks/query`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ page_size: 10 }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.results.some((page: any) => page.id === "page_task")).toBe(true);
  });

  it("resolves and queries a data source", async () => {
    const databaseRes = await app.request(`${base}/v1/databases/database_tasks`, { headers: authHeaders() });
    expect(databaseRes.status).toBe(200);
    const database = (await databaseRes.json()) as any;
    expect(database.data_sources[0].id).toBe("data_source_database_tasks");

    const res = await app.request(`${base}/v1/data_sources/data_source_database_tasks/query`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ page_size: 10 }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.results.some((page: any) => page.id === "page_task")).toBe(true);
  });

  it("retrieves page markdown", async () => {
    const res = await app.request(`${base}/v1/pages/page_default/markdown`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.page_id).toBe("page_default");
    expect(body.markdown).toContain("Emulated page");
  });

  it("appends and lists block children", async () => {
    const appendRes = await app.request(`${base}/v1/blocks/page_default/children`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ children: [{ type: "paragraph", paragraph: { rich_text: [] } }] }),
    });
    expect(appendRes.status).toBe(200);

    const listRes = await app.request(`${base}/v1/blocks/page_default/children`, { headers: authHeaders() });
    expect(listRes.status).toBe(200);
    const body = (await listRes.json()) as any;
    expect(body.results).toHaveLength(1);
  });
});
