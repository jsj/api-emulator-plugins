# @api-emulator/ethos

Ethos-style life insurance APIs provide partner lead intake, term-life quotes, application decisions, and policy workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/ethos
```

## Run

```bash
npx -p api-emulator api --plugin ./@ethos/api-emulator.mjs --service ethos
```

## Endpoints

- `GET /v1/leads`
- `POST /v1/leads`
- `POST /v1/quotes/term-life`
- `GET /v1/quotes/:quoteId`
- `POST /v1/applications`
- `GET /v1/applications/:applicationId`
- `GET /v1/policies`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
ethos:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://www.ethos.com/api/)
- [api-emulator](https://github.com/jsj/api-emulator)
