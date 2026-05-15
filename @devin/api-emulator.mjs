const STATE_KEY = 'devin:state';
const NOW = '2026-05-15T12:00:00.000Z';

function initialState(config = {}) {
  return {
    self: config.self ?? { id: 'usr_emulator', email: 'operator@example.com', name: 'Devin Emulator User', default_org_id: 'org_emulator' },
    organizations: config.organizations ?? [{ id: 'org_emulator', name: 'Emulator Organization' }],
    users: config.users ?? [{ id: 'usr_emulator', email: 'operator@example.com', name: 'Devin Emulator User', role: 'admin' }],
    sessions: config.sessions ?? [],
    prReviews: config.prReviews ?? [],
    knowledgeNotes: config.knowledgeNotes ?? [],
    nextSession: 1,
    nextReview: 1,
    nextNote: 1,
    ...config,
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

function orgExists(s, orgId) {
  return s.organizations.some((org) => org.id === orgId);
}

function notFound(c, message) {
  return c.json({ error: { message } }, 404);
}

export const contract = {
  provider: 'devin',
  source: 'Devin official v3 API and MCP documentation',
  docs: 'https://docs.devin.ai/api-reference/overview',
  baseUrl: 'https://api.devin.ai/v3',
  auth: ['Authorization: Bearer <token>'],
  scope: ['self', 'organization-sessions', 'session-messages', 'enterprise-users', 'pr-reviews', 'knowledge-notes', 'inspection'],
  compatibilityOracle: 'Devin API examples use a configurable BASE_URL; Devin MCP is available for session and knowledge workflows.',
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'devin',
  register(app, store) {
    app.get('/v3/self', (c) => c.json(state(store).self));
    app.get('/v3/enterprise/organizations/:orgId/members/users', (c) => {
      const s = state(store);
      if (!orgExists(s, c.req.param('orgId'))) return notFound(c, 'organization not found');
      return c.json({ users: s.users, next_cursor: null });
    });

    app.get('/v3/organizations/:orgId/sessions', (c) => {
      const s = state(store);
      const orgId = c.req.param('orgId');
      if (!orgExists(s, orgId)) return notFound(c, 'organization not found');
      return c.json({ sessions: s.sessions.filter((session) => session.org_id === orgId), next_cursor: null });
    });

    app.post('/v3/organizations/:orgId/sessions', async (c) => {
      const s = state(store);
      const orgId = c.req.param('orgId');
      if (!orgExists(s, orgId)) return notFound(c, 'organization not found');
      const body = await jsonBody(c);
      const id = `devin-${String(s.nextSession++).padStart(6, '0')}`;
      const session = {
        devin_id: id,
        session_id: id,
        org_id: orgId,
        status: 'running',
        title: body.title ?? 'Emulator session',
        prompt: body.prompt ?? body.message ?? '',
        url: `https://app.devin.ai/sessions/${id}`,
        messages: body.prompt ? [{ role: 'user', content: body.prompt, created_at: NOW }] : [],
        created_at: NOW,
        updated_at: NOW,
      };
      s.sessions.unshift(session);
      saveState(store, s);
      return c.json(session, 201);
    });

    app.get('/v3/organizations/:orgId/sessions/:devinId', (c) => {
      const session = state(store).sessions.find((item) => item.org_id === c.req.param('orgId') && item.devin_id === c.req.param('devinId'));
      if (!session) return notFound(c, 'session not found');
      return c.json(session);
    });

    app.post('/v3/organizations/:orgId/sessions/:devinId/messages', async (c) => {
      const s = state(store);
      const session = s.sessions.find((item) => item.org_id === c.req.param('orgId') && item.devin_id === c.req.param('devinId'));
      if (!session) return notFound(c, 'session not found');
      const body = await jsonBody(c);
      const message = { role: 'user', content: body.message ?? body.content ?? '', created_at: NOW };
      session.messages.push(message, { role: 'assistant', content: 'Emulator acknowledged the request.', created_at: NOW });
      session.updated_at = NOW;
      saveState(store, s);
      return c.json({ message, session });
    });

    app.get('/v3/organizations/:orgId/pr-reviews', (c) => {
      const rows = state(store).prReviews.filter((review) => review.org_id === c.req.param('orgId'));
      return c.json({ pr_reviews: rows, next_cursor: null });
    });

    app.post('/v3/organizations/:orgId/pr-reviews', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const review = { id: `prr_${s.nextReview++}`, org_id: c.req.param('orgId'), status: 'completed', repository: body.repository ?? body.repo, pull_request_url: body.pull_request_url ?? body.url, summary: 'Emulator PR review completed.', created_at: NOW };
      s.prReviews.unshift(review);
      saveState(store, s);
      return c.json(review, 201);
    });

    app.post('/v3/organizations/:orgId/knowledge/notes', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const note = { id: `note_${s.nextNote++}`, org_id: c.req.param('orgId'), title: body.title ?? 'Emulator note', content: body.content ?? body.body ?? '', created_at: NOW };
      s.knowledgeNotes.unshift(note);
      saveState(store, s);
      return c.json(note, 201);
    });

    app.get('/devin/inspect/state', (c) => c.json(state(store)));
  },
};
