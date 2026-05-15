import { registerRoutes } from './src/routes/http.mjs';

export const contract = {
  provider: 'elevenlabs',
  source: 'ElevenLabs OpenAPI compatible subset',
  docs: 'https://elevenlabs.io/docs/api-reference/introduction',
  openapi: 'https://elevenlabs.io/openapi.json',
  baseUrl: 'https://api.elevenlabs.io',
  auth: 'xi-api-key',
  scope: ['models', 'voices', 'text-to-speech', 'history', 'user'],
  fidelity: 'deterministic-subset',
};

export const plugin = {
  name: 'elevenlabs',
  register(app, store) {
    registerRoutes(app, store, contract);
  },
};

export const label = 'ElevenLabs API emulator';
export const endpoints = 'models, voices, text-to-speech, history, user';
export const initConfig = {
  elevenlabs: {
    apiKey: 'elevenlabs-emulator-key',
  },
};

export default plugin;
