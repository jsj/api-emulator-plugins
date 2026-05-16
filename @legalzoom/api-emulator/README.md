# @api-emulator/legalzoom

LegalZoom provides legal-services workflows for customers, products, orders, business formations, and generated documents.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/legalzoom
```

## Run

```bash
npx -p api-emulator api --plugin ./@legalzoom/api-emulator.mjs --service legalzoom
```

## Endpoints

- `GET /v1/customers`
- `POST /v1/customers`
- `GET /v1/products`
- `GET /v1/orders`
- `POST /v1/orders`
- `GET /v1/orders/:orderId`
- `POST /v1/business-formations`
- `GET /v1/business-formations/:formationId`
- `GET /v1/orders/:orderId/documents`
- `GET /v1/documents/:documentId`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
legalzoom:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://www.legalzoom.com/)
- [api-emulator](https://github.com/jsj/api-emulator)
