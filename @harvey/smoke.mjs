import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);

const projects = await harness.call('GET', '/api/v1/vault/workspace/projects');
assert.equal(projects.payload.data[0].id, 'prj_contracts');

const documents = await harness.call('GET', '/api/v1/vault/projects/prj_contracts/documents');
assert.equal(documents.payload.data[0].name, 'Master Services Agreement.pdf');

const search = await harness.call('POST', '/api/v1/vault/search', { query: 'agreement' });
assert.equal(search.payload.results[0].document.id, 'doc_msa');

const completion = await harness.call('POST', '/api/v1/completion', { query: 'Summarize indemnity risk' });
assert.equal(completion.payload.object, 'completion');
assert.equal(completion.payload.citations[0].document_id, 'doc_msa');

console.log('harvey smoke ok');
