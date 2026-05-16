# @api-emulator/spectrum

Spectrum Enterprise ticketing APIs provide OAuth tokens, sites, circuits, tickets, notes, and attachments for B2B support workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/spectrum
```

## Run

```bash
npx -p api-emulator api --plugin ./@spectrum/api-emulator.mjs --service spectrum
```

## Endpoints

- `POST /auth/oauth/v2/token`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
spectrum:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://apis.spectrum.net/entservices/ticketing-b2b/v1)
- [api-emulator](https://github.com/jsj/api-emulator)
