# @api-emulator/harvey

Harvey provides legal AI APIs for vault projects, documents, search, and legal-grade completions.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/harvey
```

## Run

```bash
npx -p api-emulator api --plugin ./@harvey/api-emulator.mjs --service harvey
```

## Endpoints

- `GET /api/v1/vault/workspace/projects`
- `GET /api/v1/vault/projects/:projectId/documents`
- `GET /api/v1/vault/documents/:documentId`
- `POST /api/v1/vault/search`
- `POST /api/v1/completion`
- `POST /v2/completion`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
harvey:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developers.harvey.ai/guides/introduction)
- [api-emulator](https://github.com/jsj/api-emulator)
