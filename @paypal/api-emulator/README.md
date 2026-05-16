# @api-emulator/paypal

PayPal provides payments APIs for OAuth, checkout orders, captures, refunds, webhooks, and transaction workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/paypal
```

## Run

```bash
npx -p api-emulator api --plugin ./@paypal/api-emulator.mjs --service paypal
```

## Endpoints

- `POST /v1/oauth2/token`
- `POST /v2/checkout/orders`
- `GET /v2/checkout/orders/:id`
- `POST /v2/checkout/orders/:id/capture`
- `GET /v2/payments/captures/:id`
- `POST /v2/payments/captures/:id/refund`
- `GET /v2/payments/refunds/:id`
- `GET /paypal/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
paypal:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.paypal.com/docs/api/)
- [api-emulator](https://github.com/jsj/api-emulator)
