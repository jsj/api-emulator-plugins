# @api-emulator/legora

Legora provides legal workspace APIs for matters, documents, workflows, review tables, and AI completions.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/legora
```

## Run

```bash
npx -p api-emulator api --plugin ./@legora/api-emulator.mjs --service legora
```

## Endpoints

- `GET /v1/workspace`
- `GET /v1/matters`
- `POST /v1/matters`
- `GET /v1/matters/:matterId/documents`
- `POST /v1/matters/:matterId/documents`
- `GET /v1/workflows`
- `POST /v1/workflows/:workflowId/runs`
- `GET /v1/review-tables/:tableId`
- `POST /v1/chat/completions`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
legora:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://legora.com/product)
- [api-emulator](https://github.com/jsj/api-emulator)
