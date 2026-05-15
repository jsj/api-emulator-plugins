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

type ContextLike = {
  req: RequestLike;
  json(payload: unknown, status?: number): Response;
  body?(payload: string | null, status?: number): Response;
};

type NextLike = () => Promise<void>;

type Handler = (context: ContextLike) => Promise<Response> | Response;

type AppLike = {
  use(path: string, handler: (context: ContextLike, next: NextLike) => Promise<Response | void>): void;
  get(path: string, handler: Handler): void;
  post(path: string, handler: Handler): void;
  put?(path: string, handler: Handler): void;
  patch?(path: string, handler: Handler): void;
  delete(path: string, handler: Handler): void;
};

type ServicePlugin = {
  name: string;
  register(app: AppLike, store: StoreLike): void;
  seed?(store: StoreLike, baseUrl: string): void;
};

type JsonObject = Record<string, unknown>;

interface KalshiSeries extends Entity {
  ticker: string;
  title: string;
  category: string;
  tags: string[];
  frequency: string;
  status: string;
  volume: number;
  product_metadata?: JsonObject;
}

interface KalshiEvent extends Entity {
  event_ticker: string;
  series_ticker: string;
  title: string;
  sub_title: string;
  category: string;
  status: string;
  mutually_exclusive: boolean;
  markets: string[];
  close_ts: number;
}

interface KalshiMarket extends Entity {
  ticker: string;
  event_ticker: string;
  series_ticker: string;
  title: string;
  subtitle: string;
  status: string;
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number;
  volume: number;
  open_interest: number;
  close_time: string;
  result?: "yes" | "no" | "";
}

interface KalshiOrder extends Entity {
  order_id: string;
  client_order_id: string;
  ticker: string;
  event_ticker: string;
  side: "yes" | "no" | "buy" | "sell" | "bid" | "ask";
  action: "buy" | "sell";
  type: string;
  status: string;
  count: number;
  fill_count: number;
  remaining_count: number;
  yes_price?: number;
  no_price?: number;
  price?: number;
  price_dollars?: string;
  created_time: string;
  updated_time: string;
  subaccount: number;
}

interface KalshiFill extends Entity {
  trade_id: string;
  order_id: string;
  ticker: string;
  side: string;
  action: string;
  count: number;
  yes_price: number;
  no_price: number;
  fee: number;
  created_time: string;
  subaccount: number;
}

interface KalshiPosition extends Entity {
  ticker: string;
  event_ticker: string;
  position: number;
  resting_orders_count: number;
  total_traded: number;
  market_exposure: number;
  fees_paid: number;
  realized_pnl: number;
  subaccount: number;
}

interface KalshiApiKey extends Entity {
  api_key_id: string;
  name: string;
  created_time: string;
}

interface KalshiQuote extends Entity {
  quote_id: string;
  rfq_id: string;
  market_ticker: string;
  event_ticker: string;
  status: string;
  created_time: string;
  payload: JsonObject;
}

interface KalshiRfq extends Entity {
  rfq_id: string;
  market_ticker: string;
  event_ticker: string;
  status: string;
  created_time: string;
  payload: JsonObject;
}

interface KalshiSeedData {
  balance?: JsonObject;
  series?: Array<Partial<KalshiSeries> & { ticker: string }>;
  events?: Array<Partial<KalshiEvent> & { event_ticker: string; series_ticker: string }>;
  markets?: Array<Partial<KalshiMarket> & { ticker: string; event_ticker: string; series_ticker: string }>;
  orders?: Array<Partial<KalshiOrder> & { ticker: string }>;
  fills?: Array<Partial<KalshiFill> & { ticker: string; order_id: string }>;
  positions?: Array<Partial<KalshiPosition> & { ticker: string }>;
}

export interface KalshiSeedConfig {
  kalshi?: KalshiSeedData;
}

export const contract = {
  provider: "kalshi",
  source: "Kalshi REST OpenAPI spec https://docs.kalshi.com/openapi.yaml and kalshi-typescript@3.15.0 generated client",
  docs: "https://docs.kalshi.com",
  scope: [
    "exchange",
    "series",
    "events",
    "markets",
    "orderbooks",
    "trades",
    "portfolio",
    "orders",
    "fills",
    "positions",
    "api-keys",
    "communications",
    "historical",
    "multivariate",
    "milestones",
    "live-data",
    "search",
    "fcm",
    "structured-targets",
    "incentive-programs",
  ],
  fidelity: "stateful-rest-emulator-with-openapi-route-coverage",
} as const;

