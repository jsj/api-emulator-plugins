const STATE_KEY = 'xbox:state';
const FIXED_TIME = '2026-05-15T12:00:00Z';

function initialState(config = {}) {
  const applications = config.applications ?? [
    {
      id: '9NBLGGH4R315',
      primaryName: 'Emulator Adventure',
      packageFamilyName: 'Contoso.EmulatorAdventure_8wekyb3d8bbwe',
      pendingApplicationSubmission: { id: '1152921504621243649' },
      hasAdvancedListingPermission: true,
    },
  ];
  return {
    applications,
    submissions: config.submissions ?? {
      '9NBLGGH4R315': [
        submission('1152921504621243649', {
          status: 'PendingCommit',
          friendlyName: 'Emulator Adventure 1.0',
          listings: {
            en: {
              baseListing: {
                title: 'Emulator Adventure',
                shortDescription: 'A deterministic Xbox publishing emulator title.',
              },
            },
          },
        }),
      ],
    },
    flights: config.flights ?? {
      '9NBLGGH4R315': [
        {
          flightId: 'beta',
          friendlyName: 'Beta testers',
          groupIds: ['xbox_group_seed'],
          rankHigherThan: 'production',
        },
      ],
    },
    flightSubmissions: config.flightSubmissions ?? {
      '9NBLGGH4R315:beta': [submission('flight_submission_seed', { status: 'PendingCommit', friendlyName: 'Beta 1.0' })],
    },
    storeProducts: config.storeProducts ?? {
      '9NBLGGH4R315': {
        productId: '9NBLGGH4R315',
        metadata: {
          listings: {
            'en-us': {
              title: 'Emulator Adventure',
              shortDescription: 'A deterministic Xbox publishing emulator title.',
            },
          },
        },
        packages: [{ id: 'package_seed', fileName: 'EmulatorAdventure_1.0.0.0.msix', state: 'Ready' }],
        latestSubmission: { id: 'store_submission_seed', status: 'InProgress' },
      },
    },
    nextSubmissionId: 2,
  };
}

function submission(id, overrides = {}) {
  return {
    id,
    status: 'PendingCommit',
    statusDetails: { errors: [], warnings: [] },
    applicationCategory: 'Games',
    pricing: { trialPeriod: 'NoFreeTrial', marketSpecificPricings: {}, sales: [] },
    visibility: 'Public',
    targetPublishMode: 'Manual',
    targetPublishDate: FIXED_TIME,
    packages: [],
    trailers: [],
    createdDateTime: FIXED_TIME,
    ...overrides,
  };
}

function state(store) {
  const current = store.getData?.(STATE_KEY);
  if (current) return current;
  const next = initialState();
  store.setData?.(STATE_KEY, next);
  return next;
}

function saveState(store, next) {
  store.setData?.(STATE_KEY, next);
}

function paged(items, c) {
  const top = Number(c.req.query('top') ?? items.length) || items.length;
  const skip = Number(c.req.query('skip') ?? 0) || 0;
  const value = items.slice(skip, skip + top);
  const body = { value };
  if (skip + top < items.length) body['@nextLink'] = `applications?skip=${skip + top}&top=${top}`;
  return body;
}

function xboxError(c, code, message, status = 404) {
  return c.json({ code, message, target: c.req.url }, status);
}

function storeError(c, code, message, status = 404, target = 'product') {
  return c.json({ errors: [{ code, message, target }], responseData: {} }, status);
}

