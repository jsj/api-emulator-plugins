import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'wikipedia');

const summary = await harness.call('GET', '/api/rest_v1/page/summary/Ada_Lovelace');
assert.equal(summary.status, 200);
assert.equal(summary.payload.title, 'Ada Lovelace');
assert.equal(summary.payload.titles.canonical, 'Ada_Lovelace');
assert.match(summary.payload.extract, /Analytical Engine/);

const search = await harness.call('GET', '/w/rest.php/v1/search/page?q=computer&limit=2');
assert.equal(search.status, 200);
assert.equal(search.payload.pages[0].key, 'Alan_Turing');

const titleSearch = await harness.call('GET', '/w/rest.php/v1/search/title?q=Ada&limit=1');
assert.equal(titleSearch.payload.pages[0].title, 'Ada Lovelace');

const bare = await harness.call('GET', '/w/rest.php/v1/page/Alan_Turing/bare');
assert.equal(bare.payload.key, 'Alan_Turing');
assert.equal(bare.payload.content_model, 'wikitext');

const html = await harness.call('GET', '/w/rest.php/v1/page/API_emulator/html');
assert.equal(html.status, 200);
assert.match(html.payload, /<h1>API emulator<\/h1>/);

const source = await harness.call('GET', '/w/rest.php/v1/page/API_emulator');
assert.match(source.payload.source, /without reaching production/);

const actionSearch = await harness.call('GET', '/w/api.php?action=query&list=search&srsearch=emulator&format=json&srlimit=1');
assert.equal(actionSearch.payload.query.search[0].title, 'API emulator');

const actionExtract = await harness.call('GET', '/w/api.php?action=query&prop=extracts&titles=Ada_Lovelace&format=json');
assert.equal(actionExtract.payload.query.pages['1001'].title, 'Ada Lovelace');

const missing = await harness.call('GET', '/api/rest_v1/page/summary/Missing_Page');
assert.equal(missing.status, 404);
assert.match(missing.payload.detail, /doesn't exist/);

const state = await harness.call('GET', '/wikipedia/inspect/state');
assert.equal(state.payload.searches.length, 2);

console.log('wikipedia smoke ok');
