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
  body?(payload: string | null, status?: number, headers?: Record<string, string>): Response;
};

type Handler = (context: ContextLike) => Promise<Response> | Response;

type AppLike = {
  use(path: string, handler: (context: ContextLike, next: () => Promise<void>) => Promise<Response | void>): void;
  get?(path: string, handler: Handler): void;
  post(path: string, handler: Handler): void;
  put?(path: string, handler: Handler): void;
  patch?(path: string, handler: Handler): void;
  delete?(path: string, handler: Handler): void;
};

type JsonObject = Record<string, unknown>;

type ServicePlugin = {
  name: string;
  register(app: AppLike, store: StoreLike): void;
  seed?(store: StoreLike, baseUrl?: string): void;
};

interface PlaidItem extends Entity {
  item_id: string;
  access_token: string;
  institution_id: string;
  webhook?: string;
  products: string[];
}

interface PlaidAccount extends Entity {
  account_id: string;
  item_id: string;
  name: string;
  official_name: string;
  mask: string;
  type: string;
  subtype: string;
  available: number;
  current: number;
  iso_currency_code: string;
}

interface PlaidTransaction extends Entity {
  transaction_id: string;
  account_id: string;
  item_id: string;
  name: string;
  amount: number;
  date: string;
  category: string[];
  pending: boolean;
}

interface PlaidInstitution extends Entity {
  institution_id: string;
  name: string;
  products: string[];
  country_codes: string[];
  oauth: boolean;
}

interface PlaidTransfer extends Entity {
  transfer_id: string;
  authorization_id: string;
  access_token: string;
  account_id: string;
  amount: string;
  description: string;
  ach_class: string;
  type: string;
  network: string;
  status: string;
}

interface PlaidLinkToken extends Entity {
  link_token: string;
  client_name: string;
  products: string[];
  country_codes: string[];
  language: string;
  expiration: string;
}

interface PlaidSeedData {
  institutions?: Array<Partial<PlaidInstitution> & { institution_id: string; name: string }>;
  item?: Partial<PlaidItem>;
  accounts?: Array<Partial<PlaidAccount> & { account_id: string; name: string }>;
  transactions?: Array<Partial<PlaidTransaction> & { transaction_id: string; account_id: string }>;
}

export interface PlaidSeedConfig {
  plaid?: PlaidSeedData;
}

export const contract = {
  provider: "plaid",
  source: "Plaid OpenAPI 2020-09-14 spec",
  docs: "https://plaid.com/docs/api",
  scope: [
    "link-token",
    "sandbox-public-token",
    "item-public-token-exchange",
    "items",
    "accounts",
    "auth",
    "identity",
    "transactions",
    "institutions",
    "categories",
    "transfers",
    "investments",
    "liabilities",
    "assets",
    "processor",
    "signal",
    "payment-initiation",
    "income",
    "cra",
    "watchlist",
    "beacon",
    "protect",
    "wallet",
    "fdx",
  ],
  fidelity: "stateful-core-plus-openapi-compatible-generic-fallback",
  openapiVersion: "2020-09-14_1.688.6",
  openapiRouteCount: 340,
} as const;

export const label = "Plaid API emulator";
export const endpoints = "Link, sandbox tokens, items, accounts, auth, identity, transactions, institutions, transfers, and generic Plaid OpenAPI fallback";
export const initConfig = {
  plaid: {
    client_id: "plaid-emulator-client",
    secret: "plaid-emulator-secret",
    products: ["auth", "transactions"],
    country_codes: ["US"],
  },
};

function getPlaidStore(store: StoreLike) {
  return {
    items: store.collection<PlaidItem>("plaid.items", ["item_id", "access_token"]),
    accounts: store.collection<PlaidAccount>("plaid.accounts", ["account_id", "item_id"]),
    transactions: store.collection<PlaidTransaction>("plaid.transactions", ["transaction_id", "account_id", "item_id"]),
    institutions: store.collection<PlaidInstitution>("plaid.institutions", ["institution_id", "name"]),
    transfers: store.collection<PlaidTransfer>("plaid.transfers", ["transfer_id", "authorization_id", "account_id", "status"]),
    linkTokens: store.collection<PlaidLinkToken>("plaid.link_tokens", ["link_token"]),
  };
}

