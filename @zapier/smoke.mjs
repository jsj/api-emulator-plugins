import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'zapier');

const me = await harness.call('GET', '/v1/me');
assert.equal(me.payload.id, 'acct_emulator');

const meV2 = await harness.call('GET', '/v2/me');
assert.equal(meV2.payload.data.id, 'acct_emulator');

const apps = await harness.call('GET', '/v2/apps');
assert.equal(apps.payload.data[0].slug, 'webhook');

const actionRun = await harness.call('POST', '/v2/action-runs', { action_id: 'action_001', input: { lead: 'Ada' } });
assert.equal(actionRun.status, 201);
assert.equal(actionRun.payload.data.status, 'success');

const list = await harness.call('GET', '/v1/zaps');
assert.equal(list.payload.data[0].id, 'zap_001');

const created = await harness.call('POST', '/v1/zaps', { title: 'Draft Zap' });
assert.equal(created.status, 201);
assert.equal(created.payload.data.title, 'Draft Zap');

const state = await harness.call('GET', '/zapier/inspect/state');
assert.ok(state.payload.collections);

console.log('zapier smoke ok');