export const contract = {
  provider: 'xbox',
  source: 'Microsoft Store Submission API publishing-compatible subset for Xbox and Windows apps',
  docs: 'https://learn.microsoft.com/en-us/windows/uwp/monetize/create-and-manage-submissions-using-windows-store-services',
  baseUrls: ['https://manage.devcenter.microsoft.com/v1.0/my', 'https://api.store.microsoft.com'],
  scope: ['applications', 'submissions', 'submission-status', 'flights', 'flight-submissions', 'store-submission-metadata', 'packages'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'xbox',
  register(app, store) {
    app.get('/v1.0/my/applications', (c) => c.json(paged(state(store).applications, c)));

    app.get('/v1.0/my/applications/:applicationId', (c) => {
      const appRecord = state(store).applications.find((item) => item.id === c.req.param('applicationId'));
      if (!appRecord) return xboxError(c, 'ApplicationNotFound', 'The requested application was not found.');
      return c.json(appRecord);
    });

    app.post('/v1.0/my/applications/:applicationId/submissions', (c) => {
      const s = state(store);
      const applicationId = c.req.param('applicationId');
      if (!s.applications.some((item) => item.id === applicationId)) return xboxError(c, 'ApplicationNotFound', 'The requested application was not found.');
      const created = submission(`submission_${s.nextSubmissionId++}`);
      s.submissions[applicationId] = [...(s.submissions[applicationId] ?? []), created];
      saveState(store, s);
      return c.json(created, 201);
    });

    app.get('/v1.0/my/applications/:applicationId/submissions/:submissionId', (c) => {
      const found = (state(store).submissions[c.req.param('applicationId')] ?? []).find((item) => item.id === c.req.param('submissionId'));
      if (!found) return xboxError(c, 'SubmissionNotFound', 'The requested submission was not found.');
      return c.json(found);
    });

    app.put('/v1.0/my/applications/:applicationId/submissions/:submissionId', async (c) => {
      const s = state(store);
      const submissions = s.submissions[c.req.param('applicationId')] ?? [];
      const index = submissions.findIndex((item) => item.id === c.req.param('submissionId'));
      if (index === -1) return xboxError(c, 'SubmissionNotFound', 'The requested submission was not found.');
      const body = await c.req.json().catch(() => ({}));
      submissions[index] = { ...submissions[index], ...body, id: submissions[index].id, statusDetails: body.statusDetails ?? submissions[index].statusDetails };
      saveState(store, s);
      return c.json(submissions[index]);
    });

    app.post('/v1.0/my/applications/:applicationId/submissions/:submissionId/commit', (c) => {
      const s = state(store);
      const found = (s.submissions[c.req.param('applicationId')] ?? []).find((item) => item.id === c.req.param('submissionId'));
      if (!found) return xboxError(c, 'SubmissionNotFound', 'The requested submission was not found.');
      found.status = 'CommitStarted';
      saveState(store, s);
      return c.json({ status: found.status, statusDetails: found.statusDetails });
    });

    app.get('/v1.0/my/applications/:applicationId/submissions/:submissionId/status', (c) => {
      const found = (state(store).submissions[c.req.param('applicationId')] ?? []).find((item) => item.id === c.req.param('submissionId'));
      if (!found) return xboxError(c, 'SubmissionNotFound', 'The requested submission was not found.');
      return c.json({ status: found.status, statusDetails: found.statusDetails });
    });

    app.get('/v1.0/my/applications/:applicationId/listflights', (c) => c.json({ value: state(store).flights[c.req.param('applicationId')] ?? [] }));

    app.post('/v1.0/my/applications/:applicationId/flights/:flightId/submissions', (c) => {
      const s = state(store);
      const key = `${c.req.param('applicationId')}:${c.req.param('flightId')}`;
      const created = submission(`flight_submission_${s.nextSubmissionId++}`, { flightId: c.req.param('flightId') });
      s.flightSubmissions[key] = [...(s.flightSubmissions[key] ?? []), created];
      saveState(store, s);
      return c.json(created, 201);
    });

    app.get('/v1.0/my/applications/:applicationId/flights/:flightId/submissions/:submissionId', (c) => {
      const found = (state(store).flightSubmissions[`${c.req.param('applicationId')}:${c.req.param('flightId')}`] ?? []).find((item) => item.id === c.req.param('submissionId'));
      if (!found) return xboxError(c, 'SubmissionNotFound', 'The requested flight submission was not found.');
      return c.json(found);
    });

    app.put('/v1.0/my/applications/:applicationId/flights/:flightId/submissions/:submissionId', async (c) => {
      const s = state(store);
      const key = `${c.req.param('applicationId')}:${c.req.param('flightId')}`;
      const submissions = s.flightSubmissions[key] ?? [];
      const index = submissions.findIndex((item) => item.id === c.req.param('submissionId'));
      if (index === -1) return xboxError(c, 'SubmissionNotFound', 'The requested flight submission was not found.');
      submissions[index] = { ...submissions[index], ...(await c.req.json().catch(() => ({}))) };
      saveState(store, s);
      return c.json(submissions[index]);
    });

    app.post('/v1.0/my/applications/:applicationId/flights/:flightId/submissions/:submissionId/commit', (c) => {
      const s = state(store);
      const found = (s.flightSubmissions[`${c.req.param('applicationId')}:${c.req.param('flightId')}`] ?? []).find((item) => item.id === c.req.param('submissionId'));
      if (!found) return xboxError(c, 'SubmissionNotFound', 'The requested flight submission was not found.');
      found.status = 'CommitStarted';
      saveState(store, s);
      return c.json({ status: found.status, statusDetails: found.statusDetails });
    });

    app.get('/v1.0/my/applications/:applicationId/flights/:flightId/submissions/:submissionId/status', (c) => {
      const found = (state(store).flightSubmissions[`${c.req.param('applicationId')}:${c.req.param('flightId')}`] ?? []).find((item) => item.id === c.req.param('submissionId'));
      if (!found) return xboxError(c, 'SubmissionNotFound', 'The requested flight submission was not found.');
      return c.json({ status: found.status, statusDetails: found.statusDetails });
    });

    app.get('/submission/v1/product/:productId/metadata/listings', (c) => {
      const product = state(store).storeProducts[c.req.param('productId')];
      if (!product) return storeError(c, 'productnotfound', 'Product was not found.');
      return c.json({ responseData: product.metadata, errors: [] });
    });

    app.put('/submission/v1/product/:productId/metadata/listings', async (c) => {
      const s = state(store);
      const product = s.storeProducts[c.req.param('productId')];
      if (!product) return storeError(c, 'productnotfound', 'Product was not found.');
      product.metadata = await c.req.json().catch(() => product.metadata);
      saveState(store, s);
      return c.json({ responseData: product.metadata, errors: [] });
    });

    app.get('/submission/v1/product/:productId/packages', (c) => {
      const product = state(store).storeProducts[c.req.param('productId')];
      if (!product) return storeError(c, 'productnotfound', 'Product was not found.');
      return c.json({ responseData: { packages: product.packages }, errors: [] });
    });

    app.put('/submission/v1/product/:productId/packages', async (c) => {
      const s = state(store);
      const product = s.storeProducts[c.req.param('productId')];
      if (!product) return storeError(c, 'productnotfound', 'Product was not found.');
      const body = await c.req.json().catch(() => ({}));
      product.packages = body.packages ?? product.packages;
      saveState(store, s);
      return c.json({ responseData: { packages: product.packages }, errors: [] });
    });

    app.patch('/submission/v1/product/:productId/packages/:packageId', async (c) => {
      const s = state(store);
      const product = s.storeProducts[c.req.param('productId')];
      if (!product) return storeError(c, 'productnotfound', 'Product was not found.');
      const item = product.packages.find((pkg) => pkg.id === c.req.param('packageId'));
      if (!item) return storeError(c, 'packagenotfound', 'Package was not found.', 404, 'packages');
      Object.assign(item, await c.req.json().catch(() => ({})));
      saveState(store, s);
      return c.json({ responseData: item, errors: [] });
    });

    app.post('/submission/v1/product/:productId/submission', (c) => {
      const s = state(store);
      const product = s.storeProducts[c.req.param('productId')];
      if (!product) return storeError(c, 'productnotfound', 'Product was not found.');
      product.latestSubmission = { id: `store_submission_${s.nextSubmissionId++}`, status: 'InProgress' };
      saveState(store, s);
      return c.json({ responseData: product.latestSubmission, errors: [] }, 201);
    });

    app.get('/submission/v1/product/:productId/submission/:submissionId/status', (c) => {
      const product = state(store).storeProducts[c.req.param('productId')];
      if (!product || product.latestSubmission.id !== c.req.param('submissionId')) return storeError(c, 'submissionnotfound', 'Submission was not found.', 404, 'submission');
      return c.json({ responseData: product.latestSubmission, errors: [] });
    });

    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Xbox Publishing API emulator';
export const endpoints = 'Microsoft Store applications, submissions, flights, metadata, packages, and submission status';
export const capabilities = contract.scope;
export const initConfig = { xbox: initialState() };
export default plugin;
