# @api-emulator/wolfram

Wolfram APIs provide short answers, full query results, spoken results, and LLM-ready computational answers.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/wolfram
```

## Run

```bash
npx -p api-emulator api --plugin ./@wolfram/api-emulator.mjs --service wolfram
```

## Endpoints

- `GET /v1/result`
- `GET /v1/spoken`
- `GET /v1/simple`
- `GET /v2/query`
- `GET /api/v1/llm-api`
- `GET /wolfram/inspect/contract`
- `GET /wolfram/inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
wolfram:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://products.wolframalpha.com/api)
- [api-emulator](https://github.com/jsj/api-emulator)
