# @api-emulator/x

X API provides OAuth, users, tweets, timelines, and social publishing workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/x
```

## Run

```bash
npx -p api-emulator api --plugin ./@x/api-emulator.mjs --service x
```

## Endpoints

- `POST /2/oauth2/token`
- `GET /2/users/me`
- `GET /2/users/:id`
- `GET /2/users/:id/tweets`
- `GET /2/tweets`
- `POST /2/tweets`
- `GET /x/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
x:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.x.com/en/docs/x-api)
- [api-emulator](https://github.com/jsj/api-emulator)
