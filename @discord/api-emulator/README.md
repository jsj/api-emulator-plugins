# @api-emulator/discord

Discord provides community, messaging, guild, channel, bot, and interaction APIs.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/discord
```

## Run

```bash
npx -p api-emulator api --plugin ./@discord/api-emulator/src/index.ts --service discord
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
discord:
  # Add provider-specific seed state here.
```

## Links

- [api-emulator](https://github.com/jsj/api-emulator)
