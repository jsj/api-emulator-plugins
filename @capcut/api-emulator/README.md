# @api-emulator/capcut

CapCut-style creative APIs manage templates, projects, media inputs, and render task polling for video automation workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/capcut
```

## Run

```bash
npx -p api-emulator api --plugin ./@capcut/api-emulator.mjs --service capcut
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
capcut:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://www.capcut.com/)
- [api-emulator](https://github.com/jsj/api-emulator)
