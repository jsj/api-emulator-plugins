import { registerRoutes, seedDefaults } from "./routes/http.ts";
import type { AlpacaSeedConfig } from "./routes/http.ts";

export {
  buildSeedConfigFromRealAlpaca,
  seedFromAlpacaMarketData,
  seedFromConfig,
} from "./routes/http.ts";
export type { AlpacaSeedConfig } from "./routes/http.ts";

export const plugin = {
  name: "alpaca",
  register(app: Parameters<typeof registerRoutes>[0], store: Parameters<typeof registerRoutes>[1]) {
    registerRoutes(app, store);
  },
  seed(store: Parameters<typeof seedDefaults>[0]) {
    seedDefaults(store);
  },
};

export const label = "Alpaca trading + market data emulator";
export const endpoints = "Alpaca trading, broker, stock/crypto/option/news/corporate-actions/screener REST surfaces across /v1, /v2, /v1beta1, and /v1beta3";
export const initConfig = {
  alpaca: {
    account: {
      buying_power: "100000",
      cash: "100000",
      portfolio_value: "100000",
    },
    positions: [{ symbol: "SPY", qty: "10", current_price: "589.5", market_value: "5895" }],
    bars: {
      SPY: [
        { timestamp: "2025-01-02T14:30:00Z", open: 585, high: 587, low: 584.5, close: 586.5, volume: 1000000 },
      ],
    },
  } satisfies AlpacaSeedConfig["alpaca"],
};

export default plugin;
