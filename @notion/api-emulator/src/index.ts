import type { Hono } from "hono";
import type { AppEnv, RouteContext, ServicePlugin, Store, TokenMap, WebhookDispatcher } from "@api-emulator/core";
import { getNotionStore } from "./store.js";
import type {
  NotionBlock,
  NotionDatabase,
  NotionPage,
  NotionParent,
  NotionRichText,
  NotionUser,
  NotionWorker,
} from "./entities.js";

export { getNotionStore, type NotionStore } from "./store.js";
export * from "./entities.js";

export interface NotionSeedConfig {
  port?: number;
  users?: Array<{ id?: string; name: string; email?: string; type?: "person" | "bot" }>;
  pages?: Array<{ id?: string; title: string; parent?: NotionParent; properties?: Record<string, unknown> }>;
  databases?: Array<{ id?: string; title: string; parent?: NotionParent; properties?: Record<string, unknown> }>;
}

function now(): string {
  return new Date().toISOString();
}

function notionId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function uuid(): string {
  const hex = "0123456789abcdef";
  const chars = Array.from({ length: 36 }, (_, i) => {
    if ([8, 13, 18, 23].includes(i)) return "-";
    if (i === 14) return "4";
    if (i === 19) return hex[(Math.random() * 4) | 8];
    return hex[(Math.random() * 16) | 0];
  });
  return chars.join("");
}

function richText(content: string): NotionRichText {
  return [{ type: "text", text: { content, link: null }, plain_text: content, href: null }];
}

function titleProperty(title: string): Record<string, unknown> {
  return { title: { id: "title", type: "title", title: richText(title) } };
}

function databaseDataSourceId(databaseId: string): string {
  return `data_source_${databaseId}`;
}

function databaseFromDataSourceId(dataSourceId: string): string {
  return dataSourceId.startsWith("data_source_") ? dataSourceId.slice("data_source_".length) : dataSourceId;
}

function normalizeParent(parent: any): NotionParent {
  if (parent?.data_source_id) return { type: "database_id", database_id: databaseFromDataSourceId(String(parent.data_source_id)) };
  if (parent?.database_id && !parent.type) return { type: "database_id", database_id: String(parent.database_id) };
  if (parent?.page_id && !parent.type) return { type: "page_id", page_id: String(parent.page_id) };
  return (parent as NotionParent | undefined) ?? { type: "workspace", workspace: true };
}

