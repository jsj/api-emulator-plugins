# @api-emulator/exa

Exa provides neural search, contents, similar-link discovery, and answer APIs for AI agent retrieval workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/exa
```

## Run

```bash
npx -p api-emulator api --plugin ./@exa/api-emulator.mjs --service exa
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
exa:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.exa.ai)
- [api-emulator](https://github.com/jsj/api-emulator)
