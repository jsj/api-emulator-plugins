import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'proton-mail');

const labels = await harness.call('GET', '/core/v4/labels');
assert.equal(labels.payload.Labels[0].Name, 'Inbox');

const created = await harness.call('POST', '/core/v4/labels', { Name: 'Smoke Label', Color: '#000000' });
assert.equal(created.status, 201);
assert.equal(created.payload.Label.Name, 'Smoke Label');

const messages = await harness.call('GET', '/mail/v4/messages?Page=0&PageSize=10');
assert.equal(messages.payload.Messages[0].ID, 'message_emulator');

const message = await harness.call('GET', '/mail/v4/messages/message_emulator');
assert.equal(message.payload.Message.Body, 'Deterministic Proton Mail message body.');

const marked = await harness.call('PUT', '/mail/v4/messages/read', { IDs: ['message_emulator'] });
assert.equal(marked.payload.Responses[0].Response.Code, 1000);

console.log('proton-mail smoke ok');
