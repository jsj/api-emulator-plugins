import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'listenlabs');

const studies = await harness.call('GET', '/api/public/list_surveys');
assert.equal(studies.payload[0].link_id, 'study-1');

const questions = await harness.call('GET', '/api/public/study_questions?study_id=12345678-0000-0000-0000-000000000000');
assert.equal(questions.payload[0].id, 'question_1');

const responses = await harness.call('GET', '/api/public/responses?study_id=12345678-0000-0000-0000-000000000000');
assert.equal(responses.payload[0].id, 'response_1');

const response = await harness.call('GET', '/api/public/responses/response_1');
assert.match(response.payload.summary, /positive/);

const insights = await harness.call('GET', '/api/public/insights?study_id=12345678-0000-0000-0000-000000000000');
assert.equal(insights.payload.quality_guard.accepted, 12);
assert.equal(insights.payload.research_agent_outputs[0].type, 'deck');

const created = await harness.call('POST', '/api/public/responses?study_id=12345678-0000-0000-0000-000000000000', { answers: [{ question_id: 'question_1', answer: 'Ship it' }] });
assert.equal(created.status, 201);

console.log('listenlabs smoke ok');
