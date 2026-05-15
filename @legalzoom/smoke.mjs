import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);

const products = await harness.call('GET', '/v1/products');
assert.equal(products.payload.data[0].id, 'prod_llc');

const customer = await harness.call('POST', '/v1/customers', { email: 'grace@example.com', name: 'Grace Hopper' });
assert.equal(customer.status, 201);
assert.equal(customer.payload.email, 'grace@example.com');

const order = await harness.call('POST', '/v1/orders', { customer_id: customer.payload.id, product_id: 'prod_llc', jurisdiction: 'DE' });
assert.equal(order.status, 201);
assert.equal(order.payload.status, 'in_progress');

const formation = await harness.call('POST', '/v1/business-formations', { order_id: order.payload.id, entity_name: 'Grace Labs LLC', entity_type: 'LLC', jurisdiction: 'DE' });
assert.equal(formation.status, 201);
assert.equal(formation.payload.status, 'draft');

const documents = await harness.call('GET', '/v1/orders/order_1/documents');
assert.equal(documents.payload.data[0].name, 'Articles of Organization');

console.log('legalzoom smoke ok');
