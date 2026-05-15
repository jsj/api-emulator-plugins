import { createToken, fixedNow, getState, readBody, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'fidelity:state';

function defaultState(baseUrl = 'https://workplacexchange.fidelity.com') {
  return {
    baseUrl,
    tokenCount: 0,
    participants: [
      {
        participantId: 'P000000001',
        employerId: 'FID-PLAN-001',
        firstName: 'Emery',
        lastName: 'Stone',
        status: 'ACTIVE',
        employmentStatus: 'ACTIVE',
        lastUpdatedDateTime: fixedNow,
      },
    ],
    balances: [
      {
        participantId: 'P000000001',
        asOfDate: '2026-01-01',
        totalBalance: { amount: 125430.55, currency: 'USD' },
        vestedBalance: { amount: 110200.1, currency: 'USD' },
        plans: [
          {
            planId: '401K-001',
            planName: 'Emulator 401(k) Plan',
            planType: 'RETIREMENT',
            planBalance: { amount: 95430.55, currency: 'USD' },
            vestedBalance: { amount: 90200.1, currency: 'USD' },
          },
          {
            planId: 'STOCK-001',
            planName: 'Emulator Stock Plan',
            planType: 'STOCK',
            outstandingValue: { amount: 25000, currency: 'USD' },
            vestedValue: { amount: 18000, currency: 'USD' },
          },
          {
            planId: 'HSA-001',
            planName: 'Emulator HSA',
            planType: 'HEALTH_SAVINGS',
            cashAvailableToWithdraw: { amount: 5000, currency: 'USD' },
          },
        ],
      },
    ],
    payStatements: [
      {
        participantId: 'P000000001',
        payStatementId: 'PAY-2026-001',
        payDate: '2026-01-01',
        grossPay: { amount: 7500, currency: 'USD' },
        netPay: { amount: 5120.42, currency: 'USD' },
        deductions: [{ code: '401K', description: '401(k) contribution', amount: { amount: 750, currency: 'USD' } }],
      },
    ],
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());
const save = (store, next) => setState(store, STATE_KEY, next);
const page = (items) => ({ data: items, links: { self: null, next: null }, meta: { count: items.length } });

function participant(s, participantId) {
  return s.participants.find((row) => row.participantId === participantId);
}

function balance(s, participantId) {
  return s.balances.find((row) => row.participantId === participantId);
}

function missing(c, resource = 'Resource') {
  return routeError(c, `${resource} not found`, 404, 'not_found');
}

export function seedFromConfig(store, baseUrl = 'https://workplacexchange.fidelity.com', config = {}) {
  return save(store, { ...defaultState(baseUrl), ...config });
}

export const contract = {
  provider: 'fidelity',
  source: 'Fidelity WorkplaceXchange public documentation-informed subset',
  docs: 'https://workplacexchange.fidelity.com/public/wpx/docs/wi-balances',
  baseUrl: 'https://workplacexchange.fidelity.com',
  scope: ['oauth2_token', 'participants', 'workplace_balances', 'pay_statements'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'fidelity',
  register(app, store) {
    app.post('/wpx/oauth2/token', (c) => {
      const s = state(store);
      s.tokenCount += 1;
      return c.json({
        access_token: createToken('fidelity_access', s.tokenCount),
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'workplace.balances.read participant.read pay.statements.read',
      });
    });

    app.get('/wpx/hrp/v1/participants', (c) => c.json(page(state(store).participants)));
    app.get('/wpx/hrp/v1/participants/:participantId', (c) => {
      const row = participant(state(store), c.req.param('participantId'));
      return row ? c.json(row) : missing(c, 'Participant');
    });
    app.get('/wpx/wi/v1/participants/:participantId/balances', (c) => {
      const row = balance(state(store), c.req.param('participantId'));
      return row ? c.json(row) : missing(c, 'Balance');
    });
    app.get('/wpx/hrp/v1/participants/:participantId/pay-statements', (c) => {
      const s = state(store);
      if (!participant(s, c.req.param('participantId'))) return missing(c, 'Participant');
      return c.json(page(s.payStatements.filter((row) => row.participantId === c.req.param('participantId'))));
    });
    app.post('/wpx/hrp/v1/participants', async (c) => {
      const s = state(store);
      const body = await readBody(c);
      const row = {
        participantId: body.participantId ?? `P${String(s.participants.length + 1).padStart(9, '0')}`,
        employerId: body.employerId ?? 'FID-PLAN-001',
        firstName: body.firstName ?? 'Local',
        lastName: body.lastName ?? 'Participant',
        status: body.status ?? 'ACTIVE',
        employmentStatus: body.employmentStatus ?? 'ACTIVE',
        lastUpdatedDateTime: fixedNow,
      };
      s.participants.push(row);
      save(store, s);
      return c.json(row, 201);
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Fidelity WorkplaceXchange API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { fidelity: { clientId: 'fidelity-emulator-client' } };
export default plugin;
