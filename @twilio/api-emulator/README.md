# @api-emulator/twilio

Twilio provides communications APIs for messaging, phone numbers, verification, voice, and customer engagement.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/twilio
```

## Run

```bash
npx -p api-emulator api --plugin ./@twilio/api-emulator/src/index.ts --service twilio
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
twilio:
  # Add provider-specific seed state here.
```

## Links

- [api-emulator](https://github.com/jsj/api-emulator)
