import { createToken, fixedNow, getState, readBody, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'paypal:state';

function defaultState(baseUrl = 'https://api-m.sandbox.paypal.com') {
  return { baseUrl, orders: [], captures: [], refunds: [], tokenCount: 0 };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());

function orderResponse(order) {
  return {
    id: order.id,
    status: order.status,
    intent: order.intent,
    purchase_units: order.purchase_units,
    create_time: order.create_time,
    update_time: order.update_time,
    links: [
      { href: `${order.baseUrl}/v2/checkout/orders/${order.id}`, rel: 'self', method: 'GET' },
      { href: `${order.baseUrl}/v2/checkout/orders/${order.id}/capture`, rel: 'capture', method: 'POST' },
    ],
  };
}

export function seedFromConfig(store, baseUrl = 'https://api-m.sandbox.paypal.com', config = {}) {
  return setState(store, STATE_KEY, { ...defaultState(baseUrl), ...config });
}

export const contract = {
  provider: 'paypal',
  source: 'PayPal REST API OpenAPI subset',
  docs: 'https://developer.paypal.com/docs/api/',
  baseUrl: 'https://api-m.sandbox.paypal.com',
  scope: ['oauth2_token', 'checkout_orders'],
  fidelity: 'deterministic-subset',
};

export const plugin = {
  name: 'paypal',
  register(app, store) {
    app.post('/v1/oauth2/token', (c) => {
      const current = state(store);
      current.tokenCount += 1;
      return c.json({ scope: 'https://uri.paypal.com/services/checkout/orders', access_token: createToken('paypal_access', current.tokenCount), token_type: 'Bearer', app_id: 'APP-EMULATOR', expires_in: 32400, nonce: createToken('nonce', current.tokenCount) });
    });
    app.post('/v2/checkout/orders', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      const order = {
        id: `ORDER-${String(current.orders.length + 1).padStart(6, '0')}`,
        baseUrl: current.baseUrl,
        status: 'CREATED',
        intent: body.intent ?? 'CAPTURE',
        purchase_units: body.purchase_units ?? [{ amount: { currency_code: 'USD', value: '10.00' } }],
        create_time: fixedNow,
        update_time: fixedNow,
      };
      current.orders.push(order);
      return c.json(orderResponse(order), 201);
    });
    app.get('/v2/checkout/orders/:id', (c) => {
      const order = state(store).orders.find((item) => item.id === c.req.param('id'));
      if (!order) return routeError(c, 'The specified resource does not exist.', 404, 'RESOURCE_NOT_FOUND');
      return c.json(orderResponse(order));
    });
    app.post('/v2/checkout/orders/:id/capture', (c) => {
      const current = state(store);
      const order = current.orders.find((item) => item.id === c.req.param('id'));
      if (!order) return routeError(c, 'The specified resource does not exist.', 404, 'RESOURCE_NOT_FOUND');
      order.status = 'COMPLETED';
      order.update_time = fixedNow;
      const capture = { id: `CAPTURE-${String(current.captures.length + 1).padStart(6, '0')}`, status: 'COMPLETED', amount: order.purchase_units[0]?.amount ?? { currency_code: 'USD', value: '10.00' }, final_capture: true, create_time: fixedNow };
      current.captures.push(capture);
      return c.json({ ...orderResponse(order), purchase_units: [{ ...order.purchase_units[0], payments: { captures: [capture] } }] }, 201);
    });
    app.get('/v2/payments/captures/:id', (c) => {
      const capture = state(store).captures.find((item) => item.id === c.req.param('id'));
      if (!capture) return routeError(c, 'The specified resource does not exist.', 404, 'RESOURCE_NOT_FOUND');
      return c.json(capture);
    });
    app.post('/v2/payments/captures/:id/refund', async (c) => {
      const current = state(store);
      const capture = current.captures.find((item) => item.id === c.req.param('id'));
      if (!capture) return routeError(c, 'The specified resource does not exist.', 404, 'RESOURCE_NOT_FOUND');
      const body = await readBody(c);
      const refund = {
        id: `REFUND-${String(current.refunds.length + 1).padStart(6, '0')}`,
        status: 'COMPLETED',
        amount: body.amount ?? capture.amount,
        seller_payable_breakdown: {
          gross_amount: body.amount ?? capture.amount,
          paypal_fee: { currency_code: capture.amount.currency_code, value: '0.30' },
          net_amount: { currency_code: capture.amount.currency_code, value: '9.70' },
        },
        create_time: fixedNow,
        update_time: fixedNow,
      };
      current.refunds.push(refund);
      return c.json(refund, 201);
    });
    app.get('/v2/payments/refunds/:id', (c) => {
      const refund = state(store).refunds.find((item) => item.id === c.req.param('id'));
      if (!refund) return routeError(c, 'The specified resource does not exist.', 404, 'RESOURCE_NOT_FOUND');
      return c.json(refund);
    });
    app.get('/paypal/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'PayPal API emulator';
export const endpoints = 'OAuth token, checkout orders create/get/capture, captures, refunds';
export const initConfig = { paypal: { clientId: 'paypal-emulator-client', clientSecret: 'paypal-emulator-secret' } };

export default plugin;
