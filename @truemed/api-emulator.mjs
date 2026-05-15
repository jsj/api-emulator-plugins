function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function initialState(config = {}) {
  const created = now();
  return {
    apiKeys: config.apiKeys ?? ['trm_sk_emulator'],
    paymentSessions: config.paymentSessions ?? [{
      id: 'ps_emulator',
      status: 'captured',
      status_summary: 'Captured',
      kind: 'one_time_payment',
      customer_email: 'patient@example.test',
      customer_name: 'Pat Patient',
      total_amount: 12500,
      authorize_amount: 12500,
      capture_amount: 12500,
      captured_on: created,
      authorized_on: created,
      created_at: created,
      metadata: 'seeded',
      order_items: [{ item_id: 'item_therapy_mat', sku: 'THERAPY-MAT', name: 'Therapy Mat', price: 12500, quantity: 1 }],
      refunds: [],
    }],
    paymentTokens: config.paymentTokens ?? [{
      id: 'pt_emulator',
      payment_token: 'pt_emulator',
      status: 'active',
      customer_email: 'patient@example.test',
      customer_name: 'Pat Patient',
      lmn_expires_at: '2027-01-01T00:00:00.000Z',
      payment_methods: [{ id: 'pm_emulator', brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 }],
      metadata: 'seeded',
      created_at: created,
    }],
    qualificationSessions: config.qualificationSessions ?? [{
      id: 'qs_emulator',
      qualification_session_id: 'qs_emulator',
      status: 'qualified',
      email: 'patient@example.test',
      user_id: 'user_emulator',
      source: 'emulator',
      expires_at: '2027-01-01T00:00:00.000Z',
      created_at: created,
    }],
    catalogItems: config.catalogItems ?? [{
      sku: 'THERAPY-MAT',
      name: 'Therapy Mat',
      description: 'HSA/FSA eligible recovery mat',
      eligibility: 'eligible_with_lmn',
      image_urls: ['https://example.test/therapy-mat.png'],
      url: 'https://example.test/products/therapy-mat',
      product_id: 'prod_therapy',
      gtin: '000000000001',
      metadata: 'seeded',
      created_at: created,
      reviewed_at: created,
    }],
  };
}

