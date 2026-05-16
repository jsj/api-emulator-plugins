# @api-emulator/craigslist

Craigslist provides Bulkpost OpenAPI surfaces for OAuth, billing, account messages, posting stats, post edits, images, status, RSS feeds, and classifieds search workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/craigslist
```

## Run

```bash
npx -p api-emulator api --plugin ./@craigslist/api-emulator.mjs --service craigslist
```

## Endpoints

- `POST /bulkpost/oauth/access-token`
- `GET /bulkpost/v1/account/billing/credit`
- `GET /bulkpost/v1/account/billing/current-pricing/area/:areaAbbr/category/:categoryAbbr`
- `POST /bulkpost/v1/account/billing/make-invoice`
- `GET /bulkpost/v1/account/billing/posting-block-balances`
- `PUT /bulkpost/v1/account/message/:messageId/ack`
- `GET /bulkpost/v1/account/stats/all-postings`
- `GET /bulkpost/v1/account/stats/posting/:postingId`
- `GET /bulkpost/v1/posting/zip/:zip/area`
- `GET /bulkpost/v1/postings/:postingId`
- `PATCH /bulkpost/v1/postings/:postingId`
- `DELETE /bulkpost/v1/postings/:postingId`
- `GET /bulkpost/v1/postings/:postingId/body`
- `PUT /bulkpost/v1/postings/:postingId/body`
- `GET /bulkpost/v1/postings/:postingId/images`
- `POST /bulkpost/v1/postings/:postingId/images`
- `PUT /bulkpost/v1/postings/:postingId/images`
- `GET /bulkpost/v1/postings/:postingId/images/:imageId`
- `DELETE /bulkpost/v1/postings/:postingId/images/:imageId`
- `GET /bulkpost/v1/postings/:postingId/price`
- `PUT /bulkpost/v1/postings/:postingId/price`
- `GET /bulkpost/v1/postings/:postingId/remuneration`
- `PUT /bulkpost/v1/postings/:postingId/remuneration`
- `GET /bulkpost/v1/postings/:postingId/status`
- `PUT /bulkpost/v1/postings/:postingId/status`
- `PUT /bulkpost/v1/postings/:postingId/undelete`
- `GET /search/:area/:category.json`
- `GET /search/:area/:category.rss`
- `GET /:area/search/:category`
- `GET /:area/search/:category/rss`
- `POST /posting/bulk`
- `GET /posts`
- `GET /posts/:postId`
- `DELETE /posts/:postId`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
craigslist:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://bapi.craigslist.org/bulkpost-docs/v1/)
- [api-emulator](https://github.com/jsj/api-emulator)
