# @api-emulator/apple-music

Apple Music provides MusicKit and iTunes Search APIs for catalog search, songs, albums, artists, library playlists, and playlist tracks.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/apple-music
```

## Run

```bash
npx -p api-emulator api --plugin ./@apple-music/api-emulator.mjs --service apple-music
```

## Endpoints

- `GET /search`
- `GET /v1/catalog/:storefront/search`
- `GET /v1/catalog/:storefront/songs/:id`
- `GET /v1/catalog/:storefront/albums/:id`
- `GET /v1/catalog/:storefront/artists/:id`
- `GET /v1/me/library/playlists`
- `POST /v1/me/library/playlists`
- `GET /v1/me/library/playlists/:id`
- `PUT /v1/me/library/playlists/:id`
- `DELETE /v1/me/library/playlists/:id`
- `GET /v1/me/library/playlists/:id/tracks`
- `POST /v1/me/library/playlists/:id/tracks`
- `DELETE /v1/me/library/playlists/:id/tracks`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
apple-music:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.apple.com/documentation/applemusicapi)
- [api-emulator](https://github.com/jsj/api-emulator)
