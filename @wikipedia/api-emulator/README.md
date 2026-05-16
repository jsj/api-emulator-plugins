# @api-emulator/wikipedia

Wikipedia provides Wikimedia REST and MediaWiki Action API read surfaces for page summaries, search, extracts, and content retrieval.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/wikipedia
```

## Run

```bash
npx -p api-emulator api --plugin ./@wikipedia/api-emulator.mjs --service wikipedia
```

## Endpoints

- `GET /api/rest_v1/page/summary/:title{.+}`
- `GET /w/rest.php/v1/search/page`
- `GET /w/rest.php/v1/search/title`
- `GET /w/rest.php/v1/page/:title/bare`
- `GET /w/rest.php/v1/page/:title/html`
- `GET /w/rest.php/v1/page/:title`
- `GET /w/api.php`
- `GET /wikipedia/inspect/state`
- `GET /wikipedia/inspect/contract`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
wikipedia:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://www.mediawiki.org/wiki/Wikimedia_REST_API)
- [api-emulator](https://github.com/jsj/api-emulator)
