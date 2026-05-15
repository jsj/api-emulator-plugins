import { listHistory, notFound, searchVoices, synthesizeSpeech } from '../concepts/speech.mjs';
import { saveState, state } from '../store.mjs';

async function jsonBody(c) {
  return c.req.json().catch(() => ({}));
}

function query(c, names) {
  return Object.fromEntries(names.map((name) => [name, c.req.query?.(name)]).filter(([, value]) => value !== undefined));
}

function requireApiKey(c) {
  const key = c.req.header?.('xi-api-key') ?? c.req.header?.('authorization')?.replace(/^Bearer\s+/i, '');
  if (key) return null;
  return {
    detail: {
      status: 'invalid_api_key',
      message: 'Missing xi-api-key header',
    },
  };
}

function guarded(c, handler) {
  const authError = requireApiKey(c);
  if (authError) return c.json(authError, 401);
  return handler();
}

export function registerRoutes(app, store, contract) {
  app.get('/v1/models', (c) =>
    guarded(c, () => {
      const current = state(store);
      return c.json(current.models);
    }),
  );

  app.get('/v2/voices', (c) =>
    guarded(c, () => {
      const current = state(store);
      return c.json(searchVoices(current, query(c, ['page_size', 'pageSize', 'next_page_token', 'nextPageToken', 'search'])));
    }),
  );

  app.get('/v1/voices', (c) =>
    guarded(c, () => {
      const current = state(store);
      return c.json({ voices: current.voices });
    }),
  );

  app.get('/v1/voices/:voice_id', (c) =>
    guarded(c, () => {
      const current = state(store);
      const voice = current.voices.find((item) => item.voice_id === c.req.param('voice_id'));
      if (!voice) {
        const error = notFound(`Voice ${c.req.param('voice_id')} not found`);
        return c.json(error.payload, error.status);
      }
      return c.json(voice);
    }),
  );

  app.post('/v1/text-to-speech/:voice_id', async (c) =>
    guarded(c, async () => {
      const current = state(store);
      const result = synthesizeSpeech(current, await jsonBody(c), c.req.param('voice_id'));
      if (result.error) return c.json(result.error.payload, result.error.status);
      saveState(store, current);
      return c.body(result.audio, 200, {
        'content-type': 'audio/mpeg',
        'request-id': result.requestId,
        'x-character-count': String(result.characters),
      });
    }),
  );

  app.post('/v1/text-to-speech/:voice_id/stream/with-timestamps', async (c) =>
    guarded(c, async () => {
      const current = state(store);
      const result = synthesizeSpeech(current, await jsonBody(c), c.req.param('voice_id'));
      if (result.error) return c.json(result.error.payload, result.error.status);
      saveState(store, current);
      return c.body(result.audio, 200, {
        'content-type': 'audio/mpeg',
        'request-id': result.requestId,
        'x-character-count': String(result.characters),
      });
    }),
  );

  app.get('/v1/history', (c) =>
    guarded(c, () => {
      const current = state(store);
      return c.json(listHistory(current, query(c, ['page_size', 'pageSize', 'start_after_history_item_id', 'startAfterHistoryItemId'])));
    }),
  );

  app.get('/v1/user', (c) =>
    guarded(c, () => {
      const current = state(store);
      return c.json(current.user);
    }),
  );

  app.get('/v1/user/subscription', (c) =>
    guarded(c, () => {
      const current = state(store);
      return c.json(current.user.subscription);
    }),
  );

  app.get('/inspect/contract', (c) => c.json(contract));
  app.get('/inspect/state', (c) => c.json(state(store)));
  app.post('/inspect/reset', (c) => {
    store.setData?.('elevenlabs:state', null);
    return c.json({ ok: true, state: state(store) });
  });
}
