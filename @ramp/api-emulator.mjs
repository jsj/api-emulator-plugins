function initialState(config = {}) {
  return {
    ...{
    "entities": [
        {
            "id": "entity_1",
            "entity_name": "Emulator Inc",
            "country": "US"
        }
    ],
    "users": [
        {
            "id": "user_1",
            "user_id": "user_1",
            "uuid": "user_1",
            "first_name": "Ada",
            "last_name": "Lovelace",
            "full_name": "Ada Lovelace",
            "email": "ada@example.com",
            "status": "ACTIVE"
        }
    ],
    "cards": [
        {
            "id": "card_1",
            "uuid": "card_1",
            "user_id": "user_1",
            "display_name": "Ada Corporate Card",
            "spending_restrictions": {
                "limit_amount": 500000,
                "interval": "MONTHLY"
            },
            "status": "ACTIVE"
        }
    ],
    "transactions": [
        {
            "id": "txn_1",
            "transaction_uuid": "txn_1",
            "user_id": "user_1",
            "card_id": "card_1",
            "amount": 4299,
            "currency": "USD",
            "merchant_name": "Emulator Cafe",
            "spent_by_user": "Ada Lovelace",
            "transaction_time": "2026-05-15T12:00:00Z",
            "merchant_category": "Meals",
            "state": "CLEARED",
            "sk_category_name": "Meals"
        }
    ],
    "reimbursements": [],
    "nextId": 2
},
    ...config,
  };
}

