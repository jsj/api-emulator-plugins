# @api-emulator/fireworks

Fireworks AI provides OpenAI-compatible inference APIs for model listing, chat completions, completions, and embeddings.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/fireworks
```

## Run

```bash
npx -p api-emulator api --plugin ./@fireworks/api-emulator.mjs --service fireworks
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
fireworks:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.fireworks.ai/api-reference/post-chatcompletions)
- [api-emulator](https://github.com/jsj/api-emulator)
