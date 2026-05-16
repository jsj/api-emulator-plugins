# @api-emulator/google-play

Google Play provides Android Publisher and Play Developer Reporting APIs for tracks, reviews, products, subscriptions, and vitals.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/google-play
```

## Run

```bash
npx -p api-emulator api --plugin ./@google-play/api-emulator.mjs --service google-play
```

## Endpoints

- `POST /androidpublisher/v3/applications/:packageName/edits`
- `POST /androidpublisher/v3/applications/:packageName/edits/:editId:commit`
- `GET /androidpublisher/v3/applications/:packageName/edits/:editId/tracks`
- `GET /androidpublisher/v3/applications/:packageName/edits/:editId/tracks/:track`
- `PUT /androidpublisher/v3/applications/:packageName/edits/:editId/tracks/:track`
- `GET /androidpublisher/v3/applications/:packageName/reviews`
- `POST /androidpublisher/v3/applications/:packageName/reviews/:reviewId:reply`
- `GET /androidpublisher/v3/applications/:packageName/inappproducts`
- `GET /androidpublisher/v3/applications/:packageName/subscriptions`
- `GET /androidpublisher/v3/applications/:packageName/monetization/subscriptions`
- `GET /v1beta1/apps/:packageName/errorIssues:search`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
google-play:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developers.google.com/android-publisher)
- [api-emulator](https://github.com/jsj/api-emulator)
