export const contract = {
  provider: 'sentry',
  source: 'Sentry Integration Platform webhook docs',
  docs: 'https://docs.sentry.io/organization/integrations/integration-platform/webhooks/',
  scope: ['issue-webhook-delivery', 'issue-alert-webhook-delivery', 'inspection'],
  fidelity: 'webhook-producer-subset',
};

function now() {
  return new Date().toISOString();
}

function sentryState(store) {
  const current = store.getData?.('sentry:state');
  if (current) return current;
  const initial = {
    targets: [],
    deliveries: [],
    issues: [],
    nextIssueId: 1000,
  };
  store.setData?.('sentry:state', initial);
  return initial;
}

function saveState(store, state) {
  store.setData?.('sentry:state', state);
}

async function parseBody(c) {
  return c.req.json().catch(() => ({}));
}

function makeIssue(state, overrides = {}) {
  const id = String(overrides.id ?? state.nextIssueId++);
  const title = overrides.title ?? 'Fatal error: Portfolio view crashed';
  return {
    id,
    shortId: overrides.shortId ?? `VIBETRADE-${id}`,
    title,
    culprit: overrides.culprit ?? 'PortfolioBreakdown.render',
    permalink: overrides.permalink ?? `https://sentry.local/organizations/vibetrade/issues/${id}/`,
    level: overrides.level ?? 'error',
    platform: overrides.platform ?? 'swift',
    project: overrides.project ?? { slug: 'vibetrade-ios' },
    metadata: {
      type: overrides.metadata?.type ?? 'NSInvalidArgumentException',
      value: overrides.metadata?.value ?? title,
      filename: overrides.metadata?.filename ?? 'PortfolioBreakdown.swift',
      function: overrides.metadata?.function ?? 'render',
      ...overrides.metadata,
    },
    firstSeen: overrides.firstSeen ?? now(),
    lastSeen: overrides.lastSeen ?? now(),
  };
}

function issueWebhookPayload(issue, action = 'created') {
  return {
    action,
    installation: { uuid: 'sentry-emulator-installation' },
    actor: { type: 'application', id: 'sentry-emulator', name: 'Sentry Emulator' },
    data: { issue },
  };
}

async function hmacSha256Hex(secret, payload) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function deliver(target, payload, secret) {
  const body = JSON.stringify(payload);
  const headers = {
    'content-type': 'application/json',
    'sentry-hook-resource': 'issue',
    'sentry-hook-timestamp': String(Math.floor(Date.now() / 1000)),
  };
  if (secret) headers['sentry-hook-signature'] = await hmacSha256Hex(secret, body);

  const response = await fetch(target.url, {
    method: 'POST',
    headers,
    body,
  });
  const responseBody = await response.text();
  return {
    targetUrl: target.url,
    status: response.status,
    ok: response.ok,
    body: responseBody,
    deliveredAt: now(),
  };
}

export const plugin = {
  name: 'sentry',
  register(app, store) {
    app.post('/control/targets', async (c) => {
      const state = sentryState(store);
      const body = await parseBody(c);
      if (!body.url) return c.json({ error: 'url is required' }, 400);
      const target = {
        id: body.id ?? crypto.randomUUID(),
        url: body.url,
        secret: body.secret ?? null,
        createdAt: now(),
      };
      state.targets.push(target);
      saveState(store, state);
      return c.json(target, 201);
    });

    app.post('/control/issues', async (c) => {
      const state = sentryState(store);
      const body = await parseBody(c);
      const issue = makeIssue(state, body.issue ?? body);
      const payload = issueWebhookPayload(issue, body.action ?? 'created');
      const targets = body.targetUrl
        ? [{ id: 'inline', url: body.targetUrl, secret: body.secret ?? null }]
        : state.targets;
      if (targets.length === 0) return c.json({ error: 'No targets registered. Provide targetUrl or POST /control/targets first.' }, 400);

      const deliveries = [];
      for (const target of targets) {
        deliveries.push(await deliver(target, payload, target.secret));
      }
      state.issues.push(issue);
      state.deliveries.push(...deliveries);
      saveState(store, state);
      return c.json({ issue, deliveries }, deliveries.every((item) => item.ok) ? 202 : 502);
    });

    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/issues', (c) => c.json(sentryState(store).issues));
    app.get('/inspect/deliveries', (c) => c.json(sentryState(store).deliveries));
    app.get('/inspect/targets', (c) => c.json(sentryState(store).targets));
    app.post('/inspect/reset', (c) => {
      store.setData?.('sentry:state', null);
      sentryState(store);
      return c.json({ ok: true });
    });
  },
};

export function seedFromConfig(store, _baseUrl, config) {
  const state = sentryState(store);
  for (const target of config.targets ?? []) {
    if (target.url) state.targets.push({ id: target.id ?? crypto.randomUUID(), url: target.url, secret: target.secret ?? null, createdAt: now() });
  }
  saveState(store, state);
}

export const label = 'Sentry webhook emulator';
export const endpoints = 'control issue webhook delivery and inspect deliveries';
export const capabilities = contract.scope;
export const initConfig = {
  sentry: {
    targets: [{ url: 'http://127.0.0.1:8787/v1/webhooks/sentry/crash', secret: 'sentry-emulator-secret' }],
  },
};
