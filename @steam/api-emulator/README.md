# @api-emulator/steam

Steam Web API provides player summaries, owned games, achievements, news, and community data.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/steam
```

## Run

```bash
npx -p api-emulator api --plugin ./@steam/api-emulator.mjs --service steam
```

## Endpoints

- `GET /ISteamUser/GetPlayerSummaries/v0002/`
- `GET /ISteamUser/GetPlayerSummaries/v2/`
- `GET /IPlayerService/GetOwnedGames/v0001/`
- `GET /IPlayerService/GetOwnedGames/v1/`
- `GET /ISteamUserStats/GetPlayerAchievements/v0001/`
- `GET /ISteamNews/GetNewsForApp/v0002/`
- `GET /steam/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
steam:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://steamcommunity.com/dev)
- [api-emulator](https://github.com/jsj/api-emulator)
