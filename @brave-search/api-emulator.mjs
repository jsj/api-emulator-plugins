import { registerRoutes } from './src/routes/http.mjs';

export const contract = {
  provider: 'brave-search',
  source: 'Brave Search API compatible subset',
  docs: 'https://api.search.brave.com',
  scope: ['web_search', 'news_search', 'suggest'],
  fidelity: 'deterministic-subset',
};

export const plugin = {
  name: 'brave-search',
  register(app, store) {
    registerRoutes(app, store, contract);
  },
};

export const label = 'Brave Search API emulator';
export const endpoints = 'web search, news search, suggest';
export const initConfig = {
  braveSearch: {
    apiKey: 'brave-search-emulator-key',
  },
};

export default plugin;
