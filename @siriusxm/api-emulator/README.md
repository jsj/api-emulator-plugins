# @api-emulator/siriusxm

SiriusXM provides channel lineup, now-playing metadata, recent track, profile, and favorite channel workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/siriusxm
```

## Run

```bash
npx -p api-emulator api --plugin ./@siriusxm/api-emulator.mjs --service siriusxm
```

## Endpoints

- `GET /v1/me`
- `GET /v1/channels`
- `GET /v1/channels/:id`
- `GET /v1/channels/:id/now-playing`
- `GET /v1/channels/:id/tracks`
- `GET /v1/me/favorites/channels`
- `PUT /v1/me/favorites/channels/:id`
- `DELETE /v1/me/favorites/channels/:id`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
siriusxm:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://www.siriusxm.com/channels and https://xmplaylist.com/docs)
- [api-emulator](https://github.com/jsj/api-emulator)
