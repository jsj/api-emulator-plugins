export function now() {
  return new Date().toISOString();
}

export function sentryState(store) {
  const current = store.getData?.('sentry:state');
  if (current) return current;
  const initial = {
    targets: [],
    deliveries: [],
    issues: [],
    nextIssueId: 1000,
  };
  store.setData?.('sentry:state', initial);
  return initial;
}

export function saveState(store, state) {
  store.setData?.('sentry:state', state);
}

export async function parseBody(c) {
  return c.req.json().catch(() => ({}));
}
