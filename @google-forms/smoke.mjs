import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'google-forms');

const discovery = await harness.call('GET', '/$discovery/rest?version=v1');
assert.equal(discovery.payload.name, 'forms');
assert.equal(discovery.payload.resources.forms.resources.responses.methods.list.httpMethod, 'GET');

const created = await harness.call('POST', '/v1/forms', { info: { title: 'CLI Created Form', documentTitle: 'CLI Created Form' } });
assert.equal(created.payload.info.title, 'CLI Created Form');

const fetched = await harness.call('GET', `/v1/forms/${created.payload.formId}`);
assert.equal(fetched.payload.formId, created.payload.formId);

const updated = await harness.call('POST', `/v1/forms/${created.payload.formId}:batchUpdate`, {
  requests: [{ createItem: { item: { title: 'Favorite feature?', questionItem: { question: { questionId: 'q_feature', textQuestion: {} } } } } }],
});
assert.equal(updated.payload.form.items[0].title, 'Favorite feature?');

const responses = await harness.call('GET', '/v1/forms/form_emulator/responses');
assert.equal(responses.payload.responses[0].responseId, 'response_emulator_1');

const response = await harness.call('GET', '/v1/forms/form_emulator/responses/response_emulator_1');
assert.equal(response.payload.answers.q_satisfaction.questionId, 'q_satisfaction');

console.log('google-forms smoke ok');
