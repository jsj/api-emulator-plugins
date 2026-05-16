# @api-emulator/mediawiki

MediaWiki provides Action API and page summary APIs for Wikipedia, Wikimedia Commons, Wiktionary, Wikidata, and Fandom-style wiki workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/mediawiki
```

## Run

```bash
npx -p api-emulator api --plugin ./@mediawiki/api-emulator.mjs --service mediawiki
```

## Endpoints

- `GET /api.php`
- `POST /api.php`
- `GET /w/api.php`
- `POST /w/api.php`
- `GET /api/rest_v1/page/summary/:title`
- `GET /w/rest.php/v1/page/:title/summary`
- `GET /mediawiki/inspect/contract`
- `GET /mediawiki/inspect/state`
- `GET /mediawiki/inspect/popular`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
mediawiki:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://www.mediawiki.org/wiki/API:Action_API)
- [api-emulator](https://github.com/jsj/api-emulator)
