# @api-emulator/coinbase

Coinbase Advanced Trade APIs provide market products, account balances, historical orders, and order preview workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/coinbase
```

## Run

```bash
npx -p api-emulator api --plugin ./@coinbase/api-emulator.mjs --service coinbase
```

## Endpoints

- `GET /api/v3/brokerage/time`
- `GET /api/v3/brokerage/market/products`
- `GET /api/v3/brokerage/market/products/:productId`
- `GET /api/v3/brokerage/accounts`
- `GET /api/v3/brokerage/accounts/:accountUuid`
- `GET /api/v3/brokerage/orders/historical/batch`
- `POST /api/v3/brokerage/orders/preview`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
coinbase:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/rest-api)
- [api-emulator](https://github.com/jsj/api-emulator)
