import { registerModeledRoutes } from "./routes/http.ts";
import { registerFallbackRoutes } from "./spec/fallback.ts";
import { getPlaidStore } from "./store.ts";
import { seedDefaults, seedFromConfig } from "./seed.ts";
import type { PlaidSeedConfig, ServicePlugin } from "./types.ts";

export type { PlaidSeedConfig } from "./types.ts";
export { getPlaidStore, type PlaidStore } from "./store.ts";
export { operations, modeledOperations, fallbackOperations, type Fidelity, type Operation } from "./spec/operations.ts";
export { seedFromConfig } from "./seed.ts";

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
  openapiRouteCount: 330,
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

export const plugin: ServicePlugin = {
  name: "plaid",
  seed(store) {
    seedDefaults(store);
  },
  register(app, store) {
    const plaid = getPlaidStore(store);
    registerModeledRoutes(app, plaid);
    registerFallbackRoutes(app, plaid);
  },
};

export default plugin;
