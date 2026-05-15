import { fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'mercury:state';

function defaultState(baseUrl = 'https://api.mercury.com/api/v1') {
  return {
    baseUrl,
    accounts: [
      {
        id: 'mercury-account-1',
        accountNumber: '000123456789',
        availableBalance: 250000,
        createdAt: fixedNow,
        currentBalance: 250000,
        dashboardLink: 'https://mercury.com/accounts/mercury-account-1',
        kind: 'checking',
        legalBusinessName: 'Emulator Labs Inc.',
        name: 'Operating Checking',
        routingNumber: '084106768',
        status: 'active',
        type: 'mercury',
        canReceiveTransactions: true,
        nickname: 'Operating',
      },
    ],
    recipients: [
      {
        id: 'mercury-recipient-1',
        attachments: [],
        defaultPaymentMethod: 'ach',
        emails: ['vendor@example.com'],
        name: 'Emulator Vendor LLC',
        status: 'active',
        contactEmail: 'vendor@example.com',
        nickname: 'Vendor',
        electronicRoutingInfo: { accountNumber: '123456789', routingNumber: '021000021', electronicAccountType: 'businessChecking' },
      },
    ],
    transactions: [
      {
        id: 'mercury-transaction-1',
        accountId: 'mercury-account-1',
        amount: -1250,
        attachments: [],
        counterpartyId: 'mercury-recipient-1',
        counterpartyName: 'Emulator Vendor LLC',
        createdAt: fixedNow,
        postedAt: fixedNow,
        dashboardLink: 'https://mercury.com/transactions/mercury-transaction-1',
        kind: 'outgoingPayment',
        status: 'sent',
        bankDescription: 'ACH PAYMENT',
        externalMemo: 'Invoice 1001',
        note: 'Emulator payment',
      },
    ],
    approvals: [],
    nextRecipientId: 2,
    nextTransactionId: 2,
    nextApprovalId: 1,
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());
const save = (store, next) => setState(store, STATE_KEY, next);
const error = (c, message, status = 400, code = 'invalid_request') => c.json({ error: code, message }, status);

function requireAuth(c) {
  const auth = c.req.header?.('authorization') ?? c.req.header?.('Authorization') ?? '';
  return /^Bearer\s+.+/i.test(auth) || /^Basic\s+.+/i.test(auth);
}

function page(items, c) {
  const limit = Math.max(1, Math.min(Number(c.req.query('limit') ?? items.length), 100));
  const startAfter = c.req.query('start_after');
  const start = startAfter ? Math.max(0, items.findIndex((item) => item.id === startAfter) + 1) : 0;
  return items.slice(start, start + limit);
}

function accountById(s, id) {
  return s.accounts.find((account) => account.id === id);
}

function recipientById(s, id) {
  return s.recipients.find((recipient) => recipient.id === id);
}

function transactionById(s, id) {
  return s.transactions.find((transaction) => transaction.id === id);
}

function registerRoutes(app, store, prefix) {
  app.get(`${prefix}/accounts`, (c) => {
    if (!requireAuth(c)) return error(c, 'Authentication required', 401, 'unauthorized');
    return c.json({ accounts: page(state(store).accounts, c) });
  });
  app.get(`${prefix}/account/:accountId`, (c) => {
    if (!requireAuth(c)) return error(c, 'Authentication required', 401, 'unauthorized');
    const account = accountById(state(store), c.req.param('accountId'));
    return account ? c.json(account) : error(c, 'Account not found', 404, 'not_found');
  });
  app.get(`${prefix}/transactions`, (c) => {
    if (!requireAuth(c)) return error(c, 'Authentication required', 401, 'unauthorized');
    const accountId = c.req.query('accountId');
    const rows = accountId ? state(store).transactions.filter((txn) => txn.accountId === accountId) : state(store).transactions;
    return c.json({ transactions: page(rows, c) });
  });
  app.get(`${prefix}/transaction/:transactionId`, (c) => {
    if (!requireAuth(c)) return error(c, 'Authentication required', 401, 'unauthorized');
    const transaction = transactionById(state(store), c.req.param('transactionId'));
    return transaction ? c.json(transaction) : error(c, 'Transaction not found', 404, 'not_found');
  });
  app.get(`${prefix}/recipients`, (c) => {
    if (!requireAuth(c)) return error(c, 'Authentication required', 401, 'unauthorized');
    return c.json({ recipients: page(state(store).recipients, c) });
  });
  app.post(`${prefix}/recipients`, async (c) => {
    if (!requireAuth(c)) return error(c, 'Authentication required', 401, 'unauthorized');
    const s = state(store);
    const body = await readBody(c);
    const recipient = {
      id: `mercury-recipient-${s.nextRecipientId++}`,
      attachments: [],
      defaultPaymentMethod: body.defaultPaymentMethod ?? 'ach',
      emails: body.emails ?? [body.email ?? 'recipient@example.com'],
      name: body.name ?? 'New Recipient',
      status: 'active',
      contactEmail: body.contactEmail ?? body.email ?? body.emails?.[0] ?? 'recipient@example.com',
      nickname: body.nickname ?? body.name ?? 'New Recipient',
      electronicRoutingInfo: body.electronicRoutingInfo ?? { accountNumber: '123456789', routingNumber: '021000021', electronicAccountType: 'businessChecking' },
    };
    s.recipients.push(recipient);
    save(store, s);
    return c.json(recipient, 201);
  });
  app.get(`${prefix}/recipient/:recipientId`, (c) => {
    if (!requireAuth(c)) return error(c, 'Authentication required', 401, 'unauthorized');
    const recipient = recipientById(state(store), c.req.param('recipientId'));
    return recipient ? c.json(recipient) : error(c, 'Recipient not found', 404, 'not_found');
  });
  app.post(`${prefix}/recipient/:recipientId`, async (c) => {
    if (!requireAuth(c)) return error(c, 'Authentication required', 401, 'unauthorized');
    const s = state(store);
    const recipient = recipientById(s, c.req.param('recipientId'));
    if (!recipient) return error(c, 'Recipient not found', 404, 'not_found');
    Object.assign(recipient, await readBody(c));
    save(store, s);
    return c.json(recipient);
  });
  app.post(`${prefix}/account/:accountId/request-send-money`, async (c) => {
    if (!requireAuth(c)) return error(c, 'Authentication required', 401, 'unauthorized');
    const s = state(store);
    const account = accountById(s, c.req.param('accountId'));
    if (!account) return error(c, 'Account not found', 404, 'not_found');
    const body = await readBody(c);
    const approval = { requestId: `mercury-approval-${s.nextApprovalId++}`, accountId: account.id, recipientId: body.recipientId ?? 'mercury-recipient-1', amount: Number(body.amount ?? 10), paymentMethod: body.paymentMethod ?? 'ach', status: 'pendingApproval', reviews: [], createdAt: fixedNow };
    s.approvals.push(approval);
    save(store, s);
    return c.json(approval, 201);
  });
  app.post(`${prefix}/account/:accountId/transactions`, async (c) => {
    if (!requireAuth(c)) return error(c, 'Authentication required', 401, 'unauthorized');
    const s = state(store);
    const account = accountById(s, c.req.param('accountId'));
    if (!account) return error(c, 'Account not found', 404, 'not_found');
    const body = await readBody(c);
    const recipient = recipientById(s, body.recipientId) ?? s.recipients[0];
    const transaction = { id: `mercury-transaction-${s.nextTransactionId++}`, accountId: account.id, amount: -Math.abs(Number(body.amount ?? 10)), attachments: [], counterpartyId: recipient.id, counterpartyName: recipient.name, createdAt: fixedNow, dashboardLink: `https://mercury.com/transactions/mercury-transaction-${s.nextTransactionId}`, kind: 'outgoingPayment', status: 'pending', bankDescription: 'ACH PAYMENT', externalMemo: body.externalMemo ?? '', note: body.note ?? '' };
    s.transactions.push(transaction);
    save(store, s);
    return c.json(transaction, 201);
  });
}

export function seedFromConfig(store, baseUrl = 'https://api.mercury.com/api/v1', config = {}) {
  return save(store, { ...defaultState(baseUrl), ...config });
}

export const contract = {
  provider: 'mercury',
  source: 'Mercury API documentation and official SDK-informed subset',
  docs: 'https://docs.mercury.com/docs/welcome',
  baseUrl: 'https://api.mercury.com/api/v1',
  scope: ['accounts', 'transactions', 'recipients', 'request_send_money', 'create_transaction'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'mercury',
  register(app, store) {
    registerRoutes(app, store, '/api/v1');
    registerRoutes(app, store, '');
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Mercury banking API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { mercury: { apiKey: 'secret-token:mercury_emulator' } };
export default plugin;
