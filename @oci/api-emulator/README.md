# @api-emulator/oci

Oracle Cloud Infrastructure provides cloud APIs for identity, regions, availability domains, compute instances, and networking.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/oci
```

## Run

```bash
npx -p api-emulator api --plugin ./@oci/api-emulator.mjs --service oci
```

## Endpoints

- `GET /20160918/regions`
- `GET /20160918/availabilityDomains`
- `GET /20160918/instances`
- `GET /20160918/instances/:instanceId`
- `POST /20160918/instances/:instanceId`
- `GET /oci/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
oci:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.oracle.com/iaas/api/)
- [api-emulator](https://github.com/jsj/api-emulator)
