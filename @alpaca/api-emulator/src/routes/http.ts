type Entity = {
  id: number;
  created_at: string;
  updated_at: string;
};

type CollectionLike<T extends Entity> = {
  all(): T[];
  insert(data: Omit<T, "id" | "created_at" | "updated_at">): T;
  update(id: number, data: Partial<T>): T | undefined;
  clear(): void;
  findOneBy(field: keyof T, value: string | number): T | undefined;
};

type StoreLike = {
  collection<T extends Entity>(name: string, indexFields: string[]): CollectionLike<T>;
};

type RequestLike = {
  header(name: string): string | undefined;
  param(name: string): string;
  query(name: string): string | undefined;
  json(): Promise<Record<string, unknown>>;
};

interface AlpacaRealSeedData {
  account?: Partial<AlpacaAccount>;
  clock?: Partial<AlpacaClock>;
  positions?: Array<Partial<AlpacaPosition> & { symbol: string }>;
  orders?: Array<Partial<AlpacaOrder> & { symbol: string; qty: string; side: "buy" | "sell" }>;
  bars?: Record<string, Array<{ timestamp: string; open: number; high: number; low: number; close: number; volume: number; timeframe?: string }>>;
}

type ContextLike = {
  req: RequestLike;
  json(payload: unknown, status?: number): Response;
};

type NextLike = () => Promise<void>;

type AppLike = {
  use(path: string, handler: (context: ContextLike, next: NextLike) => Promise<Response | void>): void;
  get(path: string, handler: (context: ContextLike) => Response): void;
  post(path: string, handler: (context: ContextLike) => Promise<Response> | Response): void;
  put?(path: string, handler: (context: ContextLike) => Promise<Response> | Response): void;
  patch?(path: string, handler: (context: ContextLike) => Promise<Response> | Response): void;
  delete(path: string, handler: (context: ContextLike) => Response): void;
};

type ServicePlugin = {
  name: string;
  register(app: AppLike, store: StoreLike): void;
  seed?(store: StoreLike, baseUrl: string): void;
};

interface AlpacaAccount extends Entity {
  account_number: string;
  status: string;
  currency: string;
  buying_power: string;
  cash: string;
  portfolio_value: string;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at_alpaca: string;
}

interface AlpacaClock extends Entity {
  timestamp: string;
  is_open: boolean;
  next_open: string;
  next_close: string;
}

interface AlpacaPosition extends Entity {
  symbol: string;
  qty: string;
  side: "long" | "short";
  market_value: string;
  avg_entry_price: string;
  current_price: string;
  unrealized_pl: string;
}

interface AlpacaOrder extends Entity {
  order_id: string;
  client_order_id?: string;
  symbol: string;
  qty: string;
  side: "buy" | "sell";
  type: string;
  time_in_force: string;
  status: string;
  submitted_at_alpaca: string;
  filled_at?: string | null;
  filled_qty: string;
}

