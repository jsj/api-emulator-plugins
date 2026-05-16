# @api-emulator/geico

GEICO-style P&C insurance APIs provide customer, auto policy, claim, billing, and quote workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/geico
```

## Run

```bash
npx -p api-emulator api --plugin ./@geico/api-emulator.mjs --service geico
```

## Endpoints

- `GET /v1/customers/current`
- `GET /v1/policies`
- `GET /v1/policies/:policyId`
- `GET /v1/policies/:policyId/claims`
- `GET /v1/claims/:claimId`
- `POST /v1/claims`
- `GET /v1/billing/invoices`
- `POST /v1/quotes/auto`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
geico:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://www.geico.com/about/b2b-services/)
- [api-emulator](https://github.com/jsj/api-emulator)
