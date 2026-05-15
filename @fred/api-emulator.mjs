import { registerRoutes } from './src/routes/http.mjs';

export const contract = {
  provider: 'fred',
  source: 'FRED API compatible series subset',
  docs: 'https://fred.stlouisfed.org/docs/api/fred',
  scope: ['series-search', 'series', 'observations'],
  fidelity: 'deterministic-subset',
};

export const plugin = {
  name: 'fred',
  register(app, store) {
    registerRoutes(app, store);
  },
};

export const label = 'FRED API emulator';
export const endpoints = 'series/search, series, series/observations';
export const initConfig = { fred: { apiKey: 'fred-emulator-key' } };
