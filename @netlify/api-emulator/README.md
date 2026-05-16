# @api-emulator/netlify

Netlify provides web hosting APIs for sites, deploys, builds, environment variables, and domains.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/netlify
```

## Run

```bash
npx -p api-emulator api --plugin ./@netlify/api-emulator.mjs --service netlify
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
netlify:
  # Add provider-specific seed state here.
```

## Links

- [api-emulator](https://github.com/jsj/api-emulator)