function titleFromMarkdown(markdown: unknown): string {
  const text = String(markdown ?? "").trim();
  const heading = text.split("\n").find((line) => line.startsWith("# "));
  return heading?.replace(/^#\s+/, "").trim() || "Untitled";
}

function paginate<T>(items: T[], startCursor?: string | null, pageSize = 100) {
  const start = startCursor ? Math.max(0, Number.parseInt(startCursor, 10) || 0) : 0;
  const end = start + Math.min(Math.max(pageSize, 1), 100);
  return {
    object: "list",
    results: items.slice(start, end),
    next_cursor: end < items.length ? String(end) : null,
    has_more: end < items.length,
  };
}

function toNotionObject<T extends { notion_id: string }>(entity: T | undefined): (Omit<T, "notion_id"> & { id: string }) | undefined {
  if (!entity) return undefined;
  const { notion_id, ...rest } = entity;
  return { ...rest, id: notion_id };
}

function toNotionDatabase(database: NotionDatabase | undefined) {
  const result = toNotionObject(database);
  if (!result) return undefined;
  return {
    ...result,
    data_sources: [
      {
        id: databaseDataSourceId(result.id),
        name: result.title?.[0]?.plain_text ?? "Default",
      },
    ],
  };
}

function toWorkerResponse(worker: NotionWorker | undefined) {
  if (!worker) return undefined;
  return {
    workerId: worker.worker_id,
    id: worker.worker_id,
    workspaceId: worker.workspace_id,
    spaceId: worker.workspace_id,
    name: worker.name,
    status: worker.status,
    createdTime: worker.created_time,
    createdAt: worker.created_time,
    updatedTime: worker.updated_time,
    updatedAt: worker.updated_time,
    url: `https://www.notion.so/workers/${worker.worker_id}`,
    fields: {},
    capabilities: worker.capabilities,
  };
}

function toNotionList<T extends { notion_id: string }>(items: T[]): Array<Omit<T, "notion_id"> & { id: string }> {
  return items.map((item) => toNotionObject(item)!);
}

function parsePaging(body: Record<string, unknown>, queryPageSize?: string, queryStartCursor?: string) {
  return {
    pageSize: Number(body.page_size ?? queryPageSize ?? 100),
    startCursor: (body.start_cursor ?? queryStartCursor ?? null) as string | null,
  };
}

function firstUser(store: Store): NotionUser {
  const ns = getNotionStore(store);
  const existing = ns.users.all()[0];
  if (existing) return existing;
  return ns.users.insert({
    object: "user",
    notion_id: "user_default",
    type: "person",
    name: "Notion User",
    avatar_url: null,
    person: { email: "user@api-emulator.jsj.sh" },
  });
}

function baseObject(store: Store) {
  const user = firstUser(store);
  const time = now();
  return {
    created_time: time,
    last_edited_time: time,
    created_by: { object: "user" as const, id: user.notion_id },
    last_edited_by: { object: "user" as const, id: user.notion_id },
  };
}

function createBlock(store: Store, parent: NotionParent, input: Record<string, unknown>): any {
  const type = typeof input.type === "string" ? input.type : "paragraph";
  return {
    object: "block",
    notion_id: notionId("block"),
    parent,
    type,
    ...baseObject(store),
    archived: false,
    has_children: Array.isArray(input.children) && input.children.length > 0,
    [type]: input[type] ?? {},
  };
}

function error(c: any, status: 400 | 404, message: string) {
  return c.json({ object: "error", status, code: status === 404 ? "object_not_found" : "validation_error", message }, status);
}

function seedDefaults(store: Store): void {
  const ns = getNotionStore(store);
  if (ns.users.all().length === 0) {
    ns.users.insert({
      object: "user",
      notion_id: "user_default",
      type: "person",
      name: "Notion User",
      avatar_url: null,
      person: { email: "user@api-emulator.jsj.sh" },
    });
  }
  if (ns.pages.all().length === 0) {
    const page = ns.pages.insert({
      object: "page",
      notion_id: "page_default",
      parent: { type: "workspace", workspace: true },
      ...baseObject(store),
      archived: false,
      in_trash: false,
      url: "https://www.notion.so/page_default",
      public_url: null,
      properties: titleProperty("Emulated page"),
    });
    ns.blocks.insert({
      object: "block",
      notion_id: page.notion_id,
      parent: page.parent,
      type: "child_page",
      ...baseObject(store),
      archived: false,
      has_children: false,
      child_page: { title: "Emulated page" },
    });
  }
}

export function seedFromConfig(store: Store, _baseUrl: string, config: NotionSeedConfig): void {
  const ns = getNotionStore(store);
  for (const u of config.users ?? []) {
    const id = u.id ?? notionId("user");
    if (ns.users.findOneBy("notion_id", id)) continue;
    ns.users.insert({
      object: "user",
      notion_id: id,
      type: u.type ?? "person",
      name: u.name,
      avatar_url: null,
      person: u.type === "bot" ? undefined : { email: u.email ?? `${u.name}@api-emulator.jsj.sh` },
      bot: u.type === "bot" ? {} : undefined,
    });
  }
  for (const p of config.pages ?? []) {
    const id = p.id ?? notionId("page");
    if (ns.pages.findOneBy("notion_id", id)) continue;
    ns.pages.insert({
      object: "page",
      notion_id: id,
      parent: p.parent ?? { type: "workspace", workspace: true },
      ...baseObject(store),
      archived: false,
      in_trash: false,
      url: `https://www.notion.so/${id}`,
      public_url: null,
      properties: { ...titleProperty(p.title), ...(p.properties ?? {}) },
    });
  }
  for (const d of config.databases ?? []) {
    const id = d.id ?? notionId("database");
    if (ns.databases.findOneBy("notion_id", id)) continue;
    ns.databases.insert({
      object: "database",
      notion_id: id,
      parent: d.parent ?? { type: "workspace", workspace: true },
      ...baseObject(store),
      archived: false,
      in_trash: false,
      title: richText(d.title),
      description: [],
      properties: d.properties ?? {},
      url: `https://www.notion.so/${id}`,
      public_url: null,
    });
  }
}

function registerRoutes(ctx: RouteContext): void {
  const { app, store } = ctx;
  const ns = () => getNotionStore(store);

  app.get("/v1/users", (c) =>
    c.json(paginate(toNotionList(ns().users.all()), c.req.query("start_cursor"), Number(c.req.query("page_size") ?? 100))),
  );
  app.get("/v1/users/me", (c) => c.json(toNotionObject(firstUser(store))));
  app.get("/v1/users/:user_id", (c) => {
    const user = ns().users.findOneBy("notion_id", c.req.param("user_id"));
    return user ? c.json(toNotionObject(user)) : error(c, 404, "User not found");
  });

  app.post("/v1/search", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const { pageSize, startCursor } = parsePaging(body);
    const query = String(body.query ?? "").toLowerCase();
    const filter = body.filter as { property?: string; value?: string } | undefined;
    const pages = ns().pages.all().filter(() => !filter || filter.value === "page");
    const databases = ns().databases.all().filter(() => !filter || filter.value === "database");
    const items = toNotionList([...pages, ...databases]).filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query));
    return c.json(paginate(items, startCursor, pageSize));
  });

  app.post("/v1/pages", async (c) => {
    const body = (await c.req.json()) as Record<string, unknown>;
    const page = ns().pages.insert({
      object: "page",
      notion_id: notionId("page"),
      parent: normalizeParent(body.parent),
      ...baseObject(store),
      archived: false,
      in_trash: false,
      url: "",
      public_url: null,
      properties: (body.properties as Record<string, unknown> | undefined) ?? (body.markdown ? titleProperty(titleFromMarkdown(body.markdown)) : {}),
      markdown: body.markdown === undefined ? undefined : String(body.markdown),
    });
    ns().pages.update(page.id, { url: `https://www.notion.so/${page.notion_id}` });
    return c.json(toNotionObject({ ...page, url: `https://www.notion.so/${page.notion_id}` }), 200);
  });

  app.get("/v1/pages/:page_id", (c) => {
    const page = ns().pages.findOneBy("notion_id", c.req.param("page_id"));
    return page ? c.json(toNotionObject(page)) : error(c, 404, "Page not found");
  });

  app.patch("/v1/pages/:page_id", async (c) => {
    const page = ns().pages.findOneBy("notion_id", c.req.param("page_id"));
    if (!page) return error(c, 404, "Page not found");
    const body = (await c.req.json()) as Record<string, unknown>;
    ns().pages.update(page.id, {
      properties: { ...page.properties, ...((body.properties as Record<string, unknown> | undefined) ?? {}) },
      archived: (body.archived as boolean | undefined) ?? page.archived,
      in_trash: (body.in_trash as boolean | undefined) ?? page.in_trash,
      last_edited_time: now(),
    });
    return c.json(toNotionObject(ns().pages.findOneBy("notion_id", page.notion_id)));
  });

  app.get("/v1/pages/:page_id/properties/:property_id", (c) => {
    const page = ns().pages.findOneBy("notion_id", c.req.param("page_id"));
    if (!page) return error(c, 404, "Page not found");
    return c.json((page.properties[c.req.param("property_id")] as object | undefined) ?? { object: "property_item", type: "unknown" });
  });

  app.post("/v1/databases", async (c) => {
    const body = (await c.req.json()) as Record<string, unknown>;
    const database = ns().databases.insert({
      object: "database",
      notion_id: notionId("database"),
      parent: (body.parent as NotionParent | undefined) ?? { type: "workspace", workspace: true },
      ...baseObject(store),
      archived: false,
      in_trash: false,
      title: (body.title as NotionRichText | undefined) ?? [],
      description: (body.description as NotionRichText | undefined) ?? [],
      properties: (body.properties as Record<string, unknown> | undefined) ?? {},
      url: "",
      public_url: null,
    });
    ns().databases.update(database.id, { url: `https://www.notion.so/${database.notion_id}` });
    return c.json(toNotionObject({ ...database, url: `https://www.notion.so/${database.notion_id}` }), 200);
  });

  app.get("/v1/databases/:database_id", (c) => {
    const database = ns().databases.findOneBy("notion_id", c.req.param("database_id"));
    return database ? c.json(toNotionDatabase(database)) : error(c, 404, "Database not found");
  });

  app.patch("/v1/databases/:database_id", async (c) => {
    const database = ns().databases.findOneBy("notion_id", c.req.param("database_id"));
    if (!database) return error(c, 404, "Database not found");
    const body = (await c.req.json()) as Record<string, unknown>;
    ns().databases.update(database.id, {
      title: (body.title as NotionRichText | undefined) ?? database.title,
      description: (body.description as NotionRichText | undefined) ?? database.description,
      properties: { ...database.properties, ...((body.properties as Record<string, unknown> | undefined) ?? {}) },
      archived: (body.archived as boolean | undefined) ?? database.archived,
      last_edited_time: now(),
    });
    return c.json(toNotionDatabase(ns().databases.findOneBy("notion_id", database.notion_id)));
  });

  app.post("/v1/databases/:database_id/query", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const databaseId = c.req.param("database_id");
    if (!ns().databases.findOneBy("notion_id", databaseId)) return error(c, 404, "Database not found");
    const { pageSize, startCursor } = parsePaging(body);
    return c.json(
      paginate(
        toNotionList(ns().pages.all().filter((p) => p.parent.type === "database_id" && p.parent.database_id === databaseId)),
        startCursor,
        pageSize,
      ),
    );
  });

  app.get("/v1/data_sources/:data_source_id", (c) => {
    const databaseId = databaseFromDataSourceId(c.req.param("data_source_id"));
    const database = ns().databases.findOneBy("notion_id", databaseId);
    if (!database) return error(c, 404, "Data source not found");
    return c.json({
      object: "data_source",
      id: databaseDataSourceId(database.notion_id),
      parent: { type: "database_id", database_id: database.notion_id },
      created_time: database.created_time,
      last_edited_time: database.last_edited_time,
      created_by: database.created_by,
      last_edited_by: database.last_edited_by,
      archived: database.archived,
      in_trash: database.in_trash,
      title: database.title,
      description: database.description,
      properties: database.properties,
      url: database.url,
      public_url: database.public_url,
    });
  });

  app.post("/v1/data_sources/:data_source_id/query", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const databaseId = databaseFromDataSourceId(c.req.param("data_source_id"));
    if (!ns().databases.findOneBy("notion_id", databaseId)) return error(c, 404, "Data source not found");
    const { pageSize, startCursor } = parsePaging(body);
    return c.json(
      paginate(
        toNotionList(ns().pages.all().filter((p) => p.parent.type === "database_id" && p.parent.database_id === databaseId)),
        startCursor,
        pageSize,
      ),
    );
  });

  app.get("/v1/pages/:page_id/markdown", (c) => {
    const page = ns().pages.findOneBy("notion_id", c.req.param("page_id"));
    if (!page) return error(c, 404, "Page not found");
    return c.json({
      object: "page_markdown",
      page_id: page.notion_id,
      markdown: String((page as any).markdown ?? `# ${(page.properties.title as any)?.title?.[0]?.plain_text ?? "Untitled"}\n`),
      truncated: false,
      unknown_block_ids: [],
    });
  });

  app.patch("/v1/pages/:page_id/markdown", async (c) => {
    const page = ns().pages.findOneBy("notion_id", c.req.param("page_id"));
    if (!page) return error(c, 404, "Page not found");
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const markdown = (body.replace_content as any)?.new_str ?? body.markdown ?? "";
    ns().pages.update(page.id, { last_edited_time: now(), markdown } as Partial<NotionPage>);
    return c.json({
      object: "page_markdown",
      page_id: page.notion_id,
      markdown: String(markdown),
      truncated: false,
      unknown_block_ids: [],
    });
  });

  app.get("/v1/blocks/:block_id", (c) => {
    const block = ns().blocks.findOneBy("notion_id", c.req.param("block_id"));
    return block ? c.json(toNotionObject(block)) : error(c, 404, "Block not found");
  });

  app.patch("/v1/blocks/:block_id", async (c) => {
    const block = ns().blocks.findOneBy("notion_id", c.req.param("block_id"));
    if (!block) return error(c, 404, "Block not found");
    const body = (await c.req.json()) as Record<string, unknown>;
    ns().blocks.update(block.id, { ...body, last_edited_time: now() });
    return c.json(toNotionObject(ns().blocks.findOneBy("notion_id", block.notion_id)));
  });

  app.delete("/v1/blocks/:block_id", (c) => {
    const block = ns().blocks.findOneBy("notion_id", c.req.param("block_id"));
    if (!block) return error(c, 404, "Block not found");
    ns().blocks.update(block.id, { archived: true, in_trash: true, last_edited_time: now() } as Partial<NotionBlock>);
    return c.json(toNotionObject(ns().blocks.findOneBy("notion_id", block.notion_id)));
  });

  app.get("/v1/blocks/:block_id/children", (c) => {
    const blockId = c.req.param("block_id");
    const children = ns().blocks.all().filter((b) => b.parent.type === "block_id" && b.parent.block_id === blockId);
    return c.json(paginate(toNotionList(children), c.req.query("start_cursor"), Number(c.req.query("page_size") ?? 100)));
  });

  app.patch("/v1/blocks/:block_id/children", async (c) => {
    const parent: NotionParent = { type: "block_id", block_id: c.req.param("block_id") };
    const body = (await c.req.json()) as { children?: Array<Record<string, unknown>> };
    const results = toNotionList((body.children ?? []).map((child) => ns().blocks.insert(createBlock(store, parent, child))));
    return c.json({ object: "list", results, next_cursor: null, has_more: false });
  });

  app.get("/v1/comments", (c) => {
    const blockId = c.req.query("block_id");
    const pageId = c.req.query("page_id");
    const comments = ns().comments.all().filter((comment) => {
      if (blockId) return comment.parent.type === "block_id" && comment.parent.block_id === blockId;
      if (pageId) return comment.parent.type === "page_id" && comment.parent.page_id === pageId;
      return true;
    });
    return c.json(paginate(toNotionList(comments), c.req.query("start_cursor"), Number(c.req.query("page_size") ?? 100)));
  });

  app.post("/v1/comments", async (c) => {
    const body = (await c.req.json()) as Record<string, unknown>;
    const parent = body.parent as { type: "page_id"; page_id: string } | { type: "block_id"; block_id: string };
    if (!parent) return error(c, 400, "Missing comment parent");
    const comment = ns().comments.insert({
      object: "comment",
      notion_id: notionId("comment"),
      parent,
      discussion_id: notionId("discussion"),
      created_time: now(),
      last_edited_time: now(),
      created_by: { object: "user", id: firstUser(store).notion_id },
      rich_text: (body.rich_text as NotionRichText | undefined) ?? [],
    });
    return c.json(toNotionObject(comment));
  });

  app.post("/api/v3/workersListWorkers", (c) => {
    return c.json({ workers: ns().workers.all().filter((worker) => worker.status !== "deleted").map(toWorkerResponse) });
  });

  app.post("/api/v3/workersCreateWorker", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const worker = ns().workers.insert({
      worker_id: uuid(),
      workspace_id: String(body.workspaceId ?? body.workspace_id ?? "workspace_default"),
      name: String(body.name ?? "Untitled worker"),
      status: "active",
      created_time: now(),
      updated_time: now(),
      capabilities: [],
    });
    const response = toWorkerResponse(worker);
    return c.json({ ...response, worker: response });
  });

  app.post("/api/v3/workersGetWorker", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const worker = ns().workers.findOneBy("worker_id", String(body.workerId ?? body.worker_id ?? body.id));
    return worker ? c.json({ worker: toWorkerResponse(worker) }) : error(c, 404, "Worker not found");
  });

  app.post("/api/v3/workersDeleteWorker", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const worker = ns().workers.findOneBy("worker_id", String(body.workerId ?? body.worker_id ?? body.id));
    if (!worker) return error(c, 404, "Worker not found");
    ns().workers.update(worker.id, { status: "deleted", updated_time: now() });
    return c.json({ worker: toWorkerResponse(ns().workers.findOneBy("worker_id", worker.worker_id)), ok: true });
  });

  app.post("/api/v3/workersListCapabilities", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const worker = ns().workers.findOneBy("worker_id", String(body.workerId ?? body.worker_id ?? body.id));
    return c.json({ capabilities: worker?.capabilities ?? [] });
  });

  const listWorkerRuns = async (c: any) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const workerId = String(body.workerId ?? body.worker_id ?? "");
    return c.json({ runs: ns().workerRuns.findBy("worker_id", workerId) });
  };
  app.post("/api/v3/workersListRuns", listWorkerRuns);
  app.post("/api/v3/workersListRunsForWorker", listWorkerRuns);

  app.post("/api/v3/workersGetRunLogs", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const run = ns().workerRuns.findOneBy("run_id", String(body.runId ?? body.run_id ?? body.id));
    return c.json({ logs: run?.logs ?? [] });
  });
}

export const notionPlugin: ServicePlugin = {
  name: "notion",
  register(app: Hono<AppEnv>, store: Store, webhooks: WebhookDispatcher, baseUrl: string, tokenMap?: TokenMap): void {
    const ctx: RouteContext = { app, store, webhooks, baseUrl, tokenMap };
    registerRoutes(ctx);
  },
  seed(store: Store): void {
    seedDefaults(store);
  },
};

export default notionPlugin;
