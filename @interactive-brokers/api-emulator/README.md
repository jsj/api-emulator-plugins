# @api-emulator/interactive-brokers

Interactive Brokers Client Portal Web API provides session, accounts, portfolio, market data, contract search, and order workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/interactive-brokers
```

## Run

```bash
npx -p api-emulator api --plugin ./@interactive-brokers/api-emulator.mjs --service interactive-brokers
```

## Endpoints

- `POST /oauth2/api/v1/token`
- `GET /iserver/auth/status`
- `POST /iserver/reauthenticate`
- `GET /iserver/accounts`
- `GET /portfolio/accounts`
- `GET /portfolio/subaccounts`
- `GET /portfolio/:accountId/positions/:pageId`
- `GET /portfolio/:accountId/ledger`
- `GET /portfolio/:accountId/summary`
- `GET /iserver/secdef/search`
- `GET /iserver/marketdata/snapshot`
- `GET /iserver/account/orders`
- `POST /iserver/account/:accountId/orders`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
interactive-brokers:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://www.interactivebrokers.com/campus/ibkr-api-page/cpapi-v1/)
- [api-emulator](https://github.com/jsj/api-emulator)
