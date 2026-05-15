import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'nytimes');

const search = await harness.call('GET', '/svc/search/v2/articlesearch.json?q=emulator&api-key=test');
assert.equal(search.payload.status, 'OK');
assert.equal(search.payload.response.docs[0].source, 'The New York Times');

const archive = await harness.call('GET', '/svc/archive/v1/2026/1.json?api-key=test');
assert.equal(archive.payload.response.docs.length, 1);

const top = await harness.call('GET', '/svc/topstories/v2/technology.json?api-key=test');
assert.equal(top.payload.results[0].section, 'technology');

console.log('nytimes smoke ok');
