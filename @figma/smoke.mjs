import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'figma');

const me = await harness.call('GET', '/v1/me', undefined, { authorization: 'Bearer figd_test' });
assert.equal(me.payload.handle, 'Figma Emulator');

const file = await harness.call('GET', '/v1/files/emulator-file');
assert.equal(file.payload.name, 'Emulator Design System');

const images = await harness.call('GET', '/v1/images/emulator-file?ids=1:1,2:2');
assert.match(images.payload.images['1:1'], /emulator-file/);

const comment = await harness.call('POST', '/v1/files/emulator-file/comments', { message: 'Looks good' });
assert.equal(comment.status, 201);
assert.equal(comment.payload.message, 'Looks good');

const comments = await harness.call('GET', '/v1/files/emulator-file/comments');
assert.equal(comments.payload.comments.length, 1);

console.log('figma smoke ok');
