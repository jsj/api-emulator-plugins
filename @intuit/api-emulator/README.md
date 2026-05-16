# @api-emulator/intuit

Intuit QuickBooks Online provides accounting APIs for OAuth, company info, query, customers, invoices, payments, and accounts.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/intuit
```

## Run

```bash
npx -p api-emulator api --plugin ./@intuit/api-emulator.mjs --service intuit
```

## Endpoints

- `POST /oauth2/v1/tokens/bearer`
- `GET /v3/company/:realmId/companyinfo/:companyId`
- `GET /v3/company/:realmId/query`
- `POST /v3/company/:realmId/query`
- `POST /v3/company/:realmId/customer`
- `GET /v3/company/:realmId/customer/:id`
- `POST /v3/company/:realmId/invoice`
- `GET /v3/company/:realmId/invoice/:id`
- `POST /v3/company/:realmId/payment`
- `GET /v3/company/:realmId/account/:id`
- `GET /intuit/inspect/state`
- `GET /inspect/contract`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
intuit:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account)
- [api-emulator](https://github.com/jsj/api-emulator)
