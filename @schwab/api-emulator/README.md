# @api-emulator/schwab

Charles Schwab Trader API provides OAuth, brokerage accounts, account hashes, orders, quotes, and option chain data.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/schwab
```

## Run

```bash
npx -p api-emulator api --plugin ./@schwab/api-emulator.mjs --service schwab
```

## Endpoints

- `POST /v1/oauth/token`
- `GET /trader/v1/accounts/accountNumbers`
- `GET /trader/v1/accounts`
- `GET /trader/v1/accounts/:accountHash/orders`
- `POST /trader/v1/accounts/:accountHash/orders`
- `GET /trader/v1/accounts/:accountHash/orders/:orderId`
- `GET /marketdata/v1/quotes`
- `GET /marketdata/v1/chains`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
schwab:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.schwab.com/products/trader-api--individual)
- [api-emulator](https://github.com/jsj/api-emulator)
