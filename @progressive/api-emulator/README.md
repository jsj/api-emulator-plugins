# @api-emulator/progressive

Progressive-style insurance APIs provide auto quotes, policy servicing, customer, and claim workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/progressive
```

## Run

```bash
npx -p api-emulator api --plugin ./@progressive/api-emulator.mjs --service progressive
```

## Endpoints

- `GET /v1/customers`
- `GET /v1/policies`
- `GET /v1/policies/:policyId`
- `GET /v1/quotes`
- `POST /v1/quotes/auto`
- `GET /v1/claims`
- `POST /v1/claims`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
progressive:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.progressive.com/s/)
- [api-emulator](https://github.com/jsj/api-emulator)
