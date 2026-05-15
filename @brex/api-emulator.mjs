import { fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'brex:state';

function defaultState(baseUrl = 'https://api.brex.com') {
  return {
    baseUrl,
    vendors: [
      { id: 'vendor_001', company_name: 'Emulator Vendor LLC', email: 'ap@example.com', phone: '+14155550123', payment_accounts: [] },
    ],
    users: [
      { id: 'user_001', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com', status: 'ACTIVE', manager_id: null, department_id: null, location_id: null, title_id: null, metadata: {}, remote_display_id: null },
    ],
    nextVendorId: 2,
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());
const save = (store, next) => setState(store, STATE_KEY, next);
const error = (c, status, type, message, code) => c.json({ type, message, ...(code ? { code } : {}) }, status);

function requireBearer(c) {
  return /^Bearer\s+\S+/i.test(c.req.header?.('authorization') ?? c.req.header?.('Authorization') ?? '');
}

function page(items, c) {
  const limit = Number(c.req.query('limit') ?? 100);
  if (limit > 1000) return { error: error(c, 400, 'BAD_REQUEST', 'limit must be less than or equal to 1000') };
  const cursor = c.req.query('cursor');
  const start = cursor ? Math.max(0, items.findIndex((item) => item.id === cursor) + 1) : 0;
  const rows = items.slice(start, start + Math.max(1, limit));
  const next = start + rows.length < items.length ? rows.at(-1)?.id : null;
  return { items: rows, next_cursor: next };
}

function vendorById(s, id) {
  return s.vendors.find((vendor) => vendor.id === id);
}

function userById(s, id) {
  return s.users.find((user) => user.id === id);
}

export function seedFromConfig(store, baseUrl = 'https://api.brex.com', config = {}) {
  return save(store, { ...defaultState(baseUrl), ...config });
}

export const contract = {
  provider: 'brex',
  source: 'Brex API documentation-informed subset',
  docs: 'https://developer.brex.com/',
  baseUrl: 'https://api.brex.com',
  scope: ['vendors', 'users_me', 'users'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'brex',
  register(app, store) {
    app.get('/v1/vendors', (c) => {
      if (!requireBearer(c)) return error(c, 401, 'UNAUTHORIZED', 'PERMISSION_DENIED: Invalid or Revoked Token');
      const name = c.req.query('name');
      const rows = name ? state(store).vendors.filter((vendor) => vendor.company_name.toLowerCase().includes(name.toLowerCase())) : state(store).vendors;
      const result = page(rows, c);
      return result.error ?? c.json(result);
    });
    app.post('/v1/vendors', async (c) => {
      if (!requireBearer(c)) return error(c, 401, 'UNAUTHORIZED', 'PERMISSION_DENIED: Invalid or Revoked Token');
      if (!c.req.header?.('idempotency-key') && !c.req.header?.('Idempotency-Key')) return error(c, 400, 'BAD_REQUEST', 'Idempotency-Key header is required', 'MISSING_IDEMPOTENCY_KEY');
      const s = state(store);
      const body = await readBody(c);
      const vendor = { id: `vendor_${String(s.nextVendorId++).padStart(3, '0')}`, company_name: body.company_name ?? 'New Vendor', email: body.email ?? null, phone: body.phone ?? null, payment_accounts: body.payment_accounts ?? [] };
      s.vendors.push(vendor);
      save(store, s);
      return c.json(vendor, 201);
    });
    app.get('/v1/vendors/:vendorId', (c) => {
      if (!requireBearer(c)) return error(c, 401, 'UNAUTHORIZED', 'PERMISSION_DENIED: Invalid or Revoked Token');
      const vendor = vendorById(state(store), c.req.param('vendorId'));
      return vendor ? c.json(vendor) : error(c, 404, 'NOT_FOUND', 'Not Found', 'VENDOR_NOT_FOUND');
    });
    app.put('/v1/vendors/:vendorId', async (c) => {
      if (!requireBearer(c)) return error(c, 401, 'UNAUTHORIZED', 'PERMISSION_DENIED: Invalid or Revoked Token');
      const s = state(store);
      const vendor = vendorById(s, c.req.param('vendorId'));
      if (!vendor) return error(c, 404, 'NOT_FOUND', 'Not Found', 'VENDOR_NOT_FOUND');
      Object.assign(vendor, await readBody(c));
      save(store, s);
      return c.json(vendor);
    });
    app.delete('/v1/vendors/:vendorId', (c) => {
      if (!requireBearer(c)) return error(c, 401, 'UNAUTHORIZED', 'PERMISSION_DENIED: Invalid or Revoked Token');
      const s = state(store);
      const before = s.vendors.length;
      s.vendors = s.vendors.filter((vendor) => vendor.id !== c.req.param('vendorId'));
      save(store, s);
      return before === s.vendors.length ? error(c, 404, 'NOT_FOUND', 'Not Found', 'VENDOR_NOT_FOUND') : c.json({ id: c.req.param('vendorId'), deleted: true });
    });
    app.get('/v2/users/me', (c) => {
      if (!requireBearer(c)) return error(c, 401, 'UNAUTHORIZED', 'PERMISSION_DENIED: Invalid or Revoked Token');
      return c.json(state(store).users[0]);
    });
    app.get('/v2/users', (c) => {
      if (!requireBearer(c)) return error(c, 401, 'UNAUTHORIZED', 'PERMISSION_DENIED: Invalid or Revoked Token');
      const email = c.req.query('email');
      const rows = email ? state(store).users.filter((user) => user.email === email) : state(store).users;
      const result = page(rows, c);
      return result.error ?? c.json(result);
    });
    app.get('/v2/users/:userId', (c) => {
      if (!requireBearer(c)) return error(c, 401, 'UNAUTHORIZED', 'PERMISSION_DENIED: Invalid or Revoked Token');
      const user = userById(state(store), c.req.param('userId'));
      return user ? c.json(user) : error(c, 404, 'NOT_FOUND', 'Not Found', 'USER_NOT_FOUND');
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Brex API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { brex: { accessToken: 'brex-emulator-token' } };
export default plugin;
