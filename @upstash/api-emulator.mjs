import { registerRoutes } from './src/routes/http.mjs';

export const contract = {
  "provider": "upstash",
  "source": "Provider API docs",
  "docs": "",
  "scope": [
    "redis",
    "vector",
    "qstash"
  ],
  "fidelity": "resource-model-subset"
};

export const plugin = {
  name: 'upstash',
  register(app, store) { registerRoutes(app, store, contract); },
};

export const label = 'Upstash Redis, Vector, and QStash emulator';
export const endpoints = 'redis commands, vector upsert/query, qstash messages';
export const capabilities = contract.scope;
export const initConfig = { upstash: {} };
export default plugin;
