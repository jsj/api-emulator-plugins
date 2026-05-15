import { makeIssue, issueWebhookPayload } from '../concepts/issues.mjs';
import { deliver } from '../concepts/webhooks.mjs';
import { now, parseBody, saveState, sentryState } from '../store.mjs';

export function registerRoutes(app, store, contract) {
  app.get('/api/0/organizations/', (c) => c.json(sentryState(store).organizations));
  app.get('/api/0/organizations/:org/projects/', (c) => {
    const org = c.req.param('org');
    return c.json(sentryState(store).projects.filter((project) => project.organization === org));
  });
  app.get('/api/0/projects/:org/:project/releases/', (c) => {
    const project = c.req.param('project');
    return c.json(sentryState(store).releases.filter((release) => release.projects.some((item) => item.slug === project)));
  });
  app.get('/api/0/organizations/:org/releases/', (c) => c.json(sentryState(store).releases));
  app.post('/api/0/organizations/:org/releases/', async (c) => {
    const state = sentryState(store);
    const body = await parseBody(c);
    const version = String(body.version ?? `release-${state.releases.length + 1}`);
    const release = {
      version,
      shortVersion: version,
      ref: body.ref ?? null,
      url: body.url ?? null,
      dateCreated: now(),
      dateReleased: null,
      dateStarted: body.dateStarted ?? null,
      projects: (body.projects ?? ['api']).map((slug) => ({ slug, name: slug })),
    };
    state.releases.unshift(release);
    saveState(store, state);
    return c.json(release, 201);
  });
  app.get('/api/0/organizations/:org/releases/:version/', (c) => {
    const release = sentryState(store).releases.find((item) => item.version === c.req.param('version'));
    if (!release) return c.json({ detail: 'Not found' }, 404);
    return c.json(release);
  });
  app.get('/api/0/organizations/:org/releases/:version/files/', (c) => {
    const files = sentryState(store).releaseFiles[c.req.param('version')] ?? [];
    return c.json(files);
  });
  app.post('/api/0/organizations/:org/releases/:version/files/', async (c) => {
    const state = sentryState(store);
    const version = c.req.param('version');
    const files = state.releaseFiles[version] ?? [];
    const file = { id: String(files.length + 1), name: 'artifact', size: Number(c.req.header('content-length') ?? 0), dateCreated: now() };
    files.push(file);
    state.releaseFiles[version] = files;
    saveState(store, state);
    return c.json(file, 201);
  });

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
}
