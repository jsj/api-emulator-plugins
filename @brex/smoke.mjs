import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const headers = { authorization: 'Bearer brex_emulator_token' };
const harness = createHarness(plugin);
assert.equal(contract.provider, 'brex');

const unauthenticated = await harness.call('GET', '/v1/vendors');
assert.equal(unauthenticated.status, 401);

const vendors = await harness.call('GET', '/v1/vendors', undefined, headers);
assert.equal(vendors.payload.items[0].id, 'vendor_001');

const created = await harness.call('POST', '/v1/vendors', { company_name: 'Smoke Vendor Inc.', email: 'smoke@example.com' }, { ...headers, 'content-type': 'application/json', 'idempotency-key': 'smoke-key-1' });
assert.equal(created.status, 201);
assert.equal(created.payload.company_name, 'Smoke Vendor Inc.');

const fetched = await harness.call('GET', `/v1/vendors/${created.payload.id}`, undefined, headers);
assert.equal(fetched.payload.email, 'smoke@example.com');

const me = await harness.call('GET', '/v2/users/me', undefined, headers);
assert.equal(me.payload.email, 'ada@example.com');

const users = await harness.call('GET', '/v2/users?email=ada@example.com', undefined, headers);
assert.equal(users.payload.items[0].id, 'user_001');

console.log('brex smoke ok');
