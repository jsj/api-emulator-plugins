import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'surveymonkey');

const me = await harness.call('GET', '/v3/users/me');
assert.equal(me.payload.email, 'ada@example.com');

const surveys = await harness.call('GET', '/v3/surveys');
assert.equal(surveys.payload.data[0].id, '987654321');

const details = await harness.call('GET', '/v3/surveys/987654321/details');
assert.equal(details.payload.pages[0].questions[0].family, 'single_choice');

const collectors = await harness.call('GET', '/v3/surveys/987654321/collectors');
assert.equal(collectors.payload.data[0].type, 'weblink');

const response = await harness.call('GET', '/v3/surveys/987654321/responses/555/details');
assert.equal(response.payload.response_status, 'completed');

const created = await harness.call('POST', '/v3/surveys/987654321/responses/bulk', { pages: [] });
assert.equal(created.status, 201);

const responses = await harness.call('GET', '/v3/surveys/987654321/responses/bulk');
assert.equal(responses.payload.data.length, 2);

console.log('surveymonkey smoke ok');
