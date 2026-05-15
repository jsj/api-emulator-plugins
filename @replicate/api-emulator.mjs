import { registerRoutes } from './src/routes/http.mjs';

export const plugin = {
  name: 'replicate',
  register(app, store) {
    registerRoutes(app, store);
  },
};

export const label = 'Replicate API emulator';
export const endpoints = 'models/:owner/:name/predictions, predictions/:id';
export const initConfig = { replicate: {} };
