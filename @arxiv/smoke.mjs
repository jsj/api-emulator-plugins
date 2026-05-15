import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'arxiv');

const feed = await harness.call('GET', '/api/query?search_query=all:emulator&start=0&max_results=1');
assert.equal(feed.status, 200);
assert.match(feed.payload, /<feed/);
assert.match(feed.payload, /<opensearch:totalResults>1<\/opensearch:totalResults>/);
assert.match(feed.payload, /Deterministic API Emulators/);

const byId = await harness.call('GET', '/api/query?id_list=2401.00002v1&max_results=1');
assert.match(byId.payload, /Local Compatibility Oracles/);

const invalid = await harness.call('GET', '/api/query?start=abc');
assert.equal(invalid.status, 400);
assert.match(invalid.payload, /start_must_be_an_integer/);

const state = await harness.call('GET', '/arxiv/inspect/state');
assert.equal(state.payload.queries.length, 2);

console.log('arxiv smoke ok');
