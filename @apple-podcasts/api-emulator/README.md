# @api-emulator/apple-podcasts

Apple Podcasts provides iTunes Search-compatible podcast search, lookup, episode, catalog, and library subscription workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/apple-podcasts
```

## Run

```bash
npx -p api-emulator api --plugin ./@apple-podcasts/api-emulator.mjs --service apple-podcasts
```

## Endpoints

- `GET /search`
- `GET /lookup`
- `GET /v1/me`
- `GET /v1/catalog/:storefront/podcasts`
- `GET /v1/catalog/:storefront/podcasts/:id`
- `GET /v1/catalog/:storefront/podcasts/:id/episodes`
- `GET /v1/me/library/podcasts`
- `PUT /v1/me/library/podcasts/:id`
- `DELETE /v1/me/library/podcasts/:id`
- `GET /inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
apple-podcasts:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://performance-partners.apple.com/search-api)
- [api-emulator](https://github.com/jsj/api-emulator)
