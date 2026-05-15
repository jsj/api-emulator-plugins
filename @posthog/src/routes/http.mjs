function now() {
  return new Date().toISOString();
}

export const contract = {
  provider: 'posthog',
  source: 'PostHog OpenAPI endpoint specs',
  docs: 'https://posthog.com/docs/api',
  scope: ['capture', 'batch', 'persons', 'groups', 'identify', 'alias', 'feature-flags', 'decide', 'experiments'],
  fidelity: 'resource-model-subset',
};

function state(store) {
  const current = store.getData?.('posthog:state');
  if (current) return current;
  const initial = {
    events: [],
    persons: {},
    groups: {},
    aliases: {},
    featureFlags: {},
    experiments: {},
    cohorts: {},
    failures: {},
    apiKeys: ['posthog-emulator-key'],
  };
  store.setData?.('posthog:state', initial);
  return initial;
}

function saveState(store, next) {
  store.setData?.('posthog:state', next);
}

function events(store) {
  return state(store).events;
}

function saveEvent(store, event) {
  const next = state(store);
  next.events.push(event);
  upsertPerson(next, event.distinctId, event.properties);
  applySpecialEvent(next, event);
  saveState(store, next);
  store.setData?.('posthog:last-event', event);
}

async function parseBody(c) {
  const contentType = c.req.header?.('content-type') ?? '';
  const encoding = c.req.header?.('content-encoding') ?? '';
  const compression = c.req.query?.('compression') ?? '';
  if (contentType.includes('application/json')) {
    return c.req.json().catch(() => ({}));
  }
  if (!c.req.text) return c.req.json().catch(() => ({}));
  const raw = await c.req.text?.().catch(() => '') ?? '';
  const text = (encoding === 'gzip' || compression === 'gzip-js') ? await decodeGzipText(raw) : raw;
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(text);
    if (params.has('data')) return parseJsonish(params.get('data'));
    return Object.fromEntries(params.entries());
  }
  return parseJsonish(text);
}

function parseJsonish(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

async function decodeGzipText(value) {
  try {
    const bytes = typeof Buffer !== 'undefined' ? Buffer.from(value, 'binary') : new TextEncoder().encode(value);
    const stream = new Response(bytes).body.pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).text();
  } catch {
    return value;
  }
}

function normalizeEvent(body, source) {
  return {
    uuid: body.uuid ?? crypto.randomUUID(),
    event: body.event ?? '$unknown',
    distinctId: body.distinct_id ?? body.distinctId ?? body.properties?.distinct_id ?? 'anonymous',
    properties: body.properties ?? {},
    source,
    capturedAt: body.timestamp ?? body.properties?.$time ?? now(),
  };
}

function hasValidApiKey(next, body, c) {
  const key = body.api_key ?? body.token ?? body.properties?.token ?? c.req.header?.('authorization')?.replace(/^Bearer\s+/i, '');
  return !key || next.apiKeys.includes(key);
}

function upsertPerson(next, distinctId, properties = {}) {
  if (!distinctId) return null;
  const existing = next.persons[distinctId] ?? {
    id: crypto.randomUUID(),
    distinctIds: [distinctId],
    properties: {},
    createdAt: now(),
  };
  existing.properties = {
    ...existing.properties,
    ...(properties.$set ?? {}),
  };
  existing.updatedAt = now();
  next.persons[distinctId] = existing;
  return existing;
}

function applySpecialEvent(next, event) {
  if (event.event === '$identify' && event.properties?.$anon_distinct_id) {
    next.aliases[event.properties.$anon_distinct_id] = event.distinctId;
    upsertPerson(next, event.distinctId, event.properties);
  }
  if (event.event === '$create_alias' && event.properties?.alias) {
    next.aliases[event.properties.alias] = event.distinctId;
  }
  if (event.event === '$groupidentify' && event.properties?.$group_type && event.properties?.$group_key) {
    const groupType = event.properties.$group_type;
    const groupKey = event.properties.$group_key;
    next.groups[groupType] ??= {};
    next.groups[groupType][groupKey] = {
      key: groupKey,
      type: groupType,
      properties: {
        ...(next.groups[groupType][groupKey]?.properties ?? {}),
        ...(event.properties.$group_set ?? {}),
      },
      updatedAt: now(),
    };
  }
}

function evaluateFlags(next, distinctId, groups = {}) {
  const flags = {};
  for (const [key, flag] of Object.entries(next.featureFlags)) {
    if (flag.active === false) {
      flags[key] = false;
      continue;
    }
    if (flag.groups) {
      flags[key] = Object.entries(flag.groups).every(([groupType, values]) => values.includes(groups[groupType]));
      continue;
    }
    flags[key] = flag.value ?? true;
  }
  return {
    featureFlags: flags,
    featureFlagPayloads: Object.fromEntries(Object.keys(flags).map((key) => [key, next.featureFlags[key]?.payload ?? null])),
    distinctId,
  };
}

