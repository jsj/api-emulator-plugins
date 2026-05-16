# @api-emulator/browserbase

Browserbase provides hosted browser sessions for web automation, scraping, and agent workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/browserbase
```

## Run

```bash
npx -p api-emulator api --plugin ./@browserbase/api-emulator.mjs --service browserbase
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
browserbase:
  # Add provider-specific seed state here.
```

## Links

- [api-emulator](https://github.com/jsj/api-emulator)
