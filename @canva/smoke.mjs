import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'canva');

const me = await harness.call('GET', '/rest/v1/users/me');
assert.equal(me.payload.user.id, 'user_emulator');

const designs = await harness.call('GET', '/rest/v1/designs');
assert.equal(designs.payload.items[0].id, 'design_001');
assert.equal(designs.payload.continuation, null);

const exportJob = await harness.call('POST', '/rest/v1/designs/design_001/exports', { export_format: { type: 'pdf' } });
assert.equal(exportJob.status, 202);
assert.equal(exportJob.payload.job.status, 'in_progress');

const fetchedExport = await harness.call('GET', `/rest/v1/exports/${exportJob.payload.job.id}`);
assert.equal(fetchedExport.payload.job.design_id, 'design_001');

const state = await harness.call('GET', '/canva/inspect/state');
assert.ok(state.payload.collections);

console.log('canva smoke ok');
