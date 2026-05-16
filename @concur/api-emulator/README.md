# @api-emulator/concur

SAP Concur provides travel and expense APIs for users, expense reports, entries, receipts, and travel requests.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/concur
```

## Run

```bash
npx -p api-emulator api --plugin ./@concur/api-emulator.mjs --service concur
```

## Endpoints

- `GET /oauth2/v0/userinfo`
- `POST /api/v3.0/expense/reports`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
concur:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.concur.com/api-reference/)
- [api-emulator](https://github.com/jsj/api-emulator)
