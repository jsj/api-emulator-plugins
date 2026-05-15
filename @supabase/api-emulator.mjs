import { registerRoutes } from './src/routes/http.mjs';

export const contract = {
  "provider": "supabase",
  "source": "Provider API docs",
  "docs": "",
  "scope": [
    "auth",
    "storage",
    "rest"
  ],
  "fidelity": "resource-model-subset"
};

export const plugin = {
  name: 'supabase',
  register(app, store) { registerRoutes(app, store, contract); },
};

export const label = 'Supabase auth, storage, and REST emulator';
export const endpoints = 'auth, storage buckets/objects, table REST, local Postgres seed/branch helper, inspection';
export const capabilities = contract.scope;
export const initConfig = {
  supabase: {
    url: 'http://127.0.0.1:8787',
    dbUrl: 'postgres://postgres:postgres@127.0.0.1:55432/postgres',
    anonKey: 'sb_anon_emulator',
    serviceRoleKey: 'sb_secret_emulator',
  },
};
export default plugin;
