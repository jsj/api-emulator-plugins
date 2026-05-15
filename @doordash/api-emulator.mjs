const STATE_KEY = 'doordash:state';

function now() {
  return new Date().toISOString();
}

function initialState(config = {}) {
  return {
    quotes: config.quotes ?? [],
    deliveries: config.deliveries ?? [{
      external_delivery_id: 'dd_delivery_seed',
      delivery_id: 'dd_delivery_seed',
      delivery_status: 'delivered',
      currency: 'USD',
      fee: 799,
      tracking_url: 'https://track.doordash.com/dd_delivery_seed',
      pickup_address: '1 Market St, San Francisco, CA',
      dropoff_address: '500 Howard St, San Francisco, CA',
      created_at: now(),
      updated_at: now(),
    }],
    stores: config.stores ?? [{
      id: 'store_emulator',
      external_store_id: 'store_emulator',
      business_id: 'business_emulator',
      name: 'DoorDash Emulator Store',
      address: '1 Market St, San Francisco, CA',
      is_active: true,
    }],
    businesses: config.businesses ?? [{ id: 'business_emulator', external_business_id: 'business_emulator', name: 'DoorDash Emulator Business' }],
    menus: config.menus ?? [{ id: 'menu_emulator', merchant_supplied_id: 'store_emulator', status: 'active', items: [{ id: 'item_emulator', name: 'API Burger', price: 1299, active: true }] }],
    orders: config.orders ?? [{ id: 'order_emulator', store_id: 'store_emulator', status: 'new', items: [{ id: 'item_emulator', quantity: 1 }] }],
    webhooks: config.webhooks ?? [],
    jobs: config.jobs ?? [{ id: 'job_emulator', status: 'completed', type: 'item_import' }],
    promotions: config.promotions ?? [],
    nextQuote: 1,
    nextDelivery: 1,
    nextBusiness: 1,
    nextStore: 1,
    nextMenu: 1,
    nextOrder: 1,
    nextPromotion: 1,
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

function quoteFromBody(s, body) {
  const externalId = body.external_delivery_id ?? `dd_quote_${s.nextQuote++}`;
  return {
    external_delivery_id: externalId,
    quote_id: externalId,
    currency: body.currency ?? 'USD',
    fee: body.fee ?? 799,
    tax: body.tax ?? 0,
    estimated_pickup_time: body.pickup_time ?? now(),
    estimated_delivery_time: body.dropoff_time ?? now(),
    expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    pickup_address: body.pickup_address,
    dropoff_address: body.dropoff_address,
    status: 'quote',
  };
}

function deliveryFromBody(s, body, patch = {}) {
  const externalId = body.external_delivery_id ?? `dd_delivery_${s.nextDelivery++}`;
  return {
    external_delivery_id: externalId,
    delivery_id: externalId,
    delivery_status: 'created',
    currency: body.currency ?? 'USD',
    fee: body.fee ?? 799,
    tracking_url: `https://track.doordash.com/${externalId}`,
    pickup_address: body.pickup_address,
    pickup_business_name: body.pickup_business_name ?? 'Emulator Merchant',
    pickup_phone_number: body.pickup_phone_number ?? '+14155550100',
    dropoff_address: body.dropoff_address,
    dropoff_contact_given_name: body.dropoff_contact_given_name ?? 'Ada',
    dropoff_contact_family_name: body.dropoff_contact_family_name ?? 'Lovelace',
    dropoff_phone_number: body.dropoff_phone_number ?? '+14155550101',
    order_value: body.order_value ?? 2500,
    created_at: now(),
    updated_at: now(),
    ...patch,
  };
}

function findDelivery(s, id) {
  return s.deliveries.find((item) => item.external_delivery_id === id || item.delivery_id === id);
}

function serviceability(body = {}) {
  return {
    is_serviceable: true,
    currency: body.currency ?? 'USD',
    fee: body.fee ?? 799,
    pickup_address: body.pickup_address,
    dropoff_address: body.dropoff_address,
    estimated_pickup_time: now(),
    estimated_delivery_time: new Date(Date.now() + 35 * 60_000).toISOString(),
  };
}

export const contract = {
  provider: 'doordash',
  source: 'DoorDash Drive, Drive Classic, Developer, and Marketplace API-compatible subset',
  docs: 'https://developer.doordash.com/en-US/api/drive/',
  scope: ['drive-v2', 'drive-classic', 'serviceability', 'address-autocomplete', 'developer-businesses', 'developer-stores', 'marketplace-menus', 'marketplace-orders', 'marketplace-store-status', 'item-management', 'promotions', 'webhooks', 'state-inspection'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'doordash',
  register(app, store) {
    app.post('/drive/v2/quotes', async (c) => {
      const s = state(store);
      const quote = quoteFromBody(s, await jsonBody(c));
      s.quotes.push(quote);
      saveState(store, s);
      return c.json(quote, 200);
    });

    app.post('/drive/v2/quotes/:externalDeliveryId/accept', async (c) => {
      const s = state(store);
      const quote = s.quotes.find((item) => item.external_delivery_id === c.req.param('externalDeliveryId'));
      const delivery = deliveryFromBody(s, quote ?? await jsonBody(c), { delivery_status: 'accepted' });
      s.deliveries.push(delivery);
      saveState(store, s);
      return c.json(delivery, 200);
    });

    app.post('/drive/v2/deliveries', async (c) => {
      const s = state(store);
      const delivery = deliveryFromBody(s, await jsonBody(c));
      s.deliveries.push(delivery);
      saveState(store, s);
      return c.json(delivery, 200);
    });

    app.get('/drive/v2/deliveries/:externalDeliveryId', (c) => {
      const delivery = findDelivery(state(store), c.req.param('externalDeliveryId'));
      return delivery ? c.json(delivery) : c.json({ code: 'not_found', message: 'Delivery not found' }, 404);
    });

    app.patch('/drive/v2/deliveries/:externalDeliveryId', async (c) => {
      const s = state(store);
      const delivery = findDelivery(s, c.req.param('externalDeliveryId'));
      if (!delivery) return c.json({ code: 'not_found', message: 'Delivery not found' }, 404);
      Object.assign(delivery, await jsonBody(c), { updated_at: now() });
      saveState(store, s);
      return c.json(delivery);
    });

    app.delete('/drive/v2/deliveries/:externalDeliveryId', (c) => {
      const s = state(store);
      const delivery = findDelivery(s, c.req.param('externalDeliveryId'));
      if (!delivery) return c.json({ code: 'not_found', message: 'Delivery not found' }, 404);
      delivery.delivery_status = 'cancelled';
      delivery.updated_at = now();
      saveState(store, s);
      return c.json(delivery);
    });
    app.post('/drive/v2/deliveries/:externalDeliveryId/cancel', (c) => {
      const s = state(store);
      const delivery = findDelivery(s, c.req.param('externalDeliveryId'));
      if (!delivery) return c.json({ code: 'not_found', message: 'Delivery not found' }, 404);
      delivery.delivery_status = 'cancelled';
      delivery.updated_at = now();
      saveState(store, s);
      return c.json(delivery);
    });

    app.post('/drive/v2/estimates', async (c) => c.json({ ...quoteFromBody(state(store), await jsonBody(c)), status: 'estimate' }));
    app.post('/drive/v2/serviceability', async (c) => c.json(serviceability(await jsonBody(c))));
    app.get('/drive/v2/address/auto_complete', (c) => c.json({ predictions: [{ description: `${c.req.query?.('input') ?? '1 Market St'}, San Francisco, CA`, place_id: 'place_emulator' }] }));
    app.post('/drive/v2/items_substitution_recommendation', async (c) => c.json({ recommendations: [{ item_id: 'item_emulator', substitute_item_id: 'item_substitute', confidence: 0.91 }], request: await jsonBody(c) }));
    app.post('/drive/v2/checkout_audit_signal', async (c) => c.json({ accepted: true, signal_id: `signal_${Date.now()}`, request: await jsonBody(c) }));

    app.post('/drive/v1/estimates', async (c) => c.json({ id: `estimate_${Date.now()}`, ...serviceability(await jsonBody(c)) }));
    app.post('/drive/v1/validations', async (c) => c.json({ valid: true, ...serviceability(await jsonBody(c)) }));
    app.post('/drive/v1/deliveries', async (c) => {
      const s = state(store);
      const delivery = deliveryFromBody(s, await jsonBody(c));
      s.deliveries.push(delivery);
      saveState(store, s);
      return c.json(delivery, 201);
    });
    app.get('/drive/v1/deliveries/:deliveryId', (c) => {
      const delivery = findDelivery(state(store), c.req.param('deliveryId'));
      return delivery ? c.json(delivery) : c.json({ code: 'not_found', message: 'Delivery not found' }, 404);
    });
    app.patch('/drive/v1/deliveries/:deliveryId', async (c) => {
      const s = state(store);
      const delivery = findDelivery(s, c.req.param('deliveryId'));
      if (!delivery) return c.json({ code: 'not_found', message: 'Delivery not found' }, 404);
      Object.assign(delivery, await jsonBody(c), { updated_at: now() });
      saveState(store, s);
      return c.json(delivery);
    });
    app.post('/drive/v1/deliveries/:deliveryId/cancel', (c) => {
      const s = state(store);
      const delivery = findDelivery(s, c.req.param('deliveryId'));
      if (!delivery) return c.json({ code: 'not_found', message: 'Delivery not found' }, 404);
      delivery.delivery_status = 'cancelled';
      saveState(store, s);
      return c.json(delivery);
    });

    app.get('/developer/v1/businesses', (c) => c.json({ businesses: state(store).businesses }));
    app.post('/developer/v1/businesses', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const business = { id: body.external_business_id ?? `business_${s.nextBusiness++}`, external_business_id: body.external_business_id ?? `business_${s.nextBusiness}`, name: body.name ?? 'Emulator Business', ...body };
      s.businesses.push(business);
      saveState(store, s);
      return c.json(business, 201);
    });
    app.get('/developer/v1/businesses/:businessId', (c) => {
      const business = state(store).businesses.find((item) => item.id === c.req.param('businessId') || item.external_business_id === c.req.param('businessId'));
      return business ? c.json(business) : c.json({ code: 'not_found' }, 404);
    });
    app.patch('/developer/v1/businesses/:businessId', async (c) => {
      const s = state(store);
      const business = s.businesses.find((item) => item.id === c.req.param('businessId') || item.external_business_id === c.req.param('businessId'));
      if (!business) return c.json({ code: 'not_found' }, 404);
      Object.assign(business, await jsonBody(c));
      saveState(store, s);
      return c.json(business);
    });
    app.get('/developer/v1/businesses/:businessId/stores', (c) => c.json({ stores: state(store).stores.filter((storeRow) => storeRow.business_id === c.req.param('businessId')) }));
    app.post('/developer/v1/businesses/:businessId/stores', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const storeRow = { id: body.external_store_id ?? `store_${s.nextStore++}`, external_store_id: body.external_store_id ?? `store_${s.nextStore}`, business_id: c.req.param('businessId'), name: body.name ?? 'Emulator Store', is_active: true, ...body };
      s.stores.push(storeRow);
      saveState(store, s);
      return c.json(storeRow, 201);
    });
    app.get('/developer/v1/businesses/:businessId/stores/:storeId', (c) => {
      const storeRow = state(store).stores.find((item) => item.business_id === c.req.param('businessId') && (item.id === c.req.param('storeId') || item.external_store_id === c.req.param('storeId')));
      return storeRow ? c.json(storeRow) : c.json({ code: 'not_found' }, 404);
    });
    app.patch('/developer/v1/businesses/:businessId/stores/:storeId', async (c) => {
      const s = state(store);
      const storeRow = s.stores.find((item) => item.business_id === c.req.param('businessId') && (item.id === c.req.param('storeId') || item.external_store_id === c.req.param('storeId')));
      if (!storeRow) return c.json({ code: 'not_found' }, 404);
      Object.assign(storeRow, await jsonBody(c));
      saveState(store, s);
      return c.json(storeRow);
    });

    app.post('/api/v1/menus', async (c) => {
      const s = state(store);
      const menu = { id: `menu_${s.nextMenu++}`, status: 'active', ...(await jsonBody(c)) };
      s.menus.push(menu);
      saveState(store, s);
      return c.json(menu, 201);
    });
    app.get('/api/v1/menus/:menuId', (c) => c.json(state(store).menus.find((menu) => menu.id === c.req.param('menuId')) ?? { code: 'not_found' }, state(store).menus.some((menu) => menu.id === c.req.param('menuId')) ? 200 : 404));
    app.patch('/api/v1/menus/:menuId', async (c) => {
      const s = state(store);
      const menu = s.menus.find((item) => item.id === c.req.param('menuId'));
      if (!menu) return c.json({ code: 'not_found' }, 404);
      Object.assign(menu, await jsonBody(c));
      saveState(store, s);
      return c.json(menu);
    });
    app.delete('/api/v1/menus/:menuId', (c) => {
      const s = state(store);
      s.menus = s.menus.filter((menu) => menu.id !== c.req.param('menuId'));
      saveState(store, s);
      return c.json({ deleted: true });
    });
    app.get('/api/v1/orders/:orderId', (c) => c.json(state(store).orders.find((order) => order.id === c.req.param('orderId')) ?? { code: 'not_found' }, state(store).orders.some((order) => order.id === c.req.param('orderId')) ? 200 : 404));
    app.post('/api/v1/orders/:orderId/events/:eventType', (c) => {
      const s = state(store);
      const order = s.orders.find((item) => item.id === c.req.param('orderId'));
      if (!order) return c.json({ code: 'not_found' }, 404);
      order.status = c.req.param('eventType');
      saveState(store, s);
      return c.json(order);
    });
    app.post('/api/v1/orders/:orderId/adjustment', async (c) => c.json({ order_id: c.req.param('orderId'), adjustment_id: `adj_${Date.now()}`, ...(await jsonBody(c)) }));
    app.post('/api/v1/orders/:orderId/cancellation', (c) => c.json({ order_id: c.req.param('orderId'), status: 'cancelled' }));
    app.post('/api/v1/orders/:orderId/return', (c) => c.json({ order_id: c.req.param('orderId'), status: 'return_requested' }));
    app.get('/api/v1/stores/:storeId/status', (c) => c.json({ store_id: c.req.param('storeId'), status: 'active', accepting_orders: true }));
    app.get('/api/v1/stores/:storeId/store_details', (c) => c.json(state(store).stores.find((storeRow) => storeRow.id === c.req.param('storeId') || storeRow.external_store_id === c.req.param('storeId')) ?? { code: 'not_found' }));
    app.get('/api/v1/stores/:storeId/menu_details', (c) => c.json({ menus: state(store).menus.filter((menu) => menu.merchant_supplied_id === c.req.param('storeId')) }));
    app.get('/api/v1/stores/:storeId/store_menu', (c) => c.json({ menus: state(store).menus.filter((menu) => menu.merchant_supplied_id === c.req.param('storeId')) }));
    app.patch('/api/v1/stores/:storeId/items/status', async (c) => c.json({ store_id: c.req.param('storeId'), updated: true, ...(await jsonBody(c)) }));
    app.patch('/api/v1/stores/:storeId/item_options/status', async (c) => c.json({ store_id: c.req.param('storeId'), updated: true, ...(await jsonBody(c)) }));
    app.patch('/api/v1/stores/:storeId/item/availability', async (c) => c.json({ store_id: c.req.param('storeId'), updated: true, ...(await jsonBody(c)) }));
    app.patch('/api/v1/stores/:storeId/item_option/availability', async (c) => c.json({ store_id: c.req.param('storeId'), updated: true, ...(await jsonBody(c)) }));

    app.get('/api/v2/items', (c) => c.json({ items: state(store).menus.flatMap((menu) => menu.items ?? []) }));
    app.post('/api/v2/items', async (c) => c.json({ id: `item_${Date.now()}`, ...(await jsonBody(c)) }, 201));
    app.get('/api/v2/jobs', (c) => c.json({ jobs: state(store).jobs }));
    app.get('/api/v2/managed_merchant_connect_url', (c) => c.json({ url: 'https://merchant.doordash.com/connect/emulator' }));
    app.get('/api/v2/stores/:storeId', (c) => c.json(state(store).stores.find((item) => item.id === c.req.param('storeId')) ?? { code: 'not_found' }));
    app.patch('/api/v2/stores/:storeId', async (c) => c.json({ id: c.req.param('storeId'), ...(await jsonBody(c)) }));
    app.get('/api/v2/stores/:storeId/items', (c) => c.json({ items: state(store).menus.flatMap((menu) => menu.items ?? []) }));
    app.patch('/api/v2/stores/:storeId/items', async (c) => c.json({ store_id: c.req.param('storeId'), updated: true, ...(await jsonBody(c)) }));
    app.get('/api/v2/promotions/stores/:storeId', (c) => c.json({ promotions: state(store).promotions.filter((promotion) => promotion.store_id === c.req.param('storeId')) }));
    app.post('/api/v2/promotions/stores/:storeId', async (c) => {
      const s = state(store);
      const promotion = { id: `promotion_${s.nextPromotion++}`, store_id: c.req.param('storeId'), ...(await jsonBody(c)) };
      s.promotions.push(promotion);
      saveState(store, s);
      return c.json(promotion, 201);
    });
    app.patch('/api/v2/promotions/stores/:storeId', async (c) => c.json({ store_id: c.req.param('storeId'), updated: true, ...(await jsonBody(c)) }));

    app.post('/webhooks/delivery_status', async (c) => {
      const s = state(store);
      const event = { id: `webhook_${Date.now()}`, type: 'delivery_status', payload: await jsonBody(c), received_at: now() };
      s.webhooks.push(event);
      saveState(store, s);
      return c.json({ ok: true });
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'DoorDash Drive API emulator';
export const endpoints = 'Drive quotes, quote acceptance, deliveries, estimates, stores, and state inspection';
export const capabilities = contract.scope;
export const initConfig = { doordash: initialState() };
export default plugin;
