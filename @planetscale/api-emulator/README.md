# @api-emulator/planetscale

PlanetScale provides MySQL database branching, organizations, deploy requests, passwords, and workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/planetscale
```

## Run

```bash
npx -p api-emulator api --plugin ./@planetscale/api-emulator.mjs --service planetscale
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
planetscale:
  # Add provider-specific seed state here.
```

## Links

- [api-emulator](https://github.com/jsj/api-emulator)