function requestId(): string {
  return `plaid-${Math.random().toString(36).slice(2, 10)}`;
}

function token(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function today(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function isoOffset(minutes: number): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length ? value : fallback;
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) ? value.map(String) : fallback;
}

function itemForAccessToken(plaid: ReturnType<typeof getPlaidStore>, accessToken: unknown): PlaidItem {
  const tokenValue = asString(accessToken, "access-sandbox-emulator");
  const existing = plaid.items.findOneBy("access_token", tokenValue);
  if (existing) return existing;

  return plaid.items.insert({
    item_id: `item-${crypto.randomUUID()}`,
    access_token: tokenValue,
    institution_id: "ins_109508",
    products: ["auth", "transactions"],
  });
}

function seedDefaults(store: StoreLike): void {
  const plaid = getPlaidStore(store);

  if (!plaid.institutions.all().length) {
    plaid.institutions.insert({
      institution_id: "ins_109508",
      name: "First Platypus Bank",
      products: ["auth", "transactions", "identity", "assets", "investments"],
      country_codes: ["US"],
      oauth: false,
    });
    plaid.institutions.insert({
      institution_id: "ins_127991",
      name: "Plaid Bank",
      products: ["auth", "transactions", "identity"],
      country_codes: ["US", "CA"],
      oauth: true,
    });
  }

  if (!plaid.items.all().length) {
    plaid.items.insert({
      item_id: "item-emulator-1",
      access_token: "access-sandbox-emulator",
      institution_id: "ins_109508",
      webhook: "https://example.test/plaid/webhook",
      products: ["auth", "transactions"],
    });
  }

  if (!plaid.accounts.all().length) {
    plaid.accounts.insert({
      account_id: "acc-checking-1",
      item_id: "item-emulator-1",
      name: "Plaid Checking",
      official_name: "Plaid Gold Standard 0% Interest Checking",
      mask: "0000",
      type: "depository",
      subtype: "checking",
      available: 110,
      current: 120,
      iso_currency_code: "USD",
    });
    plaid.accounts.insert({
      account_id: "acc-savings-1",
      item_id: "item-emulator-1",
      name: "Plaid Saving",
      official_name: "Plaid Silver Standard 0.1% Interest Saving",
      mask: "1111",
      type: "depository",
      subtype: "savings",
      available: 210,
      current: 210,
      iso_currency_code: "USD",
    });
  }

  if (!plaid.transactions.all().length) {
    plaid.transactions.insert({
      transaction_id: "txn-coffee-1",
      account_id: "acc-checking-1",
      item_id: "item-emulator-1",
      name: "Coffee Shop",
      amount: 4.21,
      date: today(-1),
      category: ["Food and Drink", "Restaurants", "Coffee Shop"],
      pending: false,
    });
    plaid.transactions.insert({
      transaction_id: "txn-payroll-1",
      account_id: "acc-checking-1",
      item_id: "item-emulator-1",
      name: "Payroll",
      amount: -1250,
      date: today(-7),
      category: ["Transfer", "Payroll"],
      pending: false,
    });
  }
}