function getKalshiStore(store: StoreLike) {
  return {
    series: store.collection<KalshiSeries>("kalshi.series", ["ticker", "category", "status"]),
    events: store.collection<KalshiEvent>("kalshi.events", ["event_ticker", "series_ticker", "status"]),
    markets: store.collection<KalshiMarket>("kalshi.markets", ["ticker", "event_ticker", "series_ticker", "status"]),
    orders: store.collection<KalshiOrder>("kalshi.orders", ["order_id", "client_order_id", "ticker", "event_ticker", "status"]),
    fills: store.collection<KalshiFill>("kalshi.fills", ["trade_id", "order_id", "ticker"]),
    positions: store.collection<KalshiPosition>("kalshi.positions", ["ticker", "event_ticker"]),
    apiKeys: store.collection<KalshiApiKey>("kalshi.api_keys", ["api_key_id"]),
    quotes: store.collection<KalshiQuote>("kalshi.quotes", ["quote_id", "rfq_id", "market_ticker", "status"]),
    rfqs: store.collection<KalshiRfq>("kalshi.rfqs", ["rfq_id", "market_ticker", "status"]),
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function unixSeconds(days = 0): number {
  return Math.floor((Date.now() + days * 24 * 60 * 60 * 1000) / 1000);
}

function dollars(cents: number): string {
  return (cents / 100).toFixed(4);
}

function asInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function splitCsv(value: string | undefined): string[] {
  return (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

function emptyCursorResponse<T>(key: string, value: T[]): JsonObject {
  return { [key]: value, cursor: "" };
}

async function jsonBody(context: ContextLike): Promise<JsonObject> {
  try {
    return await context.req.json();
  } catch {
    return {};
  }
}

function requireAuth(context: ContextLike): boolean {
  return Boolean(
    context.req.header("KALSHI-ACCESS-KEY") ||
    context.req.header("KALSHI-ACCESS-SIGNATURE") ||
    context.req.header("Authorization"),
  );
}

function notFound(context: ContextLike, message: string): Response {
  return context.json({ error: { code: "not_found", message } }, 404);
}

function noContent(context: ContextLike): Response {
  return context.body ? context.body(null, 204) : context.json({}, 204);
}

export function seedDefaults(store: StoreLike): void {
  const kalshi = getKalshiStore(store);

  if (!kalshi.series.all().length) {
    kalshi.series.insert({
      ticker: "KXNBA",
      title: "NBA",
      category: "Sports",
      tags: ["sports", "basketball"],
      frequency: "daily",
      status: "active",
      volume: 125000,
      product_metadata: { league: "NBA" },
    });
  }

  if (!kalshi.events.all().length) {
    kalshi.events.insert({
      event_ticker: "KXNBA-26CHAMPS",
      series_ticker: "KXNBA",
      title: "2026 NBA champion",
      sub_title: "Which team will win the championship?",
      category: "Sports",
      status: "open",
      mutually_exclusive: true,
      markets: ["KXNBA-26CHAMPS-LAL"],
      close_ts: unixSeconds(30),
    });
  }

  if (!kalshi.markets.all().length) {
    kalshi.markets.insert({
      ticker: "KXNBA-26CHAMPS-LAL",
      event_ticker: "KXNBA-26CHAMPS",
      series_ticker: "KXNBA",
      title: "Lakers win 2026 NBA championship",
      subtitle: "Los Angeles Lakers",
      status: "open",
      yes_bid: 37,
      yes_ask: 39,
      no_bid: 61,
      no_ask: 63,
      last_price: 38,
      volume: 5000,
      open_interest: 1200,
      close_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      result: "",
    });
  }

  if (!kalshi.positions.all().length) {
    kalshi.positions.insert({
      ticker: "KXNBA-26CHAMPS-LAL",
      event_ticker: "KXNBA-26CHAMPS",
      position: 10,
      resting_orders_count: 0,
      total_traded: 10,
      market_exposure: 380,
      fees_paid: 0,
      realized_pnl: 0,
      subaccount: 0,
    });
  }

  if (!kalshi.apiKeys.all().length) {
    kalshi.apiKeys.insert({
      api_key_id: "kalshi-emulator-key",
      name: "Emulator key",
      created_time: nowIso(),
    });
  }
}

export function seedFromConfig(store: StoreLike, _baseUrl: string, config: KalshiSeedConfig): void {
  seedDefaults(store);
  const seed = config.kalshi;
  if (!seed) return;

  const kalshi = getKalshiStore(store);
  if (seed.series) {
    kalshi.series.clear();
    for (const series of seed.series) {
      kalshi.series.insert({
        title: series.ticker,
        category: "General",
        tags: [],
        frequency: "one_off",
        status: "active",
        volume: 0,
        ...series,
      });
    }
  }
  if (seed.events) {
    kalshi.events.clear();
    for (const event of seed.events) {
      kalshi.events.insert({
        title: event.event_ticker,
        sub_title: "",
        category: "General",
        status: "open",
        mutually_exclusive: true,
        markets: [],
        close_ts: unixSeconds(7),
        ...event,
      });
    }
  }
  if (seed.markets) {
    kalshi.markets.clear();
    for (const market of seed.markets) {
      kalshi.markets.insert({
        title: market.ticker,
        subtitle: "",
        status: "open",
        yes_bid: 49,
        yes_ask: 51,
        no_bid: 49,
        no_ask: 51,
        last_price: 50,
        volume: 0,
        open_interest: 0,
        close_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        result: "",
        ...market,
      });
    }
  }
  if (seed.positions) {
    kalshi.positions.clear();
    for (const position of seed.positions) {
      const market = kalshi.markets.findOneBy("ticker", position.ticker);
      kalshi.positions.insert({
        event_ticker: market?.event_ticker ?? "",
        position: 0,
        resting_orders_count: 0,
        total_traded: 0,
        market_exposure: 0,
        fees_paid: 0,
        realized_pnl: 0,
        subaccount: 0,
        ...position,
      });
    }
  }
  if (seed.orders) {
    kalshi.orders.clear();
    for (const order of seed.orders) createOrderRecord(kalshi, order);
  }
  if (seed.fills) {
    kalshi.fills.clear();
    for (const fill of seed.fills) createFillRecord(kalshi, fill);
  }
}

function marketPayload(market: KalshiMarket): JsonObject {
  return {
    ticker: market.ticker,
    event_ticker: market.event_ticker,
    market_type: "binary",
    title: market.title,
    subtitle: market.subtitle,
    yes_sub_title: "Yes",
    no_sub_title: "No",
    status: market.status,
    yes_bid: market.yes_bid,
    yes_ask: market.yes_ask,
    no_bid: market.no_bid,
    no_ask: market.no_ask,
    last_price: market.last_price,
    volume: market.volume,
    open_interest: market.open_interest,
    close_time: market.close_time,
    created_time: market.created_at,
    updated_time: market.updated_at,
    result: market.result ?? "",
    can_close_early: true,
    notional_value: 100,
    yes_bid_dollars: dollars(market.yes_bid),
    yes_ask_dollars: dollars(market.yes_ask),
    no_bid_dollars: dollars(market.no_bid),
    no_ask_dollars: dollars(market.no_ask),
    last_price_dollars: dollars(market.last_price),
    price_level_structure: "linear_cent",
    price_ranges: [{ start: 1, end: 99, step: 1 }],
  };
}

function seriesPayload(series: KalshiSeries): JsonObject {
  return {
    ticker: series.ticker,
    title: series.title,
    category: series.category,
    tags: series.tags,
    frequency: series.frequency,
    status: series.status,
    volume: series.volume,
    product_metadata: series.product_metadata ?? {},
  };
}

function eventPayload(event: KalshiEvent, markets: KalshiMarket[], nested = false): JsonObject {
  const eventMarkets = markets.filter((market) => market.event_ticker === event.event_ticker);
  return {
    event_ticker: event.event_ticker,
    ticker: event.event_ticker,
    series_ticker: event.series_ticker,
    title: event.title,
    sub_title: event.sub_title,
    category: event.category,
    status: event.status,
    mutually_exclusive: event.mutually_exclusive,
    close_ts: event.close_ts,
    markets: nested ? eventMarkets.map(marketPayload) : eventMarkets.map((market) => market.ticker),
  };
}

function orderPayload(order: KalshiOrder): JsonObject {
  return {
    order_id: order.order_id,
    client_order_id: order.client_order_id,
    ticker: order.ticker,
    event_ticker: order.event_ticker,
    side: order.side,
    action: order.action,
    type: order.type,
    status: order.status,
    count: order.count,
    fill_count: order.fill_count,
    remaining_count: order.remaining_count,
    yes_price: order.yes_price,
    no_price: order.no_price,
    price: order.price,
    price_dollars: order.price_dollars ?? dollars(order.price ?? order.yes_price ?? 50),
    created_time: order.created_time,
    updated_time: order.updated_time,
    subaccount: order.subaccount,
  };
}

function fillPayload(fill: KalshiFill): JsonObject {
  return {
    trade_id: fill.trade_id,
    order_id: fill.order_id,
    ticker: fill.ticker,
    side: fill.side,
    action: fill.action,
    count: fill.count,
    yes_price: fill.yes_price,
    no_price: fill.no_price,
    fee: fill.fee,
    created_time: fill.created_time,
    subaccount: fill.subaccount,
  };
}

function positionPayload(position: KalshiPosition): JsonObject {
  return {
    ticker: position.ticker,
    event_ticker: position.event_ticker,
    position: position.position,
    resting_orders_count: position.resting_orders_count,
    total_traded: position.total_traded,
    market_exposure: position.market_exposure,
    fees_paid: position.fees_paid,
    realized_pnl: position.realized_pnl,
    subaccount: position.subaccount,
  };
}

function createOrderRecord(
  kalshi: ReturnType<typeof getKalshiStore>,
  body: Partial<KalshiOrder> & { ticker?: string },
): KalshiOrder {
  const ticker = String(body.ticker ?? body["market_ticker" as keyof KalshiOrder] ?? "KXNBA-26CHAMPS-LAL");
  const market = kalshi.markets.findOneBy("ticker", ticker);
  const count = Number(body.count ?? 1);
  const fillCount = Number(body.fill_count ?? 0);
  const order = kalshi.orders.insert({
    order_id: body.order_id ?? crypto.randomUUID(),
    client_order_id: body.client_order_id ?? crypto.randomUUID(),
    ticker,
    event_ticker: body.event_ticker ?? market?.event_ticker ?? "",
    side: body.side ?? "yes",
    action: body.action ?? "buy",
    type: body.type ?? "limit",
    status: body.status ?? "resting",
    count,
    fill_count: fillCount,
    remaining_count: body.remaining_count ?? Math.max(count - fillCount, 0),
    yes_price: body.yes_price ?? body.price ?? market?.yes_ask ?? 50,
    no_price: body.no_price ?? (body.price ? 100 - body.price : market?.no_ask ?? 50),
    price: body.price ?? body.yes_price ?? market?.yes_ask ?? 50,
    price_dollars: body.price_dollars ?? dollars(Number(body.price ?? body.yes_price ?? market?.yes_ask ?? 50)),
    created_time: body.created_time ?? nowIso(),
    updated_time: body.updated_time ?? nowIso(),
    subaccount: body.subaccount ?? 0,
  });
  return order;
}

function createFillRecord(
  kalshi: ReturnType<typeof getKalshiStore>,
  body: Partial<KalshiFill> & { ticker: string; order_id: string },
): KalshiFill {
  return kalshi.fills.insert({
    trade_id: body.trade_id ?? crypto.randomUUID(),
    order_id: body.order_id,
    ticker: body.ticker,
    side: body.side ?? "yes",
    action: body.action ?? "buy",
    count: body.count ?? 1,
    yes_price: body.yes_price ?? 50,
    no_price: body.no_price ?? 50,
    fee: body.fee ?? 0,
    created_time: body.created_time ?? nowIso(),
    subaccount: body.subaccount ?? 0,
  });
}

function orderbookPayload(market: KalshiMarket, depth = 0): JsonObject {
  const yes = [
    [market.yes_bid, 100, 2],
    [Math.max(market.yes_bid - 1, 1), 200, 1],
  ];
  const no = [
    [market.no_bid, 100, 2],
    [Math.max(market.no_bid - 1, 1), 200, 1],
  ];
  const take = (levels: number[][]) => (depth > 0 ? levels.slice(0, depth) : levels);
  return { orderbook: { yes: take(yes), no: take(no) } };
}

function candlesticksFor(market: KalshiMarket): JsonObject[] {
  const ts = unixSeconds(-1);
  return [
    { end_period_ts: ts - 86400, price: market.last_price - 1, open: market.last_price - 2, high: market.last_price, low: market.last_price - 3, close: market.last_price - 1, volume: 100 },
    { end_period_ts: ts, price: market.last_price, open: market.last_price - 1, high: market.last_price + 2, low: market.last_price - 2, close: market.last_price, volume: 250 },
  ];
}

function registerCoreRoutes(app: AppLike, kalshi: ReturnType<typeof getKalshiStore>) {
  app.get("/exchange/status", (context) => context.json({ exchange_active: true, trading_active: true }, 200));
  app.get("/exchange/announcements", (context) => context.json({ announcements: [] }, 200));
  app.get("/exchange/schedule", (context) => context.json({ schedule: { standard_hours: [{ open_time: "00:00", close_time: "23:59" }] } }, 200));
  app.get("/exchange/user_data_timestamp", (context) => context.json({ timestamp: unixSeconds() }, 200));
  app.get("/series/fee_changes", (context) => context.json({ fee_changes: [] }, 200));

  app.get("/series", (context) => {
    const category = context.req.query("category");
    const series = kalshi.series.all().filter((item) => !category || item.category.toLowerCase() === category.toLowerCase());
    return context.json({ series: series.map(seriesPayload) }, 200);
  });
  app.get("/series/:series_ticker", (context) => {
    const series = kalshi.series.findOneBy("ticker", context.req.param("series_ticker"));
    return series ? context.json({ series: seriesPayload(series) }, 200) : notFound(context, "series not found");
  });

  app.get("/events", (context) => {
    const withNested = context.req.query("with_nested_markets") === "true";
    const seriesTicker = context.req.query("series_ticker");
    const events = kalshi.events.all().filter((event) => !seriesTicker || event.series_ticker === seriesTicker);
    return context.json(emptyCursorResponse("events", events.map((event) => eventPayload(event, kalshi.markets.all(), withNested))), 200);
  });
  app.get("/events/multivariate", (context) => context.json(emptyCursorResponse("events", []), 200));
  app.get("/events/:event_ticker", (context) => {
    const event = kalshi.events.findOneBy("event_ticker", context.req.param("event_ticker"));
    if (!event) return notFound(context, "event not found");
    const nested = context.req.query("with_nested_markets") === "true";
    return context.json({ event: eventPayload(event, kalshi.markets.all(), nested), markets: kalshi.markets.all().filter((market) => market.event_ticker === event.event_ticker).map(marketPayload) }, 200);
  });
  app.get("/events/:event_ticker/metadata", (context) => {
    const event = kalshi.events.findOneBy("event_ticker", context.req.param("event_ticker"));
    return event ? context.json({ metadata: { category: event.category, title: event.title } }, 200) : notFound(context, "event not found");
  });

  app.get("/markets", (context) => {
    const tickers = splitCsv(context.req.query("tickers"));
    const eventTicker = context.req.query("event_ticker");
    const seriesTicker = context.req.query("series_ticker");
    const status = context.req.query("status");
    let markets = kalshi.markets.all();
    if (tickers.length) markets = markets.filter((market) => tickers.includes(market.ticker));
    if (eventTicker) markets = markets.filter((market) => market.event_ticker === eventTicker);
    if (seriesTicker) markets = markets.filter((market) => market.series_ticker === seriesTicker);
    if (status) markets = markets.filter((market) => market.status === status);
    return context.json(emptyCursorResponse("markets", markets.map(marketPayload)), 200);
  });
  app.get("/markets/:ticker", (context) => {
    const market = kalshi.markets.findOneBy("ticker", context.req.param("ticker"));
    return market ? context.json({ market: marketPayload(market) }, 200) : notFound(context, "market not found");
  });
  app.get("/markets/:ticker/orderbook", (context) => {
    const market = kalshi.markets.findOneBy("ticker", context.req.param("ticker"));
    return market ? context.json(orderbookPayload(market, asInt(context.req.query("depth"), 0)), 200) : notFound(context, "market not found");
  });
  app.get("/markets/orderbooks", (context) => {
    const tickers = splitCsv(context.req.query("tickers"));
    return context.json({ orderbooks: kalshi.markets.all().filter((market) => !tickers.length || tickers.includes(market.ticker)).map((market) => ({ ticker: market.ticker, ...orderbookPayload(market) })) }, 200);
  });
  app.get("/markets/trades", (context) => context.json(emptyCursorResponse("trades", kalshi.markets.all().map((market) => ({
    ticker: market.ticker,
    trade_id: `${market.ticker}-trade-1`,
    yes_price: market.last_price,
    no_price: 100 - market.last_price,
    count: 1,
    created_time: nowIso(),
  }))), 200));
  app.get("/series/:series_ticker/markets/:ticker/candlesticks", (context) => {
    const market = kalshi.markets.findOneBy("ticker", context.req.param("ticker"));
    return market ? context.json({ candlesticks: candlesticksFor(market) }, 200) : notFound(context, "market not found");
  });
  app.get("/markets/candlesticks", (context) => {
    const tickers = splitCsv(context.req.query("market_tickers"));
    const candlesticks = kalshi.markets.all()
      .filter((market) => !tickers.length || tickers.includes(market.ticker))
      .map((market) => ({ ticker: market.ticker, candlesticks: candlesticksFor(market) }));
    return context.json({ market_candlesticks: candlesticks }, 200);
  });
  app.get("/series/:series_ticker/events/:ticker/candlesticks", (context) => {
    const eventTicker = context.req.param("ticker");
    const market = kalshi.markets.all().find((item) => item.event_ticker === eventTicker) ?? kalshi.markets.all()[0];
    return context.json({ candlesticks: market ? candlesticksFor(market) : [] }, 200);
  });
  app.get("/series/:series_ticker/events/:ticker/forecast_percentile_history", (context) => context.json({ percentiles: [] }, 200));
}

function registerPortfolioRoutes(app: AppLike, kalshi: ReturnType<typeof getKalshiStore>) {
  app.get("/portfolio/balance", (context) => context.json({
    balance: 1000000,
    buying_power: 1000000,
    portfolio_value: 1003800,
    balance_dollars: "10000.0000",
    buying_power_dollars: "10000.0000",
  }, 200));
  app.get("/portfolio/positions", (context) => context.json(emptyCursorResponse("positions", kalshi.positions.all().map(positionPayload)), 200));
  app.get("/portfolio/fills", (context) => context.json(emptyCursorResponse("fills", kalshi.fills.all().map(fillPayload)), 200));
  app.get("/portfolio/settlements", (context) => context.json(emptyCursorResponse("settlements", []), 200));
  app.get("/portfolio/deposits", (context) => context.json(emptyCursorResponse("deposits", []), 200));
  app.get("/portfolio/withdrawals", (context) => context.json(emptyCursorResponse("withdrawals", []), 200));
  app.get("/portfolio/summary/total_resting_order_value", (context) => {
    const total = kalshi.orders.all().filter((order) => order.status === "resting").reduce((sum, order) => sum + order.remaining_count * (order.price ?? 50), 0);
    return context.json({ total_resting_order_value: total, total_resting_order_value_dollars: dollars(total) }, 200);
  });
  app.get("/portfolio/subaccounts/balances", (context) => context.json({ subaccounts: [{ subaccount: 0, balance: 1000000, buying_power: 1000000 }] }, 200));
  app.get("/portfolio/subaccounts/netting", (context) => context.json({ subaccounts: [{ subaccount: 0, netting_enabled: true }] }, 200));
  app.put?.("/portfolio/subaccounts/netting", (context) => noContent(context));
  app.post("/portfolio/subaccounts", (context) => context.json({ subaccount: 1 }, 201));
  app.post("/portfolio/subaccounts/transfer", async (context) => context.json({ transfer: { id: crypto.randomUUID(), status: "applied", ...(await jsonBody(context)) } }, 200));
  app.get("/portfolio/subaccounts/transfers", (context) => context.json(emptyCursorResponse("transfers", []), 200));
}

function registerOrderRoutes(app: AppLike, kalshi: ReturnType<typeof getKalshiStore>) {
  const create = async (context: ContextLike) => {
    const body = await jsonBody(context);
    const order = createOrderRecord(kalshi, body as Partial<KalshiOrder>);
    return context.json({ order: orderPayload(order) }, 201);
  };
  const list = (context: ContextLike) => {
    const status = context.req.query("status");
    const ticker = context.req.query("ticker");
    const eventTicker = context.req.query("event_ticker");
    let orders = kalshi.orders.all();
    if (status) orders = orders.filter((order) => order.status === status);
    if (ticker) orders = orders.filter((order) => order.ticker === ticker);
    if (eventTicker) orders = orders.filter((order) => order.event_ticker === eventTicker);
    return context.json(emptyCursorResponse("orders", orders.map(orderPayload)), 200);
  };
  const get = (context: ContextLike) => {
    const order = kalshi.orders.findOneBy("order_id", context.req.param("order_id"));
    return order ? context.json({ order: orderPayload(order) }, 200) : notFound(context, "order not found");
  };
  const cancel = (context: ContextLike) => {
    const order = kalshi.orders.findOneBy("order_id", context.req.param("order_id"));
    if (!order) return notFound(context, "order not found");
    const updated = kalshi.orders.update(order.id, { status: "canceled", remaining_count: 0, updated_time: nowIso() }) ?? order;
    return context.json({ order: orderPayload(updated), order_id: updated.order_id, client_order_id: updated.client_order_id, reduced_by: order.remaining_count }, 200);
  };
  const mutate = async (context: ContextLike) => {
    const order = kalshi.orders.findOneBy("order_id", context.req.param("order_id"));
    if (!order) return notFound(context, "order not found");
    const body = await jsonBody(context);
    const remaining = Number(body.reduce_to ?? body.remaining_count ?? body.count ?? order.remaining_count);
    const updated = kalshi.orders.update(order.id, {
      count: Number(body.count ?? order.count),
      remaining_count: remaining,
      yes_price: Number(body.yes_price ?? order.yes_price),
      no_price: Number(body.no_price ?? order.no_price),
      price: Number(body.price ?? order.price),
      updated_time: nowIso(),
    }) ?? order;
    return context.json({ order: orderPayload(updated), order_id: updated.order_id, client_order_id: updated.client_order_id, reduced_by: Math.max(order.remaining_count - remaining, 0) }, 200);
  };
  const batchCreate = async (context: ContextLike) => {
    const body = await jsonBody(context);
    const inputs = Array.isArray(body.orders) ? body.orders : [];
    const orders = inputs.map((input) => createOrderRecord(kalshi, input as Partial<KalshiOrder>));
    return context.json({ orders: orders.map((order) => ({ order: orderPayload(order), status: "success" })) }, 201);
  };
  const batchCancel = async (context: ContextLike) => {
    const body = await jsonBody(context);
    const ids = Array.isArray(body.ids) ? body.ids : Array.isArray(body.order_ids) ? body.order_ids : [];
    const orders = ids.map((id) => kalshi.orders.findOneBy("order_id", String(id))).filter((order): order is KalshiOrder => Boolean(order));
    for (const order of orders) kalshi.orders.update(order.id, { status: "canceled", remaining_count: 0, updated_time: nowIso() });
    return context.json({ orders: orders.map((order) => ({ order_id: order.order_id, status: "success" })) }, 200);
  };

  app.get("/portfolio/orders", list);
  app.post("/portfolio/orders", create);
  app.get("/portfolio/orders/:order_id", get);
  app.delete("/portfolio/orders/:order_id", cancel);
  app.post("/portfolio/orders/:order_id/amend", mutate);
  app.post("/portfolio/orders/:order_id/decrease", mutate);
  app.get("/portfolio/orders/:order_id/queue_position", (context) => context.json({ order_id: context.req.param("order_id"), queue_position: 0 }, 200));
  app.get("/portfolio/orders/queue_positions", (context) => context.json({ queue_positions: kalshi.orders.all().map((order) => ({ order_id: order.order_id, queue_position: 0 })) }, 200));
  app.post("/portfolio/orders/batched", batchCreate);
  app.delete("/portfolio/orders/batched", batchCancel);

  app.get("/portfolio/events/orders", list);
  app.post("/portfolio/events/orders", create);
  app.get("/portfolio/events/orders/:order_id", get);
  app.delete("/portfolio/events/orders/:order_id", cancel);
  app.post("/portfolio/events/orders/:order_id/amend", mutate);
  app.post("/portfolio/events/orders/:order_id/decrease", mutate);
  app.post("/portfolio/events/orders/batched", batchCreate);
  app.delete("/portfolio/events/orders/batched", batchCancel);
}

function registerSecondaryRoutes(app: AppLike, kalshi: ReturnType<typeof getKalshiStore>) {
  app.get("/api_keys", (context) => context.json({ api_keys: kalshi.apiKeys.all().map((key) => ({ api_key_id: key.api_key_id, name: key.name, created_time: key.created_time })) }, 200));
  app.post("/api_keys", async (context) => {
    const body = await jsonBody(context);
    const key = kalshi.apiKeys.insert({ api_key_id: `key-${crypto.randomUUID()}`, name: String(body.name ?? "API key"), created_time: nowIso() });
    return context.json({ api_key: key, private_key: "emulator-key-material" }, 201);
  });
  app.post("/api_keys/generate", async (context) => {
    const body = await jsonBody(context);
    const key = kalshi.apiKeys.insert({ api_key_id: `key-${crypto.randomUUID()}`, name: String(body.name ?? "Generated key"), created_time: nowIso() });
    return context.json({ api_key_id: key.api_key_id, private_key: "emulator-key-material" }, 201);
  });
  app.delete("/api_keys/:api_key", (context) => noContent(context));

  app.get("/account/api_limits", (context) => context.json({ api_limits: { read: 1000, write: 100 } }, 200));
  app.get("/account/limits", (context) => context.json({ limits: { read: 1000, write: 100 } }, 200));
  app.get("/account/endpoint_costs", (context) => context.json({ endpoint_costs: [] }, 200));
  app.get("/search/series_tags", (context) => context.json({ tags: ["sports", "politics", "economics"] }, 200));
  app.get("/search/sports_filters", (context) => context.json({ filters: [] }, 200));
  app.get("/search/tags_by_categories", (context) => context.json({ tags: ["sports", "politics", "economics"] }, 200));
  app.get("/search/filters_by_sport", (context) => context.json({ filters: [] }, 200));
  app.get("/incentive_programs", (context) => context.json(emptyCursorResponse("incentive_programs", []), 200));

  app.get("/historical/cutoff", (context) => context.json({ cutoff_ts: unixSeconds(-180) }, 200));
  app.get("/historical/markets", (context) => context.json(emptyCursorResponse("markets", kalshi.markets.all().map(marketPayload)), 200));
  app.get("/historical/markets/:ticker", (context) => {
    const market = kalshi.markets.findOneBy("ticker", context.req.param("ticker"));
    return market ? context.json({ market: marketPayload(market) }, 200) : notFound(context, "market not found");
  });
  app.get("/historical/markets/:ticker/candlesticks", (context) => {
    const market = kalshi.markets.findOneBy("ticker", context.req.param("ticker"));
    return context.json({ candlesticks: market ? candlesticksFor(market) : [] }, 200);
  });
  app.get("/historical/orders", (context) => context.json(emptyCursorResponse("orders", kalshi.orders.all().map(orderPayload)), 200));
  app.get("/historical/fills", (context) => context.json(emptyCursorResponse("fills", kalshi.fills.all().map(fillPayload)), 200));
  app.get("/historical/trades", (context) => context.json(emptyCursorResponse("trades", []), 200));

  app.get("/milestones", (context) => context.json(emptyCursorResponse("milestones", []), 200));
  app.get("/milestones/:milestone_id", (context) => context.json({ milestone: { milestone_id: context.req.param("milestone_id"), status: "active" } }, 200));
  app.get("/live_data/:type/:milestone_id", (context) => context.json({ live_data: { type: context.req.param("type"), milestone_id: context.req.param("milestone_id") } }, 200));
  app.get("/live_data/:milestone_id", (context) => context.json({ live_data: { milestone_id: context.req.param("milestone_id") } }, 200));
  app.get("/live_data/:type/milestone/:milestone_id", (context) => context.json({ live_data: { type: context.req.param("type"), milestone_id: context.req.param("milestone_id") } }, 200));
  app.get("/live_data/milestone/:milestone_id", (context) => context.json({ live_data: { milestone_id: context.req.param("milestone_id") } }, 200));
  app.get("/live_data/milestone/:milestone_id/game_stats", (context) => context.json({ game_stats: { milestone_id: context.req.param("milestone_id") } }, 200));
  app.get("/live_data/batch", (context) => context.json({ live_datas: [] }, 200));
  app.get("/live_datas", (context) => context.json({ live_datas: [] }, 200));
  app.get("/game_stats/:milestone_id", (context) => context.json({ game_stats: { milestone_id: context.req.param("milestone_id") } }, 200));

  app.get("/multivariate_event_collections", (context) => context.json(emptyCursorResponse("collections", []), 200));
  app.get("/multivariate_event_collections/:collection_ticker", (context) => context.json({ collection: { collection_ticker: context.req.param("collection_ticker"), status: "open" } }, 200));
  app.get("/multivariate_event_collections/:collection_ticker/lookup_history", (context) => context.json({ lookup_history: [] }, 200));
  app.post("/multivariate_event_collections/:collection_ticker/lookup", (context) => context.json({ tickers: [] }, 200));
  app.post("/multivariate_event_collections/:collection_ticker/markets", async (context) => context.json({ market: await jsonBody(context) }, 201));

  app.get("/portfolio/order_groups", (context) => context.json({ order_groups: [] }, 200));
  app.post("/portfolio/order_groups", async (context) => context.json({ order_group: { order_group_id: crypto.randomUUID(), ...(await jsonBody(context)) } }, 201));
  app.post("/portfolio/order_groups/create", async (context) => context.json({ order_group: { order_group_id: crypto.randomUUID(), ...(await jsonBody(context)) } }, 201));
  app.get("/portfolio/order_groups/:order_group_id", (context) => context.json({ order_group: { order_group_id: context.req.param("order_group_id") } }, 200));
  app.delete("/portfolio/order_groups/:order_group_id", (context) => noContent(context));
  app.post("/portfolio/order_groups/:order_group_id/reset", (context) => context.json({ order_group_id: context.req.param("order_group_id"), status: "reset" }, 200));
  app.post("/portfolio/order_groups/:order_group_id/trigger", (context) => context.json({ order_group_id: context.req.param("order_group_id"), status: "triggered" }, 200));
  app.put?.("/portfolio/order_groups/:order_group_id/limit", (context) => context.json({ order_group_id: context.req.param("order_group_id"), status: "updated" }, 200));

  app.get("/communications/id", (context) => context.json({ communications_id: "kalshi-emulator-user" }, 200));
  app.get("/communications/rfqs", (context) => context.json(emptyCursorResponse("rfqs", kalshi.rfqs.all()), 200));
  app.post("/communications/rfqs", async (context) => {
    const payload = await jsonBody(context);
    const rfq = kalshi.rfqs.insert({ rfq_id: crypto.randomUUID(), market_ticker: String(payload.market_ticker ?? ""), event_ticker: String(payload.event_ticker ?? ""), status: "open", created_time: nowIso(), payload });
    return context.json({ rfq }, 201);
  });
  app.get("/communications/rfqs/:rfq_id", (context) => context.json({ rfq: kalshi.rfqs.findOneBy("rfq_id", context.req.param("rfq_id")) ?? null }, 200));
  app.delete("/communications/rfqs/:rfq_id", (context) => noContent(context));
  app.get("/communications/quotes", (context) => context.json(emptyCursorResponse("quotes", kalshi.quotes.all()), 200));
  app.post("/communications/quotes", async (context) => {
    const payload = await jsonBody(context);
    const quote = kalshi.quotes.insert({ quote_id: crypto.randomUUID(), rfq_id: String(payload.rfq_id ?? ""), market_ticker: String(payload.market_ticker ?? ""), event_ticker: String(payload.event_ticker ?? ""), status: "open", created_time: nowIso(), payload });
    return context.json({ quote }, 201);
  });
  app.get("/communications/quotes/:quote_id", (context) => context.json({ quote: kalshi.quotes.findOneBy("quote_id", context.req.param("quote_id")) ?? null }, 200));
  app.delete("/communications/quotes/:quote_id", (context) => noContent(context));
  app.post("/communications/quotes/:quote_id/accept", (context) => noContent(context));
  app.post("/communications/quotes/:quote_id/confirm", (context) => noContent(context));

  app.get("/fcm/orders/:subtrader_id", (context) => context.json(emptyCursorResponse("orders", kalshi.orders.all().map(orderPayload)), 200));
  app.get("/fcm/positions/:subtrader_id", (context) => context.json(emptyCursorResponse("positions", kalshi.positions.all().map(positionPayload)), 200));
  app.get("/structured_targets", (context) => context.json(emptyCursorResponse("structured_targets", []), 200));
  app.get("/structured_targets/:structured_target_id", (context) => context.json({ structured_target: { id: context.req.param("structured_target_id") } }, 200));
}

export function registerRoutes(app: AppLike, store: StoreLike): void {
  const kalshi = getKalshiStore(store);

  app.use("/trade-api/v2/*", async (context, next) => {
    if (!requireAuth(context)) return context.json({ error: { code: "unauthorized", message: "missing Kalshi API headers" } }, 401);
    await next();
  });

  registerCoreRoutes(app, kalshi);
  registerPortfolioRoutes(app, kalshi);
  registerOrderRoutes(app, kalshi);
  registerSecondaryRoutes(app, kalshi);
}
