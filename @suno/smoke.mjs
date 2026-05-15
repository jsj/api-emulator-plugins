import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const auth = { authorization: 'Bearer suno-emulator-key' };
const harness = createHarness(plugin);
assert.equal(contract.provider, 'suno');
assert.equal(contract.baseUrl, 'https://api.sunoapi.org');

const unauthenticated = await harness.call('GET', '/api/v1/generate/credit');
assert.equal(unauthenticated.status, 401);
assert.equal(unauthenticated.payload.code, 401);

const credits = await harness.call('GET', '/api/v1/generate/credit', undefined, auth);
assert.equal(credits.status, 200);
assert.equal(credits.payload.code, 200);
assert.equal(credits.payload.data, 1200);

const invalid = await harness.call('POST', '/api/v1/generate', { prompt: 'ambient piano' }, auth);
assert.equal(invalid.status, 400);
assert.equal(invalid.payload.msg, 'customMode is required');

const generated = await harness.call(
  'POST',
  '/api/v1/generate',
  {
    customMode: false,
    instrumental: false,
    model: 'V4_5ALL',
    callBackUrl: 'https://example.com/suno-callback',
    prompt: 'A peaceful acoustic guitar melody',
  },
  auth,
);
assert.equal(generated.status, 200);
assert.match(generated.payload.data.taskId, /^suno_task_/);

const record = await harness.call('GET', `/api/v1/generate/record-info?taskId=${generated.payload.data.taskId}`, undefined, auth);
assert.equal(record.payload.data.status, 'SUCCESS');
assert.equal(record.payload.data.response.sunoData.length, 2);
assert.match(record.payload.data.response.sunoData[0].audioUrl, /suno_audio_emulator_001/);
assert.equal(record.payload.data.response.sunoData[0].modelName, 'V4_5ALL');

const missing = await harness.call('GET', '/api/v1/generate/record-info?taskId=missing', undefined, auth);
assert.equal(missing.status, 404);
assert.equal(missing.payload.msg, 'Task not found');

const lyrics = await harness.call(
  'POST',
  '/api/v1/lyrics',
  {
    prompt: 'Write a chorus about deterministic tests',
    callBackUrl: 'https://example.com/lyrics-callback',
  },
  auth,
);
assert.match(lyrics.payload.data.taskId, /^suno_lyrics_/);

const lyricsRecord = await harness.call('GET', `/api/v1/lyrics/record-info?taskId=${lyrics.payload.data.taskId}`, undefined, auth);
assert.equal(lyricsRecord.payload.data.type, 'LYRICS');
assert.match(lyricsRecord.payload.data.response.lyricsData[0].text, /deterministic tests/);

const state = await harness.call('GET', '/suno/inspect/state');
assert.equal(state.payload.callbacks.length, 2);

console.log('suno smoke ok');
