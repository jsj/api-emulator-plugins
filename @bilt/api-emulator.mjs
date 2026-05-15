import { fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'bilt:state';

function defaultState(baseUrl = 'https://api.bilt.com') {
  return {
    baseUrl,
    member: {
      id: 'mem_bilt_001',
      email: 'resident@example.test',
      firstName: 'Ada',
      lastName: 'Lovelace',
      tier: 'blue',
      pointsBalance: 12500,
      createdAt: fixedNow,
    },
    rewardsAccounts: [
      { id: 'rw_bilt_001', type: 'BILT_REWARDS', status: 'active', pointsBalance: 12500, updatedAt: fixedNow },
      { id: 'card_bilt_001', type: 'BILT_MASTERCARD', status: 'active', last4: '2026', pointsBalance: 4200, updatedAt: fixedNow },
    ],
    ledger: [
      { id: 'pt_bilt_001', accountId: 'rw_bilt_001', type: 'earn', description: 'Rent Day emulator bonus', points: 1000, postedAt: fixedNow },
      { id: 'pt_bilt_002', accountId: 'card_bilt_001', type: 'earn', description: 'Dining transaction', points: 300, postedAt: fixedNow },
      { id: 'pt_bilt_003', accountId: 'rw_bilt_001', type: 'redeem', description: 'Travel transfer fixture', points: -500, postedAt: fixedNow },
    ],
    rentPayments: [
      {
        id: 'rent_bilt_001',
        propertyName: 'Localhost Lofts',
        amount: { value: '2400.00', currency: 'USD' },
        status: 'scheduled',
        dueDate: '2026-01-01',
        autopay: true,
        fundingAccountId: 'card_bilt_001',
        pointsEarned: 250,
        createdAt: fixedNow,
      },
    ],
    nextRentId: 2,
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());
const save = (store, next) => setState(store, STATE_KEY, next);

function requireBearer(c) {
  return /^Bearer\s+\S+/i.test(c.req.header?.('authorization') ?? c.req.header?.('Authorization') ?? '');
}

function error(c, status, code, message) {
  return c.json({ error: { code, message } }, status);
}

function page(data, c) {
  const limit = Math.max(1, Math.min(Number(c.req.query?.('limit') ?? data.length), 100));
  const offset = Math.max(0, Number(c.req.query?.('offset') ?? 0));
  return { data: data.slice(offset, offset + limit), pagination: { limit, offset, total: data.length } };
}

export function seedFromConfig(store, baseUrl = 'https://api.bilt.com', config = {}) {
  return save(store, { ...defaultState(baseUrl), ...config });
}

export const contract = {
  provider: 'bilt',
  source: 'Bilt Rewards public product behavior modeled as a deterministic rewards, account, and rent-payment API subset; no official public API contract is available',
  docs: 'https://www.bilt.com/rewards',
  baseUrl: 'https://api.bilt.com',
  scope: ['member_profile', 'rewards_accounts', 'points_ledger', 'rent_payments'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'bilt',
  register(app, store) {
    app.get('/v1/member', (c) => {
      if (!requireBearer(c)) return error(c, 401, 'unauthorized', 'Bearer token required');
      return c.json({ data: state(store).member });
    });

    app.get('/v1/rewards/accounts', (c) => {
      if (!requireBearer(c)) return error(c, 401, 'unauthorized', 'Bearer token required');
      return c.json(page(state(store).rewardsAccounts, c));
    });

    app.get('/v1/rewards/ledger', (c) => {
      if (!requireBearer(c)) return error(c, 401, 'unauthorized', 'Bearer token required');
      const accountId = c.req.query('account_id');
      const rows = state(store).ledger.filter((row) => !accountId || row.accountId === accountId);
      return c.json(page(rows, c));
    });

    app.get('/v1/rent-payments', (c) => {
      if (!requireBearer(c)) return error(c, 401, 'unauthorized', 'Bearer token required');
      return c.json(page(state(store).rentPayments, c));
    });

    app.post('/v1/rent-payments', async (c) => {
      if (!requireBearer(c)) return error(c, 401, 'unauthorized', 'Bearer token required');
      const s = state(store);
      const body = await readBody(c);
      const payment = {
        id: `rent_bilt_${String(s.nextRentId++).padStart(3, '0')}`,
        propertyName: body.propertyName ?? body.property_name ?? 'Emulator Apartments',
        amount: body.amount ?? { value: String(body.amount_value ?? '1800.00'), currency: body.currency ?? 'USD' },
        status: 'scheduled',
        dueDate: body.dueDate ?? body.due_date ?? '2026-02-01',
        autopay: Boolean(body.autopay ?? false),
        fundingAccountId: body.fundingAccountId ?? body.funding_account_id ?? 'card_bilt_001',
        pointsEarned: Number(body.pointsEarned ?? body.points_earned ?? 250),
        createdAt: fixedNow,
      };
      s.rentPayments.push(payment);
      save(store, s);
      return c.json({ data: payment }, 201);
    });

    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Bilt Rewards API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { bilt: { accessToken: 'bilt_emulator_token' } };
export default plugin;
