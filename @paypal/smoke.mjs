import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'paypal');

const token = await harness.call('POST', '/v1/oauth2/token', 'grant_type=client_credentials', { 'content-type': 'application/x-www-form-urlencoded' });
assert.equal(token.payload.token_type, 'Bearer');

const order = await harness.call('POST', '/v2/checkout/orders', { intent: 'CAPTURE', purchase_units: [{ amount: { currency_code: 'USD', value: '12.00' } }] });
assert.equal(order.status, 201);
assert.equal(order.payload.status, 'CREATED');

const fetched = await harness.call('GET', `/v2/checkout/orders/${order.payload.id}`);
assert.equal(fetched.payload.id, order.payload.id);

const captured = await harness.call('POST', `/v2/checkout/orders/${order.payload.id}/capture`);
assert.equal(captured.payload.status, 'COMPLETED');
assert.equal(captured.payload.purchase_units[0].payments.captures[0].status, 'COMPLETED');

const captureId = captured.payload.purchase_units[0].payments.captures[0].id;
const capture = await harness.call('GET', `/v2/payments/captures/${captureId}`);
assert.equal(capture.payload.status, 'COMPLETED');

const refund = await harness.call('POST', `/v2/payments/captures/${captureId}/refund`, { amount: { currency_code: 'USD', value: '5.00' } });
assert.equal(refund.status, 201);
assert.equal(refund.payload.status, 'COMPLETED');

const fetchedRefund = await harness.call('GET', `/v2/payments/refunds/${refund.payload.id}`);
assert.equal(fetchedRefund.payload.amount.value, '5.00');

console.log('paypal smoke ok');
