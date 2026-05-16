# @api-emulator/postbridge

Post Bridge provides social media scheduling APIs for connected accounts, draft posts, scheduled posts, and publishing.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/postbridge
```

## Run

```bash
npx -p api-emulator api --plugin ./@postbridge/api-emulator.mjs --service postbridge
```

## Endpoints

- `GET /v1/me`
- `GET /v1/accounts`
- `GET /v1/accounts/:id`
- `GET /v1/media`
- `POST /v1/media`
- `GET /v1/posts`
- `GET /v1/posts/:id`
- `POST /v1/posts`
- `PATCH /v1/posts/:id`
- `DELETE /v1/posts/:id`
- `POST /v1/posts/:id/publish`
- `GET /v1/analytics/posts/:id`
- `GET /postbridge/inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
postbridge:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://support.post-bridge.com/api)
- [api-emulator](https://github.com/jsj/api-emulator)
