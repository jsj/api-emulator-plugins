# @api-emulator/amazon-seller

Amazon Selling Partner API provides seller marketplace, orders, inventory, and restricted data token workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/amazon-seller
```

## Run

```bash
npx -p api-emulator api --plugin ./@amazon-seller/api-emulator.mjs --service amazon-seller
```

## Endpoints

- `POST /auth/o2/token`
- `GET /sellers/v1/marketplaceParticipations`
- `GET /orders/v0/orders`
- `GET /orders/v0/orders/:orderId`
- `POST /tokens/2021-03-01/restrictedDataToken`
- `GET /amazon-seller/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
amazon-seller:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer-docs.amazon.com/sp-api)
- [api-emulator](https://github.com/jsj/api-emulator)
