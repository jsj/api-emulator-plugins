# @api-emulator/app-store-connect

App Store Connect provides APIs for iOS and macOS app metadata, builds, TestFlight, review submissions, users, and app operations.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/app-store-connect
```

## Run

```bash
npx -p api-emulator api --plugin ./@app-store-connect/api-emulator.mjs --service app-store-connect
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
app-store-connect:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.apple.com/documentation/appstoreconnectapi)
- [api-emulator](https://github.com/jsj/api-emulator)
