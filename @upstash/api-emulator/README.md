# @api-emulator/upstash

Upstash provides serverless data and messaging APIs for Redis, QStash, Kafka-style streams, and workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/upstash
```

## Run

```bash
npx -p api-emulator api --plugin ./@upstash/api-emulator.mjs --service upstash
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
upstash:
  # Add provider-specific seed state here.
```

## Links

- [api-emulator](https://github.com/jsj/api-emulator)
