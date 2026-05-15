const STATE_KEY = 'coderabbit:state';
const NOW = '2026-05-15T12:00:00.000Z';

function initialState(config = {}) {
  return {
    users: config.users ?? [
      { id: 'usr_emulator_admin', email: 'admin@example.com', name: 'Admin User', role: 'admin', seat_status: 'active', created_at: NOW },
      { id: 'usr_emulator_reviewer', email: 'reviewer@example.com', name: 'Reviewer User', role: 'member', seat_status: 'active', created_at: NOW },
    ],
    metrics: config.metrics ?? [{ date: '2026-05-15', reviews: 12, comments: 34, repositories: 3, average_review_time_seconds: 42 }],
    auditLogs: config.auditLogs ?? [{ id: 'audit_1', actor: 'admin@example.com', action: 'users.list', target: 'organization', created_at: NOW }],
    nextAudit: 2,
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

function appendAudit(s, action, target) {
  s.auditLogs.unshift({ id: `audit_${s.nextAudit++}`, actor: 'api-key', action, target, created_at: NOW });
}

export const contract = {
  provider: 'coderabbit',
  source: 'CodeRabbit official REST API and CLI documentation',
  docs: 'https://docs.coderabbit.ai/api-reference',
  baseUrl: 'https://api.coderabbit.ai',
  auth: ['x-coderabbitai-api-key: <api-key>'],
  scope: ['users', 'seat-management', 'role-management', 'review-metrics', 'audit-logs', 'inspection'],
  compatibilityOracle: 'CodeRabbit CLI supports API-key login and self-hosted URL configuration.',
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'coderabbit',
  register(app, store) {
    app.get('/v1/users', (c) => {
      const s = state(store);
      appendAudit(s, 'users.list', 'users');
      saveState(store, s);
      return c.json({ data: s.users, pagination: { has_more: false, next_cursor: null } });
    });

    app.post('/v1/users/seats', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const emails = body.emails ?? body.user_emails ?? [];
      const seatStatus = body.seat_status ?? body.action ?? 'active';
      const updated = s.users.filter((user) => emails.includes(user.email) || emails.includes(user.id));
      for (const user of updated) user.seat_status = seatStatus === 'remove' ? 'inactive' : seatStatus;
      appendAudit(s, 'users.seats.update', emails.join(','));
      saveState(store, s);
      return c.json({ data: updated, updated_count: updated.length });
    });

    app.post('/v1/users/roles', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const role = body.role ?? 'member';
      const emails = body.emails ?? body.user_emails ?? [];
      const updated = s.users.filter((user) => emails.includes(user.email) || emails.includes(user.id));
      for (const user of updated) user.role = role;
      appendAudit(s, 'users.roles.update', emails.join(','));
      saveState(store, s);
      return c.json({ data: updated, updated_count: updated.length });
    });

    app.get('/v1/metrics/reviews', (c) => {
      const s = state(store);
      const repository = c.req.query('repository');
      const data = s.metrics.map((row) => ({ ...row, repository: repository ?? 'github.com/emulator/repo' }));
      return c.json({ data, period: { start_date: c.req.query('start_date') ?? '2026-05-01', end_date: c.req.query('end_date') ?? '2026-05-15' } });
    });

    app.get('/v1/audit-logs', (c) => c.json({ data: state(store).auditLogs, pagination: { has_more: false, next_cursor: null } }));
    app.get('/coderabbit/inspect/state', (c) => c.json(state(store)));
  },
};
