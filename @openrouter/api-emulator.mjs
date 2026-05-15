import { registerRoutes } from './src/routes/http.mjs';

export const plugin = {
  name: 'openrouter',
  register(app, store) {
    registerRoutes(app, store);
  },
};

export const label = 'OpenRouter API emulator';
export const endpoints = 'chat/completions';
export const initConfig = { openrouter: {} };
