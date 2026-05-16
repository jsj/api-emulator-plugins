# @api-emulator/sentry

Sentry provides error tracking, projects, issues, events, releases, organizations, and alerting APIs.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/sentry
```

## Run

```bash
npx -p api-emulator api --plugin ./@sentry/api-emulator.mjs --service sentry
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
sentry:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.sentry.io/api/)
- [api-emulator](https://github.com/jsj/api-emulator)
