import { registerRoutes } from './src/routes/http.mjs';

export const contract = {
  provider: 'exa',
  source: 'Exa API compatible search subset',
  docs: 'https://docs.exa.ai',
  scope: ['search', 'contents', 'findSimilar', 'answer'],
  fidelity: 'deterministic-subset',
};

export const plugin = {
  name: 'exa',
  register(app, store) {
    registerRoutes(app, store, contract);
  },
};

export const label = 'Exa API emulator';
export const endpoints = 'search, contents, findSimilar, answer';
export const initConfig = {
  exa: {
    apiKey: 'exa-emulator-key',
  },
};

export default plugin;
