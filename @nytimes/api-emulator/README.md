# @api-emulator/nytimes

The New York Times APIs provide article search, archive, top stories, books, and public content datasets.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/nytimes
```

## Run

```bash
npx -p api-emulator api --plugin ./@nytimes/api-emulator.mjs --service nytimes
```

## Endpoints

- `GET /svc/search/v2/articlesearch.json`
- `GET /svc/archive/v1/:year/:month.json`
- `GET /svc/topstories/v2/:section{.+}`
- `GET /svc/books/v3/lists/current/:list.json`
- `GET /nytimes/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
nytimes:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.nytimes.com/apis)
- [api-emulator](https://github.com/jsj/api-emulator)
