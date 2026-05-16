# @api-emulator/prime-music

Prime Music provides Amazon Music-compatible APIs for catalog search, tracks, albums, playlists, library saves, and playback controls.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/prime-music
```

## Run

```bash
npx -p api-emulator api --plugin ./@prime-music/api-emulator.mjs --service prime-music
```

## Endpoints

- `GET /v1/me`
- `GET /v1/search`
- `GET /v1/tracks/:id`
- `GET /v1/albums/:id`
- `GET /v1/playlists/:id`
- `GET /v1/me/library/tracks`
- `PUT /v1/me/library/tracks/:id`
- `DELETE /v1/me/library/tracks/:id`
- `GET /v1/me/player`
- `PUT /v1/me/player/play`
- `PUT /v1/me/player/pause`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
prime-music:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.amazon.com/docs/music/API_web_overview.html)
- [api-emulator](https://github.com/jsj/api-emulator)
