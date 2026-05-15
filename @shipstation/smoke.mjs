import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'shipstation');

const shipments = await harness.call('GET', '/v2/shipments');
assert.equal(shipments.payload.total, 1);

const shipment = await harness.call('POST', '/v2/shipments', { order_id: 'order-smoke' });
assert.equal(shipment.status, 201);
assert.equal(shipment.payload.order_id, 'order-smoke');

const rates = await harness.call('POST', '/v2/rates', { carrier_id: 'stamps_com' });
assert.equal(rates.payload.rate_response.rates[0].service_code, 'usps_priority_mail');

const label = await harness.call('POST', '/v2/labels', { shipment_id: shipment.payload.shipment_id });
assert.equal(label.payload.status, 'completed');

console.log('shipstation smoke ok');