interface AlpacaBar extends Entity {
  symbol: string;
  timeframe: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AlpacaSeedConfig {
  alpaca?: AlpacaRealSeedData;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

export async function seedFromAlpacaMarketData(baseUrl: string, options: {
  apiKey: string;
  secretKey: string;
  symbols: string[];
  timeframe?: string;
}): Promise<AlpacaRealSeedData> {
  const headers = {
    'APCA-API-KEY-ID': options.apiKey,
    'APCA-API-SECRET-KEY': options.secretKey,
  };
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const timeframe = options.timeframe ?? '1Day';

  const [accountRes, clockRes, positionsRes, barsRes] = await Promise.all([
    fetch(`${normalizedBaseUrl}/v2/account`, { headers }),
    fetch(`${normalizedBaseUrl}/v2/clock`, { headers }),
    fetch(`${normalizedBaseUrl}/v2/positions`, { headers }),
    fetch(`${normalizedBaseUrl}/v2/stocks/bars?symbols=${encodeURIComponent(options.symbols.join(','))}&timeframe=${encodeURIComponent(timeframe)}`, { headers }),
  ]);

  if (!accountRes.ok || !clockRes.ok || !positionsRes.ok || !barsRes.ok) {
    throw new Error('Failed to fetch Alpaca seed data from the real API.');
  }

  const account = await accountRes.json() as Record<string, unknown>;
  const clock = await clockRes.json() as Record<string, unknown>;
  const positions = await positionsRes.json() as Array<Record<string, unknown>>;
  const barsPayload = await barsRes.json() as { bars?: Record<string, Array<Record<string, unknown>>> };

  const bars = Object.fromEntries(Object.entries(barsPayload.bars ?? {}).map(([symbol, items]) => [
    symbol,
    items.map((item) => ({
      timestamp: String(item.t ?? ''),
      open: Number(item.o ?? 0),
      high: Number(item.h ?? 0),
      low: Number(item.l ?? 0),
      close: Number(item.c ?? 0),
      volume: Number(item.v ?? 0),
      timeframe,
    })),
  ]));

  return {
    account: {
      account_number: String(account.account_number ?? 'PA-SEEDED-001'),
      status: String(account.status ?? 'ACTIVE'),
      currency: String(account.currency ?? 'USD'),
      buying_power: String(account.buying_power ?? '0'),
      cash: String(account.cash ?? '0'),
      portfolio_value: String(account.portfolio_value ?? '0'),
      pattern_day_trader: Boolean(account.pattern_day_trader ?? false),
      trading_blocked: Boolean(account.trading_blocked ?? false),
      transfers_blocked: Boolean(account.transfers_blocked ?? false),
      account_blocked: Boolean(account.account_blocked ?? false),
      created_at_alpaca: String(account.created_at ?? new Date().toISOString()),
    },
    clock: {
      timestamp: String(clock.timestamp ?? new Date().toISOString()),
      is_open: Boolean(clock.is_open ?? false),
      next_open: String(clock.next_open ?? isoOffset(1)),
      next_close: String(clock.next_close ?? isoOffset(0, 21, 0)),
    },
    positions: positions.map((position) => ({
      symbol: String(position.symbol ?? 'SPY'),
      qty: String(position.qty ?? '0'),
      side: String(position.side ?? 'long') as 'long' | 'short',
      market_value: String(position.market_value ?? '0'),
      avg_entry_price: String(position.avg_entry_price ?? '0'),
      current_price: String(position.current_price ?? '0'),
      unrealized_pl: String(position.unrealized_pl ?? '0'),
    })),
    bars,
  };
}

export async function buildSeedConfigFromRealAlpaca(baseUrl: string, options: {
  apiKey: string;
  secretKey: string;
  symbols: string[];
  timeframe?: string;
}): Promise<AlpacaSeedConfig> {
  return { alpaca: await seedFromAlpacaMarketData(baseUrl, options) };
}

function getAlpacaStore(store: StoreLike) {
  return {
    accounts: store.collection<AlpacaAccount>('alpaca.accounts', ['account_number']),
    clocks: store.collection<AlpacaClock>('alpaca.clocks', []),
    positions: store.collection<AlpacaPosition>('alpaca.positions', ['symbol']),
    orders: store.collection<AlpacaOrder>('alpaca.orders', ['order_id', 'symbol', 'status']),
    bars: store.collection<AlpacaBar>('alpaca.bars', ['symbol', 'timeframe', 'timestamp']),
  };
}

function isoOffset(days = 0, hour = 14, minute = 30): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function seedDefaults(store: StoreLike): void {
  const alpaca = getAlpacaStore(store);
  if (!alpaca.accounts.all().length) {
    alpaca.accounts.insert({
      account_number: 'PA-EMULATE-001',
      status: 'ACTIVE',
      currency: 'USD',
      buying_power: '100000',
      cash: '100000',
      portfolio_value: '100000',
      pattern_day_trader: false,
      trading_blocked: false,
      transfers_blocked: false,
      account_blocked: false,
      created_at_alpaca: isoOffset(-30),
    });
  }
  if (!alpaca.clocks.all().length) {
    alpaca.clocks.insert({
      timestamp: new Date().toISOString(),
      is_open: true,
      next_open: isoOffset(1),
      next_close: isoOffset(0, 21, 0),
    });
  }
  if (!alpaca.positions.all().length) {
    alpaca.positions.insert({
      symbol: 'SPY',
      qty: '10',
      side: 'long',
      market_value: '5895',
      avg_entry_price: '580',
      current_price: '589.5',
      unrealized_pl: '95',
    });
  }
  if (!alpaca.bars.all().length) {
    const defaults: Record<string, Array<Omit<AlpacaBar, 'id' | 'created_at' | 'updated_at' | 'symbol' | 'timeframe'>>> = {
      SPY: [
        { timestamp: '2025-01-02T14:30:00Z', open: 585, high: 587, low: 584.5, close: 586.5, volume: 1000000 },
        { timestamp: '2025-01-03T14:30:00Z', open: 586.5, high: 589, low: 586, close: 588, volume: 1100000 },
        { timestamp: '2025-01-06T14:30:00Z', open: 588, high: 590, low: 587, close: 589.5, volume: 1200000 },
      ],
      MSFT: [
        { timestamp: '2025-01-02T14:30:00Z', open: 420, high: 423, low: 419.5, close: 422, volume: 900000 },
        { timestamp: '2025-01-03T14:30:00Z', open: 422, high: 425, low: 421, close: 424.5, volume: 950000 },
        { timestamp: '2025-01-06T14:30:00Z', open: 424.5, high: 426.5, low: 423.5, close: 425.5, volume: 975000 },
      ],
    };
    for (const [symbol, bars] of Object.entries(defaults)) {
      for (const bar of bars) {
        alpaca.bars.insert({ symbol, timeframe: '1Day', ...bar });
      }
    }
  }
}

export function seedFromConfig(store: StoreLike, _baseUrl: string, config: AlpacaSeedConfig): void {
  seedDefaults(store);
  const alpaca = getAlpacaStore(store);
  const seed = config.alpaca;
  if (!seed) return;

  if (seed.account) {
    const current = alpaca.accounts.all()[0];
    if (current) alpaca.accounts.update(current.id, seed.account);
  }

  if (seed.clock) {
    const current = alpaca.clocks.all()[0];
    if (current) alpaca.clocks.update(current.id, seed.clock);
  }

  if (seed.positions) {
    alpaca.positions.clear();
    for (const position of seed.positions) {
      alpaca.positions.insert({
        qty: '0',
        side: 'long',
        market_value: '0',
        avg_entry_price: '0',
        current_price: '0',
        unrealized_pl: '0',
        ...position,
      } as Omit<AlpacaPosition, 'id' | 'created_at' | 'updated_at'>);
    }
  }

  if (seed.orders) {
    alpaca.orders.clear();
    for (const order of seed.orders) {
      alpaca.orders.insert({
        order_id: crypto.randomUUID(),
        type: 'market',
        time_in_force: 'day',
        status: 'filled',
        submitted_at_alpaca: new Date().toISOString(),
        filled_qty: order.qty,
        ...order,
      } as Omit<AlpacaOrder, 'id' | 'created_at' | 'updated_at'>);
    }
  }

  if (seed.bars) {
    alpaca.bars.clear();
    for (const [symbol, bars] of Object.entries(seed.bars)) {
      for (const bar of bars) {
        alpaca.bars.insert({
          symbol,
          timeframe: bar.timeframe ?? '1Day',
          timestamp: bar.timestamp,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume,
        });
      }
    }
  }
}

function requireAuth(context: ContextLike): boolean {
  const key = context.req.header('APCA-API-KEY-ID');
  const secret = context.req.header('APCA-API-SECRET-KEY');
  return Boolean(key && secret);
}

function barsResponse(items: AlpacaBar[]) {
  return {
    bars: items.map((bar) => ({
      t: bar.timestamp,
      o: bar.open,
      h: bar.high,
      l: bar.low,
      c: bar.close,
      v: bar.volume,
    })),
    next_page_token: null,
  };
}

function symbolsFromQuery(context: ContextLike, fallback = 'SPY'): string[] {
  const raw = context.req.query('symbols') ?? context.req.query('symbol_or_symbols') ?? context.req.query('underlying_symbols') ?? fallback;
  return raw.split(',').map((value) => value.trim()).filter(Boolean);
}

function latestBar(symbol: string, bars: AlpacaBar[]): AlpacaBar {
  return bars
    .filter((bar) => bar.symbol === symbol)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .at(-1) ?? {
      id: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      symbol,
      timeframe: '1Day',
      timestamp: new Date().toISOString(),
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 1000,
    };
}

function barPayload(bar: AlpacaBar) {
  return { t: bar.timestamp, o: bar.open, h: bar.high, l: bar.low, c: bar.close, v: bar.volume, n: 100, vw: (bar.open + bar.close) / 2 };
}

function tradePayload(symbol: string, bar: AlpacaBar) {
  return { t: bar.timestamp, p: bar.close, s: 100, x: 'V', c: ['@'], i: `${symbol}-${bar.timestamp}`, z: 'C' };
}

function quotePayload(bar: AlpacaBar) {
  return { t: bar.timestamp, ap: bar.close + 0.01, as: 100, bp: bar.close - 0.01, bs: 200, ax: 'V', bx: 'V', c: ['R'], z: 'C' };
}

function snapshotPayload(symbol: string, bars: AlpacaBar[]) {
  const sorted = bars
    .filter((bar) => bar.symbol === symbol)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const dailyBar = sorted.at(-1) ?? latestBar(symbol, bars);
  const prevDailyBar = sorted.at(-2) ?? dailyBar;
  return {
    latestTrade: tradePayload(symbol, dailyBar),
    latestQuote: quotePayload(dailyBar),
    minuteBar: barPayload(dailyBar),
    dailyBar: barPayload(dailyBar),
    prevDailyBar: barPayload(prevDailyBar),
    symbol,
  };
}

function symbolMap<T>(symbols: string[], build: (symbol: string) => T): Record<string, T> {
  return Object.fromEntries(symbols.map((symbol) => [symbol, build(symbol)]));
}

function alpacaAsset(symbol = 'SPY') {
  return {
    id: `${symbol.toLowerCase()}-asset-id`,
    class: 'us_equity',
    exchange: 'ARCA',
    symbol,
    name: `${symbol} Test Asset`,
    status: 'active',
    tradable: true,
    marginable: true,
    shortable: true,
    easy_to_borrow: true,
    fractionable: true,
  };
}

function calendarDay() {
  return { date: new Date().toISOString().slice(0, 10), open: '09:30', close: '16:00', session_open: '0930', session_close: '1600' };
}

function portfolioHistory() {
  return {
    timestamp: [Math.floor(Date.now() / 1000)],
    equity: [100000],
    profit_loss: [0],
    profit_loss_pct: [0],
    base_value: 100000,
    timeframe: '1D',
  };
}

function accountConfiguration() {
  return {
    dtbp_check: 'entry',
    trade_confirm_email: 'all',
    suspend_trade: false,
    no_shorting: false,
    fractional_trading: true,
    max_margin_multiplier: '4',
  };
}

function watchlist(id = 'watchlist-1', name = 'Default') {
  return { id, account_id: 'account-1', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), name, assets: [alpacaAsset()] };
}

function corporateAction(id = 'corporate-action-1') {
  return { id, corporate_action_id: id, ca_type: 'dividend', ca_sub_type: 'cash', initiating_symbol: 'SPY', target_symbol: 'SPY', payable_date: new Date().toISOString().slice(0, 10), ex_date: new Date().toISOString().slice(0, 10), record_date: new Date().toISOString().slice(0, 10), cash: '0.00' };
}

function optionContract(symbol = 'SPY260116C00600000') {
  return {
    id: `${symbol.toLowerCase()}-contract-id`,
    symbol,
    name: `${symbol} Test Option`,
    status: 'active',
    tradable: true,
    expiration_date: '2026-01-16',
    root_symbol: 'SPY',
    underlying_symbol: 'SPY',
    underlying_asset_id: 'spy-asset-id',
    type: 'call',
    style: 'american',
    strike_price: '600',
    size: '100',
    open_interest: '0',
    open_interest_date: new Date().toISOString().slice(0, 10),
    close_price: '1.00',
    close_price_date: new Date().toISOString().slice(0, 10),
  };
}

function newsItem() {
  return {
    id: 1,
    headline: 'Test market news',
    author: 'Alpaca Emulator',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    summary: 'Fixture news item',
    content: 'Fixture news content',
    url: 'https://example.com/news/1',
    images: [],
    symbols: ['SPY'],
  };
}

function orderbookPayload(bar: AlpacaBar) {
  return { t: bar.timestamp, b: [{ p: bar.close - 0.01, s: 1 }], a: [{ p: bar.close + 0.01, s: 1 }] };
}

function optionSnapshot(symbol: string, bars: AlpacaBar[]) {
  const bar = latestBar('SPY', bars);
  return { latestTrade: tradePayload(symbol, bar), latestQuote: quotePayload(bar), impliedVolatility: 0.2, greeks: { delta: 0.5, gamma: 0.01, theta: -0.01, vega: 0.1, rho: 0.01 } };
}

function sseResponse(event: string) {
  return new Response(`event: ${event}\ndata: {}\n\n`, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}

async function jsonBody(context: ContextLike): Promise<Record<string, unknown>> {
  try {
    return await context.req.json();
  } catch {
    return {};
  }
}

export function registerRoutes(app: AppLike, store: StoreLike): void {
  const alpaca = getAlpacaStore(store);

  app.use('/v2/*', async (context: ContextLike, next: NextLike) => {
    if (!requireAuth(context)) {
      return context.json({ message: 'unauthorized' }, 401);
    }
    await next();
  });

  app.get('/v2/account', (context: ContextLike) => context.json(alpaca.accounts.all()[0] ?? {}, 200));
  app.get('/v2/clock', (context: ContextLike) => context.json(alpaca.clocks.all()[0] ?? {}, 200));
  app.get('/v2/positions', (context: ContextLike) => context.json(alpaca.positions.all(), 200));
  app.get('/v2/positions/:symbol', (context: ContextLike) => {
    const position = alpaca.positions.findOneBy('symbol', context.req.param('symbol'));
    return position ? context.json(position, 200) : context.json({ message: 'position not found' }, 404);
  });
  app.get('/v2/orders', (context: ContextLike) => context.json(alpaca.orders.all(), 200));
  app.get('/v2/orders:by_client_order_id', (context: ContextLike) => {
    const clientOrderId = context.req.query('client_order_id') ?? '';
    const order = alpaca.orders.all().find((item) => item.client_order_id === clientOrderId);
    return order ? context.json(order, 200) : context.json({ message: 'order not found' }, 404);
  });
  app.get('/v2/orders/:orderId', (context: ContextLike) => {
    const order = alpaca.orders.findOneBy('order_id', context.req.param('orderId'));
    return order ? context.json(order, 200) : context.json({ message: 'order not found' }, 404);
  });
  app.delete('/v2/orders', (context: ContextLike) => {
    alpaca.orders.clear();
    return context.json([], 200);
  });
  app.delete('/v2/orders/:orderId', (context: ContextLike) => {
    const order = alpaca.orders.findOneBy('order_id', context.req.param('orderId'));
    if (!order) return context.json({ message: 'order not found' }, 404);
    alpaca.orders.update(order.id, { status: 'canceled' });
    return context.json({}, 204);
  });
  app.patch?.('/v2/orders/:orderId', async (context: ContextLike) => {
    const order = alpaca.orders.findOneBy('order_id', context.req.param('orderId'));
    if (!order) return context.json({ message: 'order not found' }, 404);
    const body = await jsonBody(context);
    const updated = alpaca.orders.update(order.id, { ...body, status: 'replaced' } as Partial<AlpacaOrder>);
    return context.json(updated, 200);
  });
  app.post('/v2/orders', async (context: ContextLike) => {
    const body = await context.req.json();
    const order = alpaca.orders.insert({
      order_id: crypto.randomUUID(),
      client_order_id: String(body.client_order_id ?? crypto.randomUUID()),
      symbol: String(body.symbol ?? 'SPY'),
      qty: String(body.qty ?? '1'),
      side: String(body.side ?? 'buy') as 'buy' | 'sell',
      type: String(body.type ?? 'market'),
      time_in_force: String(body.time_in_force ?? 'day'),
      status: 'filled',
      submitted_at_alpaca: new Date().toISOString(),
      filled_at: new Date().toISOString(),
      filled_qty: String(body.qty ?? '1'),
    });
    return context.json(order, 200);
  });

  app.delete('/v2/positions', (context: ContextLike) => {
    const responses = alpaca.positions.all().map((position) => ({ symbol: position.symbol, status: 200, body: { order_id: crypto.randomUUID() } }));
    alpaca.positions.clear();
    return context.json(responses, 200);
  });
  app.delete('/v2/positions/:symbol', (context: ContextLike) => {
    const symbol = context.req.param('symbol');
    const position = alpaca.positions.findOneBy('symbol', symbol);
    if (!position) return context.json({ message: 'position not found' }, 404);
    const order = alpaca.orders.insert({
      order_id: crypto.randomUUID(),
      client_order_id: crypto.randomUUID(),
      symbol,
      qty: position.qty,
      side: position.side === 'long' ? 'sell' : 'buy',
      type: 'market',
      time_in_force: 'day',
      status: 'filled',
      submitted_at_alpaca: new Date().toISOString(),
      filled_at: new Date().toISOString(),
      filled_qty: position.qty,
    });
    return context.json(order, 200);
  });
  app.post('/v2/positions/:symbol/exercise', (context: ContextLike) => context.json({}, 204));

  app.get('/v2/account/portfolio/history', (context: ContextLike) => context.json(portfolioHistory(), 200));
  app.get('/v2/account/configurations', (context: ContextLike) => context.json(accountConfiguration(), 200));
  app.patch?.('/v2/account/configurations', async (context: ContextLike) => context.json({ ...accountConfiguration(), ...(await jsonBody(context)) }, 200));
  app.get('/v2/calendar', (context: ContextLike) => context.json([calendarDay()], 200));
  app.get('/v2/assets', (context: ContextLike) => context.json(symbolsFromQuery(context).map(alpacaAsset), 200));
  app.get('/v2/assets/:symbol', (context: ContextLike) => context.json(alpacaAsset(context.req.param('symbol')), 200));

  app.get('/v2/watchlists', (context: ContextLike) => context.json([watchlist()], 200));
  app.get('/v2/watchlists/:watchlistId', (context: ContextLike) => context.json(watchlist(context.req.param('watchlistId')), 200));
  app.post('/v2/watchlists', async (context: ContextLike) => {
    const body = await jsonBody(context);
    return context.json(watchlist(crypto.randomUUID(), String(body.name ?? 'Default')), 200);
  });
  app.put?.('/v2/watchlists/:watchlistId', async (context: ContextLike) => {
    const body = await jsonBody(context);
    return context.json(watchlist(context.req.param('watchlistId'), String(body.name ?? 'Default')), 200);
  });
  app.post('/v2/watchlists/:watchlistId', (context: ContextLike) => context.json(watchlist(context.req.param('watchlistId')), 200));
  app.delete('/v2/watchlists/:watchlistId', (context: ContextLike) => context.json({}, 204));
  app.delete('/v2/watchlists/:watchlistId/:symbol', (context: ContextLike) => context.json({ ...watchlist(context.req.param('watchlistId')), assets: [] }, 200));

  app.get('/v2/corporate_actions/announcements', (context: ContextLike) => context.json([corporateAction()], 200));
  app.get('/v2/corporate_actions/announcements/:corporateActionId', (context: ContextLike) => context.json(corporateAction(context.req.param('corporateActionId')), 200));
  app.get('/v2/options/contracts', (context: ContextLike) => context.json({ option_contracts: [optionContract()], next_page_token: null }, 200));
  app.get('/v2/options/contracts/:symbol', (context: ContextLike) => context.json(optionContract(context.req.param('symbol')), 200));

  app.get('/v2/stocks/:symbol/snapshot', (context: ContextLike) => {
    const symbol = context.req.param('symbol');
    const bars = alpaca.bars
      .all()
      .filter((bar: AlpacaBar) => bar.symbol === symbol && bar.timeframe === '1Day')
      .sort((a: AlpacaBar, b: AlpacaBar) => a.timestamp.localeCompare(b.timestamp));

    const dailyBar = bars[bars.length - 1];
    const prevDailyBar = bars.length > 1 ? bars[bars.length - 2] : undefined;

    if (!dailyBar) {
      return context.json({ message: `no data for ${symbol}` }, 404);
    }

    const price = dailyBar.close;
    return context.json({
      latestTrade: { t: dailyBar.timestamp, p: price, s: 100, x: 'V', c: ['@'], i: 1, z: 'C' },
      latestQuote: { t: dailyBar.timestamp, ap: price + 0.01, as: 100, bp: price - 0.01, bs: 200, ax: 'V', bx: 'V', c: ['R'], z: 'C' },
      minuteBar: { t: dailyBar.timestamp, o: price - 0.5, h: price + 0.5, l: price - 1, c: price, v: 50000, n: 120, vw: price },
      dailyBar: { t: dailyBar.timestamp, o: dailyBar.open, h: dailyBar.high, l: dailyBar.low, c: dailyBar.close, v: dailyBar.volume, n: 5000, vw: (dailyBar.open + dailyBar.close) / 2 },
      prevDailyBar: prevDailyBar
        ? { t: prevDailyBar.timestamp, o: prevDailyBar.open, h: prevDailyBar.high, l: prevDailyBar.low, c: prevDailyBar.close, v: prevDailyBar.volume, n: 5000, vw: (prevDailyBar.open + prevDailyBar.close) / 2 }
        : { t: dailyBar.timestamp, o: price, h: price, l: price, c: price, v: 0, n: 0, vw: price },
      symbol,
    }, 200);
  });

  app.get('/v2/stocks/quotes', (context: ContextLike) => {
    const quotes = symbolMap(symbolsFromQuery(context), (symbol) => [quotePayload(latestBar(symbol, alpaca.bars.all()))]);
    return context.json({ quotes, next_page_token: null }, 200);
  });
  app.get('/v2/stocks/trades', (context: ContextLike) => {
    const trades = symbolMap(symbolsFromQuery(context), (symbol) => [tradePayload(symbol, latestBar(symbol, alpaca.bars.all()))]);
    return context.json({ trades, next_page_token: null }, 200);
  });
  app.get('/v2/stocks/trades/latest', (context: ContextLike) => {
    const trades = symbolMap(symbolsFromQuery(context), (symbol) => tradePayload(symbol, latestBar(symbol, alpaca.bars.all())));
    return context.json({ trades }, 200);
  });
  app.get('/v2/stocks/quotes/latest', (context: ContextLike) => {
    const quotes = symbolMap(symbolsFromQuery(context), (symbol) => quotePayload(latestBar(symbol, alpaca.bars.all())));
    return context.json({ quotes }, 200);
  });
  app.get('/v2/stocks/bars/latest', (context: ContextLike) => {
    const bars = symbolMap(symbolsFromQuery(context), (symbol) => barPayload(latestBar(symbol, alpaca.bars.all())));
    return context.json({ bars }, 200);
  });
  app.get('/v2/stocks/snapshots', (context: ContextLike) => context.json(symbolMap(symbolsFromQuery(context), (symbol) => snapshotPayload(symbol, alpaca.bars.all())), 200));

  app.get('/v2/stocks/:symbol/bars', (context: ContextLike) => {
    const symbol = context.req.param('symbol');
    const timeframe = context.req.query('timeframe') ?? '1Day';
    const items = alpaca.bars
      .all()
      .filter((bar: AlpacaBar) => bar.symbol === symbol && bar.timeframe === timeframe)
      .sort((a: AlpacaBar, b: AlpacaBar) => a.timestamp.localeCompare(b.timestamp));
    return context.json(barsResponse(items), 200);
  });

  app.get('/v2/stocks/bars', (context: ContextLike) => {
    const symbols = (context.req.query('symbols') ?? '').split(',').map((value: string) => value.trim()).filter(Boolean);
    const timeframe = context.req.query('timeframe') ?? '1Day';
    const response = Object.fromEntries(symbols.map((symbol: string) => {
      const items = alpaca.bars
        .all()
        .filter((bar: AlpacaBar) => bar.symbol === symbol && bar.timeframe === timeframe)
        .sort((a: AlpacaBar, b: AlpacaBar) => a.timestamp.localeCompare(b.timestamp));
      return [symbol, barsResponse(items).bars];
    }));
    return context.json({ bars: response, next_page_token: null }, 200);
  });

  app.get('/v1beta3/crypto/:feed/bars', (context: ContextLike) => {
    const bars = symbolMap(symbolsFromQuery(context, 'BTC/USD'), (symbol) => [barPayload(latestBar(symbol, alpaca.bars.all()))]);
    return context.json({ bars, next_page_token: null }, 200);
  });
  app.get('/v1beta3/crypto/:feed/quotes', (context: ContextLike) => {
    const quotes = symbolMap(symbolsFromQuery(context, 'BTC/USD'), (symbol) => [quotePayload(latestBar(symbol, alpaca.bars.all()))]);
    return context.json({ quotes, next_page_token: null }, 200);
  });
  app.get('/v1beta3/crypto/:feed/trades', (context: ContextLike) => {
    const trades = symbolMap(symbolsFromQuery(context, 'BTC/USD'), (symbol) => [tradePayload(symbol, latestBar(symbol, alpaca.bars.all()))]);
    return context.json({ trades, next_page_token: null }, 200);
  });
  app.get('/v1beta3/crypto/:feed/latest/trades', (context: ContextLike) => context.json({ trades: symbolMap(symbolsFromQuery(context, 'BTC/USD'), (symbol) => tradePayload(symbol, latestBar(symbol, alpaca.bars.all()))) }, 200));
  app.get('/v1beta3/crypto/:feed/latest/quotes', (context: ContextLike) => context.json({ quotes: symbolMap(symbolsFromQuery(context, 'BTC/USD'), (symbol) => quotePayload(latestBar(symbol, alpaca.bars.all()))) }, 200));
  app.get('/v1beta3/crypto/:feed/latest/bars', (context: ContextLike) => context.json({ bars: symbolMap(symbolsFromQuery(context, 'BTC/USD'), (symbol) => barPayload(latestBar(symbol, alpaca.bars.all()))) }, 200));
  app.get('/v1beta3/crypto/:feed/latest/orderbooks', (context: ContextLike) => context.json({ orderbooks: symbolMap(symbolsFromQuery(context, 'BTC/USD'), (symbol) => orderbookPayload(latestBar(symbol, alpaca.bars.all()))) }, 200));
  app.get('/v1beta3/crypto/:feed/snapshots', (context: ContextLike) => context.json({ snapshots: symbolMap(symbolsFromQuery(context, 'BTC/USD'), (symbol) => snapshotPayload(symbol, alpaca.bars.all())) }, 200));

  app.get('/v1beta1/options/bars', (context: ContextLike) => context.json({ bars: symbolMap(symbolsFromQuery(context, 'SPY260116C00600000'), (symbol) => [barPayload(latestBar('SPY', alpaca.bars.all()))]), next_page_token: null }, 200));
  app.get('/v1beta1/options/meta/exchanges', (context: ContextLike) => context.json({ A: 'NYSE American Options', C: 'Cboe Options' }, 200));
  app.get('/v1beta1/options/quotes/latest', (context: ContextLike) => context.json({ quotes: symbolMap(symbolsFromQuery(context, 'SPY260116C00600000'), () => quotePayload(latestBar('SPY', alpaca.bars.all()))) }, 200));
  app.get('/v1beta1/options/trades/latest', (context: ContextLike) => context.json({ trades: symbolMap(symbolsFromQuery(context, 'SPY260116C00600000'), (symbol) => tradePayload(symbol, latestBar('SPY', alpaca.bars.all()))) }, 200));
  app.get('/v1beta1/options/trades', (context: ContextLike) => context.json({ trades: symbolMap(symbolsFromQuery(context, 'SPY260116C00600000'), (symbol) => [tradePayload(symbol, latestBar('SPY', alpaca.bars.all()))]), next_page_token: null }, 200));
  app.get('/v1beta1/options/snapshots', (context: ContextLike) => context.json({ snapshots: symbolMap(symbolsFromQuery(context, 'SPY260116C00600000'), (symbol) => optionSnapshot(symbol, alpaca.bars.all())), next_page_token: null }, 200));
  app.get('/v1beta1/options/snapshots/:underlyingSymbol', (context: ContextLike) => {
    const symbol = `${context.req.param('underlyingSymbol')}260116C00600000`;
    return context.json({ snapshots: { [symbol]: optionSnapshot(symbol, alpaca.bars.all()) }, next_page_token: null }, 200);
  });
  app.get('/v1beta1/news', (context: ContextLike) => context.json({ news: [newsItem()], next_page_token: null }, 200));
  app.get('/v1beta1/corporate-actions', (context: ContextLike) => context.json({ corporate_actions: [corporateAction()], next_page_token: null }, 200));
  app.get('/v1beta1/screener/stocks/most-actives', (context: ContextLike) => context.json({ most_actives: [{ symbol: 'SPY', volume: 1000000, trade_count: 1000 }] }, 200));
  app.get('/v1beta1/screener/stocks/movers', (context: ContextLike) => context.json({ gainers: [{ symbol: 'SPY', change: 1, percent_change: 0.1 }], losers: [] }, 200));
  app.get('/v1beta1/screener/crypto/movers', (context: ContextLike) => context.json({ gainers: [{ symbol: 'BTC/USD', change: 1, percent_change: 0.1 }], losers: [] }, 200));

  app.get('/v1/accounts', (context: ContextLike) => context.json([alpaca.accounts.all()[0] ?? {}], 200));
  app.post('/v1/accounts', async (context: ContextLike) => context.json({ id: crypto.randomUUID(), status: 'ACTIVE', ...(await jsonBody(context)) }, 200));
  app.get('/v1/accounts/activities', (context: ContextLike) => context.json([], 200));
  app.get('/v1/accounts/positions', (context: ContextLike) => context.json(alpaca.positions.all(), 200));
  app.get('/v1/accounts/:accountId', (context: ContextLike) => context.json({ id: context.req.param('accountId'), status: 'ACTIVE' }, 200));
  app.patch?.('/v1/accounts/:accountId', async (context: ContextLike) => context.json({ id: context.req.param('accountId'), status: 'ACTIVE', ...(await jsonBody(context)) }, 200));
  app.delete('/v1/accounts/:accountId', (context: ContextLike) => context.json({}, 204));
  app.post('/v1/accounts/:accountId/actions/close', (context: ContextLike) => context.json({ id: context.req.param('accountId'), status: 'CLOSED' }, 200));
  app.get('/v1/accounts/:accountId/documents', (context: ContextLike) => context.json([], 200));
  app.post('/v1/accounts/:accountId/documents/upload', (context: ContextLike) => context.json({ id: crypto.randomUUID(), status: 'uploaded' }, 200));
  app.get('/v1/accounts/:accountId/documents/:documentId', (context: ContextLike) => context.json({ id: context.req.param('documentId'), type: 'document' }, 200));
  app.get('/v1/accounts/:accountId/documents/:documentId/download', (context: ContextLike) => context.json({ id: context.req.param('documentId'), content: '' }, 200));
  app.get('/v1/trading/accounts/:accountId/account', (context: ContextLike) => context.json(alpaca.accounts.all()[0] ?? {}, 200));
  app.get('/v1/trading/accounts/:accountId/account/configurations', (context: ContextLike) => context.json(accountConfiguration(), 200));
  app.patch?.('/v1/trading/accounts/:accountId/account/configurations', async (context: ContextLike) => context.json({ ...accountConfiguration(), ...(await jsonBody(context)) }, 200));
  app.get('/v1/trading/accounts/:accountId/positions', (context: ContextLike) => context.json(alpaca.positions.all(), 200));
  app.get('/v1/trading/accounts/:accountId/positions/:symbol', (context: ContextLike) => context.json(alpaca.positions.findOneBy('symbol', context.req.param('symbol')) ?? {}, 200));
  app.delete('/v1/trading/accounts/:accountId/positions', (context: ContextLike) => context.json([], 200));
  app.delete('/v1/trading/accounts/:accountId/positions/:symbol', (context: ContextLike) => context.json({ id: crypto.randomUUID(), symbol: context.req.param('symbol'), status: 'filled' }, 200));
  app.get('/v1/trading/accounts/:accountId/account/portfolio/history', (context: ContextLike) => context.json(portfolioHistory(), 200));
  app.get('/v1/clock', (context: ContextLike) => context.json(alpaca.clocks.all()[0] ?? {}, 200));
  app.get('/v1/calendar', (context: ContextLike) => context.json([calendarDay()], 200));
  app.get('/v1/assets', (context: ContextLike) => context.json(symbolsFromQuery(context).map(alpacaAsset), 200));
  app.get('/v1/assets/:symbol', (context: ContextLike) => context.json(alpacaAsset(context.req.param('symbol')), 200));
  app.get('/v1/trading/accounts/:accountId/watchlists', (context: ContextLike) => context.json([watchlist()], 200));
  app.get('/v1/trading/accounts/:accountId/watchlists/:watchlistId', (context: ContextLike) => context.json(watchlist(context.req.param('watchlistId')), 200));
  app.post('/v1/trading/accounts/:accountId/watchlists', async (context: ContextLike) => context.json(watchlist(crypto.randomUUID(), String((await jsonBody(context)).name ?? 'Default')), 200));
  app.put?.('/v1/trading/accounts/:accountId/watchlists/:watchlistId', async (context: ContextLike) => context.json(watchlist(context.req.param('watchlistId'), String((await jsonBody(context)).name ?? 'Default')), 200));
  app.post('/v1/trading/accounts/:accountId/watchlists/:watchlistId', (context: ContextLike) => context.json(watchlist(context.req.param('watchlistId')), 200));
  app.delete('/v1/trading/accounts/:accountId/watchlists/:watchlistId', (context: ContextLike) => context.json({}, 204));
  app.delete('/v1/trading/accounts/:accountId/watchlists/:watchlistId/:symbol', (context: ContextLike) => context.json({ ...watchlist(context.req.param('watchlistId')), assets: [] }, 200));
  app.post('/v1/trading/accounts/:accountId/orders', async (context: ContextLike) => context.json({ id: crypto.randomUUID(), order_id: crypto.randomUUID(), status: 'filled', ...(await jsonBody(context)) }, 200));
  app.get('/v1/trading/accounts/:accountId/orders', (context: ContextLike) => context.json(alpaca.orders.all(), 200));
  app.get('/v1/trading/accounts/:accountId/orders:by_client_order_id', (context: ContextLike) => context.json(alpaca.orders.all()[0] ?? {}, 200));
  app.get('/v1/trading/accounts/:accountId/orders/:orderId', (context: ContextLike) => context.json(alpaca.orders.findOneBy('order_id', context.req.param('orderId')) ?? {}, 200));
  app.patch?.('/v1/trading/accounts/:accountId/orders/:orderId', async (context: ContextLike) => context.json({ order_id: context.req.param('orderId'), status: 'replaced', ...(await jsonBody(context)) }, 200));
  app.delete('/v1/trading/accounts/:accountId/orders', (context: ContextLike) => context.json([], 200));
  app.delete('/v1/trading/accounts/:accountId/orders/:orderId', (context: ContextLike) => context.json({}, 204));
  app.post('/v1/accounts/:accountId/ach_relationships', async (context: ContextLike) => context.json({ id: crypto.randomUUID(), status: 'APPROVED', ...(await jsonBody(context)) }, 200));
  app.get('/v1/accounts/:accountId/ach_relationships', (context: ContextLike) => context.json([], 200));
  app.delete('/v1/accounts/:accountId/ach_relationships/:relationshipId', (context: ContextLike) => context.json({}, 204));
  app.post('/v1/accounts/:accountId/recipient_banks', async (context: ContextLike) => context.json({ id: crypto.randomUUID(), status: 'ACTIVE', ...(await jsonBody(context)) }, 200));
  app.get('/v1/accounts/:accountId/recipient_banks', (context: ContextLike) => context.json([], 200));
  app.delete('/v1/accounts/:accountId/recipient_banks/:bankId', (context: ContextLike) => context.json({}, 204));
  app.post('/v1/accounts/:accountId/transfers', async (context: ContextLike) => context.json({ id: crypto.randomUUID(), status: 'QUEUED', ...(await jsonBody(context)) }, 200));
  app.get('/v1/accounts/:accountId/transfers', (context: ContextLike) => context.json([], 200));
  app.delete('/v1/accounts/:accountId/transfers/:transferId', (context: ContextLike) => context.json({}, 204));
  app.post('/v1/journals', async (context: ContextLike) => context.json({ id: crypto.randomUUID(), status: 'executed', ...(await jsonBody(context)) }, 200));
  app.post('/v1/journals/batch', async (context: ContextLike) => context.json({ id: crypto.randomUUID(), status: 'executed', ...(await jsonBody(context)) }, 200));
  app.post('/v1/journals/reverse_batch', async (context: ContextLike) => context.json({ id: crypto.randomUUID(), status: 'executed', ...(await jsonBody(context)) }, 200));
  app.get('/v1/journals', (context: ContextLike) => context.json({ journals: [], next_page_token: null }, 200));
  app.get('/v1/journals/:journalId', (context: ContextLike) => context.json({ id: context.req.param('journalId'), status: 'executed' }, 200));
  app.delete('/v1/journals/:journalId', (context: ContextLike) => context.json({}, 204));
  app.get('/v1/corporate_actions/announcements', (context: ContextLike) => context.json([corporateAction()], 200));
  app.get('/v1/corporate_actions/announcements/:corporateActionId', (context: ContextLike) => context.json(corporateAction(context.req.param('corporateActionId')), 200));
  app.get('/v1/corporate-actions', (context: ContextLike) => context.json({ corporate_actions: [corporateAction()], next_page_token: null }, 200));
  app.get('/v1/events/accounts/status', () => sseResponse('account_status'));
  app.get('/v1/events/trades', () => sseResponse('trade'));
  app.get('/v1/events/journals/status', () => sseResponse('journal_status'));
  app.get('/v1/events/transfers/status', () => sseResponse('transfer_status'));
  app.get('/v1/events/nta', () => sseResponse('non_trading_activity'));
  app.post('/v1/rebalancing/portfolios', async (context: ContextLike) => context.json({ id: crypto.randomUUID(), status: 'active', ...(await jsonBody(context)) }, 200));
  app.get('/v1/rebalancing/portfolios', (context: ContextLike) => context.json([], 200));
  app.get('/v1/rebalancing/portfolios/:portfolioId', (context: ContextLike) => context.json({ id: context.req.param('portfolioId'), status: 'active' }, 200));
  app.patch?.('/v1/rebalancing/portfolios/:portfolioId', async (context: ContextLike) => context.json({ id: context.req.param('portfolioId'), status: 'active', ...(await jsonBody(context)) }, 200));
  app.delete('/v1/rebalancing/portfolios/:portfolioId', (context: ContextLike) => context.json({}, 204));
  app.post('/v1/rebalancing/subscriptions', async (context: ContextLike) => context.json({ id: crypto.randomUUID(), status: 'active', ...(await jsonBody(context)) }, 200));
  app.get('/v1/rebalancing/subscriptions', (context: ContextLike) => context.json({ subscriptions: [], next_page_token: null }, 200));
  app.get('/v1/rebalancing/subscriptions/:subscriptionId', (context: ContextLike) => context.json({ id: context.req.param('subscriptionId'), status: 'active' }, 200));
  app.delete('/v1/rebalancing/subscriptions/:subscriptionId', (context: ContextLike) => context.json({}, 204));
  app.post('/v1/rebalancing/runs', async (context: ContextLike) => context.json({ id: crypto.randomUUID(), status: 'queued', ...(await jsonBody(context)) }, 200));
  app.get('/v1/rebalancing/runs', (context: ContextLike) => context.json({ runs: [], next_page_token: null }, 200));
  app.get('/v1/rebalancing/runs/:runId', (context: ContextLike) => context.json({ id: context.req.param('runId'), status: 'queued' }, 200));
  app.delete('/v1/rebalancing/runs/:runId', (context: ContextLike) => context.json({}, 204));
  app.post('/v1/trading/accounts/:accountId/positions/:symbol/exercise', (context: ContextLike) => context.json({}, 204));
}
