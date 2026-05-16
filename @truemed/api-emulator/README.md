# @api-emulator/truemed

Truemed provides HSA/FSA payment APIs for checkout sessions, payment tokens, qualification sessions, product catalog eligibility, captures, voids, and refunds.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/truemed
```

## Run

```bash
npx -p api-emulator api --plugin ./@truemed/api-emulator.mjs --service truemed
```

## Endpoints

- `POST /payments/v1/create_payment_session`
- `GET /payments/v1/payment_session/:businessId`
- `GET /payments/v1/payment_sessions`
- `POST /payments/v1/payment_session/:businessId/capture`
- `POST /payments/v1/payment_session/:businessId/cancel`
- `POST /payments/v1/payment_session/:businessId/void`
- `POST /payments/v1/refund`
- `POST /api/v1/payment_tokens/create`
- `GET /api/v1/payment_tokens/:paymentToken`
- `GET /api/v1/payment_tokens`
- `POST /api/v1/payment_tokens/:paymentToken/update`
- `POST /api/v1/payment_tokens/:paymentToken/delete`
- `GET /api/v1/payment_tokens/provision_request/:provisionTokenRequestId`
- `GET /api/v1/qualification_session/:qualificationSessionId`
- `GET /api/v1/qualification_sessions`
- `POST /api/v1/product_catalog/truemed_checkout_method`
- `POST /api/v1/product_catalog/items/create`
- `POST /api/v1/product_catalog/items/update`
- `POST /api/v1/product_catalog/items/detail`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
truemed:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developers.truemed.com/openapi.json)
- [api-emulator](https://github.com/jsj/api-emulator)
