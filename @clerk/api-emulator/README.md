# @api-emulator/clerk

Clerk provides user authentication, sessions, organizations, OAuth, and identity-management primitives.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/clerk
```

## Run

```bash
npx -p api-emulator api --plugin ./@clerk/api-emulator/src/index.ts --service clerk
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
clerk:
  # Add provider-specific seed state here.
```

## Links

- [api-emulator](https://github.com/jsj/api-emulator)
