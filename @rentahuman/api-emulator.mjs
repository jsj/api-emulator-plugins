const STATE_KEY = 'rentahuman:state';

function now() {
  return new Date().toISOString();
}

function initialState(config = {}) {
  return {
    humans: config.humans ?? [{
      id: 'human_emulator',
      name: 'Ada Fieldrunner',
      location: 'San Francisco, CA',
      skills: ['pickup', 'photography', 'field-research'],
      hourly_rate_cents: 4500,
      rating: 4.98,
      availability: 'available_now',
    }],
    bounties: config.bounties ?? [],
    tasks: config.tasks ?? [],
    escrows: config.escrows ?? [],
    messages: config.messages ?? [],
    conversations: config.conversations ?? [{
      id: 'conversation_emulator',
      humanId: 'human_emulator',
      agentId: 'agent_emulator',
      subject: 'Seeded emulator conversation',
      status: 'open',
      unreadCount: 1,
      messages: [{
        id: 'msg_seed',
        conversationId: 'conversation_emulator',
        from: 'human',
        senderType: 'human',
        humanId: 'human_emulator',
        agentId: 'agent_emulator',
        text: 'Ready to help with a physical-world task.',
        attachments: [],
        read: false,
        created_at: now(),
      }],
      created_at: now(),
      updated_at: now(),
    }],
    transfers: config.transfers ?? [],
    reviews: config.reviews ?? [{ id: 'review_emulator', humanId: 'human_emulator', rating: 5, text: 'Great emulator human.' }],
    apiKeys: config.apiKeys ?? [{ id: 'key_emulator', name: 'Default key', prefix: 'rah_emulator', webhookUrl: null, active: true }],
    agents: config.agents ?? [],
    bookings: config.bookings ?? [],
    services: config.services ?? [{ id: 'service_emulator', humanId: 'human_emulator', title: 'Physical task helper', category: 'errands', hourlyRate: 45 }],
    wallet: config.wallet ?? { id: 'wallet_emulator', balance_cents: 25000, currency: 'USD' },
    nextBounty: 1,
    nextTask: 1,
    nextEscrow: 1,
    nextMessage: 1,
    nextConversation: 1,
    nextTransfer: 1,
    nextKey: 1,
    nextAgent: 1,
    nextBooking: 1,
    nextApplication: 1,
  };
}

function state(store) {
  const current = store.getData?.(STATE_KEY);
  if (current) return current;
  const next = initialState();
  store.setData?.(STATE_KEY, next);
  return next;
}

function saveState(store, next) {
  store.setData?.(STATE_KEY, next);
}

async function jsonBody(c) {
  return c.req.json().catch(() => ({}));
}

function filteredHumans(c, humans) {
  const query = (c.req.query?.('q') ?? c.req.query?.('name') ?? '').toLowerCase();
  const skill = c.req.query?.('skill');
  const location = (c.req.query?.('location') ?? '').toLowerCase();
  const minRate = Number(c.req.query?.('minRate') ?? c.req.query?.('min_rate') ?? 0);
  const maxRate = Number(c.req.query?.('maxRate') ?? c.req.query?.('max_rate') ?? Number.MAX_SAFE_INTEGER);
  return humans.filter((human) => {
    if (query && !`${human.name} ${human.skills.join(' ')}`.toLowerCase().includes(query)) return false;
    if (skill && !human.skills.includes(skill)) return false;
    if (location && !human.location.toLowerCase().includes(location)) return false;
    const hourlyRate = human.hourlyRate ?? human.hourly_rate_cents / 100;
    if (hourlyRate < minRate || hourlyRate > maxRate) return false;
    return true;
  });
}

function ok(data, key) {
  return key ? { success: true, [key]: data } : { success: true, data };
}

