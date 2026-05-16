# @api-emulator/posthog

PostHog provides product analytics, event capture, feature flags, persons, and project APIs.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/posthog
```

## Run

```bash
npx -p api-emulator api --plugin ./@posthog/api-emulator.mjs --service posthog
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
posthog:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://posthog.com/docs/api)
- [api-emulator](https://github.com/jsj/api-emulator)
