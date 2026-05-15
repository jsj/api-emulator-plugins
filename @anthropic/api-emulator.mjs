import { registerRoutes } from './src/routes/http.mjs';

export const plugin = {
  name: 'anthropic',
  register(app, store) {
    registerRoutes(app, store);
  },
};

export const label = 'Anthropic API emulator';
export const endpoints = 'messages';
export const initConfig = { anthropic: {} };
