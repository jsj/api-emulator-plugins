# @api-emulator/clay

Clay provides APIs and webhook surfaces for sales intelligence tables, rows, enrichments, and workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/clay
```

## Run

```bash
npx -p api-emulator api --plugin ./@clay/api-emulator.mjs --service clay
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
clay:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://university.clay.com/docs/http-api-integration-overview)
- [api-emulator](https://github.com/jsj/api-emulator)
