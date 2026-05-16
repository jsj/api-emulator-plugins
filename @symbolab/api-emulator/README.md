# @api-emulator/symbolab

Symbolab public web bridge APIs provide equation solution, steps, answer verification, and graph plotting workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/symbolab
```

## Run

```bash
npx -p api-emulator api --plugin ./@symbolab/api-emulator.mjs --service symbolab
```

## Endpoints

- `POST /pub_api/bridge/solution`
- `POST /pub_api/bridge/steps`
- `POST /pub_api/bridge/verify`
- `POST /pub_api/bridge/verifyProblem`
- `POST /pub_api/graph/plottingInfo`
- `GET /symbolab/inspect/contract`
- `GET /symbolab/inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
symbolab:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://www.symbolab.com/solver/step-by-step-calculator)
- [api-emulator](https://github.com/jsj/api-emulator)
