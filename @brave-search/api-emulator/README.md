# @api-emulator/brave-search

Brave Search provides web, news, and suggestion search APIs for agentic retrieval and SERP-style workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/brave-search
```

## Run

```bash
npx -p api-emulator api --plugin ./@brave-search/api-emulator.mjs --service brave-search
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
brave-search:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://api.search.brave.com)
- [api-emulator](https://github.com/jsj/api-emulator)
