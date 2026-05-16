# @api-emulator/baseten

Baseten provides model deployment, management, and inference APIs including OpenAI-compatible model endpoints.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/baseten
```

## Run

```bash
npx -p api-emulator api --plugin ./@baseten/api-emulator.mjs --service baseten
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
baseten:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.baseten.co/api-reference/overview)
- [api-emulator](https://github.com/jsj/api-emulator)
