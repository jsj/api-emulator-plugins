# @api-emulator/greptile

Greptile provides AI codebase indexing, semantic search, and repository question-answering APIs.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/greptile
```

## Run

```bash
npx -p api-emulator api --plugin ./@greptile/api-emulator.mjs --service greptile
```

## Endpoints

- `POST /v2/repositories`
- `GET /v2/repositories/:repositoryId`
- `POST /v2/query`
- `POST /v2/search`
- `GET /greptile/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
greptile:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://www.greptile.com/docs/api-reference/introduction)
- [api-emulator](https://github.com/jsj/api-emulator)
