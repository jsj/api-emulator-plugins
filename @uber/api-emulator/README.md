# @api-emulator/uber

Uber provides Rides, Direct, and Eats APIs for profiles, products, estimates, ride requests, history, payment methods, places, deliveries, stores, menus, orders, reports, and webhooks.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/uber
```

## Run

```bash
npx -p api-emulator api --plugin ./@uber/api-emulator.mjs --service uber
```

## Endpoints

- `GET /v1/me`
- `GET /v1.2/me`
- `PATCH /v1.2/me`
- `GET /v1/products`
- `GET /v1.2/products/:productId`
- `GET /v1/estimates/price`
- `GET /v1/estimates/time`
- `GET /v1.2/history`
- `GET /v1.2/payment-methods`
- `GET /v1.2/payment-methods/:paymentMethodId`
- `PATCH /v1.2/payment-methods/:paymentMethodId`
- `DELETE /v1.2/payment-methods/:paymentMethodId`
- `GET /v1.2/places/:placeId`
- `PUT /v1.2/places/:placeId`
- `GET /v1.2/me/promotions`
- `POST /v1.2/me/vouchers/redeem`
- `POST /v1.2/requests/estimate`
- `POST /v1.2/requests`
- `GET /v1.2/requests/current`
- `PATCH /v1.2/requests/current`
- `DELETE /v1.2/requests/current`
- `GET /v1.2/requests/:requestId`
- `DELETE /v1.2/requests/:requestId`
- `PATCH /v1.2/requests/:requestId`
- `GET /v1.2/requests/:requestId/map`
- `GET /v1.2/requests/:requestId/receipt`
- `PUT /v1.2/sandbox/products/:productId`
- `PUT /v1.2/sandbox/requests/:requestId`
- `GET /v1.2/sandbox/map`
- `POST /v1/customers/:customerId/delivery_quotes`
- `POST /v1/customers/:customerId/deliveries`
- `GET /v1/customers/:customerId/deliveries/:deliveryId`
- `POST /v1/customers/:customerId/deliveries/:deliveryId/cancel`
- `GET /v1/customers/:customerId/deliveries/:deliveryId/proof-of-delivery`
- `POST /event.delivery_status`
- `POST /event.courier_update`
- `GET /eats/stores`
- `GET /eats/stores/:storeId`
- `PATCH /eats/stores/:storeId`
- `GET /eats/stores/:storeId/menu`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
uber:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.uber.com/docs)
- [api-emulator](https://github.com/jsj/api-emulator)
