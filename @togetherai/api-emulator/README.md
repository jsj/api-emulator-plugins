# @api-emulator/togetherai

Together AI provides OpenAI-compatible inference, embedding, model listing, and reranking APIs.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/togetherai
```

## Run

```bash
npx -p api-emulator api --plugin ./@togetherai/api-emulator.mjs --service togetherai
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
togetherai:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.together.ai/reference/chat-completions-1)
- [api-emulator](https://github.com/jsj/api-emulator)
