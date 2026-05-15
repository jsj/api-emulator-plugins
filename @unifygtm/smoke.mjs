import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'unifygtm');

const objects = await harness.call('GET', '/data/v1/objects');
assert.equal(objects.payload.data[0].api_name, 'companies');

const records = await harness.call('GET', '/data/v1/objects/companies/records');
assert.equal(records.payload.data[0].values.domain, 'example.test');
assert.equal(records.payload.next_cursor, null);

const created = await harness.call('POST', '/data/v1/objects/companies/records', { values: { name: 'New Co' } });
assert.equal(created.status, 201);

const state = await harness.call('GET', '/unifygtm/inspect/state');
assert.ok(state.payload.collections);

console.log('unifygtm smoke ok');
