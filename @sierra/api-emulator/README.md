# @api-emulator/sierra

Sierra provides AI customer-service agent SDK surfaces for mobile chat embeds, voice SVP transport probes, and conversation fixtures.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/sierra
```

## Run

```bash
npx -p api-emulator api --plugin ./@sierra/api-emulator.mjs --service sierra
```

## Endpoints

- `GET /agent/:token/mobile`
- `GET /chat/voice/svp/:token`
- `GET /inspect/contract`
- `GET /inspect/state`
- `GET /sierra/inspect/contract`
- `GET /sierra/inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
sierra:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://github.com/sierra-inc/sierra-react-native-sdk)
- [api-emulator](https://github.com/jsj/api-emulator)
