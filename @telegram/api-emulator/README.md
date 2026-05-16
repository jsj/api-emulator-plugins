# @api-emulator/telegram

Telegram provides bot APIs for updates, messages, chats, webhooks, and interactive bot workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/telegram
```

## Run

```bash
npx -p api-emulator api --plugin ./@telegram/api-emulator/src/index.ts --service telegram
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
telegram:
  # Add provider-specific seed state here.
```

## Links

- [api-emulator](https://github.com/jsj/api-emulator)
