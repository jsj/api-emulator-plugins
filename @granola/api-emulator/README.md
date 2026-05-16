# @api-emulator/granola

Granola provides programmatic access to meeting notes, transcripts, participants, and summaries.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/granola
```

## Run

```bash
npx -p api-emulator api --plugin ./@granola/api-emulator.mjs --service granola
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
granola:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.granola.ai/introduction)
- [api-emulator](https://github.com/jsj/api-emulator)
