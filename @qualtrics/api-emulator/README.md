# @api-emulator/qualtrics

Qualtrics XM provides survey, survey definition, response, and response export APIs for experience management workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/qualtrics
```

## Run

```bash
npx -p api-emulator api --plugin ./@qualtrics/api-emulator.mjs --service qualtrics
```

## Endpoints

- `GET /API/v3/whoami`
- `GET /API/v3/surveys`
- `POST /API/v3/surveys`
- `GET /API/v3/surveys/:surveyId`
- `GET /API/v3/survey-definitions/:surveyId`
- `GET /API/v3/surveys/:surveyId/responses`
- `POST /API/v3/surveys/:surveyId/responses`
- `POST /API/v3/surveys/:surveyId/export-responses`
- `GET /API/v3/surveys/:surveyId/export-responses/:progressId`
- `GET /API/v3/surveys/:surveyId/export-responses/:fileId/file`
- `GET /qualtrics/inspect/contract`
- `GET /qualtrics/inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
qualtrics:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://api.qualtrics.com/)
- [api-emulator](https://github.com/jsj/api-emulator)
