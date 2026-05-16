# @api-emulator/replit

Replit provides extension Data API and GraphQL surfaces for users, Repls, and extension public key workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/replit
```

## Run

```bash
npx -p api-emulator api --plugin ./@replit/api-emulator.mjs --service replit
```

## Endpoints

- `POST /graphql`
- `GET /data/extensions/publicKey/:kid`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
replit:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.replit.com/extensions/api/data)
- [api-emulator](https://github.com/jsj/api-emulator)
