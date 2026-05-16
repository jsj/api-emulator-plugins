# @api-emulator/youtube-music

YouTube Music provides InnerTube-style APIs for search, browse, playback metadata, queues, playlists, likes, and subscriptions.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/youtube-music
```

## Run

```bash
npx -p api-emulator api --plugin ./@youtube-music/api-emulator.mjs --service youtube-music
```

## Endpoints

- `GET /`
- `POST /youtubei/v1/search`
- `POST /youtubei/v1/browse`
- `POST /youtubei/v1/player`
- `POST /youtubei/v1/next`
- `POST /youtubei/v1/playlist/create`
- `POST /youtubei/v1/browse/edit_playlist`
- `POST /youtubei/v1/like/like`
- `POST /youtubei/v1/subscription/subscribe`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
youtube-music:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://github.com/sigma67/ytmusicapi)
- [api-emulator](https://github.com/jsj/api-emulator)
