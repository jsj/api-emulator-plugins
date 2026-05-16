# @api-emulator/playstation

PlayStation publishing-style APIs provide Content Pipeline concepts, products, variants, assets, and publish history workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/playstation
```

## Run

```bash
npx -p api-emulator api --plugin ./@playstation/api-emulator.mjs --service playstation
```

## Endpoints

- `GET /api/v1/concepts/count`
- `GET /api/v1/concepts`
- `POST /api/v1/create/concepts/products`
- `GET /api/v1/concepts/:conceptId`
- `GET /api/v1/concepts/:conceptId/products`
- `POST /api/v1/create/concepts/products/add`
- `GET /api/v1/concepts/products/:productId`
- `GET /api/v1/products/count`
- `GET /api/v1/products/details`
- `POST /api/v1/create/concepts/products/variant`
- `POST /api/v1/create/concepts/products/variant/metadata`
- `GET /api/v1/concepts/:conceptId/products/:productId/variant/:variantId/metadata`
- `GET /api/v1/concepts/:conceptId/products/:productId/variant/:variantId/preview`
- `GET /api/v1/assets`
- `GET /api/v1/assets/statuses`
- `GET /api/v1/assets/:assetId`
- `GET /api/v1/contentservice/publishinfo/search`
- `POST /api/v1/contentservice/publish`
- `GET /api/v1/publishHistory`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
playstation:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://partners.playstation.net/)
- [api-emulator](https://github.com/jsj/api-emulator)
