import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'ebay-seller');

const token = await harness.call('POST', '/identity/v1/oauth2/token', 'grant_type=client_credentials', { 'content-type': 'application/x-www-form-urlencoded' });
assert.match(token.payload.access_token, /^ebay_access_/);

const list = await harness.call('GET', '/sell/inventory/v1/inventory_item');
assert.equal(list.payload.total, 1);

await harness.call('PUT', '/sell/inventory/v1/inventory_item/SKU-SMOKE', { product: { title: 'Smoke Item' }, availability: { shipToLocationAvailability: { quantity: 2 } }, condition: 'NEW' });
const item = await harness.call('GET', '/sell/inventory/v1/inventory_item/SKU-SMOKE');
assert.equal(item.payload.product.title, 'Smoke Item');

const offer = await harness.call('POST', '/sell/inventory/v1/offer', { sku: 'SKU-SMOKE' });
assert.equal(offer.status, 201);

console.log('ebay-seller smoke ok');
