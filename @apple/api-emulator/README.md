# @api-emulator/apple

Apple provides Sign in with Apple, CloudKit/iCloud app data, APNs, app store, device, and platform services for iOS and macOS apps.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/apple
```

## Run

```bash
npx -p api-emulator api --plugin ./@apple/api-emulator/src/index.ts --service apple
```

## Endpoints

- `GET /bag.xml`
- `POST /v1/signSapSetup`
- `POST /auth/signin`
- `GET /auth/authorize`
- `POST /auth/token`
- `POST /auth/revoke`
- `GET /auth/keys`
- `GET /inspect/last-sign-sap-setup`
- `GET /inspect/last-sign-sap-setup-response`
- `GET /inspect/last-signin`
- `GET /v1/users`
- `GET /v1/users/:id`
- `GET /v1/ciProducts/:productId/additionalRepositories`
- `GET /v1/userInvitations`
- `GET /search`
- `GET /lookup`
- `GET /v1/app-store/search`
- `GET /v1/app-store/lookup`
- `GET /v1/app-store/storefront`
- `GET /:store/app/id:appId`
- `POST /3/device/:token`
- `POST /apns/send`
- `POST /apns/control/register-team`
- `POST /apns/control/register-key`
- `POST /apns/control/register-topic`
- `POST /apns/control/register-device`
- `POST /apns/control/unregister-device`
- `POST /apns/control/set-device-status`
- `POST /apns/control/throttle`
- `POST /apns/control/flush-pending`
- `POST /apns/control/fail`
- `POST /apns/control/reset`
- `GET /inspect/apns/state`
- `GET /inspect/apns/collapsed`
- `GET /inspect/apns/pending`
- `GET /inspect/apns/unregistered`
- `GET /inspect/apns/deliveries`
- `GET /inspect/apns/last-delivery`
- `GET /inspect/apns/failures`
- `GET /inspect/apns/notifications`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
apple:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.apple.com/documentation/appstoreconnectapi)
- [api-emulator](https://github.com/jsj/api-emulator)
