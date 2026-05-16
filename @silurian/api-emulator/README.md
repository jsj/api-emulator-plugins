# @api-emulator/silurian

Silurian Earth APIs provide weather forecasts, portfolio GeoJSON features, and cyclone forecast surfaces.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/silurian
```

## Run

```bash
npx -p api-emulator api --plugin ./@silurian/api-emulator.mjs --service silurian
```

## Endpoints

- `GET /forecast/daily`
- `GET /forecast/hourly`
- `GET /past/forecast/daily`
- `GET /past/forecast/hourly`
- `GET /experimental/extended`
- `GET /experimental/regional/usa`
- `GET /experimental/past/regional/usa`
- `GET /experimental/personalized/total-energies`
- `GET /portfolios/:portfolioId/features`
- `GET /portfolios/:portfolioId/forecasts`
- `GET /portfolios/:portfolioId/observations`
- `GET /portfolios/:portfolioId/init_time`
- `GET /cyclones/forecasts`
- `GET /cyclones/forecasts/:stormId/track`
- `GET /cyclones/forecasts/:stormId/cone`
- `GET /silurian/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
silurian:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://github.com/silurian-ai/silurian-ts/blob/HEAD/reference.md)
- [api-emulator](https://github.com/jsj/api-emulator)
