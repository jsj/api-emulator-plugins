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
    organizations: [{ id: '1', slug: 'emulator', name: 'Emulator Org' }],
    projects: [{ id: '1', slug: 'api', name: 'API', organization: 'emulator', team: { id: '1', slug: 'emulator', name: 'Emulator' }, platform: 'javascript' }],
    releases: [{ version: '1.0.0', shortVersion: '1.0.0', ref: null, url: null, dateCreated: now(), dateReleased: null, projects: [{ slug: 'api', name: 'API' }] }],
    releaseFiles: {},
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
