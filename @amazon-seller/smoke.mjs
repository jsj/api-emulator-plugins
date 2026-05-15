import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'amazon-seller');

const token = await harness.call('POST', '/auth/o2/token', 'grant_type=refresh_token', { 'content-type': 'application/x-www-form-urlencoded' });
assert.equal(token.payload.token_type, 'bearer');

const marketplaces = await harness.call('GET', '/sellers/v1/marketplaceParticipations');
assert.equal(marketplaces.payload.payload[0].marketplace.id, 'ATVPDKIKX0DER');

const orders = await harness.call('GET', '/orders/v0/orders?MarketplaceIds=ATVPDKIKX0DER');
assert.equal(orders.payload.payload.Orders[0].OrderStatus, 'Unshipped');

const rdt = await harness.call('POST', '/tokens/2021-03-01/restrictedDataToken', {});
assert.equal(rdt.payload.restrictedDataToken, 'rdt_emulator_token');

console.log('amazon-seller smoke ok');
