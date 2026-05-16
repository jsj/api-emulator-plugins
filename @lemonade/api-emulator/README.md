# @api-emulator/lemonade

Lemonade-style insurance APIs provide customer, renters quote, policy binding, and claim workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/lemonade
```

## Run

```bash
npx -p api-emulator api --plugin ./@lemonade/api-emulator.mjs --service lemonade
```

## Endpoints

- `GET /v1/customers`
- `POST /v1/customers`
- `GET /v1/quotes`
- `POST /v1/quotes/renters`
- `POST /v1/policies`
- `GET /v1/policies/:policyId`
- `GET /v1/claims`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
lemonade:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://www.lemonade.com/api)
- [api-emulator](https://github.com/jsj/api-emulator)
