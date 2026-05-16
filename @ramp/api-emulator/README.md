# @api-emulator/ramp

Ramp provides finance APIs for entities, users, corporate cards, transactions, reimbursements, bills, and spend controls.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/ramp
```

## Run

```bash
npx -p api-emulator api --plugin ./@ramp/api-emulator.mjs --service ramp
```

## Endpoints

- `POST /developer/v1/reimbursements`
- `POST /developer/v1/agent-tools/get-simplified-user-detail`
- `POST /developer/v1/agent-tools/list-users`
- `POST /developer/v1/agent-tools/get-transactions`
- `POST /developer/v1/agent-tools/get-full-transaction-metadata`
- `POST /developer/v1/agent-tools/get-reimbursements`
- `GET /v1/public/agent-tools/spec/hash`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
ramp:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.ramp.com/developer-api/v1/overview)
- [api-emulator](https://github.com/jsj/api-emulator)
