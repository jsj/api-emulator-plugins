# api-emulator-plugins

Shared external plugins for [`api-emulator`](https://github.com/jsj/api-emulator).

This repo is the public plugin shelf: provider-shaped local API emulators that can be loaded by the `api-emulator` runtime without adding more providers to the core package.

## Use a plugin

Clone this repo next to your app or point at a plugin file directly:

```bash
git clone https://github.com/jsj/api-emulator-plugins.git

npx api-emulator \
  --plugin ./api-emulator-plugins/@posthog/api-emulator.mjs \
  --service posthog
```

Load more than one plugin with a comma-separated list:

```bash
npx api-emulator \
  --plugin ./api-emulator-plugins/@github/api-emulator.mjs,./api-emulator-plugins/@apple/api-emulator.mjs \
  --service github,apple
```

Generate seed config for a plugin:

```bash
npx api-emulator init \
  --plugin ./api-emulator-plugins/@alpaca/trading-emulator/src/index.ts \
  --service alpaca
```

## Plugins

| Plugin | Path | Scope |
| --- | --- | --- |
| Alpaca | `@alpaca/trading-emulator/src/index.ts` | Trading account, orders, positions, clock, market data snapshots and bars |
| Anthropic | `@anthropic/api-emulator.mjs` | Messages API |
| Apple | `@apple/api-emulator.mjs` | AMS auth, APNS, App Store Connect apps, builds, uploads, review submissions |
| Cloudflare | `@cloudflare/api-emulator/src/index.ts` | Workers-style bindings, D1, KV, R2, queues, durable objects, service bindings |
| fal | `@fal/api-emulator.mjs` | Seedance queue text-to-video flow |
| Gemini | `@gemini/api-emulator.mjs` | `generateContent` |
| GitHub | `@github/api-emulator.mjs` | Apps, repos, refs, contents, issues, PRs, Actions, checks |
| Jellyfin | `@jellyfin/api-emulator.mjs` | Auth, users, libraries, items, search, playback, streams |
| Kubernetes | `@kubernetes/api-emulator/index.mjs` | Namespaces, nodes, pods, logs, events, deployments, K8sGPT results |
| OpenAI | `@openai/api-emulator.mjs` | Images, edits, chat completions |
| OpenRouter | `@openrouter/api-emulator.mjs` | Chat completions |
| Pirate Bay | `@piratebay/api-emulator/src/index.ts` | API Bay metadata endpoints and precompiled top lists |
| PostHog | `@posthog/api-emulator.mjs` | Capture, batch, persons, groups, identify, alias, feature flags, decide, experiments |
| Replicate | `@replicate/api-emulator.mjs` | Model predictions |

## Plugin shape

An external plugin exports a `plugin` object that satisfies the `ServicePlugin` interface from `@emulators/core`.

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

- `label`: display name for `npx api-emulator list`
- `endpoints`: short endpoint summary for `list`
- `initConfig`: starter config emitted by `npx api-emulator init`
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

Some plugins include a smoke script. Start the plugin with `api-emulator`, then run the smoke script in another shell:

```bash
npx api-emulator \
  --plugin ./@posthog/api-emulator.mjs \
  --service posthog

node ./@posthog/smoke.mjs
```

## Philosophy

`api-emulator` should stay a thin runtime spine. Provider behavior belongs behind plugin seams, where it can evolve independently, be shared publicly, or stay private inside a team.
