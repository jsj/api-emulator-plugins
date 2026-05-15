import { fixedNow, getState, readBody, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'shipstation:state';

function defaultState(baseUrl = 'https://api.shipstation.com') {
  return {
    baseUrl,
    shipments: [{ shipment_id: 'se-100001', order_id: 'order-100001', carrier_id: 'stamps_com', service_code: 'usps_priority_mail', ship_date: '2026-01-02', shipment_status: 'pending', created_at: fixedNow }],
    labels: [],
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());

export function seedFromConfig(store, baseUrl = 'https://api.shipstation.com', config = {}) {
  return setState(store, STATE_KEY, { ...defaultState(baseUrl), ...config });
}

export const contract = {
  provider: 'shipstation',
  source: 'ShipStation OpenAPI subset',
  docs: 'https://docs.shipstation.com/',
  baseUrl: 'https://api.shipstation.com',
  scope: ['shipments', 'rates', 'labels'],
  fidelity: 'deterministic-subset',
};

export const plugin = {
  name: 'shipstation',
  register(app, store) {
    app.get('/v2/shipments', (c) => c.json({ shipments: state(store).shipments, total: state(store).shipments.length, page: 1, pages: 1 }));
    app.post('/v2/shipments', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      const shipment = { shipment_id: `se-${100001 + current.shipments.length}`, order_id: body.order_id ?? `order-${100001 + current.shipments.length}`, carrier_id: body.carrier_id ?? 'stamps_com', service_code: body.service_code ?? 'usps_priority_mail', ship_date: body.ship_date ?? '2026-01-02', shipment_status: 'pending', created_at: fixedNow, ship_to: body.ship_to, packages: body.packages ?? [] };
      current.shipments.push(shipment);
      return c.json(shipment, 201);
    });
    app.get('/v2/shipments/:id', (c) => {
      const shipment = state(store).shipments.find((item) => item.shipment_id === c.req.param('id'));
      if (!shipment) return routeError(c, 'shipment not found', 404, 'not_found');
      return c.json(shipment);
    });
    app.post('/v2/rates', async (c) => {
      const body = await readBody(c);
      return c.json({ rate_response: { rates: [{ rate_id: 'rate_emulator_priority', carrier_id: body.carrier_id ?? 'stamps_com', service_code: 'usps_priority_mail', package_type: 'package', delivery_days: 2, guaranteed_service: false, shipping_amount: { currency: 'usd', amount: 7.25 } }] } });
    });
    app.post('/v2/labels', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      const label = { label_id: `label-${String(current.labels.length + 1).padStart(6, '0')}`, shipment_id: body.shipment_id ?? 'se-100001', status: 'completed', tracking_number: `9400${String(current.labels.length + 1).padStart(18, '0')}`, label_download: { pdf: `${current.baseUrl}/mock/labels/${current.labels.length + 1}.pdf` }, created_at: fixedNow };
      current.labels.push(label);
      return c.json(label, 201);
    });
    app.get('/shipstation/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'ShipStation API emulator';
export const endpoints = 'shipments, rates, labels';
export const initConfig = { shipstation: { apiKey: 'TEST_shipstation_emulator_key' } };

export default plugin;
