# @api-emulator/azure

Azure Resource Manager provides cloud resource APIs for subscriptions, resource groups, deployments, and managed resources.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/azure
```

## Run

```bash
npx -p api-emulator api --plugin ./@azure/api-emulator.mjs --service azure
```

## Endpoints

- `GET /subscriptions/:subscriptionId/resourcegroups`
- `GET /subscriptions/:subscriptionId/resourceGroups`
- `GET /subscriptions/:subscriptionId/resourcegroups/:resourceGroupName`
- `GET /subscriptions/:subscriptionId/resourceGroups/:resourceGroupName`
- `PUT /subscriptions/:subscriptionId/resourcegroups/:resourceGroupName`
- `PUT /subscriptions/:subscriptionId/resourceGroups/:resourceGroupName`
- `DELETE /subscriptions/:subscriptionId/resourcegroups/:resourceGroupName`
- `DELETE /subscriptions/:subscriptionId/resourceGroups/:resourceGroupName`
- `GET /azure/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
azure:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://learn.microsoft.com/en-us/rest/api/resources/resource-groups)
- [api-emulator](https://github.com/jsj/api-emulator)
