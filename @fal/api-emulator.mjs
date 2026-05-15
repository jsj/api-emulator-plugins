import { registerRoutes } from './src/routes/http.mjs';

export const plugin = {
  name: 'fal',
  register(app, store) {
    registerRoutes(app, store);
  },
};

export const label = 'fal API emulator';
export const endpoints = 'Platform APIs v1, generic queue model APIs, Seedance 2 queue text-to-video';
export const initConfig = { fal: {} };
