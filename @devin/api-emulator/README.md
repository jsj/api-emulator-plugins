# @api-emulator/devin

Devin provides AI engineering agent APIs for sessions, messages, PR reviews, users, and knowledge notes.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/devin
```

## Run

```bash
npx -p api-emulator api --plugin ./@devin/api-emulator.mjs --service devin
```

## Endpoints

- `GET /v3/self`
- `GET /v3/enterprise/organizations/:orgId/members/users`
- `GET /v3/organizations/:orgId/sessions`
- `POST /v3/organizations/:orgId/sessions`
- `GET /v3/organizations/:orgId/sessions/:devinId`
- `POST /v3/organizations/:orgId/sessions/:devinId/messages`
- `GET /v3/organizations/:orgId/pr-reviews`
- `POST /v3/organizations/:orgId/pr-reviews`
- `POST /v3/organizations/:orgId/knowledge/notes`
- `GET /devin/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
devin:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.devin.ai/api-reference/overview)
- [api-emulator](https://github.com/jsj/api-emulator)
