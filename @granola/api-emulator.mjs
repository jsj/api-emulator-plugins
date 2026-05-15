import { createSaasProvider, fixedNow } from '../scripts/saas-emulator-kit.mjs';

const config = {
  name: 'granola',
  label: 'Granola API emulator',
  source: 'Granola public API documented subset',
  docs: 'https://docs.granola.ai/introduction',
  baseUrl: 'https://public-api.granola.ai',
  scope: ["notes"],
  endpoints: 'notes',
  initConfig: { granola: { apiKey: 'granola-emulator-key', workspaceId: 'ws_emulator' } },
  collections: {
      notes: [{
        id: 'note_001',
        title: 'Pipeline review',
        created_at: fixedNow,
        updated_at: fixedNow,
        summary: 'Discussed pipeline health.',
        attendees: [{ email: 'emulator@example.test', name: 'Emulator User' }],
        transcript: [{ speaker: 'Emulator User', text: 'Welcome to the meeting.', start_ms: 0 }],
      }],
    },
  routes: [
      { method: 'GET', path: '/v1/me', response: () => ({ id: 'user_emulator', email: 'emulator@example.test' }) },
      { method: 'GET', path: '/v1/notes', response: (c, state) => ({ notes: state.collections.notes, next_cursor: null }) },
      { method: 'GET', path: '/v1/notes/:id', collection: 'notes', action: 'get', param: 'id', envelope: 'note' },
    ],
};

export const { contract, plugin, seedFromConfig, label, endpoints, initConfig } = createSaasProvider(config);

export default plugin;
