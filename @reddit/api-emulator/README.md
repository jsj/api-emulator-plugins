# @api-emulator/reddit

Reddit provides OAuth, identity, subreddit, listing, post submission, and comment APIs.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/reddit
```

## Run

```bash
npx -p api-emulator api --plugin ./@reddit/api-emulator.mjs --service reddit
```

## Endpoints

- `POST /api/v1/access_token`
- `GET /api/v1/me`
- `GET /r/:subreddit/about`
- `GET /r/:subreddit/hot`
- `GET /r/:subreddit/new`
- `POST /api/submit`
- `GET /reddit/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
reddit:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://www.reddit.com/dev/api/)
- [api-emulator](https://github.com/jsj/api-emulator)
