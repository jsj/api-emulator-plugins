function now() {
  return new Date().toISOString();
}

function initialState(config = {}) {
  return {
    edits: config.edits ?? [{ id: 'edit_cli_smoke', expiryTimeSeconds: '1893456000' }],
    tracks: config.tracks ?? [{ track: 'production', releases: [{ name: '1.0.0', versionCodes: ['100'], status: 'completed' }] }],
    reviews: config.reviews ?? [{
      reviewId: 'review_cli_smoke',
      authorName: 'Emulator User',
      comments: [{ userComment: { text: 'Works well', starRating: 5, lastModified: { seconds: '1893456000' } } }],
    }],
    products: config.products ?? [{ sku: 'coins_100', status: 'active', purchaseType: 'managedUser', defaultPrice: { priceMicros: '1990000', currency: 'USD' } }],
    subscriptions: config.subscriptions ?? [{ productId: 'pro_monthly', basePlans: [{ basePlanId: 'monthly', state: 'ACTIVE' }] }],
    vitalsIssues: config.vitalsIssues ?? [{
      name: 'apps/com.example.app/errorIssues/error_cli_smoke',
      type: 'CRASH',
      cause: 'java.lang.RuntimeException',
      location: 'MainActivity.kt:42',
      errorReportCount: '1',
      distinctUsers: '1',
    }],
    nextEditId: 2,
  };
}

function state(store) {
  const current = store.getData?.('google-play:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('google-play:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('google-play:state', next);
}

export const contract = {
  provider: 'google-play',
  source: 'Google Android Publisher and Play Developer Reporting API CLI-compatible subset',
  docs: 'https://developers.google.com/android-publisher',
  scope: ['edits', 'tracks', 'reviews', 'in-app-products', 'subscriptions', 'vitals-error-issues'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'google-play',
  register(app, store) {
    app.post('/androidpublisher/v3/applications/:packageName/edits', (c) => {
      const s = state(store);
      const edit = { id: `edit_${s.nextEditId++}`, expiryTimeSeconds: '1893456000' };
      s.edits.push(edit);
      saveState(store, s);
      return c.json(edit, 200);
    });

    app.post('/androidpublisher/v3/applications/:packageName/edits/:editId:commit', (c) => {
      const edit = state(store).edits.find((item) => item.id === c.req.param('editId')) ?? { id: c.req.param('editId') };
      return c.json({ ...edit, committed: true });
    });

    app.get('/androidpublisher/v3/applications/:packageName/edits/:editId/tracks', (c) => c.json({ tracks: state(store).tracks }));
    app.get('/androidpublisher/v3/applications/:packageName/edits/:editId/tracks/:track', (c) => {
      const track = state(store).tracks.find((item) => item.track === c.req.param('track'));
      if (!track) return c.json({ error: { message: 'Track not found' } }, 404);
      return c.json(track);
    });
    app.put('/androidpublisher/v3/applications/:packageName/edits/:editId/tracks/:track', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const track = { track: c.req.param('track'), releases: body.releases ?? [] };
      s.tracks = s.tracks.filter((item) => item.track !== track.track);
      s.tracks.push(track);
      saveState(store, s);
      return c.json(track);
    });

    app.get('/androidpublisher/v3/applications/:packageName/reviews', (c) => c.json({ reviews: state(store).reviews }));
    app.post('/androidpublisher/v3/applications/:packageName/reviews/:reviewId:reply', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      return c.json({ result: { replyText: body.replyText ?? '', lastEdited: { seconds: String(Math.floor(Date.now() / 1000)) } } });
    });

    app.get('/androidpublisher/v3/applications/:packageName/inappproducts', (c) => c.json({ inappproduct: state(store).products }));
    app.get('/androidpublisher/v3/applications/:packageName/subscriptions', (c) => c.json({ subscriptions: state(store).subscriptions }));
    app.get('/androidpublisher/v3/applications/:packageName/monetization/subscriptions', (c) => c.json({ subscriptions: state(store).subscriptions }));
    app.get('/v1beta1/apps/:packageName/errorIssues:search', (c) => c.json({ errorIssues: state(store).vitalsIssues }));
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Google Play API emulator';
export const endpoints = 'Android Publisher edits/tracks/reviews/products/subscriptions and Play Developer Reporting vitals issues';
export const capabilities = contract.scope;
export const initConfig = { googlePlay: initialState() };
export default plugin;
