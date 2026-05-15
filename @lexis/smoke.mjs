import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);

const me = await harness.call('GET', '/v1/me');
assert.equal(me.payload.email, 'ada@example.com');

const sources = await harness.call('GET', '/v1/sources');
assert.equal(sources.payload.sources[0].id, 'cases');

const search = await harness.call('POST', '/v1/search', { query: 'contract', source: 'cases' });
assert.equal(search.payload.results[0].id, 'doc_roe');

const document = await harness.call('GET', '/v1/documents/doc_roe');
assert.equal(document.payload.citation, '123 F.4th 456');

const wsapi = await harness.call('POST', '/wsapi/rest/search', { SearchTerm: 'drafting' });
assert.equal(wsapi.payload.results[0].id, 'doc_article');

const folder = await harness.call('POST', '/v1/folders', { name: 'NDA Research', document_ids: ['doc_article'] });
assert.equal(folder.status, 201);
assert.equal(folder.payload.name, 'NDA Research');

console.log('lexis smoke ok');
