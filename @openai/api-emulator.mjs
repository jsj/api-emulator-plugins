import { registerRoutes } from './src/routes/http.mjs';

export const plugin = {
  name: 'openai',
  register(app, store) {
    registerRoutes(app, store);
  },
};

export const label = 'OpenAI API emulator';
export const endpoints = 'images/generations, images/edits, chat/completions';
export const initConfig = { openai: {} };
