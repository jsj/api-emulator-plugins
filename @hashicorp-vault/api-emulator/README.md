# @api-emulator/hashicorp-vault

HashiCorp Vault provides secrets-management APIs for health checks, mounts, and KV v2 secret read/write/list workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/hashicorp-vault
```

## Run

```bash
npx -p api-emulator api --plugin ./@hashicorp-vault/api-emulator.mjs --service hashicorp-vault
```

## Endpoints

- `GET /v1/sys/seal-status`
- `GET /v1/sys/health`
- `GET /v1/sys/mounts`
- `POST /v1/sys/mounts/:path`
- `GET /v1/sys/internal/ui/mounts/:path{.+}`
- `POST /v1/:mount/data/:path{.+}`
- `GET /v1/:mount/data/:path{.+}`
- `GET /v1/:mount/metadata/:path{.+}`
- `GET /v1/:mount/metadata`
- `GET /hashicorp-vault/inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
hashicorp-vault:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.hashicorp.com/vault/api-docs)
- [api-emulator](https://github.com/jsj/api-emulator)
