# @api-emulator/mixpanel

Mixpanel provides product analytics APIs for event ingestion, user profiles, exports, and reporting.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/mixpanel
```

## Run

```bash
npx -p api-emulator api --plugin ./@mixpanel/api-emulator.mjs --service mixpanel
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
mixpanel:
  # Add provider-specific seed state here.
```

## Links

- [api-emulator](https://github.com/jsj/api-emulator)
