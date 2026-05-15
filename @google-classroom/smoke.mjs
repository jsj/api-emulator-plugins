import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'google-classroom');

const discovery = await harness.call('GET', '/$discovery/rest?version=v1', undefined, { host: 'localhost:8787' });
assert.equal(discovery.payload.name, 'classroom');
assert.equal(discovery.payload.resources.courses.methods.list.path, 'v1/courses');

const courses = await harness.call('GET', '/v1/courses?pageSize=1');
assert.equal(courses.status, 200);
assert.equal(courses.payload.courses[0].id, 'course-101');

const created = await harness.call('POST', '/v1/courses', { name: 'Local SDK Course', ownerId: 'teacher-1' });
assert.equal(created.payload.name, 'Local SDK Course');
assert.equal(created.payload.courseState, 'PROVISIONED');

const fetched = await harness.call('GET', `/v1/courses/${created.payload.id}`);
assert.equal(fetched.payload.ownerId, 'teacher-1');

const teachers = await harness.call('GET', '/v1/courses/course-101/teachers');
assert.equal(teachers.payload.teachers[0].profile.emailAddress, 'ada@example.edu');

const students = await harness.call('GET', '/v1/courses/course-101/students');
assert.equal(students.payload.students[0].studentWorkFolder.id, 'folder-student-1');

const work = await harness.call('GET', '/v1/courses/course-101/courseWork');
assert.equal(work.payload.courseWork[0].workType, 'ASSIGNMENT');

const missing = await harness.call('GET', '/v1/courses/missing');
assert.equal(missing.status, 404);
assert.equal(missing.payload.error.status, 'NOT_FOUND');

console.log('google-classroom smoke ok');
