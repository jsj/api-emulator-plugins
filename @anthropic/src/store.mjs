const INTERACTIONS_KEY = 'api-emulator:interactions';

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => [key, normalize(val)]));
}

function requestKey(value) {
  return JSON.stringify(normalize(value));
}

function interactions(store) {
  return store.getData(INTERACTIONS_KEY) ?? [];
}

export function findRecordedResponse(store, endpoint, request) {
  const key = requestKey(request);
  return interactions(store)
    .slice()
    .reverse()
    .find((entry) => entry.service === 'anthropic' && entry.method === 'POST' && entry.endpoint === endpoint && requestKey(entry.request) === key)?.response;
}

export function recordInteraction(store, endpoint, request, response) {
  store.setData(INTERACTIONS_KEY, [
    ...interactions(store),
    {
      service: 'anthropic',
      method: 'POST',
      endpoint,
      request: normalize(request),
      response,
      status: 200,
      recordedAt: new Date().toISOString(),
    },
  ]);
}
