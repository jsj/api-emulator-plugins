# @api-emulator/rentahuman

RentAHuman provides REST and MCP APIs for agents, humans, bookings, bounties, applications, escrow, conversations, transfers, wallet operations, services, API keys, reviews, and webhooks.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/rentahuman
```

## Run

```bash
npx -p api-emulator api --plugin ./@rentahuman/api-emulator.mjs --service rentahuman
```

## Endpoints

- `POST /api/agents/register`
- `GET /api/agents/pairing-code`
- `GET /api/agents/pairing-status`
- `GET /api/agents/:agentId`
- `GET /api/humans`
- `GET /api/humans/:humanId`
- `GET /api/search`
- `GET /api/v1/humans`
- `GET /api/v1/humans/:humanId`
- `POST /api/v1/bounties`
- `POST /api/bounties`
- `GET /api/bounties`
- `GET /api/bounties/featured`
- `GET /api/bounties/:bountyId`
- `PATCH /api/bounties/:bountyId`
- `POST /api/bounties/:bountyId/applications`
- `PATCH /api/bounties/:bountyId/applications/:appId`
- `GET /api/bookings`
- `POST /api/bookings`
- `GET /api/bookings/:bookingId`
- `PATCH /api/bookings/:bookingId`
- `GET /api/v1/bounties`
- `POST /api/v1/bounties/:bountyId/accept`
- `POST /api/v1/tasks`
- `GET /api/v1/tasks/:taskId`
- `PATCH /api/v1/tasks/:taskId`
- `POST /api/v1/escrows`
- `POST /api/escrow`
- `GET /api/escrow/:escrowId`
- `POST /api/escrow/checkout`
- `POST /api/escrow/agent-checkout`
- `GET /api/escrow/agent-rentals`
- `GET /api/escrow/balance`
- `POST /api/v1/escrows/:escrowId/release`
- `GET /api/v1/wallet`
- `GET /api/wallet/balance`
- `POST /api/wallet/deposit`
- `POST /api/wallet/withdraw`
- `GET /api/wallet/transactions`
- `POST /api/transfers/send`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
rentahuman:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://rentahuman.ai/docs#rest-api)
- [api-emulator](https://github.com/jsj/api-emulator)
