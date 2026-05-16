# @api-emulator/nextdoor

Nextdoor provides neighborhood social APIs for member profiles, publishing posts, and local search workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/nextdoor
```

## Run

```bash
npx -p api-emulator api --plugin ./@nextdoor/api-emulator.mjs --service nextdoor
```

## Endpoints

- `GET /me`
- `GET /me/profiles`
- `GET /posts`
- `POST /posts`
- `GET /posts/:id`
- `GET /search-posts`
- `GET /search/posts`
- `GET /search-businesses`
- `GET /search/businesses`
- `GET /nextdoor/inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
nextdoor:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.nextdoor.com/reference/me-1)
- [api-emulator](https://github.com/jsj/api-emulator)