function parseEventList(query, alias) {
  const match = query.match(new RegExp(`${alias}[\\s\\S]*?event\\s+IN\\s+\\(([^)]*)\\)`, 'i'));
  if (!match) return [];
  return match[1].split(',').map((value) => value.trim().replace(/^'/, '').replace(/'$/, '').replaceAll("\\'", "'")).filter(Boolean);
}

function parseWindow(query) {
  const matches = [...query.matchAll(/toDateTime\('([^']+)'\)/g)].map((match) => new Date(`${match[1].replace(' ', 'T')}Z`));
  return { start: matches[0], end: matches[1] };
}

function eventTime(event) {
  const date = new Date(event.capturedAt);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function firstMatchingEvent(allEvents, distinctId, names, after) {
  return allEvents
    .filter((event) => event.distinctId === distinctId && (names.length === 0 || names.includes(event.event)) && (!after || eventTime(event) > after))
    .sort((left, right) => eventTime(left) - eventTime(right))[0] ?? null;
}

function runChurnQuery(next, query) {
  const entryEvents = parseEventList(query, 'entry');
  const activationEvents = parseEventList(query, 'activation');
  const { start, end } = parseWindow(query);
  const limit = Number(query.match(/LIMIT\s+(\d+)/i)?.[1] ?? 100);
  const rows = [];
  const ids = [...new Set(next.events.map((event) => event.distinctId))];

  for (const distinctId of ids) {
    const entry = firstMatchingEvent(next.events, distinctId, entryEvents, null);
    if (!entry) continue;
    const entryAt = eventTime(entry);
    if (start && entryAt < start) continue;
    if (end && entryAt >= end) continue;
    const activation = firstMatchingEvent(next.events, distinctId, activationEvents, entryAt);
    if (activation) continue;
    rows.push([distinctId, entryAt.toISOString(), entry.event, entry.properties?.$email ?? entry.properties?.email ?? null, entry.properties?.name ?? null]);
    if (rows.length >= limit) break;
  }

  return rows;
}

export function registerRoutes(app, store, contract) {
  app.post('/capture', async (c) => {
    const body = await parseBody(c);
    const next = state(store);
    if (!hasValidApiKey(next, body, c)) return c.json({ type: 'authentication_error', detail: 'Invalid API key' }, 401);
    if (!body.event) return c.json({ type: 'validation_error', detail: 'event is required' }, 400);
    if (next.failures.capture) return c.json({ type: 'validation_error', detail: next.failures.capture }, 400);
    const event = normalizeEvent(body, 'capture');
    saveEvent(store, event);
    return c.json({ status: 1, event_uuid: event.uuid });
  });
  app.post('/capture/', async (c) => {
    const body = await parseBody(c);
    const next = state(store);
    if (!hasValidApiKey(next, body, c)) return c.json({ type: 'authentication_error', detail: 'Invalid API key' }, 401);
    if (!body.event) return c.json({ type: 'validation_error', detail: 'event is required' }, 400);
    const event = normalizeEvent(body, 'capture');
    saveEvent(store, event);
    return c.json({ status: 1, event_uuid: event.uuid });
  });

  app.post('/batch', async (c) => {
    const body = await parseBody(c);
    const next = state(store);
    if (!hasValidApiKey(next, body, c)) return c.json({ type: 'authentication_error', detail: 'Invalid API key' }, 401);
    const batch = Array.isArray(body.batch) ? body.batch : [];
    if (!Array.isArray(body.batch)) return c.json({ type: 'validation_error', detail: 'batch must be an array' }, 400);
    const captured = batch.map((item) => {
      const event = normalizeEvent(item, 'batch');
      saveEvent(store, event);
      return event;
    });
    return c.json({ status: 1, captured: captured.length });
  });
  app.post('/batch/', async (c) => {
    const body = await parseBody(c);
    const next = state(store);
    if (!hasValidApiKey(next, body, c)) return c.json({ type: 'authentication_error', detail: 'Invalid API key' }, 401);
    const batch = Array.isArray(body.batch) ? body.batch : [];
    if (!Array.isArray(body.batch)) return c.json({ type: 'validation_error', detail: 'batch must be an array' }, 400);
    const captured = batch.map((item) => {
      const event = normalizeEvent(item, 'batch');
      saveEvent(store, event);
      return event;
    });
    return c.json({ status: 1, captured: captured.length });
  });

  app.post('/e', async (c) => {
    const body = await parseBody(c);
    if (!hasValidApiKey(state(store), body, c)) return c.json({ type: 'authentication_error', detail: 'Invalid API key' }, 401);
    const event = normalizeEvent(body, 'e');
    saveEvent(store, event);
    return c.json({ status: 1, event_uuid: event.uuid });
  });
  app.post('/e/', async (c) => {
    const body = await parseBody(c);
    if (!hasValidApiKey(state(store), body, c)) return c.json({ type: 'authentication_error', detail: 'Invalid API key' }, 401);
    const event = normalizeEvent(body, 'e');
    saveEvent(store, event);
    return c.json({ status: 1, event_uuid: event.uuid });
  });

  app.post('/track', async (c) => {
    const body = await parseBody(c);
    if (!hasValidApiKey(state(store), body, c)) return c.json({ type: 'authentication_error', detail: 'Invalid API key' }, 401);
    const event = normalizeEvent(body, 'track');
    saveEvent(store, event);
    return c.json({ status: 1, event_uuid: event.uuid });
  });
  app.post('/track/', async (c) => {
    const body = await parseBody(c);
    if (!hasValidApiKey(state(store), body, c)) return c.json({ type: 'authentication_error', detail: 'Invalid API key' }, 401);
    const event = normalizeEvent(body, 'track');
    saveEvent(store, event);
    return c.json({ status: 1, event_uuid: event.uuid });
  });

  app.post('/flags', async (c) => {
    const body = await parseBody(c);
    if (!hasValidApiKey(state(store), body, c)) return c.json({ type: 'authentication_error', detail: 'Invalid API key' }, 401);
    return c.json(evaluateFlags(state(store), body.distinct_id ?? body.distinctId ?? 'anonymous', body.groups ?? {}));
  });

  app.post('/identify', async (c) => {
    const body = await parseBody(c);
    const next = state(store);
    if (!hasValidApiKey(next, body, c)) return c.json({ type: 'authentication_error', detail: 'Invalid API key' }, 401);
    const distinctId = body.distinct_id ?? body.distinctId;
    if (!distinctId) return c.json({ type: 'validation_error', detail: 'distinct_id is required' }, 400);
    const person = upsertPerson(next, distinctId, { $set: body.properties ?? {} });
    saveState(store, next);
    return c.json({ status: 1, person });
  });

  app.post('/alias', async (c) => {
    const body = await parseBody(c);
    const next = state(store);
    if (!hasValidApiKey(next, body, c)) return c.json({ type: 'authentication_error', detail: 'Invalid API key' }, 401);
    if (!body.distinct_id || !body.alias) return c.json({ type: 'validation_error', detail: 'distinct_id and alias are required' }, 400);
    next.aliases[body.alias] = body.distinct_id;
    saveState(store, next);
    return c.json({ status: 1 });
  });

  app.post('/groupidentify', async (c) => {
    const body = await parseBody(c);
    const event = normalizeEvent({
      event: '$groupidentify',
      distinct_id: body.distinct_id ?? 'group-emulator',
      properties: {
        $group_type: body.group_type,
        $group_key: body.group_key,
        $group_set: body.properties ?? {},
      },
    }, 'groupidentify');
    saveEvent(store, event);
    return c.json({ status: 1 });
  });

  app.get('/decide', (c) => c.json({ config: { enable_collect_everything: false }, isAuthenticated: true, ...evaluateFlags(state(store), c.req.query('distinct_id') ?? 'anonymous') }));
  app.post('/decide', async (c) => {
    const body = await parseBody(c);
    return c.json({ config: { enable_collect_everything: false }, isAuthenticated: true, ...evaluateFlags(state(store), body.distinct_id ?? body.distinctId ?? 'anonymous', body.groups ?? {}) });
  });
  app.post('/flags/', async (c) => {
    const body = await parseBody(c);
    if (!hasValidApiKey(state(store), body, c)) return c.json({ type: 'authentication_error', detail: 'Invalid API key' }, 401);
    return c.json(evaluateFlags(state(store), body.distinct_id ?? body.distinctId ?? 'anonymous', body.groups ?? {}));
  });
  app.post('/decide/', async (c) => {
    const body = await parseBody(c);
    return c.json({ config: { enable_collect_everything: false }, isAuthenticated: true, ...evaluateFlags(state(store), body.distinct_id ?? body.distinctId ?? 'anonymous', body.groups ?? {}) });
  });

  app.get('/api/projects/:projectId/persons', (c) => c.json({ results: Object.values(state(store).persons) }));
  app.get('/api/projects/:projectId/persons/:distinctId', (c) => {
    const person = state(store).persons[c.req.param('distinctId')];
    if (!person) return c.json({ detail: 'Not found' }, 404);
    return c.json(person);
  });
  app.patch('/api/projects/:projectId/persons/:distinctId', async (c) => {
    const next = state(store);
    const body = await parseBody(c);
    const person = upsertPerson(next, c.req.param('distinctId'), { $set: body.properties ?? body });
    saveState(store, next);
    return c.json(person);
  });
  app.get('/api/projects/:projectId/groups', (c) => c.json({ results: Object.values(state(store).groups).flatMap((groups) => Object.values(groups)) }));
  app.get('/api/projects/:projectId/feature_flags', (c) => c.json({ results: Object.entries(state(store).featureFlags).map(([key, flag]) => ({ key, ...flag })) }));
  app.post('/api/projects/:projectId/feature_flags', async (c) => {
    const next = state(store);
    const body = await parseBody(c);
    const key = body.key ?? body.name ?? crypto.randomUUID();
    next.featureFlags[key] = { key, active: body.active ?? true, value: body.value ?? true, payload: body.payload ?? null, filters: body.filters ?? {}, groups: body.groups };
    saveState(store, next);
    return c.json(next.featureFlags[key], 201);
  });
  app.patch('/api/projects/:projectId/feature_flags/:key', async (c) => {
    const next = state(store);
    const body = await parseBody(c);
    const key = c.req.param('key');
    next.featureFlags[key] = { ...(next.featureFlags[key] ?? { key }), ...body };
    saveState(store, next);
    return c.json(next.featureFlags[key]);
  });
  app.get('/api/projects/:projectId/experiments', (c) => c.json({ results: Object.values(state(store).experiments) }));
  app.post('/api/projects/:projectId/experiments', async (c) => {
    const next = state(store);
    const body = await parseBody(c);
    const id = body.id ?? crypto.randomUUID();
    next.experiments[id] = { id, name: body.name ?? 'Emulator Experiment', feature_flag_key: body.feature_flag_key ?? null, parameters: body.parameters ?? {}, created_at: now() };
    saveState(store, next);
    return c.json(next.experiments[id], 201);
  });
  app.post('/api/projects/:projectId/query', async (c) => {
    const body = await parseBody(c);
    const query = body.query?.query ?? body.query ?? '';
    if (typeof query !== 'string') return c.json({ type: 'validation_error', detail: 'query is required' }, 400);
    return c.json({ results: runChurnQuery(state(store), query) });
  });
  app.post('/api/projects/:projectId/query/', async (c) => {
    const body = await parseBody(c);
    const query = body.query?.query ?? body.query ?? '';
    if (typeof query !== 'string') return c.json({ type: 'validation_error', detail: 'query is required' }, 400);
    return c.json({ results: runChurnQuery(state(store), query) });
  });
  app.get('/api/projects/:projectId/cohorts', (c) => c.json({ results: Object.values(state(store).cohorts) }));
  app.post('/api/projects/:projectId/cohorts', async (c) => {
    const next = state(store);
    const body = await parseBody(c);
    const id = body.id ?? crypto.randomUUID();
    next.cohorts[id] = { id, name: body.name ?? 'Emulator Cohort', filters: body.filters ?? {}, groups: body.groups ?? [], created_at: now() };
    saveState(store, next);
    return c.json(next.cohorts[id], 201);
  });

  app.post('/control/feature-flags/:key', async (c) => {
    const next = state(store);
    next.featureFlags[c.req.param('key')] = await parseBody(c);
    saveState(store, next);
    return c.json({ ok: true, key: c.req.param('key'), flag: next.featureFlags[c.req.param('key')] });
  });

  app.post('/control/failures/:surface', async (c) => {
    const next = state(store);
    const body = await parseBody(c);
    next.failures[c.req.param('surface')] = body.message ?? 'emulated PostHog failure';
    saveState(store, next);
    return c.json({ ok: true, failures: next.failures });
  });

  app.post('/control/api-keys', async (c) => {
    const next = state(store);
    const body = await parseBody(c);
    next.apiKeys = Array.isArray(body.keys) ? body.keys : next.apiKeys;
    saveState(store, next);
    return c.json({ ok: true, apiKeys: next.apiKeys });
  });

  app.get('/inspect/contract', (c) => c.json(contract));
  app.get('/_inspector', (c) => c.json(state(store)));
  app.get('/inspect/state', (c) => c.json(state(store)));
  app.get('/inspect/events', (c) => c.json(events(store)));
  app.get('/inspect/persons', (c) => c.json(state(store).persons));
  app.get('/inspect/groups', (c) => c.json(state(store).groups));
  app.get('/inspect/feature-flags', (c) => c.json(state(store).featureFlags));
  app.get('/inspect/experiments', (c) => c.json(state(store).experiments));
  app.get('/inspect/cohorts', (c) => c.json(state(store).cohorts));
  app.get('/inspect/last-event', (c) => c.json(store.getData?.('posthog:last-event') ?? null));
  app.post('/inspect/reset', (c) => {
    store.setData?.('posthog:state', null);
    store.setData?.('posthog:last-event', null);
    state(store);
    return c.json({ ok: true });
  });
}
