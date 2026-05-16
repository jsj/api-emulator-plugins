# @api-emulator/statefarm

State Farm-style insurance APIs provide renters quote, policy, claim, billing, and customer workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/statefarm
```

## Run

```bash
npx -p api-emulator api --plugin ./@statefarm/api-emulator.mjs --service statefarm
```

## Endpoints

- `GET /v1/customers`
- `GET /v1/quotes`
- `POST /v1/quotes/renters`
- `GET /v1/policies`
- `GET /v1/policies/:policyId`
- `POST /v1/claims`
- `GET /v1/billing/bills`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
statefarm:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.statefarm/api/renters)
- [api-emulator](https://github.com/jsj/api-emulator)
