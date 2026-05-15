import { contract, registerRoutes, seedDefaults } from "./routes/http.ts";
import type { KalshiSeedConfig } from "./routes/http.ts";

export { contract, seedFromConfig } from "./routes/http.ts";
export type { KalshiSeedConfig } from "./routes/http.ts";

export const plugin = {
  name: "kalshi",
  register(app: Parameters<typeof registerRoutes>[0], store: Parameters<typeof registerRoutes>[1]) {
    registerRoutes(app, store);
  },
  seed(store: Parameters<typeof seedDefaults>[0]) {
    seedDefaults(store);
  },
};

export const label = "Kalshi trading API emulator";
export const endpoints = "Kalshi REST Trade API v2 surfaces for exchange, markets, events, portfolio, orders, fills, positions, API keys, communications, historical, multivariate, milestones, live data, search, FCM, and structured targets";
export const initConfig = {
  kalshi: {
    balance: {
      balance: 1000000,
      buying_power: 1000000,
    },
    markets: [
      {
        ticker: "KXNBA-26CHAMPS-LAL",
        event_ticker: "KXNBA-26CHAMPS",
        series_ticker: "KXNBA",
        yes_bid: 37,
        yes_ask: 39,
        last_price: 38,
      },
    ],
    positions: [{ ticker: "KXNBA-26CHAMPS-LAL", position: 10, total_traded: 10 }],
  } satisfies KalshiSeedConfig["kalshi"],
};

export const capabilities = [...contract.scope];
export const manifest = {
  name: "kalshi",
  label,
  endpoints,
  contract,
  compatibility: {
    apiEmulator: ">=0.5.1",
  },
};

export default plugin;
