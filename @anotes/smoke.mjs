import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { plugin } from './api-emulator.mjs';

const execFileP = promisify(execFile);
const harness = createHarness(plugin);

const contract = await harness.call('GET', '/anotes/inspect/contract');
assert.equal(contract.status, 200);
assert.equal(contract.payload.provider, 'anotes');

const status = await harness.call('GET', '/anotes/status');
assert.equal(status.status, 200);
assert.equal(status.payload.ok, true);
assert.equal(status.payload.note_count, 2);

const folders = await harness.call('GET', '/anotes/folders');
assert.equal(folders.status, 200);
assert.equal(folders.payload[0].name, 'Inbox');

const notes = await harness.call('GET', '/anotes/notes');
assert.equal(notes.status, 200);
assert.equal(notes.payload[0].title, 'Welcome to anotes');
assert.equal(notes.payload[0].body, 'Seed Apple Notes content from the emulator.');

const note = await harness.call('GET', '/anotes/notes/100');
assert.equal(note.status, 200);
assert.equal(note.payload.folder_name, 'Inbox');
assert.equal(note.payload.body, 'Seed Apple Notes content from the emulator.');

const search = await harness.call('GET', '/anotes/search?query=checklist');
assert.equal(search.status, 200);
assert.equal(search.payload[0].title, 'Project checklist');

const created = await harness.call('POST', '/anotes/notes', {
  title: 'Created via fakout',
  body: 'Created note body',
  folder_id: 10,
});
assert.equal(created.status, 201);
assert.equal(created.payload.title, 'Created via fakout');

const rpcList = await harness.call('POST', '/anotes/rpc', {
  jsonrpc: '2.0',
  id: 1,
  method: 'notes.list',
});
assert.equal(rpcList.status, 200);
assert.equal(rpcList.payload.id, 1);
assert.equal(rpcList.payload.result.length, 3);

const rpcCreate = await harness.call('POST', '/anotes/rpc', {
  jsonrpc: '2.0',
  id: 2,
  method: 'notes.create',
  params: { title: 'RPC note', body: 'rpc body' },
});
assert.equal(rpcCreate.status, 200);
assert.equal(rpcCreate.payload.result.title, 'RPC note');

const fixture = await harness.call('GET', '/anotes/fixtures/note-store.sql');
assert.equal(fixture.status, 200);
assert.match(fixture.payload, /Welcome to anotes/);
assert.match(fixture.payload, /ZICCLOUDSYNCINGOBJECT/);

const dir = await mkdtemp(join(tmpdir(), 'anotes-smoke-'));
try {
  const sqlPath = join(dir, 'note-store.sql');
  const dbPath = join(dir, 'NoteStore.sqlite');
  await writeFile(sqlPath, fixture.payload);
  await execFileP('sqlite3', [dbPath, `.read ${sqlPath}`]);
  const { stdout } = await execFileP('sqlite3', [dbPath, 'select count(*) from ZICCLOUDSYNCINGOBJECT where Z_ENT = 12;']);
  assert.equal(stdout.trim(), '4');
  const body = await execFileP('sqlite3', [dbPath, 'select cast(ZDATA as text) from ZICNOTEDATA where ZNOTE = 100;']);
  assert.equal(body.stdout.trim(), 'Seed Apple Notes content from the emulator.');
} finally {
  await rm(dir, { recursive: true, force: true });
}

console.log('anotes smoke ok');
