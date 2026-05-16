# @api-emulator/usaa

USAA-style Open Finance APIs provide FDX account, customer, balance, and transaction data workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/usaa
```

## Run

```bash
npx -p api-emulator api --plugin ./@usaa/api-emulator.mjs --service usaa
```

## Endpoints

- `GET /fdx/v6/customers/current`
- `GET /fdx/v6/accounts`
- `GET /fdx/v6/accounts/:accountId`
- `GET /fdx/v6/accounts/:accountId/transactions`
- `GET /customers/current`
- `GET /accounts`
- `GET /accounts/:accountId`
- `GET /accounts/:accountId/transactions`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
usaa:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.akoya.com/reference/fdx-apis)
- [api-emulator](https://github.com/jsj/api-emulator)
