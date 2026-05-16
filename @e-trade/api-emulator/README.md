# @api-emulator/e-trade

E*TRADE provides brokerage APIs for OAuth 1.0a authorization, accounts, balances, portfolios, market quotes, orders, and order previews.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/e-trade
```

## Run

```bash
npx -p api-emulator api --plugin ./@e-trade/api-emulator.mjs --service e-trade
```

## Endpoints

- `GET /v1/accounts/list${suffix}`
- `GET /v1/accounts/:accountIdKey/balance${suffix}`
- `GET /v1/accounts/:accountIdKey/portfolio${suffix}`
- `GET /v1/accounts/:accountIdKey/orders${suffix}`
- `POST /v1/accounts/:accountIdKey/orders/preview${suffix}`
- `GET /oauth/request_token`
- `GET /oauth/access_token`
- `GET /oauth/renew_access_token`
- `GET /oauth/revoke_access_token`
- `GET /v1/market/quote/:symbols`
- `GET /v1/market/quote/:symbols.json`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
e-trade:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://apisb.etrade.com/docs/api/account/api-account-v1.html)
- [api-emulator](https://github.com/jsj/api-emulator)
