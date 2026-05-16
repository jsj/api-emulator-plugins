# @api-emulator/zapier

Zapier provides automation APIs for apps, Zaps, task history, and webhook trigger workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/zapier
```

## Run

```bash
npx -p api-emulator api --plugin ./@zapier/api-emulator.mjs --service zapier
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
zapier:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.zapier.com/platform/home)
- [api-emulator](https://github.com/jsj/api-emulator)
