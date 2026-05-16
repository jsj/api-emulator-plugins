# @api-emulator/shopify

Shopify Admin APIs provide shop, products, orders, inventory, customers, and GraphQL commerce workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/shopify
```

## Run

```bash
npx -p api-emulator api --plugin ./@shopify/api-emulator.mjs --service shopify
```

## Endpoints

- `GET /admin/api/:version/shop.json`
- `GET /admin/api/:version/products.json`
- `POST /admin/api/:version/products.json`
- `GET /admin/api/:version/products/:id.json`
- `GET /admin/api/:version/orders.json`
- `POST /admin/api/:version/graphql.json`
- `GET /shopify/inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
shopify:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://shopify.dev/docs/api)
- [api-emulator](https://github.com/jsj/api-emulator)
