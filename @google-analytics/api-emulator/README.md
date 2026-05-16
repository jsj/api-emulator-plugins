# @api-emulator/google-analytics

Google Analytics Data API provides GA4 property metadata, report execution, realtime metrics, and audience export workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/google-analytics
```

## Run

```bash
npx -p api-emulator api --plugin ./@google-analytics/api-emulator.mjs --service google-analytics
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
google-analytics:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developers.google.com/analytics/devguides/reporting/data/v1/rest)
- [api-emulator](https://github.com/jsj/api-emulator)
