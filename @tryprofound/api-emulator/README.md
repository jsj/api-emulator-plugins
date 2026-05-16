# @api-emulator/tryprofound

TryProfound provides AI search analytics APIs for organizations, prompts, reports, agents, knowledge bases, and content optimization.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/tryprofound
```

## Run

```bash
npx -p api-emulator api --plugin ./@tryprofound/api-emulator.mjs --service tryprofound
```

## Endpoints

- `GET /v1/org`
- `GET /v1/org/domains`
- `GET /v1/org/personas`
- `GET /v1/org/assets`
- `GET /v1/org/models`
- `GET /v1/org/regions`
- `GET /v1/org/categories`
- `GET /v1/org/categories/:categoryId/assets`
- `GET /v1/org/categories/:categoryId/personas`
- `GET /v1/org/categories/:categoryId/prompts`
- `GET /v1/org/categories/:categoryId/tags`
- `GET /v1/org/categories/:categoryId/topics`
- `POST /v1/org/categories/:categoryId/prompts`
- `PATCH /v1/org/categories/:categoryId/prompts/status`
- `PATCH /v1/org/categories/:categoryId/prompts`
- `POST /v1/prompts/answers`
- `GET /v1/content/:assetId/optimization`
- `GET /v1/content/:assetId/optimization/:contentId`
- `GET /v1/agents`
- `GET /v1/agents/:agentId`
- `POST /v1/agents/:agentId/runs`
- `GET /v1/agents/:agentId/runs/:runId`
- `GET /v1/knowledge-bases`
- `POST /v1/knowledge-bases/:knowledgeBaseId/search`
- `POST /v1/knowledge-bases/:knowledgeBaseId/documents`
- `PUT /v1/knowledge-bases/:knowledgeBaseId/documents`
- `DELETE /v1/knowledge-bases/:knowledgeBaseId/documents`
- `POST /v1/knowledge-bases/:knowledgeBaseId/folders`
- `DELETE /v1/knowledge-bases/:knowledgeBaseId/folders`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
tryprofound:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.tryprofound.com)
- [api-emulator](https://github.com/jsj/api-emulator)
