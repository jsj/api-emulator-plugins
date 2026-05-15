export const IMAGE_TEXT = 'openai-emulator-image';
export const IMAGE_BASE64 = Buffer.from(IMAGE_TEXT).toString('base64');
export const INTERACTIONS_KEY = 'api-emulator:interactions';

export function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => [key, normalize(val)]));
}

export function requestKey(value) {
  return JSON.stringify(normalize(value));
}

export function interactions(store) {
  return store.getData(INTERACTIONS_KEY) ?? [];
}

export function findRecordedResponse(store, service, endpoint, request) {
  const key = requestKey(request);
  return interactions(store)
    .slice()
    .reverse()
    .find((entry) => entry.service === service && entry.method === 'POST' && entry.endpoint === endpoint && requestKey(entry.request) === key)?.response;
}

export function recordInteraction(store, service, endpoint, request, response) {
  store.setData(INTERACTIONS_KEY, [
    ...interactions(store),
    {
      service,
      method: 'POST',
      endpoint,
      request: normalize(request),
      response,
      status: 200,
      recordedAt: new Date().toISOString(),
    },
  ]);
}
