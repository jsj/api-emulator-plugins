# @api-emulator/brex

Brex provides spend-management APIs for vendors, users, payments, and team workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/brex
```

## Run

```bash
npx -p api-emulator api --plugin ./@brex/api-emulator.mjs --service brex
```

## Endpoints

- `GET /v1/vendors`
- `POST /v1/vendors`
- `GET /v1/vendors/:vendorId`
- `PUT /v1/vendors/:vendorId`
- `DELETE /v1/vendors/:vendorId`
- `GET /v2/users/me`
- `GET /v2/users`
- `GET /v2/users/:userId`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
brex:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.brex.com/)
- [api-emulator](https://github.com/jsj/api-emulator)
