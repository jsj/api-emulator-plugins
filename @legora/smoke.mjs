import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);

const workspace = await harness.call('GET', '/v1/workspace');
assert.equal(workspace.payload.id, 'workspace_emulator');

const matters = await harness.call('GET', '/v1/matters');
assert.equal(matters.payload.data[0].id, 'matter_alpha');

const document = await harness.call('POST', '/v1/matters/matter_alpha/documents', { name: 'NDA.pdf' });
assert.equal(document.status, 201);
assert.equal(document.payload.status, 'processed');

const run = await harness.call('POST', '/v1/workflows/workflow_review/runs', {});
assert.equal(run.status, 201);
assert.equal(run.payload.status, 'completed');

const table = await harness.call('GET', '/v1/review-tables/table_risks');
assert.equal(table.payload.rows[0].risk, 'medium');

const chat = await harness.call('POST', '/v1/chat/completions', { messages: [{ role: 'user', content: 'Summarize key risks' }] });
assert.equal(chat.payload.choices[0].finish_reason, 'stop');

console.log('legora smoke ok');
