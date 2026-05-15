export type Entity = {
  id: number;
  created_at: string;
  updated_at: string;
};

export type CollectionLike<T extends Entity> = {
  all(): T[];
  insert(data: Omit<T, "id" | "created_at" | "updated_at">): T;
  update(id: number, data: Partial<T>): T | undefined;
  clear(): void;
  findOneBy(field: keyof T, value: string | number): T | undefined;
};

export type StoreLike = {
  collection<T extends Entity>(name: string, indexFields: string[]): CollectionLike<T>;
};

export type RequestLike = {
  header(name: string): string | undefined;
  param(name: string): string;
  query(name: string): string | undefined;
  json(): Promise<Record<string, unknown>>;
};

export type ContextLike = {
  req: RequestLike;
  json(payload: unknown, status?: number): Response;
  body?(payload: string | null, status?: number, headers?: Record<string, string>): Response;
};

export type Handler = (context: ContextLike) => Promise<Response> | Response;

export type AppLike = {
  use(path: string, handler: (context: ContextLike, next: () => Promise<void>) => Promise<Response | void>): void;
  get?(path: string, handler: Handler): void;
  post(path: string, handler: Handler): void;
  put?(path: string, handler: Handler): void;
  patch?(path: string, handler: Handler): void;
  delete?(path: string, handler: Handler): void;
};

export type JsonObject = Record<string, unknown>;

export type ServicePlugin = {
  name: string;
  register(app: AppLike, store: StoreLike): void;
  seed?(store: StoreLike, baseUrl?: string): void;
};

export interface PlaidItem extends Entity {
  item_id: string;
  access_token: string;
  institution_id: string;
  webhook?: string;
  products: string[];
}

export interface PlaidAccount extends Entity {
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

export interface PlaidTransaction extends Entity {
  transaction_id: string;
  account_id: string;
  item_id: string;
  name: string;
  amount: number;
  date: string;
  category: string[];
  pending: boolean;
}

export interface PlaidInstitution extends Entity {
  institution_id: string;
  name: string;
  products: string[];
  country_codes: string[];
  oauth: boolean;
}

export interface PlaidTransfer extends Entity {
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

export interface PlaidLinkToken extends Entity {
  link_token: string;
  client_name: string;
  products: string[];
  country_codes: string[];
  language: string;
  expiration: string;
}

export interface PlaidSeedData {
  institutions?: Array<Partial<PlaidInstitution> & { institution_id: string; name: string }>;
  item?: Partial<PlaidItem>;
  accounts?: Array<Partial<PlaidAccount> & { account_id: string; name: string }>;
  transactions?: Array<Partial<PlaidTransaction> & { transaction_id: string; account_id: string }>;
}

export interface PlaidSeedConfig {
  plaid?: PlaidSeedData;
}
