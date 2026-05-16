# @api-emulator/patreon

Patreon API v2 provides JSON:API resources for OAuth, identity, campaigns, members, posts, and webhooks.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/patreon
```

## Run

```bash
npx -p api-emulator api --plugin ./@patreon/api-emulator.mjs --service patreon
```

## Endpoints

- `POST /api/oauth2/token`
- `GET /api/oauth2/v2/identity`
- `GET /api/oauth2/v2/campaigns`
- `GET /api/oauth2/v2/campaigns/:id`
- `GET /api/oauth2/v2/campaigns/:id/members`
- `GET /api/oauth2/v2/campaigns/:id/tiers`
- `GET /api/oauth2/v2/members/:id`
- `GET /api/oauth2/v2/campaigns/:id/posts`
- `GET /api/oauth2/v2/posts/:id`
- `GET /api/oauth2/v2/webhooks`
- `POST /api/oauth2/v2/webhooks`
- `PATCH /api/oauth2/v2/webhooks/:id`
- `DELETE /api/oauth2/v2/webhooks/:id`
- `POST /api/oauth2/v2/lives`
- `GET /api/oauth2/v2/lives/:id`
- `PATCH /api/oauth2/v2/lives/:id`
- `GET /patreon/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
patreon:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.patreon.com/)
- [api-emulator](https://github.com/jsj/api-emulator)
