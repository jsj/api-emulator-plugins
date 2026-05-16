# api-emulator-registry

Plugin registry for [`api-emulator`](https://github.com/jsj/api-emulator): fake real APIs locally so your app can test integrations without touching production, sandboxes, or someone else's server.

Use this repo like an app store of provider emulators. Pick a plugin, run it on localhost with `api-emulator`, seed state, reset data, and test your app against stable fake APIs.

## Quick start

Clone this registry next to your app:

```bash
git clone https://github.com/jsj/api-emulator-plugins.git
```

Run one provider:

```bash
npx -p api-emulator api \
  --plugin ./api-emulator-plugins/@posthog/api-emulator.mjs \
  --service posthog
```

Run multiple providers:

```bash
npx -p api-emulator api \
  --plugin ./api-emulator-plugins/@github/api-emulator.mjs,./api-emulator-plugins/@apple/api-emulator.mjs \
  --service github,apple
```

Generate starter seed config:

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
Provider plugins from this registry
```

`api-emulator` is the runtime. This registry keeps provider behavior in separate plugins so public, private, and internal APIs can evolve independently.

## Plugins

Most providers live under a scoped folder:

```text
@posthog/api-emulator.mjs
@github/api-emulator.mjs
@cloudflare/api-emulator/src/index.ts
```

Each plugin exports a `plugin` object for `@api-emulator/core`:

```js
export const plugin = {
  name: "posthog",
  register(app) {
    app.post("/capture", async (c) => c.json({ ok: true }))
  },
}

export const label = "PostHog API emulator"
export const endpoints = "capture, batch, decide, feature flags"
export const initConfig = {
  posthog: {
    apiKeys: ["posthog-emulator-key"],
  },
}
```

Optional exports include `label`, `endpoints`, `initConfig`, `seedFromConfig`, and `defaultFallback`.

## Fixtures

Stateful or stochastic providers can export a fixture after a useful run and restore it later:

```ts
const fixture = openai.exportFixture({ metadata: { name: "happy-path-chat" } })

openai.resetToFixture(fixture)
```

## Smoke testing

```bash
bun run smoke
node ./@posthog/smoke.mjs
```

## License

MIT. See [`LICENSE`](./LICENSE).
