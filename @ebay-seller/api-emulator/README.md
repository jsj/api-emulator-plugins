# @api-emulator/ebay-seller

eBay Seller APIs provide OAuth, inventory item, offer, and marketplace selling workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/ebay-seller
```

## Run

```bash
npx -p api-emulator api --plugin ./@ebay-seller/api-emulator.mjs --service ebay-seller
```

## Endpoints

- `POST /identity/v1/oauth2/token`
- `GET /sell/inventory/v1/inventory_item/:sku`
- `PUT /sell/inventory/v1/inventory_item/:sku`
- `GET /sell/inventory/v1/inventory_item`
- `POST /sell/inventory/v1/offer`
- `GET /ebay-seller/inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
ebay-seller:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.ebay.com/api-docs)
- [api-emulator](https://github.com/jsj/api-emulator)
