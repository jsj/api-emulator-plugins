# @api-emulator/google-maps

Google Maps Places APIs provide text search, nearby search, autocomplete, details, and field-mask workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/google-maps
```

## Run

```bash
npx -p api-emulator api --plugin ./@google-maps/api-emulator.mjs --service google-maps
```

## Endpoints

- `POST /v1/places:searchText`
- `POST /v1/places:searchNearby`
- `POST /v1/places:autocomplete`
- `GET /v1/places/:placeId/photos/:photoId/media`
- `GET /v1/places/:placeId`
- `GET /google-maps/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
google-maps:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developers.google.com/maps/documentation/places/web-service/reference/rest)
- [api-emulator](https://github.com/jsj/api-emulator)
