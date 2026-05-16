# @api-emulator/turbotax

TurboTax partner tax-import APIs provide OAuth, tax document, and import session workflows for deterministic tax prep testing.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/turbotax
```

## Run

```bash
npx -p api-emulator api --plugin ./@turbotax/api-emulator.mjs --service turbotax
```

## Endpoints

- `POST /oauth2/v1/tokens/bearer`
- `GET /v1/tax-documents`
- `POST /v1/tax-documents`
- `GET /v1/tax-documents/:id`
- `POST /v1/import-sessions`
- `GET /v1/import-sessions/:id`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
turbotax:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://www.intuit.com/partners/fdp/implementation-support/tax-import/)
- [api-emulator](https://github.com/jsj/api-emulator)
