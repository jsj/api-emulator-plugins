# @api-emulator/pinterest

Pinterest REST API v5 provides user account, board, and pin creation/listing workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/pinterest
```

## Run

```bash
npx -p api-emulator api --plugin ./@pinterest/api-emulator.mjs --service pinterest
```

## Endpoints

- `GET /v5/user_account`
- `GET /v5/boards`
- `POST /v5/boards`
- `GET /v5/boards/:id`
- `PATCH /v5/boards/:id`
- `DELETE /v5/boards/:id`
- `GET /v5/boards/:id/pins`
- `GET /v5/pins`
- `POST /v5/pins`
- `GET /v5/pins/:id`
- `PATCH /v5/pins/:id`
- `DELETE /v5/pins/:id`
- `GET /v5/ad_accounts`
- `GET /v5/catalogs`
- `GET /pinterest/inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
pinterest:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developers.pinterest.com/docs/api/v5/)
- [api-emulator](https://github.com/jsj/api-emulator)
