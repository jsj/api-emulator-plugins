function now() { return new Date().toISOString(); }
function id(prefix) { return prefix + '_' + crypto.randomUUID().replaceAll('-', '').slice(0, 20); }
function state(store) {
  const key = 'adyen:state';
  const existing = store.getData?.(key);
  if (existing) return existing;
  const initial = { payments: [], captures: [], refunds: [], webhooks: [] };
  store.setData?.(key, initial);
  return initial;
}
function save(store, next) { store.setData?.('adyen:state', next); }
async function body(c) {
  if (c.req.parseBody) return c.req.parseBody().catch(() => ({}));
  return c.req.json().catch(() => ({}));
}
function list(items) { return { data: items, pagination: { total: items.length } }; }
function paymentResult(payment) { return { resultCode: payment.resultCode, pspReference: payment.pspReference, merchantReference: payment.reference, amount: payment.amount }; }
export function registerRoutes(app, store, contract) {
  app.post('/payments', async (c) => { const next = state(store); const input = await body(c); const payment = { pspReference: id('PSP'), reference: input.reference ?? id('order'), amount: input.amount ?? { currency: 'USD', value: 1000 }, resultCode: input.resultCode ?? 'Authorised', createdAt: now(), raw: input }; next.payments.push(payment); save(store, next); return c.json(paymentResult(payment)); });
  app.post('/payments/:pspReference/captures', async (c) => { const next = state(store); const input = await body(c); const capture = { pspReference: id('CAP'), originalReference: c.req.param('pspReference'), amount: input.amount, status: 'received', createdAt: now() }; next.captures.push(capture); save(store, next); return c.json(capture); });
  app.post('/payments/:pspReference/refunds', async (c) => { const next = state(store); const input = await body(c); const refund = { pspReference: id('REF'), originalReference: c.req.param('pspReference'), amount: input.amount, status: 'received', createdAt: now() }; next.refunds.push(refund); save(store, next); return c.json(refund); });
  app.post('/webhooks', async (c) => { const next = state(store); const webhook = { id: id('wh'), payload: await body(c), receivedAt: now() }; next.webhooks.push(webhook); save(store, next); return c.json({ notificationResponse: '[accepted]' }); });
  app.get('/inspect/contract', (c) => c.json(contract));
  app.get('/inspect/state', (c) => c.json(state(store)));
  app.post('/inspect/reset', (c) => { store.setData?.('adyen:state', null); state(store); return c.json({ ok: true }); });
}
