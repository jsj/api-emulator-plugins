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

function seedDefaults(store: StoreLike): void {
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

export const plugin: ServicePlugin = {
  name: 'alpaca',
  register(app: AppLike, store: StoreLike) {
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
    app.delete('/v2/orders', (context: ContextLike) => {
      alpaca.orders.clear();
      return context.json([], 200);
    });
    app.post('/v2/orders', async (context: ContextLike) => {
      const body = await context.req.json();
      const order = alpaca.orders.insert({
        order_id: crypto.randomUUID(),
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
  },
  seed(store: StoreLike) {
    seedDefaults(store);
  },
};

export const label = 'Alpaca trading + market data emulator';
export const endpoints = '/v2/account, /v2/clock, /v2/positions, /v2/orders, /v2/stocks/:symbol/snapshot, /v2/stocks/:symbol/bars, /v2/stocks/bars';
export const initConfig = {
  alpaca: {
    account: {
      buying_power: '100000',
      cash: '100000',
      portfolio_value: '100000',
    },
    positions: [{ symbol: 'SPY', qty: '10', current_price: '589.5', market_value: '5895' }],
    bars: {
      SPY: [
        { timestamp: '2025-01-02T14:30:00Z', open: 585, high: 587, low: 584.5, close: 586.5, volume: 1000000 },
      ],
    },
  },
};
