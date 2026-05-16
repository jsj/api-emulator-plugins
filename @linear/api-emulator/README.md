# @api-emulator/linear

Linear provides issue tracking, teams, projects, cycles, workflow states, and product planning APIs.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/linear
```

## Run

```bash
npx -p api-emulator api --plugin ./@linear/api-emulator/src/index.ts --service linear
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
linear:
  # Add provider-specific seed state here.
```

## Links

- [api-emulator](https://github.com/jsj/api-emulator)