function state(store) {
  const current = store.getData?.('ramp:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('ramp:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('ramp:state', next);
}

async function json(c) {
  return c.req.json().catch(() => ({}));
}

function byId(rows, id) {
  return rows.find((row) => String(row.id ?? row.uuid ?? row.ID ?? row.uid) === String(id));
}

function page(app, store, route, key) {
  app.get(route, (c) => c.json({ data: state(store)[key], page: { next: null } }));
}

function dataList(app, store, route, key) {
  app.get(route, (c) => c.json({ data: state(store)[key] }));
}

function dataGet(app, store, route, key) {
  app.get(route, (c) => { const row = byId(state(store)[key], c.req.param('id')); return row ? c.json({ data: row }) : c.json({ error: 'not_found', message: 'Resource not found' }, 404); });
}

async function createPlain(c, store, key, prefix) {
  const s = state(store); const body = await json(c);
  const row = { id: body.id ?? s.nextId++, created_at: new Date().toISOString(), ...body };
  s[key].push(row); saveState(store, s); return row;
}

async function createData(c, store, key, prefix) {
  const row = await createPlain(c, store, key, prefix);
  if (typeof row.id === 'number') row.id = `${prefix}_${row.id}`;
  saveState(store, state(store));
  return c.json({ data: row }, 201);
}

async function createRow(c, store, key, prefix) {
  const row = await createPlain(c, store, key, prefix);
  if (typeof row.id === 'number') row.id = `${prefix}_${row.id}`;
  saveState(store, state(store));
  return c.json(row, 201);
}

async function createKeyed(c, store, key, prefix) {
  const row = await createPlain(c, store, key, prefix);
  row.id ??= `${prefix}_${state(store).nextId}`;
  return c.json(row, 201);
}

function wdList(app, store, route, key) { app.get(route, (c) => c.json({ total: state(store)[key].length, data: state(store)[key] })); }
function wdGet(app, store, route, key) { app.get(route, (c) => { const row = byId(state(store)[key], c.req.param('id')); return row ? c.json(row) : c.json({ error: 'not_found' }, 404); }); }
async function createWd(c, store, key, prefix) { const row = await createPlain(c, store, key, prefix); if (typeof row.id === 'number') row.id = `${prefix}_${row.id}`; saveState(store, state(store)); return c.json(row, 201); }

function samList(app, store, route, key) { app.get(route, (c) => c.json({ data: state(store)[key], pagination: { endCursor: '', hasNextPage: false } })); }
function samGet(app, store, route, key) { app.get(route, (c) => { const row = byId(state(store)[key], c.req.param('id')); return row ? c.json({ data: row }) : c.json({ message: 'Not Found' }, 404); }); }
async function createSam(c, store, key, prefix) { return createData(c, store, key, prefix); }

function concurList(app, store, route, key) { app.get(route, (c) => c.json({ Items: state(store)[key], NextPage: null })); }
async function createConcur(c, store, key, prefix) { const s = state(store); const body = await json(c); const row = { ID: body.ID ?? `${prefix}_${s.nextId++}`, ...body }; s[key].push(row); saveState(store, s); return c.json(row, 201); }

function rampUser(user) {
  return {
    user_id: user.user_id ?? user.id,
    id: user.id,
    uuid: user.uuid ?? user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    full_name: user.full_name ?? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
    email: user.email,
    status: user.status,
  };
}

function rampTransaction(transaction, s) {
  const user = byId(s.users, transaction.user_id) ?? {};
  return {
    transaction_uuid: transaction.transaction_uuid ?? transaction.id,
    id: transaction.id,
    amount: transaction.amount,
    currency: transaction.currency,
    merchant_name: transaction.merchant_name,
    spent_by_user: transaction.spent_by_user ?? rampUser(user).full_name,
    transaction_time: transaction.transaction_time,
    merchant_category: transaction.merchant_category ?? transaction.sk_category_name,
    state: transaction.state,
    card_id: transaction.card_id,
    user_id: transaction.user_id,
  };
}

function rampReimbursement(reimbursement) {
  return {
    reimbursement_uuid: reimbursement.reimbursement_uuid ?? reimbursement.id,
    id: reimbursement.id,
    amount: reimbursement.amount,
    currency: reimbursement.currency,
    memo: reimbursement.memo,
    status: reimbursement.status ?? 'DRAFT',
    created_at: reimbursement.created_at,
  };
}

async function postAgentTool(c, store, handler) {
  const body = await json(c);
  return c.json(handler(state(store), body));
}



export const contract = {
  provider: 'ramp',
  source: 'Ramp official API documentation-informed REST subset',
  docs: 'https://docs.ramp.com/developer-api/v1/overview',
  baseUrl: 'https://api.ramp.com/developer/v1',
  scope: ["entities","users","cards","transactions","reimbursements"],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'ramp',
  register(app, store) {

    page(app, store, '/developer/v1/entities', 'entities');
    page(app, store, '/developer/v1/users', 'users');
    page(app, store, '/developer/v1/cards', 'cards');
    page(app, store, '/developer/v1/transactions', 'transactions');
    app.post('/developer/v1/reimbursements', async (c) => createRow(c, store, 'reimbursements', 'reimbursement'));
    app.post('/developer/v1/agent-tools/get-simplified-user-detail', (c) =>
      postAgentTool(c, store, (s) => rampUser(s.users[0])),
    );
    app.post('/developer/v1/agent-tools/list-users', (c) =>
      postAgentTool(c, store, (s) => ({
        users: s.users.map(rampUser),
        total_count: s.users.length,
        next_page_cursor: null,
      })),
    );
    app.post('/developer/v1/agent-tools/get-transactions', (c) =>
      postAgentTool(c, store, (s) => ({
        transactions: s.transactions.map((transaction) => rampTransaction(transaction, s)),
        total_count: s.transactions.length,
        next_page_cursor: null,
      })),
    );
    app.post('/developer/v1/agent-tools/get-full-transaction-metadata', (c) =>
      postAgentTool(c, store, (s, body) => {
        const transaction = byId(s.transactions, body.id);
        return transaction
          ? rampTransaction(transaction, s)
          : { error: 'not_found', message: 'Transaction not found' };
      }),
    );
    app.post('/developer/v1/agent-tools/get-reimbursements', (c) =>
      postAgentTool(c, store, (s) => ({
        reimbursements: [...s.reimbursements].reverse().map(rampReimbursement),
        total_count: s.reimbursements.length,
        next_page_cursor: null,
      })),
    );
    app.get('/v1/public/agent-tools/spec/hash', (c) => c.json({ content_hash: 'ramp-emulator-agent-tools-v1' }));
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Ramp API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { ramp: initialState() };
export default plugin;
