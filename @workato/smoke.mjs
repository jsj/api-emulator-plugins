import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'workato');

const recipes = await harness.call('GET', '/api/recipes');
assert.equal(recipes.payload[0].name, 'Sync leads to CRM');

const started = await harness.call('POST', '/api/recipes/301/start');
assert.equal(started.payload.success, true);
assert.equal(started.payload.recipe.running, true);

const jobs = await harness.call('GET', '/api/recipes/301/jobs');
assert.equal(jobs.payload[0].status, 'succeeded');

const created = await harness.call('POST', '/api/recipes', { name: 'Draft automation', folder_id: 101 });
assert.equal(created.status, 201);
assert.equal(created.payload.name, 'Draft automation');

const state = await harness.call('GET', '/workato/inspect/state');
assert.equal(state.payload.collections.recipes.length, 2);

console.log('workato smoke ok');
