const stateKey = 'suno:state';
const fixedNow = '2026-05-15T12:00:00.000Z';

const defaultSongs = [
  {
    id: 'suno_audio_emulator_001',
    audioUrl: 'https://cdn.sunoapi.org/emulator/suno_audio_emulator_001.mp3',
    sourceAudioUrl: 'https://cdn.sunoapi.org/emulator/suno_audio_emulator_001.mp3',
    streamAudioUrl: 'https://cdn.sunoapi.org/emulator/suno_audio_emulator_001-stream.mp3',
    sourceStreamAudioUrl: 'https://cdn.sunoapi.org/emulator/suno_audio_emulator_001-stream.mp3',
    imageUrl: 'https://cdn.sunoapi.org/emulator/suno_audio_emulator_001.png',
    sourceImageUrl: 'https://cdn.sunoapi.org/emulator/suno_audio_emulator_001.png',
    prompt: 'A peaceful acoustic guitar melody',
    modelName: 'V4_5ALL',
    title: 'Emulator Sunrise',
    tags: 'acoustic, calm, emulator',
    createTime: fixedNow,
    duration: 180,
  },
  {
    id: 'suno_audio_emulator_002',
    audioUrl: 'https://cdn.sunoapi.org/emulator/suno_audio_emulator_002.mp3',
    sourceAudioUrl: 'https://cdn.sunoapi.org/emulator/suno_audio_emulator_002.mp3',
    streamAudioUrl: 'https://cdn.sunoapi.org/emulator/suno_audio_emulator_002-stream.mp3',
    sourceStreamAudioUrl: 'https://cdn.sunoapi.org/emulator/suno_audio_emulator_002-stream.mp3',
    imageUrl: 'https://cdn.sunoapi.org/emulator/suno_audio_emulator_002.png',
    sourceImageUrl: 'https://cdn.sunoapi.org/emulator/suno_audio_emulator_002.png',
    prompt: 'A peaceful acoustic guitar melody',
    modelName: 'V4_5ALL',
    title: 'Emulator Horizon',
    tags: 'acoustic, calm, emulator',
    createTime: fixedNow,
    duration: 177,
  },
];

export const contract = {
  provider: 'suno',
  source: 'SunoAPI.org OpenAPI compatible subset',
  docs: 'https://docs.sunoapi.org/',
  openapi: 'https://docs.sunoapi.org/suno-api/suno-api.json',
  baseUrl: 'https://api.sunoapi.org',
  auth: 'Authorization: Bearer',
  scope: ['credits', 'generate', 'record-info', 'lyrics'],
  fidelity: 'deterministic-subset',
};

function initialState(baseUrl = contract.baseUrl, config = {}) {
  return {
    baseUrl,
    credits: config.credits ?? 1200,
    nextTask: 1,
    tasks: {},
    lyricsTasks: {},
    callbacks: [],
  };
}

function getState(store) {
  const existing = store.getData(stateKey);
  if (existing) return existing;
  const next = initialState();
  store.setData(stateKey, next);
  return next;
}

function saveState(store, state) {
  store.setData(stateKey, state);
  return state;
}

export function seedFromConfig(store, baseUrl = contract.baseUrl, config = {}) {
  return saveState(store, {
    ...initialState(baseUrl, config),
    ...config,
    baseUrl,
    tasks: config.tasks ?? {},
    lyricsTasks: config.lyricsTasks ?? {},
    callbacks: config.callbacks ?? [],
  });
}

function sunoResponse(data, status = 200, msg = 'success') {
  return { code: status, msg, data };
}

function sunoError(c, status, msg) {
  return c.json(sunoResponse(null, status, msg), status);
}

function auth(c) {
  const header = c.req.header('authorization') ?? c.req.header('Authorization') ?? '';
  return header.toLowerCase().startsWith('bearer ') && header.slice(7).trim().length > 0;
}

function requireAuth(c) {
  if (auth(c)) return null;
  return sunoError(c, 401, 'Invalid or missing API key');
}

