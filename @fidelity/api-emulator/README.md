# @api-emulator/fidelity

Fidelity WorkplaceXchange provides workplace participant, retirement, stock-plan, HSA balance, and pay statement APIs.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/fidelity
```

## Run

```bash
npx -p api-emulator api --plugin ./@fidelity/api-emulator.mjs --service fidelity
```

## Endpoints

- `POST /wpx/oauth2/token`
- `GET /wpx/hrp/v1/participants`
- `GET /wpx/hrp/v1/participants/:participantId`
- `GET /wpx/wi/v1/participants/:participantId/balances`
- `GET /wpx/hrp/v1/participants/:participantId/pay-statements`
- `POST /wpx/hrp/v1/participants`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
fidelity:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://workplacexchange.fidelity.com/public/wpx/docs/wi-balances)
- [api-emulator](https://github.com/jsj/api-emulator)
