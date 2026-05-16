import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'qualtrics');

const whoami = await harness.call('GET', '/API/v3/whoami');
assert.equal(whoami.payload.result.userId, 'UR_emulator');

const surveys = await harness.call('GET', '/API/v3/surveys');
assert.equal(surveys.payload.result.elements[0].id, 'SV_emulator');

const definition = await harness.call('GET', '/API/v3/survey-definitions/SV_emulator');
assert.equal(definition.payload.result.questions.QID1.questionType.type, 'MC');

const createdResponse = await harness.call('POST', '/API/v3/surveys/SV_emulator/responses', { values: { QID1: 4 } });
assert.equal(createdResponse.status, 201);

const responses = await harness.call('GET', '/API/v3/surveys/SV_emulator/responses');
assert.equal(responses.payload.result.elements.length, 2);

const exportStart = await harness.call('POST', '/API/v3/surveys/SV_emulator/export-responses', { format: 'json' });
assert.equal(exportStart.payload.result.status, 'complete');

const missing = await harness.call('GET', '/API/v3/surveys/SV_missing');
assert.equal(missing.status, 404);

console.log('qualtrics smoke ok');
