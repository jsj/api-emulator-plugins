# @api-emulator/canvas

Canvas LMS provides education APIs for users, courses, assignments, enrollments, submissions, and learning workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/canvas
```

## Run

```bash
npx -p api-emulator api --plugin ./@canvas/api-emulator.mjs --service canvas
```

## Endpoints

- `GET /api/v1/users/self`
- `GET /api/v1/users/:id`
- `GET /api/v1/courses`
- `GET /api/v1/courses/:course_id`
- `GET /api/v1/courses/:course_id/assignments`
- `GET /api/v1/courses/:course_id/assignments/:id`
- `POST /api/v1/courses/:course_id/assignments`
- `GET /api/v1/courses/:course_id/assignments/:assignment_id/submissions`
- `GET /api/v1/courses/:course_id/assignments/:assignment_id/submissions/:user_id`
- `POST /api/v1/courses/:course_id/assignments/:assignment_id/submissions`
- `GET /canvas/inspect/contract`
- `GET /canvas/inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
canvas:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developerdocs.instructure.com/services/canvas)
- [api-emulator](https://github.com/jsj/api-emulator)
