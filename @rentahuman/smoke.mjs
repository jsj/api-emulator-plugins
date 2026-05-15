import assert from 'node:assert/strict';
import { plugin } from './api-emulator.mjs';

const routes = [];
const data = new Map();
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
  patch: (path, handler) => routes.push({ method: 'PATCH', path, handler }),
  delete: (path, handler) => routes.push({ method: 'DELETE', path, handler }),
};
const store = { getData: (key) => data.get(key), setData: (key, value) => data.set(key, value) };

plugin.register(app, store);

function match(routePath, requestPath) {
  const routeParts = routePath.split('/').filter(Boolean);
  const requestParts = requestPath.split('/').filter(Boolean);
  if (routeParts.length !== requestParts.length) return null;
  const params = {};
  for (let i = 0; i < routeParts.length; i += 1) {
    if (routeParts[i].startsWith(':')) params[routeParts[i].slice(1)] = decodeURIComponent(requestParts[i]);
    else if (routeParts[i] !== requestParts[i]) return null;
  }
  return params;
}

async function request(method, path, body) {
  const url = new URL(path, 'http://rentahuman.local');
  const route = routes.find((item) => item.method === method && match(item.path, url.pathname));
  assert.ok(route, `${method} ${path} route should exist`);
  const params = match(route.path, url.pathname);
  let status = 200;
  let payload;
  await route.handler({
    req: {
      param: (name) => params[name],
      query: (name) => url.searchParams.get(name) ?? undefined,
      json: async () => body ?? {},
    },
    json: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
  });
  return { status, payload };
}

const humans = await request('GET', '/api/v1/humans?skill=pickup');
assert.equal(humans.payload.data[0].id, 'human_emulator');

const officialHumans = await request('GET', '/api/humans?skill=pickup');
assert.equal(officialHumans.payload.success, true);
assert.equal(officialHumans.payload.humans[0].id, 'human_emulator');

const agent = await request('POST', '/api/agents/register', { name: 'Smoke Agent', email: 'smoke@example.com' });
assert.match(agent.payload.agent.apiKey, /^rah_emulator_/);

const booking = await request('POST', '/api/bookings', { humanId: 'human_emulator', agentId: agent.payload.agent.id, agentType: 'other', taskTitle: 'Smoke booking', taskDescription: 'Run smoke', startTime: new Date().toISOString(), estimatedHours: 1 });
assert.equal(booking.payload.booking.status, 'pending');

const bounty = await request('POST', '/api/v1/bounties', { title: 'Pick up a package', budget_cents: 9000 });
assert.equal(bounty.status, 201);

const task = await request('POST', '/api/v1/tasks', { human_id: 'human_emulator', title: 'Package pickup' });
assert.equal(task.payload.status, 'booked');

const escrow = await request('POST', '/api/v1/escrows', { task_id: task.payload.id, amount_cents: 9000 });
assert.equal(escrow.payload.status, 'funded');

const released = await request('POST', `/api/v1/escrows/${escrow.payload.id}/release`);
assert.equal(released.payload.status, 'released');

const conversation = await request('POST', '/api/conversations/start', { humanId: 'human_emulator' });
assert.match(conversation.payload.conversation.id, /^conversation_/);

const message = await request('POST', `/api/conversations/${conversation.payload.conversation.id}`, {
  from: 'human',
  text: 'I can pick that up.',
  attachments: [{ type: 'image', url: 'https://rentahuman.ai/proof.jpg' }],
});
assert.equal(message.payload.message.text, 'I can pick that up.');

const messages = await request('GET', `/api/conversations/${conversation.payload.conversation.id}/messages`);
assert.equal(messages.payload.messages[0].attachments[0].type, 'image');

const unread = await request('GET', '/api/conversations/unread-count');
assert.ok(unread.payload.unread.count >= 1);

const read = await request('POST', `/api/conversations/${conversation.payload.conversation.id}/read`);
assert.equal(read.payload.conversation.unreadCount, 0);

const archived = await request('DELETE', `/api/conversations/${conversation.payload.conversation.id}`);
assert.equal(archived.payload.conversation.status, 'archived');

const mcpConversation = await request('POST', '/mcp', { method: 'tools/call', params: { name: 'start_conversation', arguments: { humanId: 'human_emulator', subject: 'MCP smoke' } } });
assert.equal(mcpConversation.payload.result.subject, 'MCP smoke');

const transfer = await request('POST', '/api/transfers/send', { humanId: 'human_emulator', amount_cents: 100 });
assert.equal(transfer.payload.transfer.status, 'sent');

const key = await request('POST', '/api/keys', { name: 'Smoke key' });
assert.match(key.payload.key.apiKey, /^rah_/);

const tools = await request('POST', '/mcp', { method: 'tools/list' });
assert.ok(tools.payload.tools.some((tool) => tool.name === 'book_service'));

console.log('rentahuman smoke ok');
