import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'granola');

assert.equal(contract.baseUrl, 'https://public-api.granola.ai');

const notes = await harness.call('GET', '/v1/notes');
assert.equal(notes.payload.notes[0].id, 'note_001');
assert.equal(notes.payload.next_cursor, null);

const note = await harness.call('GET', '/v1/notes/note_001');
assert.equal(note.payload.note.transcript[0].speaker, 'Emulator User');

const state = await harness.call('GET', '/granola/inspect/state');
assert.ok(state.payload.collections);

console.log('granola smoke ok');
