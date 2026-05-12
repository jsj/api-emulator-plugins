import { contract, createCloudflareBindings } from "./src/index";

function assertEqual(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
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

await (env.Assets as any).put("hello.txt", "hello");
const object = await (env.Assets as any).get("hello.txt");
assertEqual(await object.text(), "hello");

await (env.Jobs as any).send({ type: "smoke" });
assertEqual((env.Jobs as any).messages().length, 1);

const workflow = await (env.Deployments as any).create({ id: "deploy-1", params: { ref: "main" } });
assertEqual(workflow.id, "deploy-1");

await (env.SearchIndex as any).upsert([
  { id: "doc-1", values: [1, 0], metadata: { title: "First document" } },
  { id: "doc-2", values: [0, 1], metadata: { title: "Second document" } },
]);
const matches = await (env.SearchIndex as any).query([1, 0], { topK: 1, returnMetadata: "all" });
assertEqual(matches.matches[0].id, "doc-1");
assertEqual(matches.matches[0].metadata.title, "First document");

console.log("cloudflare smoke ok");
