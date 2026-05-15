import { registerRoutes } from './src/routes/http.mjs';

export const plugin = {
  name: 'gemini',
  register(app, store) {
    registerRoutes(app, store);
  },
};

export const label = 'Gemini API emulator';
export const endpoints = 'models/:model:generateContent';
export const initConfig = { gemini: {} };
