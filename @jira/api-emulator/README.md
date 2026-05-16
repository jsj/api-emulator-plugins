# @api-emulator/jira

Jira provides issue tracking APIs for users, projects, issues, search, and workflow-oriented project management.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/jira
```

## Run

```bash
npx -p api-emulator api --plugin ./@jira/api-emulator.mjs --service jira
```

## Endpoints

- `GET /rest/api/3/myself`
- `GET /rest/api/2/myself`
- `GET /rest/api/3/serverInfo`
- `GET /rest/api/2/serverInfo`
- `GET /rest/api/3/project`
- `GET /rest/api/2/project`
- `GET /rest/api/3/project/search`
- `GET /rest/api/3/search`
- `GET /rest/api/2/search`
- `GET /rest/api/3/search/jql`
- `POST /rest/api/3/search`
- `POST /rest/api/2/search`
- `POST /rest/api/3/search/jql`
- `GET /rest/api/3/issue/:issueIdOrKey`
- `GET /rest/api/2/issue/:issueIdOrKey`
- `POST /rest/api/3/issue`
- `PUT /rest/api/3/issue/:issueIdOrKey`
- `PUT /rest/api/2/issue/:issueIdOrKey`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
jira:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [api-emulator](https://github.com/jsj/api-emulator)
