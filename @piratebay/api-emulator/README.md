# @api-emulator/piratebay

Pirate Bay provides generic media index fixtures for search, item metadata, playback, and library-style workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/piratebay
```

## Run

```bash
npx -p api-emulator api --plugin ./@piratebay/api-emulator.mjs --service piratebay
```

## Endpoints

- `GET /System/Info/Public`
- `POST /Users/AuthenticateByName`
- `GET /Users/Public`
- `GET /Users/:userId/Views`
- `GET /Users/:userId/Items`
- `GET /Users/:userId/Items/Latest`
- `GET /Users/:userId/Items/Resume`
- `POST /Users/:userId/FavoriteItems/:itemId`
- `DELETE /Users/:userId/FavoriteItems/:itemId`
- `GET /Users/:userId/Items/:itemId`
- `GET /Search/Hints`
- `POST /Items/:itemId/PlaybackInfo`
- `GET /Videos/:itemId/stream`
- `POST /Sessions/Playing`
- `POST /Sessions/Playing/Progress`
- `POST /Sessions/Playing/Stopped`
- `GET /Items/:itemId/Images/:imageType`
- `GET /inspect/last-authenticate`
- `GET /inspect/last-playback-info`
- `GET /inspect/last-playing`
- `GET /inspect/last-progress`
- `GET /inspect/last-stopped`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
piratebay:
  # Add provider-specific seed state here.
```

## Links

- [api-emulator](https://github.com/jsj/api-emulator)
