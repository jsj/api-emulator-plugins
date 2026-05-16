# @api-emulator/apple-maps

Apple Maps Server API provides map tokens, search, geocoding, and reverse geocoding for location-aware apps.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/apple-maps
```

## Run

```bash
npx -p api-emulator api --plugin ./@apple-maps/api-emulator.mjs --service apple-maps
```

## Endpoints

- `GET /v1/token`
- `GET /v1/search`
- `GET /v1/geocode`
- `GET /v1/reverseGeocode`
- `GET /apple-maps/inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
apple-maps:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.apple.com/documentation/applemapsserverapi/)
- [api-emulator](https://github.com/jsj/api-emulator)
