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

const contract = await harness.call('GET', '/imsg/inspect/contract');
assert.equal(contract.status, 200);
assert.equal(contract.payload.provider, 'imsg');

const state = await harness.call('GET', '/imsg/inspect/state');
assert.equal(state.status, 200);
assert.equal(state.payload.chats[0].displayName, 'Emulator Group');

const status = await harness.call('GET', '/imsg/status');
assert.equal(status.status, 200);
assert.equal(status.payload.ok, true);
assert.ok(status.payload.rpc_methods.includes('chats.list'));

const chats = await harness.call('GET', '/imsg/chats');
assert.equal(chats.status, 200);
assert.equal(chats.payload[0].name, 'Emulator Group');
assert.equal(chats.payload[0].participants.length, 2);

const history = await harness.call('GET', '/imsg/chats/1/history?attachments=true&reactions=true');
assert.equal(history.status, 200);
assert.equal(history.payload.length, 2);
assert.equal(history.payload[0].attachments[0].transfer_name, 'photo.jpg');

const search = await harness.call('GET', '/imsg/search?query=direct');
assert.equal(search.status, 200);
assert.equal(search.payload[0].text, 'direct hello');

const sent = await harness.call('POST', '/imsg/send', {
  chat_id: 2,
  text: 'sent through fakout',
});
assert.equal(sent.status, 200);
assert.equal(sent.payload.ok, true);
assert.equal(sent.payload.message.text, 'sent through fakout');

const reacted = await harness.call('POST', '/imsg/react', {
  chat_id: 2,
  message_id: sent.payload.message.id,
  reaction: 'like',
});
assert.equal(reacted.status, 200);
assert.equal(reacted.payload.reaction.emoji, '👍');

const rpcChats = await harness.call('POST', '/imsg/rpc', {
  jsonrpc: '2.0',
  id: 1,
  method: 'chats.list',
});
assert.equal(rpcChats.status, 200);
assert.equal(rpcChats.payload.id, 1);
assert.equal(rpcChats.payload.result[0].name, 'Emulator Group');

const rpcSend = await harness.call('POST', '/imsg/rpc', {
  jsonrpc: '2.0',
  id: 2,
  method: 'send',
  params: { to: '+15551234567', text: 'rpc fakout send' },
});
assert.equal(rpcSend.status, 200);
assert.equal(rpcSend.payload.result.text, 'rpc fakout send');

const fixture = await harness.call('GET', '/imsg/fixtures/chat-db.sql');
assert.equal(fixture.status, 200);
assert.match(fixture.payload, /hello from emulator/);
assert.match(fixture.payload, /photo.jpg/);

const dir = await mkdtemp(join(tmpdir(), 'imsg-smoke-'));
try {
  const sqlPath = join(dir, 'chat-db.sql');
  const dbPath = join(dir, 'chat.db');
  await writeFile(sqlPath, fixture.payload);
  await execFileP('sqlite3', [dbPath, `.read ${sqlPath}`]);
  const { stdout } = await execFileP('sqlite3', [dbPath, 'select count(*) from message;']);
  assert.equal(stdout.trim(), '5');
} finally {
  await rm(dir, { recursive: true, force: true });
}

console.log('imsg smoke ok');
