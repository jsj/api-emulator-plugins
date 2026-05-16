# @api-emulator/gong

Gong provides conversation intelligence APIs for users, recorded calls, transcripts, and CRM activity exports.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/gong
```

## Run

```bash
npx -p api-emulator api --plugin ./@gong/api-emulator.mjs --service gong
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
gong:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://help.gong.io/docs/what-the-gong-api-provides)
- [api-emulator](https://github.com/jsj/api-emulator)
