import { cloudflarePlugin, contract, createCloudflareBindings } from "./src/index";

function assertEqual(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}

class TestApp {
  private routes: Array<{ method: string; path: string; handler: (context: any) => Response | Promise<Response> }> = [];

  get(path: string, handler: (context: any) => Response | Promise<Response>): void {
    this.routes.push({ method: "GET", path, handler });
  }

  post(path: string, handler: (context: any) => Response | Promise<Response>): void {
    this.routes.push({ method: "POST", path, handler });
  }

  put(path: string, handler: (context: any) => Response | Promise<Response>): void {
    this.routes.push({ method: "PUT", path, handler });
  }

  patch(path: string, handler: (context: any) => Response | Promise<Response>): void {
    this.routes.push({ method: "PATCH", path, handler });
  }

  delete(path: string, handler: (context: any) => Response | Promise<Response>): void {
    this.routes.push({ method: "DELETE", path, handler });
  }

  all(path: string, handler: (context: any) => Response | Promise<Response>): void {
    this.routes.push({ method: "ALL", path, handler });
  }

  async request(method: string, path: string, body?: unknown): Promise<Response> {
    for (const route of this.routes) {
      if (route.method !== method && route.method !== "ALL") continue;
      const params = matchRoute(route.path, path);
      if (!params) continue;
      return route.handler({
        req: {
          url: `http://emulator.test${path}`,
          param: (name: string) => params[name],
          json: async () => body ?? {},
          text: async () => String(body ?? ""),
        },
        json: (value: unknown, status = 200) =>
          new Response(JSON.stringify(value), {
            status,
            headers: { "content-type": "application/json" },
          }),
      });
    }
    throw new Error(`No route for ${method} ${path}`);
  }
}

function matchRoute(pattern: string, pathWithQuery: string): Record<string, string> | null {
  const path = pathWithQuery.split("?")[0];
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);
  const params: Record<string, string> = {};
  for (let index = 0; index < patternParts.length; index++) {
    const patternPart = patternParts[index];
    const pathPart = pathParts[index];
    if (patternPart === "*") return params;
    if (!pathPart) return null;
    if (patternPart.startsWith(":")) params[patternPart.slice(1)] = decodeURIComponent(pathPart);
    else if (patternPart !== pathPart) return null;
  }
  return patternParts.length === pathParts.length ? params : null;
}

const env = createCloudflareBindings({
  kv: { CONFIG: { feature: "enabled" } },
  queues: ["Jobs"],
  r2Buckets: ["Assets"],
  workflows: ["Deployments"],
  vectorizeIndexes: ["SearchIndex"],
});

assertEqual(contract.provider, "cloudflare");
assertEqual(await (env.CONFIG as any).get("feature"), "enabled");
await (env.CONFIG as any).put("mode", JSON.stringify({ enabled: true }), { metadata: { source: "smoke" } });
const configValues = await (env.CONFIG as any).get(["feature", "mode"]);
assertEqual(configValues.get("feature"), "enabled");
assertEqual(JSON.parse(configValues.get("mode")).enabled, true);
const configMetadata = await (env.CONFIG as any).getWithMetadata("mode", "json");
assertEqual(configMetadata.metadata.source, "smoke");

await (env.DB as any).exec("CREATE TABLE smoke_items (id TEXT PRIMARY KEY, name TEXT)");
await (env.DB as any).prepare("INSERT INTO smoke_items (id, name) VALUES (?, ?)").bind("item-1", "First").run();
const d1Row = await (env.DB as any).prepare("SELECT name FROM smoke_items WHERE id = ?").bind("item-1").first();
assertEqual(d1Row.name, "First");
const d1Raw = await (env.DB as any).prepare("SELECT id, name FROM smoke_items").raw();
assertEqual(d1Raw[0][0], "item-1");

await (env.Assets as any).put("hello.txt", "hello");
const object = await (env.Assets as any).get("hello.txt");
assertEqual(await object.text(), "hello");

await (env.Jobs as any).send({ type: "smoke" });
await (env.Jobs as any).sendBatch([{ body: { type: "batch" } }]);
assertEqual((env.Jobs as any).metrics().messagesVisible, 2);
const pulled = (env.Jobs as any).pull(1);
assertEqual(pulled.length, 1);
assertEqual((env.Jobs as any).ack([pulled[0].leaseId]), 1);
assertEqual((env.Jobs as any).messages().length, 1);

const workflow = await (env.Deployments as any).create({ id: "deploy-1", params: { ref: "main" } });
assertEqual(workflow.id, "deploy-1");
assertEqual((await workflow.status()).status, "running");
await workflow.terminate();
assertEqual((await (await (env.Deployments as any).get("deploy-1")).status()).status, "terminated");

await (env.SearchIndex as any).upsert([
  { id: "doc-1", values: [1, 0], metadata: { title: "First document" } },
  { id: "doc-2", values: [0, 1], metadata: { title: "Second document" } },
]);
const matches = await (env.SearchIndex as any).query([1, 0], { topK: 1, returnMetadata: "all" });
assertEqual(matches.matches[0].id, "doc-1");
assertEqual(matches.matches[0].metadata.title, "First document");

const app = new TestApp();
cloudflarePlugin.register(app as any);
await app.request("POST", "/client/v4/accounts/test/d1/database/routes-db/import", {
  sql: "CREATE TABLE route_items (id TEXT PRIMARY KEY, name TEXT)",
});
await app.request("POST", "/client/v4/accounts/test/d1/database/routes-db/query", {
  sql: "INSERT INTO route_items (id, name) VALUES (?, ?)",
  params: ["route-1", "Route"],
});
const d1RouteResponse = await app.request("POST", "/client/v4/accounts/test/d1/database/routes-db/query", {
  sql: "SELECT name FROM route_items WHERE id = ?",
  params: ["route-1"],
});
assertEqual((await d1RouteResponse.json() as any).result[0].results[0].name, "Route");

await app.request("POST", "/client/v4/accounts/test/storage/kv/namespaces", { title: "ROUTE_KV" });
await app.request("PUT", "/client/v4/accounts/test/storage/kv/namespaces/ROUTE_KV/values/greeting", "hello-route");
const kvRouteResponse = await app.request("GET", "/client/v4/accounts/test/storage/kv/namespaces/ROUTE_KV/values/greeting");
assertEqual(await kvRouteResponse.text(), "hello-route");

await app.request("POST", "/client/v4/accounts/test/queues/route-queue/messages", { body: { ok: true } });
const queueRouteResponse = await app.request("POST", "/client/v4/accounts/test/queues/route-queue/messages/pull", { batch_size: 1 });
assertEqual((await queueRouteResponse.json() as any).result.messages.length, 1);

await app.request("PUT", "/client/v4/accounts/test/workflows/route-workflow");
await app.request("POST", "/client/v4/accounts/test/workflows/route-workflow/instances", { id: "route-instance" });
const workflowRouteResponse = await app.request("PATCH", "/client/v4/accounts/test/workflows/route-workflow/instances/route-instance/status", { status: "terminated" });
assertEqual((await workflowRouteResponse.json() as any).result.status, "terminated");

console.log("cloudflare smoke ok");
