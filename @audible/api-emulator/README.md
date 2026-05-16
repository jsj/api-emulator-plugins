# @api-emulator/audible

Audible provides audiobook catalog, library, review, and wishlist API surfaces for local client compatibility tests.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/audible
```

## Run

```bash
npx -p api-emulator api --plugin ./@audible/api-emulator.mjs --service audible
```

## Endpoints

- `GET /1.0/catalog/products`
- `GET /1.0/catalog/products/:asin`
- `GET /1.0/catalog/products/:asin/reviews`
- `GET /1.0/library`
- `GET /1.0/library/:asin`
- `GET /1.0/wishlist`
- `POST /1.0/wishlist`
- `DELETE /1.0/wishlist/:asin`
- `GET /audible/inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
audible:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://audible.readthedocs.io/en/latest/misc/external_api.html)
- [api-emulator](https://github.com/jsj/api-emulator)
