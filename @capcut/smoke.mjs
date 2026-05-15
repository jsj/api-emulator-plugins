import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'capcut');

const templates = await harness.call('GET', '/openapi/v1/templates');
assert.equal(templates.payload.data[0].aspect_ratio, '9:16');

const task = await harness.call('POST', '/openapi/v1/render_tasks', { project_id: 'proj_001' });
assert.equal(task.status, 202);

const fetched = await harness.call('GET', '/openapi/v1/render_tasks/task_001');
assert.equal(fetched.payload.data.status, 'completed');

const state = await harness.call('GET', '/capcut/inspect/state');
assert.ok(state.payload.collections);

console.log('capcut smoke ok');
