# @api-emulator/mintlify

Mintlify provides documentation deployment, preview, assistant, search, page content, and analytics APIs.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/mintlify
```

## Run

```bash
npx -p api-emulator api --plugin ./@mintlify/api-emulator.mjs --service mintlify
```

## Endpoints

- `GET /v1/agent/:projectId/jobs`
- `POST /v2/agent/:projectId/job/:id/message`
- `GET /v1/analytics/feedback`
- `GET /v1/analytics/feedback-by-page`
- `GET /v1/analytics/assistant-conversations`
- `GET /v1/analytics/assistant-caller-stats`
- `GET /v1/analytics/searches`
- `GET /v1/analytics/views`
- `GET /v1/analytics/visitors`
- `GET /mintlify/inspect/contract`
- `GET /mintlify/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
mintlify:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://www.mintlify.com/docs/api/introduction)
- [api-emulator](https://github.com/jsj/api-emulator)