export function seedFromConfig(store: StoreLike, _baseUrl: string, config: PlaidSeedConfig): void {
  const seed = config.plaid;
  if (!seed) {
    seedDefaults(store);
    return;
  }

  const plaid = getPlaidStore(store);
  plaid.items.clear();
  plaid.accounts.clear();
  plaid.transactions.clear();
  plaid.institutions.clear();
  plaid.transfers.clear();
  plaid.linkTokens.clear();

  seedDefaults(store);

  for (const institution of seed.institutions ?? []) {
    plaid.institutions.insert({
      institution_id: institution.institution_id,
      name: institution.name,
      products: institution.products ?? ["auth", "transactions"],
      country_codes: institution.country_codes ?? ["US"],
      oauth: institution.oauth ?? false,
    });
  }

  if (seed.item) {
    plaid.items.insert({
      item_id: seed.item.item_id ?? "item-seeded-1",
      access_token: seed.item.access_token ?? "access-sandbox-seeded",
      institution_id: seed.item.institution_id ?? "ins_109508",
      webhook: seed.item.webhook,
      products: seed.item.products ?? ["auth", "transactions"],
    });
  }

  for (const account of seed.accounts ?? []) {
    plaid.accounts.insert({
      account_id: account.account_id,
      item_id: account.item_id ?? "item-seeded-1",
      name: account.name,
      official_name: account.official_name ?? account.name,
      mask: account.mask ?? "0000",
      type: account.type ?? "depository",
      subtype: account.subtype ?? "checking",
      available: account.available ?? 100,
      current: account.current ?? 100,
      iso_currency_code: account.iso_currency_code ?? "USD",
    });
  }

  for (const transaction of seed.transactions ?? []) {
    plaid.transactions.insert({
      transaction_id: transaction.transaction_id,
      account_id: transaction.account_id,
      item_id: transaction.item_id ?? "item-seeded-1",
      name: transaction.name ?? "Seeded Transaction",
      amount: transaction.amount ?? 1,
      date: transaction.date ?? today(-1),
      category: transaction.category ?? ["Transfer"],
      pending: transaction.pending ?? false,
    });
  }
}

function accountPayload(account: PlaidAccount): JsonObject {
  return {
    account_id: account.account_id,
    balances: {
      available: account.available,
      current: account.current,
      limit: null,
      iso_currency_code: account.iso_currency_code,
      unofficial_currency_code: null,
    },
    mask: account.mask,
    name: account.name,
    official_name: account.official_name,
    type: account.type,
    subtype: account.subtype,
  };
}

function transactionPayload(transaction: PlaidTransaction): JsonObject {
  return {
    transaction_id: transaction.transaction_id,
    account_id: transaction.account_id,
    amount: transaction.amount,
    iso_currency_code: "USD",
    unofficial_currency_code: null,
    category: transaction.category,
    category_id: "13005032",
    date: transaction.date,
    authorized_date: transaction.date,
    name: transaction.name,
    merchant_name: transaction.name,
    payment_channel: "in store",
    pending: transaction.pending,
    transaction_type: "place",
  };
}

function institutionPayload(institution: PlaidInstitution): JsonObject {
  return {
    institution_id: institution.institution_id,
    name: institution.name,
    products: institution.products,
    country_codes: institution.country_codes,
    url: "https://example.test",
    primary_color: "#1f8efa",
    logo: null,
    routing_numbers: [],
    oauth: institution.oauth,
  };
}

function itemPayload(item: PlaidItem): JsonObject {
  return {
    item_id: item.item_id,
    institution_id: item.institution_id,
    webhook: item.webhook ?? null,
    error: null,
    available_products: ["assets", "auth", "balance", "identity", "investments", "liabilities", "transactions"],
    billed_products: item.products,
    products: item.products,
    consented_products: item.products,
    update_type: "background",
  };
}

function authNumbers(accounts: PlaidAccount[]): JsonObject {
  return {
    ach: accounts.map((account, index) => ({
      account_id: account.account_id,
      account: `${index + 1111222200}`,
      routing: "011401533",
      wire_routing: "021000021",
    })),
    eft: [],
    international: [],
    bacs: [],
  };
}

