# @api-emulator/modal

Modal provides serverless Python compute control-plane APIs for apps, environments, secrets, volumes, workspaces, and tokens.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/modal
```

## Run

```bash
npx -p api-emulator api --plugin ./@modal/api-emulator.mjs --service modal
```

## Endpoints

- `GET /modal/inspect/state`
- `POST /modal/inspect/reset`
- `GET /modal/v1/token/info`
- `GET /modal/v1/workspace`
- `GET /modal/v1/environments`
- `POST /modal/v1/environments`
- `GET /modal/v1/apps`
- `POST /modal/v1/apps`
- `GET /modal/v1/apps/:app_id`
- `PATCH /modal/v1/apps/:app_id`
- `DELETE /modal/v1/apps/:app_id`
- `GET /modal/v1/secrets`
- `POST /modal/v1/secrets`
- `GET /modal/v1/volumes`
- `POST /modal/v1/volumes`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
modal:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://modal.com/docs/reference)
- [api-emulator](https://github.com/jsj/api-emulator)
