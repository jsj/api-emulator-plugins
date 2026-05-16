# @api-emulator/duke-energy

Duke Energy customer APIs provide Auth0 token exchange, account lists, account details, balances, meters, and usage graph workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/duke-energy
```

## Run

```bash
npx -p api-emulator api --plugin ./@duke-energy/api-emulator.mjs --service duke-energy
```

## Endpoints

- `POST /login/auth-token`
- `GET /account-list`
- `GET /account-details-v2`
- `POST /account/usage/graph`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
duke-energy:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://github.com/hunterjm/aiodukeenergy)
- [api-emulator](https://github.com/jsj/api-emulator)
