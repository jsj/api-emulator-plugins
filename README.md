# api-emulator-plugins

The public plugin shelf for [`api-emulator`](https://github.com/jsj/api-emulator).

Use this repo like an app store of local API emulators. Pick a provider, load it into `api-emulator`, then test your app against a fake API on localhost instead of hitting production, sandboxes, or someone else's server.

## Quick start

Clone the shelf next to your app:

```bash
git clone https://github.com/jsj/api-emulator-plugins.git
```

Run one plugin:

```bash
npx -p api-emulator api \
  --plugin ./api-emulator-plugins/@posthog/api-emulator.mjs \
  --service posthog
```

Load more than one plugin with a comma-separated list:

```bash
npx -p api-emulator api \
  --plugin ./api-emulator-plugins/@github/api-emulator.mjs,./api-emulator-plugins/@apple/api-emulator.mjs \
  --service github,apple
```

Generate seed config for a plugin:

```bash
npx -p api-emulator api init \
  --plugin ./api-emulator-plugins/@alpaca/api-emulator/src/index.ts \
  --service alpaca
```

## How it fits together

```text
Your app
  ↓
api-emulator on localhost
  ↓
GitHub, PostHog, Cloudflare, OpenAI, and other plugin backed fake APIs
```

`api-emulator` stays the runtime spine. This repo keeps provider behavior in separate plugins so public, private, and internal emulators can evolve independently.

## Fixtures for stochastic APIs

OpenAI and Anthropic record chat/message request and response pairs into the runtime fixture store. Export a fixture after a useful run, then restore it later to replay the same response for the same request.

```ts
const fixture = openai.exportFixture({ metadata: { name: "happy-path-chat" } })

openai.resetToFixture(fixture)
```

## Plugins

| Plugin | Path | Scope |
| --- | --- | --- |
| Alpaca | `@alpaca/api-emulator/src/index.ts` | Trading account, orders, positions, clock, market data snapshots and bars |
| Anthropic | `@anthropic/api-emulator.mjs` | Messages API |
| Apple | `@apple/api-emulator.mjs` | AMS auth, APNS, App Store Connect apps, builds, uploads, review submissions |
| Cloudflare | `@cloudflare/api-emulator/src/index.ts` | Workers-style bindings, D1, KV, R2, queues, durable objects, service bindings |
| fal | `@fal/api-emulator.mjs` | Seedance queue text-to-video flow |
| Gemini | `@gemini/api-emulator.mjs` | `generateContent` |
| GitHub | `@github/api-emulator.mjs` | Apps, repos, refs, contents, issues, PRs, Actions, checks |
| Kubernetes | `@kubernetes/api-emulator/index.mjs` | Namespaces, nodes, pods, logs, events, deployments, K8sGPT results |
| OpenAI | `@openai/api-emulator.mjs` | Images, edits, chat completions |
| OpenRouter | `@openrouter/api-emulator.mjs` | Chat completions |
| PostHog | `@posthog/api-emulator.mjs` | Capture, batch, persons, groups, identify, alias, feature flags, decide, experiments |
| Replicate | `@replicate/api-emulator.mjs` | Model predictions |

## Core app examples

The main [api-emulator](https://github.com/jsj/api-emulator) repo has runnable examples for common integration flows:

- [OAuth](https://github.com/jsj/api-emulator/tree/main/examples/oauth)
- [Next.js embedded mode](https://github.com/jsj/api-emulator/tree/main/examples/nextjs-embedded)
- [Resend magic link](https://github.com/jsj/api-emulator/tree/main/examples/resend-magic-link)
- [Stripe checkout](https://github.com/jsj/api-emulator/tree/main/examples/stripe-checkout)

Use this repo when those examples need providers outside the default catalog, or when you want to share a provider plugin independently from the runtime.

## Write a plugin

A plugin exports a `plugin` object that satisfies the `ServicePlugin` interface from `@api-emulator/core`.

```js
export const plugin = {
  name: "posthog",
  register(app, store, webhooks, baseUrl) {
    app.post("/capture", async (c) => {
      const body = await c.req.json();
      return c.json({ ok: true, received: body });
    });
  },
};

export const label = "PostHog API emulator";
export const endpoints = "capture, batch, decide, feature flags";
export const initConfig = {
  posthog: {
    apiKeys: ["posthog-emulator-key"],
  },
};
```

Optional exports:

- `label`: display name for `npx -p api-emulator api list`
- `endpoints`: short endpoint summary for `list`
- `initConfig`: starter config emitted by `npx -p api-emulator api init`
- `seedFromConfig(store, baseUrl, config, webhooks)`: load config into emulator state
- `defaultFallback(config)`: default auth fallback for token-protected providers

## Repo layout

Simple plugins can be a single file:

```text
@posthog/
  api-emulator.mjs
  smoke.mjs
```

Larger plugins can be small packages:

```text
@cloudflare/
  api-emulator/
    package.json
    src/index.ts
    smoke.ts
```

## Smoke testing

Some plugins include a smoke script. Run all repository-level smoke tests with:

```bash
bun run smoke
```

You can also run an individual smoke test directly:

```bash
node ./@posthog/smoke.mjs
```

## License

MIT. See [`LICENSE`](./LICENSE).
