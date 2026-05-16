# @api-emulator/adyen

Adyen is a payments platform for checkout, payment methods, transaction processing, and payouts.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/adyen
```

## Run

```bash
npx -p api-emulator api --plugin ./@adyen/api-emulator.mjs --service adyen
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
adyen:
  # Add provider-specific seed state here.
```

## Links

- [api-emulator](https://github.com/jsj/api-emulator)
