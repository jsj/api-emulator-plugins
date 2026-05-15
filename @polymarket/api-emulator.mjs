import { registerRoutes } from './src/routes/http.mjs';

export const contract = {
  provider: 'polymarket',
  source: 'Polymarket Gamma API compatible market subset',
  docs: 'https://docs.polymarket.com',
  scope: ['gamma-markets'],
  fidelity: 'resource-model-subset',
};

export const plugin = {
  name: 'polymarket',
  register(app, store) {
    registerRoutes(app, store);
  },
};

export const label = 'Polymarket Gamma API emulator';
export const endpoints = 'markets, markets/:id';
export const initConfig = { polymarket: {} };
