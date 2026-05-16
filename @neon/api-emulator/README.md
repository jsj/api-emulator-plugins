# @api-emulator/neon

Neon provides serverless Postgres with projects, branches, databases, roles, endpoints, and previews.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/neon
```

## Run

```bash
npx -p api-emulator api --plugin ./@neon/api-emulator.mjs --service neon
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
neon:
  # Add provider-specific seed state here.
```

## Links

- [api-emulator](https://github.com/jsj/api-emulator)
