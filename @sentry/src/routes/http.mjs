import { makeIssue, issueWebhookPayload } from '../concepts/issues.mjs';
import { deliver } from '../concepts/webhooks.mjs';
import { now, parseBody, saveState, sentryState } from '../store.mjs';

export function registerRoutes(app, store, contract) {
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
