# @api-emulator/mercury

Mercury provides banking APIs for accounts, transactions, recipients, and payment approval workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/mercury
```

## Run

```bash
npx -p api-emulator api --plugin ./@mercury/api-emulator.mjs --service mercury
```

## Endpoints

- `GET ${prefix}/accounts`
- `GET ${prefix}/account/:accountId`
- `GET ${prefix}/transactions`
- `GET ${prefix}/transaction/:transactionId`
- `GET ${prefix}/recipients`
- `POST ${prefix}/recipients`
- `GET ${prefix}/recipient/:recipientId`
- `POST ${prefix}/recipient/:recipientId`
- `POST ${prefix}/account/:accountId/request-send-money`
- `POST ${prefix}/account/:accountId/transactions`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
mercury:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.mercury.com/docs/welcome)
- [api-emulator](https://github.com/jsj/api-emulator)
