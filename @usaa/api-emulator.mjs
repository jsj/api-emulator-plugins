import { fixedNow, getState, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'usaa:state';

function defaultState(baseUrl = 'https://api.usaa.com') {
  return {
    baseUrl,
    customer: { customerId: 'cust_usaa_1', name: { first: 'Ada', last: 'Lovelace' } },
    accounts: [
      { accountId: 'acct_checking_1', accountType: 'DEPOSIT_ACCOUNT', displayName: 'USAA Classic Checking', accountNumberDisplay: '...1234', balanceAsOf: fixedNow, currentBalance: 2400.12, currency: { currencyCode: 'USD' } },
      { accountId: 'acct_card_1', accountType: 'LINE_OF_CREDIT', displayName: 'USAA Rewards Visa', accountNumberDisplay: '...9876', balanceAsOf: fixedNow, currentBalance: -120.45, currency: { currencyCode: 'USD' } },
    ],
    transactions: [
      { transactionId: 'txn_usaa_1', accountId: 'acct_checking_1', postedTimestamp: fixedNow, description: 'EMULATOR PAYROLL', debitCreditMemo: 'CREDIT', amount: 2500, currency: { currencyCode: 'USD' } },
      { transactionId: 'txn_usaa_2', accountId: 'acct_card_1', postedTimestamp: fixedNow, description: 'EMULATOR FUEL', debitCreditMemo: 'DEBIT', amount: 52.31, currency: { currencyCode: 'USD' } },
    ],
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());
const save = (store, next) => setState(store, STATE_KEY, next);
const page = (items) => ({ page: { nextOffset: null, total: items.length }, links: { self: '' }, items });
const notFound = (c, message = 'Resource not found') => c.json({ code: '701', message }, 404);

function accountById(s, id) {
  return s.accounts.find((account) => account.accountId === id);
}

export function seedFromConfig(store, baseUrl = 'https://api.usaa.com', config = {}) {
  return save(store, { ...defaultState(baseUrl), ...config });
}

export const contract = {
  provider: 'usaa',
  source: 'FDX/Open Finance documentation-informed account data subset for USAA-style integrations',
  docs: 'https://docs.akoya.com/reference/fdx-apis',
  baseUrl: 'https://api.usaa.com',
  scope: ['customer_current', 'accounts', 'account_transactions'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'usaa',
  register(app, store) {
    app.get('/fdx/v6/customers/current', (c) => c.json(state(store).customer));
    app.get('/fdx/v6/accounts', (c) => c.json(page(state(store).accounts)));
    app.get('/fdx/v6/accounts/:accountId', (c) => {
      const row = accountById(state(store), c.req.param('accountId'));
      return row ? c.json(row) : notFound(c);
    });
    app.get('/fdx/v6/accounts/:accountId/transactions', (c) => {
      const s = state(store);
      if (!accountById(s, c.req.param('accountId'))) return notFound(c);
      return c.json(page(s.transactions.filter((transaction) => transaction.accountId === c.req.param('accountId'))));
    });
    app.get('/customers/current', (c) => c.json(state(store).customer));
    app.get('/accounts', (c) => c.json(page(state(store).accounts)));
    app.get('/accounts/:accountId', (c) => {
      const row = accountById(state(store), c.req.param('accountId'));
      return row ? c.json(row) : notFound(c);
    });
    app.get('/accounts/:accountId/transactions', (c) => {
      const s = state(store);
      if (!accountById(s, c.req.param('accountId'))) return notFound(c);
      return c.json(page(s.transactions.filter((transaction) => transaction.accountId === c.req.param('accountId'))));
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'USAA Open Finance API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { usaa: { accessToken: 'usaa-emulator-token' } };
export default plugin;