async function body(c) {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

function taskId(state, prefix) {
  const id = `${prefix}_${String(state.nextTask).padStart(6, '0')}`;
  state.nextTask += 1;
  return id;
}

function generateSongs(request) {
  const title = request.title || (request.customMode ? 'Custom Emulator Song' : 'Emulator Song');
  const prompt = request.prompt || request.gptDescriptionPrompt || 'Suno emulator generation';
  return defaultSongs.map((song, index) => ({
    ...song,
    id: `${song.id}_${index + 1}`,
    prompt,
    modelName: request.model ?? 'V4_5ALL',
    title: index === 0 ? title : `${title} Alternate`,
    tags: request.tags ?? song.tags,
  }));
}

function validateGenerate(request) {
  if (typeof request.customMode !== 'boolean') return 'customMode is required';
  if (typeof request.instrumental !== 'boolean') return 'instrumental is required';
  if (!request.model) return 'model is required';
  if (!request.callBackUrl) return 'callBackUrl is required';
  if (!request.prompt && !request.gptDescriptionPrompt) return 'prompt is required';
  if (request.customMode && !request.instrumental && !request.title) return 'title is required in custom mode';
  return null;
}

function taskRecord(task) {
  return {
    taskId: task.taskId,
    parentMusicId: task.parentMusicId ?? '',
    param: JSON.stringify(task.request),
    response: {
      taskId: task.taskId,
      sunoData: task.songs,
    },
    status: task.status,
    type: task.type,
    errorCode: null,
    errorMessage: null,
    createTime: task.createTime,
  };
}

function lyricsRecord(task) {
  return {
    taskId: task.taskId,
    parentMusicId: '',
    param: JSON.stringify(task.request),
    response: {
      taskId: task.taskId,
      lyricsData: [
        {
          text: task.request.prompt ?? 'Verse 1\nEmulator music fills the room\nChorus\nA deterministic Suno tune',
          title: task.request.title ?? 'Emulator Lyrics',
          status: 'complete',
        },
      ],
    },
    status: 'SUCCESS',
    type: 'LYRICS',
    errorCode: null,
    errorMessage: null,
    createTime: task.createTime,
  };
}

async function createGenerate(c, store, type = 'GENERATE') {
  const unauthenticated = requireAuth(c);
  if (unauthenticated) return unauthenticated;
  const request = await body(c);
  const validation = validateGenerate(request);
  if (validation) return sunoError(c, 400, validation);

  const state = getState(store);
  const id = taskId(state, 'suno_task');
  const task = {
    taskId: id,
    type,
    status: 'SUCCESS',
    request,
    songs: generateSongs(request),
    createTime: fixedNow,
    parentMusicId: request.audioId ?? request.taskId ?? '',
  };
  state.tasks[id] = task;
  if (request.callBackUrl) state.callbacks.push({ taskId: id, url: request.callBackUrl, status: task.status, createTime: fixedNow });
  saveState(store, state);
  return c.json(sunoResponse({ taskId: id }));
}

async function createLyrics(c, store) {
  const unauthenticated = requireAuth(c);
  if (unauthenticated) return unauthenticated;
  const request = await body(c);
  if (!request.prompt && !request.title) return sunoError(c, 400, 'prompt is required');
  if (!request.callBackUrl) return sunoError(c, 400, 'callBackUrl is required');

  const state = getState(store);
  const id = taskId(state, 'suno_lyrics');
  state.lyricsTasks[id] = {
    taskId: id,
    request,
    createTime: fixedNow,
  };
  state.callbacks.push({ taskId: id, url: request.callBackUrl, status: 'SUCCESS', createTime: fixedNow });
  saveState(store, state);
  return c.json(sunoResponse({ taskId: id }));
}

function recordInfo(c, store) {
  const unauthenticated = requireAuth(c);
  if (unauthenticated) return unauthenticated;
  const id = c.req.query('taskId');
  if (!id) return sunoError(c, 400, 'taskId is required');

  const task = getState(store).tasks[id];
  if (!task) return sunoError(c, 404, 'Task not found');
  return c.json(sunoResponse(taskRecord(task)));
}

function lyricsInfo(c, store) {
  const unauthenticated = requireAuth(c);
  if (unauthenticated) return unauthenticated;
  const id = c.req.query('taskId');
  if (!id) return sunoError(c, 400, 'taskId is required');

  const task = getState(store).lyricsTasks[id];
  if (!task) return sunoError(c, 404, 'Task not found');
  return c.json(sunoResponse(lyricsRecord(task)));
}

export const plugin = {
  name: 'suno',
  register(app, store) {
    app.get('/api/v1/generate/credit', (c) => {
      const unauthenticated = requireAuth(c);
      if (unauthenticated) return unauthenticated;
      return c.json(sunoResponse(getState(store).credits));
    });
    app.post('/api/v1/generate', (c) => createGenerate(c, store));
    app.get('/api/v1/generate/record-info', (c) => recordInfo(c, store));
    app.post('/api/v1/generate/extend', (c) => createGenerate(c, store, 'EXTEND'));
    app.post('/api/v1/wav/generate', (c) => createGenerate(c, store, 'WAV'));
    app.post('/api/v1/mp4/generate', (c) => createGenerate(c, store, 'MP4'));
    app.post('/api/v1/lyrics', (c) => createLyrics(c, store));
    app.get('/api/v1/lyrics/record-info', (c) => lyricsInfo(c, store));
    app.get('/suno/inspect/state', (c) => c.json(getState(store)));
  },
};

export const label = 'Suno API emulator';
export const endpoints = 'credits, music generation tasks, generation record info, lyrics tasks';
export const initConfig = { suno: { apiKey: 'suno-emulator-key' } };

export default plugin;