function humanProfile(human) {
  return {
    headline: 'API-native physical world operator',
    bio: 'Seeded RentAHuman profile for emulator workflows.',
    expertise: human.skills,
    location: { city: 'San Francisco', state: 'CA', country: 'US' },
    hourlyRate: human.hourlyRate ?? human.hourly_rate_cents / 100,
    currency: human.currency ?? 'USD',
    timezone: 'America/Los_Angeles',
    reviewCount: 12,
    isAvailable: true,
    isVerified: true,
    isFeatured: true,
    ...human,
  };
}

function findConversation(s, conversationId) {
  return s.conversations.find((conversation) => conversation.id === conversationId);
}

function conversationMessages(s, conversation) {
  const conversationId = conversation.id;
  const nested = conversation.messages ?? [];
  const global = s.messages.filter((message) => message.conversationId === conversationId);
  const byId = new Map([...nested, ...global].map((message) => [message.id, message]));
  return [...byId.values()].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

function conversationPayload(s, conversation) {
  const messages = conversationMessages(s, conversation);
  const lastMessage = messages.at(-1) ?? null;
  return {
    id: conversation.id,
    humanId: conversation.humanId,
    agentId: conversation.agentId,
    bountyId: conversation.bountyId ?? null,
    bookingId: conversation.bookingId ?? null,
    subject: conversation.subject ?? null,
    status: conversation.status ?? 'open',
    unreadCount: messages.filter((message) => !message.read && message.from !== 'agent').length,
    lastMessage,
    messages,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
  };
}

function createConversation(s, body = {}) {
  const conversation = {
    id: body.id ?? `conversation_${s.nextConversation++}`,
    humanId: body.humanId ?? body.human_id ?? 'human_emulator',
    agentId: body.agentId ?? body.agent_id ?? 'agent_emulator',
    bountyId: body.bountyId ?? body.bounty_id,
    bookingId: body.bookingId ?? body.booking_id,
    subject: body.subject ?? 'RentAHuman conversation',
    status: body.status ?? 'open',
    unreadCount: 0,
    messages: [],
    created_at: now(),
    updated_at: now(),
  };
  s.conversations.push(conversation);
  return conversation;
}

function createConversationMessage(s, conversation, body = {}) {
  const message = {
    id: body.id ?? `msg_${s.nextMessage++}`,
    conversationId: conversation.id,
    from: body.from ?? body.senderType ?? 'agent',
    senderType: body.senderType ?? body.from ?? 'agent',
    humanId: body.humanId ?? conversation.humanId,
    agentId: body.agentId ?? conversation.agentId,
    text: body.text ?? body.message ?? body.content ?? '',
    attachments: body.attachments ?? [],
    read: body.read ?? false,
    created_at: now(),
  };
  conversation.messages ??= [];
  conversation.messages.push(message);
  conversation.updated_at = message.created_at;
  if (!message.read && message.from !== 'agent') conversation.unreadCount = (conversation.unreadCount ?? 0) + 1;
  s.messages.push(message);
  return message;
}

function listConversations(c, s) {
  const humanId = c.req.query?.('humanId') ?? c.req.query?.('human_id');
  const agentId = c.req.query?.('agentId') ?? c.req.query?.('agent_id');
  const status = c.req.query?.('status');
  const unreadOnly = ['true', '1'].includes(String(c.req.query?.('unreadOnly') ?? c.req.query?.('unread_only') ?? 'false'));
  const limit = Number(c.req.query?.('limit') ?? 20);
  const offset = Number(c.req.query?.('offset') ?? 0);
  const rows = s.conversations
    .map((conversation) => conversationPayload(s, conversation))
    .filter((conversation) => !humanId || conversation.humanId === humanId)
    .filter((conversation) => !agentId || conversation.agentId === agentId)
    .filter((conversation) => !status || conversation.status === status)
    .filter((conversation) => !unreadOnly || conversation.unreadCount > 0);
  return { rows: rows.slice(offset, offset + limit), total: rows.length, limit, offset };
}

export const contract = {
  provider: 'rentahuman',
  source: 'RentAHuman REST API, OpenAPI, and MCP tool catalog-compatible subset',
  docs: 'https://rentahuman.ai/docs#rest-api',
  scope: ['agents', 'humans', 'search', 'bookings', 'bounties', 'applications', 'escrow', 'conversations', 'transfers', 'wallet', 'services', 'api-keys', 'reviews', 'mcp-tools', 'state-inspection'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'rentahuman',
  register(app, store) {
    app.post('/api/agents/register', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const agent = { id: `agent_${s.nextAgent++}`, name: body.name ?? 'Emulator Agent', email: body.email, apiKey: `rah_emulator_${Date.now()}`, created_at: now() };
      s.agents.push(agent);
      saveState(store, s);
      return c.json(ok(agent, 'agent'), 201);
    });
    app.get('/api/agents/pairing-code', (c) => c.json(ok({ code: 'RAH-EMULATOR', expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() }, 'pairingCode')));
    app.get('/api/agents/pairing-status', (c) => c.json(ok({ paired: true, humanId: 'human_emulator' }, 'status')));
    app.get('/api/agents/:agentId', (c) => c.json(ok(state(store).agents.find((agent) => agent.id === c.req.param('agentId')) ?? { id: c.req.param('agentId'), name: 'Emulator Agent' }, 'agent')));

    app.get('/api/humans', (c) => {
      const humans = filteredHumans(c, state(store).humans).map(humanProfile);
      return c.json({ success: true, humans, count: humans.length });
    });
    app.get('/api/humans/:humanId', (c) => {
      const human = state(store).humans.find((item) => item.id === c.req.param('humanId'));
      return human ? c.json(ok(humanProfile(human), 'human')) : c.json({ success: false, error: 'not_found' }, 404);
    });
    app.get('/api/search', (c) => {
      const humans = filteredHumans(c, state(store).humans).map(humanProfile);
      return c.json({ success: true, results: humans, count: humans.length });
    });

    app.get('/api/v1/humans', (c) => c.json({ data: filteredHumans(c, state(store).humans) }));
    app.get('/api/v1/humans/:humanId', (c) => {
      const human = state(store).humans.find((item) => item.id === c.req.param('humanId'));
      return human ? c.json(human) : c.json({ error: 'not_found' }, 404);
    });

    app.post('/api/v1/bounties', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const bounty = {
        id: `bounty_${s.nextBounty++}`,
        title: body.title ?? 'Emulator bounty',
        description: body.description ?? '',
        location: body.location ?? 'San Francisco, CA',
        budget_cents: body.budget_cents ?? 7500,
        status: 'open',
        created_at: now(),
      };
      s.bounties.push(bounty);
      saveState(store, s);
      return c.json(bounty, 201);
    });
    app.post('/api/bounties', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const bounty = {
        id: `bounty_${s.nextBounty++}`,
        title: body.title ?? body.taskTitle ?? 'Emulator bounty',
        description: body.description ?? body.taskDescription ?? '',
        location: body.location ?? 'San Francisco, CA',
        budget_cents: body.budget_cents ?? body.budgetCents ?? 7500,
        spotsAvailable: body.spotsAvailable ?? 1,
        applications: [],
        status: 'open',
        created_at: now(),
      };
      s.bounties.push(bounty);
      saveState(store, s);
      return c.json(ok(bounty, 'bounty'), 201);
    });
    app.get('/api/bounties', (c) => c.json(ok(state(store).bounties, 'bounties')));
    app.get('/api/bounties/featured', (c) => c.json(ok(state(store).bounties.filter((bounty) => bounty.status === 'open').slice(0, 10), 'bounties')));
    app.get('/api/bounties/:bountyId', (c) => {
      const bounty = state(store).bounties.find((item) => item.id === c.req.param('bountyId'));
      return bounty ? c.json(ok(bounty, 'bounty')) : c.json({ success: false, error: 'not_found' }, 404);
    });
    app.patch('/api/bounties/:bountyId', async (c) => {
      const s = state(store);
      const bounty = s.bounties.find((item) => item.id === c.req.param('bountyId'));
      if (!bounty) return c.json({ success: false, error: 'not_found' }, 404);
      Object.assign(bounty, await jsonBody(c), { updated_at: now() });
      saveState(store, s);
      return c.json(ok(bounty, 'bounty'));
    });
    app.post('/api/bounties/:bountyId/applications', async (c) => {
      const s = state(store);
      const bounty = s.bounties.find((item) => item.id === c.req.param('bountyId'));
      if (!bounty) return c.json({ success: false, error: 'not_found' }, 404);
      const body = await jsonBody(c);
      const application = { id: `app_${s.nextApplication++}`, humanId: body.humanId ?? 'human_emulator', status: 'pending', message: body.message ?? '', created_at: now() };
      bounty.applications ??= [];
      bounty.applications.push(application);
      saveState(store, s);
      return c.json(ok(application, 'application'), 201);
    });
    app.patch('/api/bounties/:bountyId/applications/:appId', async (c) => {
      const s = state(store);
      const bounty = s.bounties.find((item) => item.id === c.req.param('bountyId'));
      const application = bounty?.applications?.find((item) => item.id === c.req.param('appId'));
      if (!application) return c.json({ success: false, error: 'not_found' }, 404);
      Object.assign(application, await jsonBody(c), { updated_at: now() });
      if (application.status === 'accepted') bounty.human_id = application.humanId;
      saveState(store, s);
      return c.json(ok(application, 'application'));
    });

    app.get('/api/bookings', (c) => {
      const s = state(store);
      const status = c.req.query?.('status');
      const humanId = c.req.query?.('humanId');
      const bookings = s.bookings.filter((booking) => (!status || booking.status === status) && (!humanId || booking.humanId === humanId));
      return c.json(ok(bookings, 'bookings'));
    });
    app.post('/api/bookings', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const human = s.humans.find((item) => item.id === body.humanId) ?? s.humans[0];
      const booking = {
        id: `booking_${s.nextBooking++}`,
        humanId: body.humanId ?? human.id,
        agentId: body.agentId ?? 'agent_emulator',
        agentName: body.agentName ?? 'Emulator Agent',
        agentType: body.agentType ?? 'other',
        taskTitle: body.taskTitle ?? 'Emulator booking',
        taskDescription: body.taskDescription ?? '',
        taskCategory: body.taskCategory ?? 'errands',
        startTime: body.startTime ?? now(),
        estimatedHours: body.estimatedHours ?? 1,
        totalAmount: (body.estimatedHours ?? 1) * (human.hourlyRate ?? human.hourly_rate_cents / 100),
        currency: human.currency ?? 'USD',
        paymentStatus: 'pending',
        status: 'pending',
        created_at: now(),
      };
      s.bookings.push(booking);
      saveState(store, s);
      return c.json({ success: true, booking, message: 'Use checkout or PATCH paymentTxHash to confirm payment.' });
    });
    app.get('/api/bookings/:bookingId', (c) => {
      const booking = state(store).bookings.find((item) => item.id === c.req.param('bookingId'));
      return booking ? c.json(ok(booking, 'booking')) : c.json({ success: false, error: 'not_found' }, 404);
    });
    app.patch('/api/bookings/:bookingId', async (c) => {
      const s = state(store);
      const booking = s.bookings.find((item) => item.id === c.req.param('bookingId'));
      if (!booking) return c.json({ success: false, error: 'not_found' }, 404);
      const body = await jsonBody(c);
      Object.assign(booking, body, { paymentStatus: body.paymentTxHash ? 'paid' : booking.paymentStatus, updated_at: now() });
      saveState(store, s);
      return c.json(ok(booking, 'booking'));
    });
    app.get('/api/v1/bounties', (c) => c.json({ data: state(store).bounties }));
    app.post('/api/v1/bounties/:bountyId/accept', async (c) => {
      const s = state(store);
      const bounty = s.bounties.find((item) => item.id === c.req.param('bountyId'));
      if (!bounty) return c.json({ error: 'not_found' }, 404);
      const body = await jsonBody(c);
      bounty.status = 'accepted';
      bounty.human_id = body.human_id ?? 'human_emulator';
      saveState(store, s);
      return c.json(bounty);
    });

    app.post('/api/v1/tasks', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const task = {
        id: `task_${s.nextTask++}`,
        human_id: body.human_id ?? 'human_emulator',
        title: body.title ?? 'Emulator task',
        instructions: body.instructions ?? '',
        status: 'booked',
        scheduled_at: body.scheduled_at ?? now(),
        created_at: now(),
      };
      s.tasks.push(task);
      saveState(store, s);
      return c.json(task, 201);
    });
    app.get('/api/v1/tasks/:taskId', (c) => {
      const task = state(store).tasks.find((item) => item.id === c.req.param('taskId'));
      return task ? c.json(task) : c.json({ error: 'not_found' }, 404);
    });
    app.patch('/api/v1/tasks/:taskId', async (c) => {
      const s = state(store);
      const task = s.tasks.find((item) => item.id === c.req.param('taskId'));
      if (!task) return c.json({ error: 'not_found' }, 404);
      Object.assign(task, await jsonBody(c), { updated_at: now() });
      saveState(store, s);
      return c.json(task);
    });

    app.post('/api/v1/escrows', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const escrow = {
        id: `escrow_${s.nextEscrow++}`,
        task_id: body.task_id,
        amount_cents: body.amount_cents ?? 7500,
        currency: body.currency ?? 'USD',
        status: 'funded',
        created_at: now(),
      };
      s.escrows.push(escrow);
      s.wallet.balance_cents -= escrow.amount_cents;
      saveState(store, s);
      return c.json(escrow, 201);
    });
    app.post('/api/escrow', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const escrow = { id: `escrow_${s.nextEscrow++}`, task_id: body.task_id ?? body.taskId, bounty_id: body.bountyId, amount_cents: body.amount_cents ?? body.amountCents ?? 7500, currency: body.currency ?? 'USD', status: 'created', created_at: now() };
      s.escrows.push(escrow);
      saveState(store, s);
      return c.json(ok(escrow, 'escrow'), 201);
    });
    app.get('/api/escrow/:escrowId', (c) => {
      const escrow = state(store).escrows.find((item) => item.id === c.req.param('escrowId'));
      return escrow ? c.json(ok(escrow, 'escrow')) : c.json({ success: false, error: 'not_found' }, 404);
    });
    app.post('/api/escrow/checkout', async (c) => c.json(ok({ id: `checkout_${Date.now()}`, url: 'https://rentahuman.ai/checkout/emulator', ...(await jsonBody(c)) }, 'checkout')));
    app.post('/api/escrow/agent-checkout', async (c) => c.json(ok({ id: `agent_checkout_${Date.now()}`, url: 'https://rentahuman.ai/agent-checkout/emulator', ...(await jsonBody(c)) }, 'checkout')));
    app.get('/api/escrow/agent-rentals', (c) => c.json(ok(state(store).bookings, 'rentals')));
    app.get('/api/escrow/balance', (c) => c.json(ok({ balance_cents: state(store).escrows.reduce((sum, escrow) => sum + (escrow.amount_cents ?? 0), 0), currency: 'USD' }, 'balance')));
    app.post('/api/v1/escrows/:escrowId/release', (c) => {
      const s = state(store);
      const escrow = s.escrows.find((item) => item.id === c.req.param('escrowId'));
      if (!escrow) return c.json({ error: 'not_found' }, 404);
      escrow.status = 'released';
      escrow.released_at = now();
      saveState(store, s);
      return c.json(escrow);
    });

    app.get('/api/v1/wallet', (c) => c.json(state(store).wallet));
    app.get('/api/wallet/balance', (c) => c.json(ok(state(store).wallet, 'wallet')));
    app.post('/api/wallet/deposit', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      s.wallet.balance_cents += body.amount_cents ?? body.amountCents ?? 0;
      saveState(store, s);
      return c.json(ok(s.wallet, 'wallet'));
    });
    app.post('/api/wallet/withdraw', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      s.wallet.balance_cents -= body.amount_cents ?? body.amountCents ?? 0;
      saveState(store, s);
      return c.json(ok(s.wallet, 'wallet'));
    });
    app.get('/api/wallet/transactions', (c) => c.json(ok([...state(store).transfers, ...state(store).escrows], 'transactions')));

    app.post('/api/transfers/send', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const transfer = { id: `transfer_${s.nextTransfer++}`, humanId: body.humanId ?? 'human_emulator', amount_cents: body.amount_cents ?? body.amountCents ?? 1000, currency: body.currency ?? 'USD', status: 'sent', created_at: now() };
      s.transfers.push(transfer);
      s.wallet.balance_cents -= transfer.amount_cents;
      saveState(store, s);
      return c.json(ok(transfer, 'transfer'), 201);
    });
    app.post('/api/transfers/bulk-send', async (c) => {
      const body = await jsonBody(c);
      const recipients = body.recipients ?? [{ humanId: 'human_emulator', amount_cents: body.amount_cents ?? 1000 }];
      const transfers = [];
      for (const recipient of recipients) transfers.push((await plugin.registerTransfer?.(store, recipient)) ?? recipient);
      return c.json(ok(transfers, 'transfers'));
    });
    app.get('/api/transfers/mine', (c) => c.json(ok(state(store).transfers, 'transfers')));
    app.get('/api/transfers/:transferId', (c) => {
      const transfer = state(store).transfers.find((item) => item.id === c.req.param('transferId'));
      return transfer ? c.json(ok(transfer, 'transfer')) : c.json({ success: false, error: 'not_found' }, 404);
    });
    app.post('/api/transfers/checkout', async (c) => c.json(ok({ id: `transfer_checkout_${Date.now()}`, url: 'https://rentahuman.ai/transfer-checkout/emulator', ...(await jsonBody(c)) }, 'checkout')));

    app.post('/api/conversations/start', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const conversation = createConversation(s, body);
      if (body.text || body.message || body.content) createConversationMessage(s, conversation, body);
      saveState(store, s);
      return c.json(ok(conversationPayload(s, conversation), 'conversation'), 201);
    });
    app.post('/api/conversations', async (c) => {
      const s = state(store);
      const conversation = createConversation(s, await jsonBody(c));
      saveState(store, s);
      return c.json(ok(conversationPayload(s, conversation), 'conversation'), 201);
    });
    app.get('/api/conversations', (c) => {
      const result = listConversations(c, state(store));
      return c.json({ success: true, conversations: result.rows, count: result.rows.length, total: result.total, limit: result.limit, offset: result.offset });
    });
    app.get('/api/conversations/unread-count', (c) => {
      const s = state(store);
      const humanId = c.req.query?.('humanId') ?? c.req.query?.('human_id');
      const agentId = c.req.query?.('agentId') ?? c.req.query?.('agent_id');
      const count = s.conversations
        .map((conversation) => conversationPayload(s, conversation))
        .filter((conversation) => !humanId || conversation.humanId === humanId)
        .filter((conversation) => !agentId || conversation.agentId === agentId)
        .reduce((sum, conversation) => sum + conversation.unreadCount, 0);
      return c.json(ok({ count }, 'unread'));
    });
    app.get('/api/conversations/:conversationId', (c) => {
      const s = state(store);
      const conversation = findConversation(s, c.req.param('conversationId'));
      return conversation ? c.json(ok(conversationPayload(s, conversation), 'conversation')) : c.json({ success: false, error: 'not_found' }, 404);
    });
    app.post('/api/conversations/:conversationId', async (c) => {
      const s = state(store);
      const conversation = findConversation(s, c.req.param('conversationId'));
      if (!conversation) return c.json({ success: false, error: 'not_found' }, 404);
      const message = createConversationMessage(s, conversation, await jsonBody(c));
      saveState(store, s);
      return c.json(ok(message, 'message'), 201);
    });
    app.get('/api/conversations/:conversationId/messages', (c) => {
      const s = state(store);
      const conversation = findConversation(s, c.req.param('conversationId'));
      if (!conversation) return c.json({ success: false, error: 'not_found' }, 404);
      return c.json(ok(conversationMessages(s, conversation), 'messages'));
    });
    app.patch('/api/conversations/:conversationId', async (c) => {
      const s = state(store);
      const conversation = findConversation(s, c.req.param('conversationId'));
      if (!conversation) return c.json({ success: false, error: 'not_found' }, 404);
      Object.assign(conversation, await jsonBody(c), { updated_at: now() });
      saveState(store, s);
      return c.json(ok(conversationPayload(s, conversation), 'conversation'));
    });
    app.post('/api/conversations/:conversationId/read', (c) => {
      const s = state(store);
      const conversation = findConversation(s, c.req.param('conversationId'));
      if (!conversation) return c.json({ success: false, error: 'not_found' }, 404);
      for (const message of conversation.messages ?? []) message.read = true;
      for (const message of s.messages.filter((item) => item.conversationId === conversation.id)) message.read = true;
      conversation.unreadCount = 0;
      conversation.updated_at = now();
      saveState(store, s);
      return c.json(ok(conversationPayload(s, conversation), 'conversation'));
    });
    app.delete('/api/conversations/:conversationId', (c) => {
      const s = state(store);
      const conversation = findConversation(s, c.req.param('conversationId'));
      if (!conversation) return c.json({ success: false, error: 'not_found' }, 404);
      conversation.status = 'archived';
      conversation.updated_at = now();
      saveState(store, s);
      return c.json(ok(conversationPayload(s, conversation), 'conversation'));
    });
    app.post('/api/v1/messages', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const message = { id: `msg_${s.nextMessage++}`, task_id: body.task_id, from: body.from ?? 'agent', text: body.text ?? '', created_at: now() };
      s.messages.push(message);
      saveState(store, s);
      return c.json(message, 201);
    });
    app.get('/api/v1/tasks/:taskId/messages', (c) => c.json({ data: state(store).messages.filter((message) => message.task_id === c.req.param('taskId')) }));

    app.post('/mcp', async (c) => {
      const body = await jsonBody(c);
      if (body.method === 'tools/list') {
        return c.json({ tools: ['get_agent_identity', 'list_identities', 'create_identity', 'switch_identity', 'delete_identity', 'search_humans', 'get_human', 'browse_services', 'get_reviews', 'create_bounty', 'list_bounties', 'get_bounty', 'update_bounty', 'get_bounty_applications', 'accept_application', 'reject_application', 'rent_human', 'get_my_rentals', 'create_personal_bounty', 'create_escrow_checkout', 'fund_escrow', 'get_escrow', 'list_escrows', 'release_payment', 'cancel_escrow', 'confirm_delivery', 'open_dispute', 'get_wallet_balance', 'deposit_wallet', 'send_money', 'bulk_send_money', 'get_transfer', 'list_transfers', 'start_conversation', 'send_message', 'get_conversation', 'list_conversations', 'get_service_availability', 'book_service', 'list_my_service_bookings', 'agent_register', 'get_pairing_code', 'check_pairing_status', 'check_account_status', 'list_api_keys', 'create_api_key', 'revoke_api_key'].map((name) => ({ name })) });
      }
      if (body.method === 'tools/call' || body.method === 'tool/call') {
        const s = state(store);
        const name = body.params?.name ?? body.name;
        const args = body.params?.arguments ?? body.arguments ?? {};
        if (name === 'start_conversation') {
          const conversation = createConversation(s, args);
          saveState(store, s);
          return c.json({ result: conversationPayload(s, conversation) });
        }
        if (name === 'send_message') {
          const conversation = findConversation(s, args.conversationId ?? args.conversation_id);
          if (!conversation) return c.json({ error: { code: 'not_found', message: 'Conversation not found' } }, 404);
          const message = createConversationMessage(s, conversation, args);
          saveState(store, s);
          return c.json({ result: message });
        }
        if (name === 'get_conversation') {
          const conversation = findConversation(s, args.conversationId ?? args.conversation_id);
          if (!conversation) return c.json({ error: { code: 'not_found', message: 'Conversation not found' } }, 404);
          return c.json({ result: conversationPayload(s, conversation) });
        }
        if (name === 'list_conversations') return c.json({ result: s.conversations.map((conversation) => conversationPayload(s, conversation)) });
      }
      return c.json({ result: { ok: true, method: body.method ?? 'unknown', echo: body.params ?? body.arguments ?? {} } });
    });

    app.get('/api/services/browse', (c) => c.json(ok(state(store).services, 'services')));
    app.post('/api/services/book', async (c) => c.json(ok({ id: `service_booking_${Date.now()}`, status: 'pending_payment', checkoutUrl: 'https://rentahuman.ai/services/checkout/emulator', ...(await jsonBody(c)) }, 'booking')));
    app.get('/api/services/my-bookings', (c) => c.json(ok(state(store).bookings, 'bookings')));
    app.get('/api/services/agent-bookings', (c) => c.json(ok(state(store).bookings, 'bookings')));

    app.get('/api/keys', (c) => c.json(ok(state(store).apiKeys, 'keys')));
    app.post('/api/keys', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const key = { id: `key_${s.nextKey++}`, name: body.name ?? 'Emulator key', prefix: `rah_${Date.now()}`, active: true, webhookUrl: body.webhookUrl ?? null };
      s.apiKeys.push(key);
      saveState(store, s);
      return c.json(ok({ ...key, apiKey: `${key.prefix}_secret` }, 'key'), 201);
    });
    app.patch('/api/keys/:keyId', async (c) => {
      const s = state(store);
      const key = s.apiKeys.find((item) => item.id === c.req.param('keyId'));
      if (!key) return c.json({ success: false, error: 'not_found' }, 404);
      Object.assign(key, await jsonBody(c), { updated_at: now() });
      saveState(store, s);
      return c.json(ok(key, 'key'));
    });
    app.delete('/api/keys/:keyId', (c) => {
      const s = state(store);
      const key = s.apiKeys.find((item) => item.id === c.req.param('keyId'));
      if (!key) return c.json({ success: false, error: 'not_found' }, 404);
      key.active = false;
      saveState(store, s);
      return c.json(ok(key, 'key'));
    });

    app.get('/api/reviews', (c) => c.json(ok(state(store).reviews.filter((review) => !c.req.query?.('humanId') || review.humanId === c.req.query('humanId')), 'reviews')));
    app.post('/api/reviews', async (c) => {
      const s = state(store);
      const review = { id: `review_${Date.now()}`, ...(await jsonBody(c)), created_at: now() };
      s.reviews.push(review);
      saveState(store, s);
      return c.json(ok(review, 'review'), 201);
    });
    app.get('/api/reviews/:reviewId', (c) => {
      const review = state(store).reviews.find((item) => item.id === c.req.param('reviewId'));
      return review ? c.json(ok(review, 'review')) : c.json({ success: false, error: 'not_found' }, 404);
    });

    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'RentAHuman API emulator';
export const endpoints = 'Human search, bounties, tasks, escrow, messages, wallet, MCP tool list, and state inspection';
export const capabilities = contract.scope;
export const initConfig = { rentahuman: initialState() };
export default plugin;
