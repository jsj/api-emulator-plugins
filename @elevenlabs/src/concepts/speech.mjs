function nowIso() {
  return new Date().toISOString();
}

function clampPageSize(value, fallback = 30) {
  return Math.max(1, Math.min(100, Number(value ?? fallback) || fallback));
}

function pageTokenOffset(token) {
  if (!token) return 0;
  const match = String(token).match(/^page_(\d+)$/);
  return match ? Number(match[1]) : 0;
}

export function searchVoices(current, query) {
  const pageSize = clampPageSize(query.page_size ?? query.pageSize);
  const offset = pageTokenOffset(query.next_page_token ?? query.nextPageToken);
  const search = String(query.search ?? '').trim().toLowerCase();
  const filtered = search
    ? current.voices.filter((voice) => `${voice.name} ${voice.description}`.toLowerCase().includes(search))
    : current.voices;
  const voices = filtered.slice(offset, offset + pageSize);
  const nextOffset = offset + voices.length;
  return {
    voices,
    has_more: nextOffset < filtered.length,
    total_count: filtered.length,
    next_page_token: nextOffset < filtered.length ? `page_${nextOffset}` : null,
  };
}

export function listHistory(current, query) {
  const pageSize = clampPageSize(query.page_size ?? query.pageSize, 20);
  const startAfter = query.start_after_history_item_id ?? query.startAfterHistoryItemId;
  const offset = startAfter ? current.history.findIndex((item) => item.history_item_id === startAfter) + 1 : 0;
  const start = Math.max(0, offset);
  const history = current.history.slice(start, start + pageSize);
  const hasMore = start + history.length < current.history.length;
  return {
    history,
    last_history_item_id: history.at(-1)?.history_item_id ?? null,
    has_more: hasMore,
    scanned_until: history.at(-1)?.date_unix ?? null,
  };
}

export function synthesizeSpeech(current, body, voiceId) {
  const voice = current.voices.find((item) => item.voice_id === voiceId);
  if (!voice) return { error: notFound(`Voice ${voiceId} not found`) };
  const text = String(body.text ?? '').trim();
  if (!text) return { error: validationError('body.text', 'Field required') };
  const modelId = body.model_id ?? body.modelId ?? current.models[0].model_id;
  const model = current.models.find((item) => item.model_id === modelId);
  if (!model) return { error: notFound(`Model ${modelId} not found`) };
  const id = `elevenlabs_history_${String(current.history.length + 1).padStart(4, '0')}`;
  const characterCountChangeFrom = current.user.subscription.character_count;
  const characterCountChangeTo = characterCountChangeFrom + text.length;
  current.user.subscription.character_count = characterCountChangeTo;
  current.history.unshift({
    history_item_id: id,
    request_id: `elevenlabs_req_${String(current.history.length + 1).padStart(4, '0')}`,
    voice_id: voice.voice_id,
    voice_name: voice.name,
    text,
    date_unix: Math.floor(Date.now() / 1000),
    character_count_change_from: characterCountChangeFrom,
    character_count_change_to: characterCountChangeTo,
    content_type: 'audio/mpeg',
    state: 'created',
    settings: body.voice_settings ?? body.voiceSettings ?? voice.settings,
    feedback: null,
    model_id: model.model_id,
    share_link_id: null,
    source: 'api',
    created_at: nowIso(),
  });
  return {
    audio: Buffer.from(`ID3\nElevenLabs emulator audio\nvoice=${voiceId}\nmodel=${modelId}\ntext=${text}\n`),
    characters: text.length,
    requestId: `elevenlabs_req_${String(current.history.length).padStart(4, '0')}`,
  };
}

export function notFound(message) {
  return { status: 404, payload: { detail: { status: 'not_found', message } } };
}

export function validationError(location, message) {
  return {
    status: 422,
    payload: {
      detail: [
        {
          loc: location.split('.'),
          msg: message,
          type: 'value_error',
        },
      ],
    },
  };
}
