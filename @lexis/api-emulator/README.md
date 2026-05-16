# @api-emulator/lexis

Lexis provides legal research APIs for sources, search, documents, folders, and Web Services API-compatible aliases.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/lexis
```

## Run

```bash
npx -p api-emulator api --plugin ./@lexis/api-emulator.mjs --service lexis
```

## Endpoints

- `GET /v1/me`
- `GET /v1/sources`
- `POST /v1/search`
- `GET /v1/documents/:documentId`
- `GET /v1/folders`
- `POST /v1/folders`
- `GET /wsapi/rest/sources`
- `POST /wsapi/rest/search`
- `GET /wsapi/rest/documents/:documentId`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
lexis:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://www.lexisnexis.com/en-us/products/lexis-api.page)
- [api-emulator](https://github.com/jsj/api-emulator)
