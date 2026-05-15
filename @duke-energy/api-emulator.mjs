import { fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'duke-energy:state';

function defaultState(baseUrl = 'https://api-v2.cma.duke-energy.app') {
  return {
    baseUrl,
    accessToken: 'duke_energy_emulator_token',
    accounts: [
      {
        accountNumber: '3000000001',
        bpNumber: '1000000001',
        premiseNumber: '7000000001',
        nickname: 'Home',
        customerName: 'Ada Lovelace',
        serviceAddress: { line1: '123 Emulator Way', city: 'Charlotte', state: 'NC', postalCode: '28202' },
        status: 'ACTIVE',
        electric: true,
        gas: false,
      },
    ],
    details: {
      accountNumber: '3000000001',
      balance: { amount: '124.50', currency: 'USD', dueDate: '2026-01-20' },
      meterInfo: [{ meterNumber: 'MTR-LOCAL-001', commodity: 'electric', rateCode: 'RS', status: 'ACTIVE' }],
      billingSummary: { lastBillAmount: '118.20', nextReadDate: '2026-01-18', autopay: true },
    },
    usage: [
      { date: '2026-01-01', interval: 'daily', usage: 28.4, unit: 'kWh', temperatureAvg: 43 },
      { date: '2026-01-02', interval: 'daily', usage: 31.2, unit: 'kWh', temperatureAvg: 39 },
      { date: '2026-01-03', interval: 'daily', usage: 25.8, unit: 'kWh', temperatureAvg: 46 },
    ],
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());
const save = (store, next) => setState(store, STATE_KEY, next);

function requireBearer(c) {
  return /^Bearer\s+\S+/i.test(c.req.header?.('authorization') ?? c.req.header?.('Authorization') ?? '');
}

function error(c, status, code, message) {
  return c.json({ error: { code, message, timestamp: fixedNow } }, status);
}

function findAccount(s, accountNumber) {
  return s.accounts.find((account) => account.accountNumber === accountNumber || account.bpNumber === accountNumber || account.premiseNumber === accountNumber);
}

export function seedFromConfig(store, baseUrl = 'https://api-v2.cma.duke-energy.app', config = {}) {
  return save(store, { ...defaultState(baseUrl), ...config });
}

export const contract = {
  provider: 'duke-energy',
  source: 'Duke Energy mobile customer API behavior inferred from public aiodukeenergy/pydukeenergy clients',
  docs: 'https://github.com/hunterjm/aiodukeenergy',
  baseUrl: 'https://api-v2.cma.duke-energy.app',
  scope: ['login_auth_token', 'account_list', 'account_details', 'usage_graph'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'duke-energy',
  register(app, store) {
    app.post('/login/auth-token', async (c) => {
      const body = await readBody(c);
      if (!body.id_token && !body.idToken) return error(c, 400, 'invalid_request', 'id_token is required');
      return c.json({
        access_token: state(store).accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        issued_at: fixedNow,
      });
    });

    app.get('/account-list', (c) => {
      if (!requireBearer(c)) return error(c, 401, 'unauthorized', 'Bearer token required');
      return c.json({ accounts: state(store).accounts, count: state(store).accounts.length });
    });

    app.get('/account-details-v2', (c) => {
      if (!requireBearer(c)) return error(c, 401, 'unauthorized', 'Bearer token required');
      const s = state(store);
      const accountNumber = c.req.query('accountNumber') ?? c.req.query('account_number') ?? s.accounts[0]?.accountNumber;
      const account = findAccount(s, accountNumber);
      if (!account) return error(c, 404, 'not_found', 'Account not found');
      return c.json({ account, ...s.details, generatedAt: fixedNow });
    });

    app.post('/account/usage/graph', async (c) => {
      if (!requireBearer(c)) return error(c, 401, 'unauthorized', 'Bearer token required');
      const s = state(store);
      const body = await readBody(c);
      const accountNumber = body.accountNumber ?? body.account_number ?? s.accounts[0]?.accountNumber;
      const account = findAccount(s, accountNumber);
      if (!account) return error(c, 404, 'not_found', 'Account not found');
      return c.json({
        accountNumber: account.accountNumber,
        premiseNumber: account.premiseNumber,
        interval: body.interval ?? 'daily',
        unit: 'kWh',
        usage: s.usage,
      });
    });

    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Duke Energy customer API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { dukeEnergy: { accessToken: 'duke_energy_emulator_token' } };
export default plugin;
