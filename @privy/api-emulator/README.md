# @api-emulator/privy

Privy provides embedded wallets, authentication, user identity, and authorization for crypto apps.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/privy
```

## Run

```bash
npx -p api-emulator api --plugin ./@privy/api-emulator.mjs --service privy
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
privy:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.privy.io/)
- [api-emulator](https://github.com/jsj/api-emulator)