function ensureAccountsForItem(plaid: ReturnType<typeof getPlaidStore>, item: PlaidItem): void {
  if (plaid.accounts.all().some((account) => account.item_id === item.item_id)) return;

  const suffix = item.item_id.slice(-8).replace(/[^a-z0-9]/gi, "") || "emulator";
  plaid.accounts.insert({
    account_id: `acc-checking-${suffix}`,
    item_id: item.item_id,
    name: "Plaid Checking",
    official_name: "Plaid Gold Standard 0% Interest Checking",
    mask: "0000",
    type: "depository",
    subtype: "checking",
    available: 110,
    current: 120,
    iso_currency_code: "USD",
  });
  plaid.accounts.insert({
    account_id: `acc-savings-${suffix}`,
    item_id: item.item_id,
    name: "Plaid Saving",
    official_name: "Plaid Silver Standard 0.1% Interest Saving",
    mask: "1111",
    type: "depository",
    subtype: "savings",
    available: 210,
    current: 210,
    iso_currency_code: "USD",
  });
}

function genericResponse(path: string, body: JsonObject, plaid: ReturnType<typeof getPlaidStore>): JsonObject {
  const id = crypto.randomUUID();
  const base = { request_id: requestId() };

  if (path.endsWith("/list")) {
    const key = path.split("/").filter(Boolean).at(-2)?.replace(/-/g, "_") ?? "items";
    return { [key.endsWith("s") ? key : `${key}s`]: [], ...base };
  }
  if (path.endsWith("/get")) return { ...base, item: itemPayload(itemForAccessToken(plaid, body.access_token)) };
  if (path.endsWith("/create")) return { ...base, id, status: "created" };
  if (path.endsWith("/update")) return { ...base, status: "updated" };
  if (path.endsWith("/remove") || path.endsWith("/revoke") || path.endsWith("/cancel") || path.endsWith("/terminate")) return { ...base, removed: true };
  if (path.includes("/pdf/") || path.endsWith("/pdf/get") || path.endsWith("/download")) return { ...base, data: "" };
  return { ...base, status: "ok" };
}

