import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'quizlet');

const user = await harness.call('GET', '/2.0/users/emulator_teacher');
assert.equal(user.payload.username, 'emulator_teacher');

const sets = await harness.call('GET', '/2.0/users/emulator_teacher/sets');
assert.equal(sets.payload[0].title, 'Emulator Biology');

const set = await harness.call('GET', '/2.0/sets/2001');
assert.equal(set.payload.terms[0].term, 'cell');

const terms = await harness.call('GET', '/2.0/sets/2001/terms');
assert.equal(terms.payload.length, 2);

const multi = await harness.call('GET', '/2.0/sets?set_ids=2001');
assert.equal(multi.payload[0].id, 2001);

const search = await harness.call('GET', '/2.0/search/sets?q=osmosis&creator=emulator_teacher');
assert.equal(search.payload[0].title, 'Emulator Biology');

const created = await harness.call('POST', '/2.0/sets', {
  title: 'French Basics',
  terms: ['bonjour', 'merci'],
  definitions: ['hello', 'thank you'],
  lang_terms: 'fr',
  lang_definitions: 'en',
}, { 'content-type': 'application/json' });
assert.equal(created.status, 201);
assert.equal(created.payload.term_count, 2);

const updated = await harness.call('PUT', `/2.0/sets/${created.payload.id}`, {
  title: 'French Basics Updated',
  terms: ['salut'],
  definitions: ['hi'],
}, { 'content-type': 'application/json' });
assert.equal(updated.payload.title, 'French Basics Updated');
assert.equal(updated.payload.terms[0].definition, 'hi');

const deleted = await harness.call('DELETE', `/2.0/sets/${created.payload.id}`);
assert.equal(deleted.status, 204);

console.log('quizlet smoke ok');
