function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`;
}

function state(store) {
  const key = 'privy:state';
  const existing = store.getData?.(key);
  if (existing) return existing;
  const initial = {
    apps: [{ id: 'privy-emulator-app', name: 'Privy Emulator', created_at: now() }],
    users: [],
    sessions: [],
    otpCodes: [],
    siweChallenges: [],
    wallets: [],
  };
  store.setData?.(key, initial);
  return initial;
}

function save(store, next) {
  store.setData?.('privy:state', next);
}

async function body(c) {
  if (c.req.parseBody) return c.req.parseBody().catch(() => ({}));
  return c.req.json().catch(() => ({}));
}

function userJson(user) {
  return {
    id: user.id,
    created_at: user.created_at,
    updated_at: user.updated_at ?? user.created_at,
    linked_accounts: user.linked_accounts,
    email: user.email ? { address: user.email, verified: true } : null,
    phone: user.phone ? { number: user.phone, verified: true } : null,
    wallet: user.wallet ? { address: user.wallet, chain_type: 'ethereum', wallet_client_type: 'privy' } : null,
    custom_metadata: user.custom_metadata ?? {},
  };
}

function sessionJson(session, user) {
  return {
    token: session.token,
    expires_at: session.expires_at,
    user: userJson(user),
  };
}

function findOrCreateUser(next, input) {
  const email = input.email ?? input.address;
  const wallet = input.wallet_address ?? input.address;
  const existing = next.users.find((user) => (email && user.email === email) || (wallet && user.wallet === wallet));
  if (existing) return existing;
  const user = {
    id: input.id ?? id('user'),
    email: input.email,
    phone: input.phone,
    wallet: input.wallet_address,
    linked_accounts: [],
    custom_metadata: input.custom_metadata ?? {},
    created_at: now(),
    updated_at: now(),
  };
  if (user.email) user.linked_accounts.push({ type: 'email', address: user.email, verified_at: now() });
  if (user.phone) user.linked_accounts.push({ type: 'phone', number: user.phone, verified_at: now() });
  if (user.wallet) user.linked_accounts.push({ type: 'wallet', address: user.wallet, chain_type: 'ethereum', verified_at: now() });
  next.users.push(user);
  return user;
}

function createSession(next, user) {
  const session = {
    token: `privy-session-${crypto.randomUUID()}`,
    user_id: user.id,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    created_at: now(),
  };
  next.sessions.push(session);
  return session;
}

export function registerRoutes(app, store, contract) {
  app.get('/api/v1/apps/:appId', (c) => {
    const app = state(store).apps.find((item) => item.id === c.req.param('appId'));
    return app ? c.json(app) : c.json({ error: 'not_found', message: 'App not found' }, 404);
  });

  app.get('/api/v1/users', (c) => c.json({ data: state(store).users.map(userJson) }));

  app.post('/api/v1/users', async (c) => {
    const next = state(store);
    const user = findOrCreateUser(next, await body(c));
    save(store, next);
    return c.json(userJson(user), 201);
  });

  app.get('/api/v1/users/:userId', (c) => {
    const user = state(store).users.find((item) => item.id === c.req.param('userId'));
    return user ? c.json(userJson(user)) : c.json({ error: 'not_found', message: 'User not found' }, 404);
  });

  app.patch('/api/v1/users/:userId', async (c) => {
    const next = state(store);
    const user = next.users.find((item) => item.id === c.req.param('userId'));
    if (!user) return c.json({ error: 'not_found', message: 'User not found' }, 404);
    Object.assign(user, await body(c), { updated_at: now() });
    save(store, next);
    return c.json(userJson(user));
  });

  app.delete('/api/v1/users/:userId', (c) => {
    const next = state(store);
    const index = next.users.findIndex((item) => item.id === c.req.param('userId'));
    if (index === -1) return c.json({ error: 'not_found', message: 'User not found' }, 404);
    next.users.splice(index, 1);
    save(store, next);
    return c.json({ deleted: true });
  });

  app.post('/api/v1/users/:userId/link_email', async (c) => {
    const next = state(store);
    const user = next.users.find((item) => item.id === c.req.param('userId'));
    if (!user) return c.json({ error: 'not_found', message: 'User not found' }, 404);
    const input = await body(c);
    user.email = input.email;
    user.linked_accounts.push({ type: 'email', address: input.email, verified_at: now() });
    save(store, next);
    return c.json(userJson(user));
  });

  app.post('/api/v1/users/:userId/link_phone', async (c) => {
    const next = state(store);
    const user = next.users.find((item) => item.id === c.req.param('userId'));
    if (!user) return c.json({ error: 'not_found', message: 'User not found' }, 404);
    const input = await body(c);
    user.phone = input.phone ?? input.phone_number;
    user.linked_accounts.push({ type: 'phone', number: user.phone, verified_at: now() });
    save(store, next);
    return c.json(userJson(user));
  });

  app.post('/api/v1/users/:userId/link_wallet', async (c) => {
    const next = state(store);
    const user = next.users.find((item) => item.id === c.req.param('userId'));
    if (!user) return c.json({ error: 'not_found', message: 'User not found' }, 404);
    const input = await body(c);
    user.wallet = input.address ?? input.wallet_address;
    user.linked_accounts.push({ type: 'wallet', address: user.wallet, chain_type: input.chain_type ?? 'ethereum', verified_at: now() });
    save(store, next);
    return c.json(userJson(user));
  });

  app.post('/api/v1/auth/email/code', async (c) => {
    const next = state(store);
    const input = await body(c);
    const code = String(input.code ?? '000000');
    const record = { id: id('otp'), email: input.email, code, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), created_at: now() };
    next.otpCodes.push(record);
    save(store, next);
    return c.json({ id: record.id, email: record.email, code });
  });

  app.post('/api/v1/auth/email/login', async (c) => {
    const next = state(store);
    const input = await body(c);
    const otp = next.otpCodes.find((item) => item.email === input.email && item.code === input.code);
    if (!otp && input.code !== '000000') return c.json({ error: 'invalid_code' }, 400);
    const user = findOrCreateUser(next, { email: input.email });
    const session = createSession(next, user);
    save(store, next);
    return c.json(sessionJson(session, user));
  });

  app.post('/api/v1/auth/siwe/init', async (c) => {
    const next = state(store);
    const input = await body(c);
    const challenge = {
      nonce: crypto.randomUUID(),
      address: input.address,
      message: `${input.domain ?? 'localhost'} wants you to sign in with your Ethereum account: ${input.address}`,
      created_at: now(),
    };
    next.siweChallenges.push(challenge);
    save(store, next);
    return c.json(challenge);
  });

  app.post('/api/v1/auth/siwe/authenticate', async (c) => {
    const next = state(store);
    const input = await body(c);
    const challenge = next.siweChallenges.find((item) => item.nonce === input.nonce) ?? {};
    const user = findOrCreateUser(next, { wallet_address: input.address ?? challenge.address });
    const session = createSession(next, user);
    save(store, next);
    return c.json(sessionJson(session, user));
  });

  app.post('/api/v1/auth/session/verify', async (c) => {
    const input = await body(c);
    const token = input.token ?? c.req.header?.('authorization')?.replace(/^Bearer\s+/i, '');
    const session = state(store).sessions.find((item) => item.token === token);
    const user = state(store).users.find((item) => item.id === session?.user_id);
    return session && user ? c.json(sessionJson(session, user)) : c.json({ error: 'invalid_session' }, 401);
  });

  app.post('/api/v1/wallets', async (c) => {
    const next = state(store);
    const input = await body(c);
    const wallet = {
      id: id('wallet'),
      user_id: input.user_id,
      address: input.address ?? `0x${crypto.randomUUID().replaceAll('-', '').slice(0, 40)}`,
      chain_type: input.chain_type ?? 'ethereum',
      wallet_client_type: 'privy',
      created_at: now(),
    };
    next.wallets.push(wallet);
    save(store, next);
    return c.json(wallet, 201);
  });

  app.get('/api/v1/wallets', (c) => c.json({ data: state(store).wallets }));

  app.post('/api/v1/wallets/:walletId/rpc', async (c) => {
    const wallet = state(store).wallets.find((item) => item.id === c.req.param('walletId'));
    if (!wallet) return c.json({ error: 'not_found', message: 'Wallet not found' }, 404);
    const input = await body(c);
    return c.json({ id: input.id ?? 1, jsonrpc: '2.0', result: input.method === 'eth_accounts' ? [wallet.address] : '0x1' });
  });

  app.get('/inspect/contract', (c) => c.json(contract));
  app.get('/inspect/state', (c) => c.json(state(store)));
  app.post('/inspect/reset', (c) => {
    store.setData?.('privy:state', null);
    state(store);
    return c.json({ ok: true });
  });
}
