# @api-emulator/robinhood

Robinhood Crypto Trading APIs provide account, holding, order, currency pair, and market data workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/robinhood
```

## Run

```bash
npx -p api-emulator api --plugin ./@robinhood/api-emulator.mjs --service robinhood
```

## Endpoints

- `GET /api/v1/crypto/trading/accounts/`
- `GET /api/v1/crypto/trading/holdings/`
- `GET /api/v1/crypto/trading/currency_pairs/`
- `GET /api/v1/crypto/trading/orders/`
- `POST /api/v1/crypto/trading/orders/`
- `GET /api/v1/crypto/trading/orders/:id/`
- `GET /api/v1/crypto/marketdata/best_bid_ask/`
- `GET /api/v1/crypto/marketdata/estimated_price/`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
robinhood:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.robinhood.com/crypto/trading/)
- [api-emulator](https://github.com/jsj/api-emulator)
