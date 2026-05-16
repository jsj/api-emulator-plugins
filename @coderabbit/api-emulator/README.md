# @api-emulator/coderabbit

CodeRabbit provides code-review automation APIs for users, seats, roles, review metrics, and audit logs.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/coderabbit
```

## Run

```bash
npx -p api-emulator api --plugin ./@coderabbit/api-emulator.mjs --service coderabbit
```

## Endpoints

- `GET /v1/users`
- `POST /v1/users/seats`
- `POST /v1/users/roles`
- `GET /v1/metrics/reviews`
- `GET /v1/audit-logs`
- `GET /coderabbit/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
coderabbit:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.coderabbit.ai/api-reference)
- [api-emulator](https://github.com/jsj/api-emulator)
