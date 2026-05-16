# @api-emulator/lucent

Lucent provides session replay SDK APIs for public-key validation, browser replay ingestion, and session capture workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/lucent
```

## Run

```bash
npx -p api-emulator api --plugin ./@lucent/api-emulator.mjs --service lucent
```

## Endpoints

- `POST /api/sdk/init`
- `POST /api/sdk/replay`
- `GET /api/sdk/replays`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
lucent:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.lucenthq.com)
- [api-emulator](https://github.com/jsj/api-emulator)
