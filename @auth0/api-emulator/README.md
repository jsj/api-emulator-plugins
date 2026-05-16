# @api-emulator/auth0

Auth0 provides authentication, authorization, user management, tokens, and tenant configuration.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/auth0
```

## Run

```bash
npx -p api-emulator api --plugin ./@auth0/api-emulator/src/index.ts --service auth0
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
auth0:
  # Add provider-specific seed state here.
```

## Links

- [api-emulator](https://github.com/jsj/api-emulator)
