# @api-emulator/workato

Workato provides automation APIs for recipes, connections, folders, jobs, and manifest export workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/workato
```

## Run

```bash
npx -p api-emulator api --plugin ./@workato/api-emulator.mjs --service workato
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
workato:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.workato.com/workato-api.html)
- [api-emulator](https://github.com/jsj/api-emulator)
