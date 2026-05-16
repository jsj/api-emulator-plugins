# @api-emulator/marketo

Adobe Marketo Engage provides REST APIs for OAuth, leads, lead upserts, programs, lists, and marketing assets.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/marketo
```

## Run

```bash
npx -p api-emulator api --plugin ./@marketo/api-emulator.mjs --service marketo
```

## Endpoints

- `GET /identity/oauth/token`
- `GET /rest/v1/leads.json`
- `GET /rest/v1/lead/:id.json`
- `DELETE /rest/v1/leads.json`
- `POST /rest/v1/leads.json`
- `GET /rest/v1/leads/describe.json`
- `GET /rest/asset/v1/programs.json`
- `GET /rest/asset/v1/program/:id.json`
- `GET /rest/asset/v1/staticLists.json`
- `GET /rest/asset/v1/staticList/:id.json`
- `GET /rest/v1/list/:id/leads.json`
- `POST /rest/v1/lists/:id/leads.json`
- `GET /rest/v1/activities.json`
- `GET /marketo/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
marketo:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://experienceleague.adobe.com/en/docs/marketo-developer/marketo/rest/rest-api)
- [api-emulator](https://github.com/jsj/api-emulator)
