# @api-emulator/bilt

Bilt Rewards-style APIs provide member profiles, rewards accounts, points ledger, and rent payment workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/bilt
```

## Run

```bash
npx -p api-emulator api --plugin ./@bilt/api-emulator.mjs --service bilt
```

## Endpoints

- `GET /v1/member`
- `GET /v1/rewards/accounts`
- `GET /v1/rewards/ledger`
- `GET /v1/rent-payments`
- `POST /v1/rent-payments`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
bilt:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://www.bilt.com/rewards)
- [api-emulator](https://github.com/jsj/api-emulator)
