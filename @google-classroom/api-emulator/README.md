# @api-emulator/google-classroom

Google Classroom provides course, roster, teacher, student, and coursework APIs for education workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/google-classroom
```

## Run

```bash
npx -p api-emulator api --plugin ./@google-classroom/api-emulator.mjs --service google-classroom
```

## Endpoints

- `GET /$discovery/rest`
- `GET /v1/courses`
- `POST /v1/courses`
- `GET /v1/courses/:id`
- `GET /v1/courses/:courseId/teachers`
- `GET /v1/courses/:courseId/students`
- `GET /v1/courses/:courseId/courseWork`
- `GET /google-classroom/inspect/contract`
- `GET /google-classroom/inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
google-classroom:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developers.google.com/workspace/classroom/reference/rest)
- [api-emulator](https://github.com/jsj/api-emulator)
