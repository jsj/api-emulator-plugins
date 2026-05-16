# @api-emulator/uipath

UiPath Orchestrator APIs provide OData workflows for folders, users, releases, jobs, queues, robots, and assets.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/uipath
```

## Run

```bash
npx -p api-emulator api --plugin ./@uipath/api-emulator.mjs --service uipath
```

## Endpoints

- `GET ${prefix}/Folders`
- `GET ${prefix}/Users/UiPath.Server.Configuration.OData.GetCurrentUserExtended`
- `GET ${prefix}/Releases/UiPath.Server.Configuration.OData.ListReleases`
- `GET ${prefix}/Jobs`
- `POST ${prefix}/Jobs/UiPath.Server.Configuration.OData.StartJobs`
- `GET ${prefix}/QueueDefinitions`
- `GET ${prefix}/QueueItems`
- `GET ${prefix}/Robots`
- `GET ${prefix}/Assets`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
uipath:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.uipath.com/orchestrator/automation-cloud/latest/api-guide/introduction)
- [api-emulator](https://github.com/jsj/api-emulator)
