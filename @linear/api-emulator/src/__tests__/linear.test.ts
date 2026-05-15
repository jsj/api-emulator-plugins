import { Hono } from "hono";
import { beforeEach, describe, expect, it } from "vitest";
import { Store, WebhookDispatcher, type TokenMap } from "@api-emulator/core";
import { linearPlugin, seedFromConfig } from "../index.js";

const base = "http://localhost:4012";

function createTestApp() {
  const app = new Hono();
  const store = new Store();
  const webhooks = new WebhookDispatcher();
  const tokenMap: TokenMap = new Map();

  linearPlugin.register(app as any, store, webhooks, base, tokenMap);
  linearPlugin.seed?.(store, base);
  seedFromConfig(store, base, {
    api_keys: ["lin_api_seeded"],
    organizations: [{ id: "org-acme", name: "Acme", url_key: "acme" }],
    users: [
      { id: "user-alice", name: "Alice", email: "alice@example.com", organization: "org-acme", admin: true },
      { id: "user-bob", name: "Bob", email: "bob@example.com", organization: "org-acme" },
    ],
    teams: [{ id: "team-eng", name: "Engineering", key: "ENG", organization: "org-acme" }],
    workflow_states: [
      { id: "state-todo", name: "Todo", type: "unstarted", team: "team-eng" },
      { id: "state-started", name: "Started", type: "started", team: "team-eng" },
    ],
    labels: [{ id: "label-bug", name: "Bug", team: "team-eng" }],
    projects: [{ id: "project-api", name: "API", slug_id: "api", team: "team-eng", lead: "user-alice", state: "started" }],
    issues: [
      { id: "issue-one", title: "First seeded issue", team: "team-eng", state: "state-todo", assignee: "user-alice", creator: "user-bob", project: "project-api", labels: ["label-bug"] },
      { id: "issue-two", title: "Second seeded issue", team: "team-eng", state: "state-started", assignee: "user-bob", creator: "user-alice", project: "project-api" },
    ],
  });

  return app;
}

async function gql(app: Hono, query: string, variables?: Record<string, unknown>, token = "lin_api_seeded") {
  return app.request(`${base}/graphql`, {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
}

describe("Linear GraphQL emulator", () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it("requires a seeded PAT", async () => {
    const res = await gql(app, "{ viewer { id } }", undefined, "bad_token");
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ errors: [{ extensions: { code: "AUTHENTICATION_ERROR" } }] });
  });

  it("accepts standard GraphQL variables", async () => {
    const res = await gql(app, "query GetIssue($id: ID!) { issue(id: $id) { id title } }", { id: "issue-one" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: { issue: { id: "issue-one", title: "First seeded issue" } }, errors: [] });
  });

  it("supports schema introspection", async () => {
    const res = await gql(app, "{ __schema { queryType { name } types { name } } }");
    const body = (await res.json()) as any;
    expect(body.data.__schema.queryType.name).toBe("Query");
    expect(body.data.__schema.types.some((type: { name: string }) => type.name === "Issue")).toBe(true);
  });

  it("returns issues with relationships", async () => {
    const res = await gql(app, '{ issue(id: "issue-one") { id identifier title team { key } state { name } assignee { email } labels { nodes { name } } } }');
    expect(await res.json()).toMatchObject({
      data: {
        issue: {
          id: "issue-one",
          identifier: "ENG-1",
          title: "First seeded issue",
          team: { key: "ENG" },
          state: { name: "Todo" },
          assignee: { email: "alice@example.com" },
          labels: { nodes: [{ name: "Bug" }] },
        },
      },
      errors: [],
    });
  });

  it("looks up issues by identifier", async () => {
    const res = await gql(app, '{ issue(identifier: "ENG-2") { id title } }');
    expect(await res.json()).toMatchObject({ data: { issue: { id: "issue-two", title: "Second seeded issue" } }, errors: [] });
  });
});
