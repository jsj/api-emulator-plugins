# @api-emulator/surveymonkey

SurveyMonkey provides API v3 surfaces for users, surveys, collectors, and bulk survey response workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/surveymonkey
```

## Run

```bash
npx -p api-emulator api --plugin ./@surveymonkey/api-emulator.mjs --service surveymonkey
```

## Endpoints

- `GET /v3/users/me`
- `GET /v3/surveys`
- `POST /v3/surveys`
- `GET /v3/surveys/:surveyId`
- `GET /v3/surveys/:surveyId/details`
- `GET /v3/surveys/:surveyId/collectors`
- `GET /v3/surveys/:surveyId/responses/bulk`
- `GET /v3/surveys/:surveyId/responses/:responseId/details`
- `POST /v3/surveys/:surveyId/responses/bulk`
- `GET /surveymonkey/inspect/contract`
- `GET /surveymonkey/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
surveymonkey:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://api.surveymonkey.com/v3/docs)
- [api-emulator](https://github.com/jsj/api-emulator)