function registerCoreRoutes(app: AppLike, plaid: ReturnType<typeof getPlaidStore>): void {
  app.post("/link/token/create", async (context) => {
    const body = await context.req.json();
    const linkToken = plaid.linkTokens.insert({
      link_token: token("link-sandbox"),
      client_name: asString(body.client_name, "Plaid Emulator"),
      products: asStringArray(body.products, ["auth", "transactions"]),
      country_codes: asStringArray(body.country_codes, ["US"]),
      language: asString(body.language, "en"),
      expiration: isoOffset(30),
    });

    return context.json({
      link_token: linkToken.link_token,
      expiration: linkToken.expiration,
      request_id: requestId(),
    }, 200);
  });

  app.post("/link/token/get", async (context) => {
    const body = await context.req.json();
    const linkToken = plaid.linkTokens.findOneBy("link_token", asString(body.link_token, ""));
    return context.json({
      link_token: body.link_token,
      metadata: {
        client_name: linkToken?.client_name ?? "Plaid Emulator",
        products: linkToken?.products ?? ["auth", "transactions"],
        country_codes: linkToken?.country_codes ?? ["US"],
        language: linkToken?.language ?? "en",
      },
      expiration: linkToken?.expiration ?? isoOffset(30),
      created_at: linkToken?.created_at ?? new Date().toISOString(),
      request_id: requestId(),
    }, 200);
  });

  app.post("/sandbox/public_token/create", async (context) => {
    const body = await context.req.json();
    return context.json({
      public_token: token("public-sandbox"),
      request_id: requestId(),
      item_id: itemForAccessToken(plaid, body.access_token).item_id,
    }, 200);
  });

  app.post("/item/public_token/create", async (context) => {
    const body = await context.req.json();
    return context.json({
      public_token: token("public-sandbox"),
      request_id: requestId(),
      item_id: itemForAccessToken(plaid, body.access_token).item_id,
    }, 200);
  });

  app.post("/item/public_token/exchange", async (context) => {
    const item = plaid.items.insert({
      item_id: `item-${crypto.randomUUID()}`,
      access_token: token("access-sandbox"),
      institution_id: "ins_109508",
      products: ["auth", "transactions"],
    });
    ensureAccountsForItem(plaid, item);

    return context.json({
      access_token: item.access_token,
      item_id: item.item_id,
      request_id: requestId(),
    }, 200);
  });

  app.post("/item/get", async (context) => {
    const body = await context.req.json();
    return context.json({
      item: itemPayload(itemForAccessToken(plaid, body.access_token)),
      status: null,
      request_id: requestId(),
    }, 200);
  });

  app.post("/item/remove", async (context) => {
    const body = await context.req.json();
    const item = plaid.items.findOneBy("access_token", asString(body.access_token, ""));
    if (item) plaid.items.update(item.id, { products: [] });
    return context.json({ removed: true, request_id: requestId() }, 200);
  });

  app.post("/item/access_token/invalidate", async (context) => {
    const body = await context.req.json();
    const item = itemForAccessToken(plaid, body.access_token);
    const newAccessToken = token("access-sandbox");
    plaid.items.update(item.id, { access_token: newAccessToken });
    return context.json({ new_access_token: newAccessToken, request_id: requestId() }, 200);
  });

  app.post("/accounts/get", async (context) => {
    const body = await context.req.json();
    const item = itemForAccessToken(plaid, body.access_token);
    const accounts = plaid.accounts.all().filter((account) => account.item_id === item.item_id);
    return context.json({
      accounts: accounts.map(accountPayload),
      item: itemPayload(item),
      request_id: requestId(),
    }, 200);
  });

  app.post("/accounts/balance/get", async (context) => {
    const body = await context.req.json();
    const item = itemForAccessToken(plaid, body.access_token);
    const accounts = plaid.accounts.all().filter((account) => account.item_id === item.item_id);
    return context.json({ accounts: accounts.map(accountPayload), item: itemPayload(item), request_id: requestId() }, 200);
  });

  app.post("/auth/get", async (context) => {
    const body = await context.req.json();
    const item = itemForAccessToken(plaid, body.access_token);
    const accounts = plaid.accounts.all().filter((account) => account.item_id === item.item_id);
    return context.json({
      accounts: accounts.map(accountPayload),
      numbers: authNumbers(accounts),
      item: itemPayload(item),
      request_id: requestId(),
    }, 200);
  });

  app.post("/identity/get", async (context) => {
    const body = await context.req.json();
    const item = itemForAccessToken(plaid, body.access_token);
    const accounts = plaid.accounts.all().filter((account) => account.item_id === item.item_id);
    return context.json({
      accounts: accounts.map((account) => ({
        ...accountPayload(account),
        owners: [{
          names: ["Plaid Emulator User"],
          phone_numbers: [{ data: "555-867-5309", primary: true, type: "home" }],
          emails: [{ data: "user@example.test", primary: true, type: "primary" }],
          addresses: [],
        }],
      })),
      item: itemPayload(item),
      request_id: requestId(),
    }, 200);
  });

  app.post("/transactions/get", async (context) => {
    const body = await context.req.json();
    const item = itemForAccessToken(plaid, body.access_token);
    const transactions = plaid.transactions.all().filter((transaction) => transaction.item_id === item.item_id);
    const accounts = plaid.accounts.all().filter((account) => account.item_id === item.item_id);
    return context.json({
      accounts: accounts.map(accountPayload),
      transactions: transactions.map(transactionPayload),
      total_transactions: transactions.length,
      item: itemPayload(item),
      request_id: requestId(),
    }, 200);
  });

  app.post("/transactions/sync", async (context) => {
    const body = await context.req.json();
    const item = itemForAccessToken(plaid, body.access_token);
    const transactions = plaid.transactions.all().filter((transaction) => transaction.item_id === item.item_id);
    return context.json({
      added: transactions.map(transactionPayload),
      modified: [],
      removed: [],
      next_cursor: `cursor-${transactions.length}`,
      has_more: false,
      request_id: requestId(),
    }, 200);
  });

  app.post("/transactions/refresh", (context) => context.json({ request_id: requestId() }, 200));

  app.post("/categories/get", (context) => context.json({
    categories: [
      { category_id: "13005032", group: "place", hierarchy: ["Food and Drink", "Restaurants", "Coffee Shop"] },
      { category_id: "21009000", group: "special", hierarchy: ["Transfer", "Payroll"] },
    ],
    request_id: requestId(),
  }, 200));

  app.post("/institutions/get", async (context) => {
    const body = await context.req.json();
    const count = typeof body.count === "number" ? body.count : 100;
    const offset = typeof body.offset === "number" ? body.offset : 0;
    const institutions = plaid.institutions.all().slice(offset, offset + count);
    return context.json({
      institutions: institutions.map(institutionPayload),
      total: plaid.institutions.all().length,
      request_id: requestId(),
    }, 200);
  });

  app.post("/institutions/search", async (context) => {
    const body = await context.req.json();
    const query = asString(body.query, "").toLowerCase();
    const institutions = plaid.institutions.all().filter((institution) => !query || institution.name.toLowerCase().includes(query));
    return context.json({ institutions: institutions.map(institutionPayload), request_id: requestId() }, 200);
  });

  app.post("/institutions/get_by_id", async (context) => {
    const body = await context.req.json();
    const institution = plaid.institutions.findOneBy("institution_id", asString(body.institution_id, "ins_109508")) ?? plaid.institutions.all()[0];
    return context.json({ institution: institutionPayload(institution), request_id: requestId() }, 200);
  });

  app.post("/transfer/authorization/create", async (context) => {
    const body = await context.req.json();
    return context.json({
      authorization: {
        id: token("authorization"),
        decision: "approved",
        created: new Date().toISOString(),
        decision_rationale: null,
        guarantee_decision: null,
        proposed_transfer: body,
      },
      request_id: requestId(),
    }, 200);
  });

  app.post("/transfer/create", async (context) => {
    const body = await context.req.json();
    const transfer = plaid.transfers.insert({
      transfer_id: token("transfer"),
      authorization_id: asString(body.authorization_id, token("authorization")),
      access_token: asString(body.access_token, "access-sandbox-emulator"),
      account_id: asString(body.account_id, "acc-checking-1"),
      amount: asString(body.amount, "1.00"),
      description: asString(body.description, "Plaid emulator transfer"),
      ach_class: asString(body.ach_class, "ppd"),
      type: asString(body.type, "credit"),
      network: asString(body.network, "ach"),
      status: "pending",
    });
    return context.json({ transfer, request_id: requestId() }, 200);
  });

  app.post("/transfer/get", async (context) => {
    const body = await context.req.json();
    const transfer = plaid.transfers.findOneBy("transfer_id", asString(body.transfer_id, ""));
    return context.json({ transfer: transfer ?? plaid.transfers.all()[0] ?? null, request_id: requestId() }, 200);
  });

  app.post("/transfer/list", (context) => context.json({
    transfers: plaid.transfers.all(),
    request_id: requestId(),
    has_more: false,
  }, 200));
}

function registerFallbackRoutes(app: AppLike, plaid: ReturnType<typeof getPlaidStore>): void {
  const fallback = async (context: ContextLike) => {
    const body = await context.req.json().catch(() => ({}));
    const path = asString(context.req.param("*"), "");
    return context.json(genericResponse(path.startsWith("/") ? path : `/${path}`, body, plaid), 200);
  };

  app.post("*", fallback);
  app.post("/*", fallback);
}

export const plugin: ServicePlugin = {
  name: "plaid",
  seed(store) {
    seedDefaults(store);
  },
  register(app, store) {
    const plaid = getPlaidStore(store);
    registerCoreRoutes(app, plaid);
    registerFallbackRoutes(app, plaid);
  },
};

export default plugin;
