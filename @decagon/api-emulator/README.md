# @api-emulator/decagon

Decagon provides AI customer-support APIs for outbound chat messages and support automation workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/decagon
```

## Run

```bash
npx -p api-emulator api --plugin ./@decagon/api-emulator.mjs --service decagon
```

## Endpoints

- `POST /chat/outbound`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
decagon:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.decagon.ai/api-reference/getting-started)
- [api-emulator](https://github.com/jsj/api-emulator)
