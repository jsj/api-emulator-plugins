# @api-emulator/backblaze

Backblaze B2 provides cloud storage APIs for account authorization, bucket management, and object storage workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/backblaze
```

## Run

```bash
npx -p api-emulator api --plugin ./@backblaze/api-emulator.mjs --service backblaze
```

## Endpoints

- `GET /b2api/v4/b2_authorize_account`
- `GET /b2api/v3/b2_authorize_account`
- `POST /b2api/v4/b2_list_buckets`
- `POST /b2api/v4/b2_create_bucket`
- `POST /b2api/v4/b2_delete_bucket`
- `GET /backblaze/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
backblaze:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://www.backblaze.com/apidocs/introduction-to-the-b2-native-api)
- [api-emulator](https://github.com/jsj/api-emulator)
