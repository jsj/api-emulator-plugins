# @api-emulator/substack

Substack-compatible APIs provide publication metadata, newsletter posts, drafts, and subscribers.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/substack
```

## Run

```bash
npx -p api-emulator api --plugin ./@substack/api-emulator.mjs --service substack
```

## Endpoints

- `GET /api/v1/publication`
- `GET /api/v1/posts`
- `GET /api/v1/posts/:id`
- `POST /api/v1/posts`
- `PATCH /api/v1/posts/:id`
- `DELETE /api/v1/posts/:id`
- `GET /api/v1/subscribers`
- `POST /api/v1/subscribers`
- `GET /api/v1/posts/:id/comments`
- `POST /api/v1/posts/:id/comments`
- `GET /api/v1/recommendations`
- `GET /substack/inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
substack:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://substack-api.readthedocs.io/)
- [api-emulator](https://github.com/jsj/api-emulator)
