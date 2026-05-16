# @api-emulator/unifygtm

Unify GTM provides data APIs for GTM objects, attributes, records, enrichment, and workflow automation.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/unifygtm
```

## Run

```bash
npx -p api-emulator api --plugin ./@unifygtm/api-emulator.mjs --service unifygtm
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
unifygtm:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.unifygtm.com/developers/api/data/overview)
- [api-emulator](https://github.com/jsj/api-emulator)
