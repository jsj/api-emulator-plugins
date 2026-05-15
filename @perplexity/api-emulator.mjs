import { registerRoutes } from './src/routes/http.mjs';

export const contract = {
  provider: 'perplexity',
  source: 'Perplexity API compatible search subset',
  docs: 'https://docs.perplexity.ai',
  scope: ['search'],
  fidelity: 'deterministic-subset',
};

export const plugin = {
  name: 'perplexity',
  register(app, store) {
    registerRoutes(app, store);
  },
};

export const label = 'Perplexity API emulator';
export const endpoints = 'search';
export const initConfig = {
  perplexity: {
    apiKey: 'perplexity-emulator-key',
  },
};
