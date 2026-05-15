import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'clay');

const tables = await harness.call('GET', '/v1/tables');
assert.equal(tables.payload.data[0].name, 'Prospects');

const rows = await harness.call('GET', '/v1/tables/tbl_001/rows');
assert.equal(rows.payload.data[0].cells.company, 'Analytical Engines');

const enrich = await harness.call('POST', '/v1/enrichments/run', { row_id: 'row_001' });
assert.equal(enrich.payload.status, 'completed');

const state = await harness.call('GET', '/clay/inspect/state');
assert.ok(state.payload.collections);

console.log('clay smoke ok');
