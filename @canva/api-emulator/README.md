# @api-emulator/canva

Canva Connect APIs provide user, design, asset upload, import, and export workflows for Canva-integrated apps.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/canva
```

## Run

```bash
npx -p api-emulator api --plugin ./@canva/api-emulator.mjs --service canva
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
canva:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://www.canva.dev/docs/connect/)
- [api-emulator](https://github.com/jsj/api-emulator)
