import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'canvas');

const self = await harness.call('GET', '/api/v1/users/self');
assert.equal(self.payload.email, 'ada@example.edu');

const courses = await harness.call('GET', '/api/v1/courses');
assert.equal(courses.payload[0].course_code, 'EMU-CS101');

const course = await harness.call('GET', '/api/v1/courses/201');
assert.equal(course.payload.name, 'Emulator Computer Science');

const assignments = await harness.call('GET', '/api/v1/courses/201/assignments');
assert.equal(assignments.payload[0].name, 'API Emulator Lab');

const created = await harness.call('POST', '/api/v1/courses/201/assignments', {
  assignment: {
    name: 'Reading Check',
    points_possible: 5,
    submission_types: ['online_quiz'],
  },
});
assert.equal(created.status, 201);
assert.equal(created.payload.workflow_state, 'published');

const stringIds = await harness.call('GET', `/api/v1/courses/201/assignments/${created.payload.id}`, undefined, {
  accept: 'application/json+canvas-string-ids',
});
assert.equal(typeof stringIds.payload.id, 'string');

const submissions = await harness.call('GET', '/api/v1/courses/201/assignments/301/submissions');
assert.equal(submissions.payload[0].workflow_state, 'submitted');

const submission = await harness.call('GET', '/api/v1/courses/201/assignments/301/submissions/101');
assert.equal(submission.payload.body, 'My emulator lab response');

const postedSubmission = await harness.call('POST', '/api/v1/courses/201/assignments/301/submissions', {
  submission: {
    user_id: 101,
    submission_type: 'online_text_entry',
    body: 'Updated response',
  },
});
assert.equal(postedSubmission.status, 201);
assert.equal(postedSubmission.payload.body, 'Updated response');
assert.equal(postedSubmission.payload.attempt, 2);

console.log('canvas smoke ok');