function state(store) {
  const current = store.getData?.('truemed:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('truemed:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('truemed:state', next);
}

async function jsonBody(c) {
  return c.req.json().catch(() => ({}));
}

function apiKey(c) {
  return c.req.header?.('x-truemed-api-key') ?? c.req.header?.('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
}

function authorized(c, store) {
  const key = apiKey(c);
  const keys = state(store).apiKeys;
  return typeof key === 'string' && (keys.length === 0 || keys.includes(key) || key === 'trm_sk_emulator');
}

function requireAuth(c, store) {
  if (authorized(c, store)) return null;
  return c.json({ error: 'Unauthorized', message: 'Missing or invalid x-truemed-api-key' }, 401);
}

function paymentDetail(session) {
  return {
    id: session.id,
    business_id: session.id,
    status: session.status,
    status_summary: session.status_summary,
    kind: session.kind,
    customer_email: session.customer_email,
    customer_name: session.customer_name,
    authorize_amount: session.authorize_amount,
    capture_amount: session.capture_amount,
    total_amount: session.total_amount,
    authorized_on: session.authorized_on,
    captured_on: session.captured_on,
    created_at: session.created_at,
    metadata: session.metadata ?? null,
    order_items: session.order_items ?? [],
    refunds: session.refunds ?? [],
    payment_token: session.payment_token ?? null,
  };
}

function tokenDetail(token) {
  return {
    id: token.id,
    payment_token: token.payment_token ?? token.id,
    status: token.status,
    customer_email: token.customer_email,
    customer_name: token.customer_name,
    lmn_expires_at: token.lmn_expires_at ?? null,
    payment_methods: token.payment_methods ?? [],
    metadata: token.metadata ?? null,
    created_at: token.created_at,
  };
}

function pagination(rows, page, pageSize) {
  return {
    current_page: page,
    page_size: pageSize,
    count: rows.length,
    last_page: Math.max(1, Math.ceil(rows.length / pageSize)),
  };
}

function pageRows(c, rows) {
  const page = Number(c.req.query?.('page') ?? 1);
  const pageSize = Number(c.req.query?.('page_size') ?? 30);
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 30;
  const start = (safePage - 1) * safePageSize;
  return { page: safePage, pageSize: safePageSize, rows: rows.slice(start, start + safePageSize) };
}

export const routes = [
  ['POST', '/payments/v1/create_payment_session'],
  ['GET', '/payments/v1/payment_session/:businessId'],
  ['GET', '/payments/v1/payment_sessions'],
  ['POST', '/payments/v1/payment_session/:businessId/capture'],
  ['POST', '/payments/v1/payment_session/:businessId/cancel'],
  ['POST', '/payments/v1/payment_session/:businessId/void'],
  ['POST', '/payments/v1/refund'],
  ['POST', '/api/v1/payment_tokens/create'],
  ['GET', '/api/v1/payment_tokens/:paymentToken'],
  ['GET', '/api/v1/payment_tokens'],
  ['POST', '/api/v1/payment_tokens/:paymentToken/update'],
  ['POST', '/api/v1/payment_tokens/:paymentToken/delete'],
  ['GET', '/api/v1/payment_tokens/provision_request/:provisionTokenRequestId'],
  ['GET', '/api/v1/qualification_session/:qualificationSessionId'],
  ['GET', '/api/v1/qualification_sessions'],
  ['POST', '/api/v1/product_catalog/truemed_checkout_method'],
  ['POST', '/api/v1/product_catalog/items/create'],
  ['POST', '/api/v1/product_catalog/items/update'],
  ['POST', '/api/v1/product_catalog/items/detail'],
  ['GET', '/inspect/contract'],
  ['GET', '/inspect/state'],
].map(([method, path]) => ({ method, path }));

export const contract = {
  provider: 'truemed',
  source: 'Truemed OpenAPI 3.1',
  docs: 'https://developers.truemed.com/openapi.json',
  scope: ['payment-sessions', 'manual-capture', 'cancel-void-refund', 'payment-tokens', 'qualification-sessions', 'product-catalog', 'inspection'],
  coverage: { source: 'https://developers.truemed.com/llms.txt', routeCount: routes.length, routes },
  fidelity: 'openapi-route-complete-stateful-rest-emulator',
};

export const plugin = {
  name: 'truemed',
  register(app, store) {
    app.post('/payments/v1/create_payment_session', async (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const s = state(store);
      const body = await jsonBody(c);
      if (!body.total_amount || !body.success_url || !body.failure_url) {
        return c.json({ error: 'MissingRequiredParameter', message: 'total_amount, success_url, and failure_url are required' }, 400);
      }
      const sessionId = body.idempotency_key ? `ps_${body.idempotency_key}` : id('ps');
      const existing = s.paymentSessions.find((session) => session.id === sessionId);
      if (existing) return c.json({ id: existing.id, redirect_url: existing.redirect_url });
      const created = now();
      const authorization = body.kind === 'authorization';
      const session = {
        id: sessionId,
        status: authorization ? 'authorized' : 'processing',
        status_summary: authorization ? 'Authorized' : 'Incomplete',
        kind: body.kind ?? 'one_time_payment',
        customer_email: body.customer_email ?? null,
        customer_name: body.customer_name ?? null,
        total_amount: body.total_amount,
        authorize_amount: body.total_amount,
        capture_amount: authorization ? null : body.total_amount,
        authorized_on: created,
        captured_on: authorization ? null : created,
        created_at: created,
        metadata: body.metadata ?? null,
        payment_token: body.payment_token ?? null,
        order_items: body.order_items ?? [],
        refunds: [],
        redirect_url: `${new URL(c.req.url).origin}/truemed/checkout/${sessionId}`,
      };
      s.paymentSessions.unshift(session);
      if (body.tokenize) {
        const token = {
          id: id('pt'),
          status: 'active',
          customer_email: session.customer_email,
          customer_name: session.customer_name,
          payment_methods: [],
          metadata: body.metadata ?? null,
          created_at: created,
        };
        token.payment_token = token.id;
        s.paymentTokens.unshift(token);
        session.payment_token = token.id;
      }
      saveState(store, s);
      return c.json({ id: session.id, redirect_url: session.redirect_url });
    });

    app.get('/payments/v1/payment_session/:businessId', (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const session = state(store).paymentSessions.find((item) => item.id === c.req.param('businessId'));
      if (!session) return c.json({ error: 'NotFound', message: 'Payment session not found' }, 404);
      return c.json(paymentDetail(session));
    });

    app.get('/payments/v1/payment_sessions', (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const s = state(store);
      const search = c.req.query?.('search')?.toLowerCase();
      const rows = search
        ? s.paymentSessions.filter((session) => [session.id, session.customer_email, session.customer_name].some((value) => String(value ?? '').toLowerCase().includes(search)))
        : s.paymentSessions;
      const page = pageRows(c, rows);
      return c.json({ pagination: pagination(rows, page.page, page.pageSize), payment_sessions: page.rows.map(paymentDetail) });
    });

    app.post('/payments/v1/payment_session/:businessId/capture', async (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const s = state(store);
      const body = await jsonBody(c);
      const session = s.paymentSessions.find((item) => item.id === c.req.param('businessId'));
      if (!session) return c.json({ error: 'PaymentSessionDoesNotExist', message: 'Payment session does not exist' }, 400);
      const amount = body.total_amount ?? session.total_amount;
      session.status = 'captured';
      session.status_summary = amount < session.total_amount ? 'Partially Captured' : 'Captured';
      session.capture_amount = amount;
      session.captured_on = now();
      saveState(store, s);
      return c.json({ id: id('cap'), payment_session_id: session.id, capture_amount: amount });
    });

    app.post('/payments/v1/payment_session/:businessId/cancel', (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const s = state(store);
      const session = s.paymentSessions.find((item) => item.id === c.req.param('businessId'));
      if (!session) return c.json({ error: 'PaymentSessionDoesNotExist', message: 'Payment session does not exist' }, 400);
      session.status = 'canceled';
      session.status_summary = 'Incomplete';
      saveState(store, s);
      return c.json({ id: session.id, status: session.status });
    });

    app.post('/payments/v1/payment_session/:businessId/void', (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const s = state(store);
      const session = s.paymentSessions.find((item) => item.id === c.req.param('businessId'));
      if (!session) return c.json({ error: 'PaymentSessionDoesNotExist', message: 'Payment session does not exist' }, 400);
      session.status = 'authorization_voided';
      session.status_summary = 'Voided';
      saveState(store, s);
      return c.json({ id: session.id, status: session.status });
    });

    app.post('/payments/v1/refund', async (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const s = state(store);
      const body = await jsonBody(c);
      const session = s.paymentSessions.find((item) => item.id === body.payment_session_id || item.id === body.business_id);
      if (!session) return c.json({ error: 'PaymentSessionDoesNotExist', message: 'Payment session does not exist' }, 400);
      const refund = { id: id('refund'), payment_session_id: session.id, amount: body.amount ?? session.capture_amount ?? session.total_amount, status: 'succeeded', created_at: now() };
      session.refunds.push(refund);
      session.status_summary = refund.amount >= session.total_amount ? 'Refunded' : 'Partially Refunded';
      saveState(store, s);
      return c.json(refund);
    });

    app.post('/api/v1/payment_tokens/create', async (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const s = state(store);
      const body = await jsonBody(c);
      const token = {
        id: id('pt'),
        status: 'active',
        customer_email: body.customer_email ?? null,
        customer_name: body.customer_name ?? null,
        lmn_expires_at: body.lmn_expires_at ?? null,
        payment_methods: body.payment_methods ?? [],
        metadata: body.metadata ?? null,
        created_at: now(),
      };
      token.payment_token = token.id;
      s.paymentTokens.unshift(token);
      saveState(store, s);
      return c.json(tokenDetail(token), 201);
    });

    app.get('/api/v1/payment_tokens/:paymentToken', (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const token = state(store).paymentTokens.find((item) => item.id === c.req.param('paymentToken') || item.payment_token === c.req.param('paymentToken'));
      if (!token) return c.json({ error: 'NotFound', message: 'Payment token not found' }, 404);
      return c.json(tokenDetail(token));
    });

    app.get('/api/v1/payment_tokens', (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const s = state(store);
      const page = pageRows(c, s.paymentTokens);
      return c.json({ pagination: pagination(s.paymentTokens, page.page, page.pageSize), payment_tokens: page.rows.map(tokenDetail) });
    });

    app.post('/api/v1/payment_tokens/:paymentToken/update', async (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const s = state(store);
      const body = await jsonBody(c);
      const token = s.paymentTokens.find((item) => item.id === c.req.param('paymentToken') || item.payment_token === c.req.param('paymentToken'));
      if (!token) return c.json({ error: 'NotFound', message: 'Payment token not found' }, 404);
      Object.assign(token, body, { id: token.id, payment_token: token.payment_token ?? token.id });
      saveState(store, s);
      return c.json(tokenDetail(token));
    });

    app.post('/api/v1/payment_tokens/:paymentToken/delete', (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const s = state(store);
      const token = s.paymentTokens.find((item) => item.id === c.req.param('paymentToken') || item.payment_token === c.req.param('paymentToken'));
      if (!token) return c.json({ error: 'NotFound', message: 'Payment token not found' }, 404);
      token.status = 'deleted';
      saveState(store, s);
      return c.json({});
    });

    app.get('/api/v1/payment_tokens/provision_request/:provisionTokenRequestId', (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      return c.json({ id: c.req.param('provisionTokenRequestId'), status: 'completed', payment_token: state(store).paymentTokens[0]?.id ?? null });
    });

    app.get('/api/v1/qualification_session/:qualificationSessionId', (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const session = state(store).qualificationSessions.find((item) => item.id === c.req.param('qualificationSessionId') || item.qualification_session_id === c.req.param('qualificationSessionId'));
      if (!session) return c.json({ error: 'NotFound', message: 'Qualification session not found' }, 404);
      return c.json(session);
    });

    app.get('/api/v1/qualification_sessions', (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const s = state(store);
      const page = pageRows(c, s.qualificationSessions);
      return c.json({ pagination: pagination(s.qualificationSessions, page.page, page.pageSize), qualification_sessions: page.rows });
    });

    app.post('/api/v1/product_catalog/truemed_checkout_method', async (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const body = await jsonBody(c);
      const s = state(store);
      const skus = new Set((body.items ?? body.order_items ?? []).map((item) => item.sku).filter(Boolean));
      const eligible = s.catalogItems.filter((item) => skus.has(item.sku) && item.eligibility !== 'ineligible');
      return c.json({ checkout_method: eligible.length ? 'truemed' : 'standard', eligible_items: eligible });
    });

    app.post('/api/v1/product_catalog/items/create', async (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const s = state(store);
      const body = await jsonBody(c);
      const item = { eligibility: 'eligible_with_lmn', created_at: now(), reviewed_at: null, ...body };
      s.catalogItems = s.catalogItems.filter((row) => row.sku !== item.sku);
      s.catalogItems.unshift(item);
      saveState(store, s);
      return c.json({ object: item }, 201);
    });

    app.post('/api/v1/product_catalog/items/update', async (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const s = state(store);
      const body = await jsonBody(c);
      const item = s.catalogItems.find((row) => row.sku === body.sku);
      if (!item) return c.json({ error: 'NotFound', message: 'Catalog item not found' }, 404);
      Object.assign(item, body);
      saveState(store, s);
      return c.json({});
    });

    app.post('/api/v1/product_catalog/items/detail', async (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const body = await jsonBody(c);
      const item = state(store).catalogItems.find((row) => row.sku === body.sku);
      if (!item) return c.json({ error: 'NotFound', message: 'Catalog item not found' }, 404);
      return c.json({ object: item });
    });

    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config.truemed ?? config));
}

export const label = 'Truemed API emulator';
export const endpoints = 'HSA/FSA payment sessions, payment tokens, qualification sessions, product catalog, refunds, capture, cancel, void, and inspection';
export const capabilities = contract.scope;
export const initConfig = { truemed: initialState() };
export default plugin;
