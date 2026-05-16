# @api-emulator/retool

Retool provides organization APIs for users, groups, folders, apps, resources, source control, and permissions.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/retool
```

## Run

```bash
npx -p api-emulator api --plugin ./@retool/api-emulator.mjs --service retool
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
retool:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.retool.com/reference/api/v2)
- [api-emulator](https://github.com/jsj/api-emulator)
