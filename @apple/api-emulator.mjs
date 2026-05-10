function now() {
  return new Date().toISOString();
}

const APNS_FAILURE_REASONS = new Set([
  'BadDeviceToken',
  'BadExpirationDate',
  'BadPriority',
  'BadPushType',
  'BadTopic',
  'ExpiredProviderToken',
  'Forbidden',
  'DeviceTokenNotForTopic',
  'InvalidProviderToken',
  'PayloadEmpty',
  'TopicDisallowed',
  'TooManyRequests',
  'Unregistered',
]);

export const contract = {
  provider: 'apple',
  source: 'Apple APNs provider API documentation and App Store Connect API JSON:API conventions',
  docs: 'https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns',
  scope: [
    'apns-auth',
    'teams',
    'keys',
    'topics',
    'environments',
    'device-tokens',
    'notifications',
    'collapse-id',
    'expiration',
    'error-reasons',
    'asc-apps',
    'asc-build-uploads',
    'asc-upload-operations',
    'asc-builds',
    'asc-testflight',
    'asc-app-store-versions',
    'asc-review-submissions',
    'asc-readiness',
  ],
  fidelity: 'resource-model-subset',
};

function fakeSignedHeaders(body = {}) {
  const request = body.request ?? {};
  return {
    headers: {
      'X-Apple-MD': 'fake-md',
      'X-Apple-MD-M': 'fake-md-m',
      'X-Apple-MD-RINFO': '17106176',
      'X-Apple-MD-LU': 'fake-lu',
      'X-VPhone-Apple-Emulator': '1',
    },
    mescalSignature: 'fake-mescal-signature',
    request: {
      url: request.url ?? null,
      method: request.method ?? null,
    },
    issuedAt: now(),
  };
}

function apnsDeliveries(store) {
  return store.getData?.('apple:apns-deliveries') ?? [];
}

function apnsFailures(store) {
  return store.getData?.('apple:apns-failures') ?? {};
}

function apnsState(store) {
  const current = store.getData?.('apple:apns-state');
  if (current) return current;
  const initial = {
    teams: {},
    keys: {},
    devices: {},
    topics: {},
    collapsed: {},
    pending: [],
    throttles: {},
  };
  store.setData?.('apple:apns-state', initial);
  return initial;
}

function saveApnsState(store, state) {
  store.setData?.('apple:apns-state', state);
}

function ascState(store) {
  const current = store.getData?.('apple:asc-state');
  if (current) return current;
  const app = resource('apps', '1234567890', {
    name: 'Apple Emulator App',
    bundleId: 'com.example.app',
    sku: 'XC-EMU',
    primaryLocale: 'en-US',
    contentRightsDeclaration: 'USES_THIRD_PARTY_CONTENT',
  });
  const appInfo = resource('appInfos', 'app-info-1', {
    primaryLocale: 'en-US',
    appStoreState: 'READY_FOR_SALE',
  }, {
    app: linkage('apps', app.id),
  });
  const appInfoLocalization = resource('appInfoLocalizations', 'app-info-loc-en-US', {
    locale: 'en-US',
    name: 'Apple Emulator App',
    subtitle: 'Local ASC emulator',
    privacyPolicyUrl: 'https://example.com/privacy',
  }, {
    appInfo: linkage('appInfos', appInfo.id),
  });
  const version = resource('appStoreVersions', 'version-1', {
    platform: 'IOS',
    versionString: '1.0.0',
    appStoreState: 'PREPARE_FOR_SUBMISSION',
    earliestReleaseDate: null,
    releaseType: 'AFTER_APPROVAL',
    copyright: '2026 Example',
  }, {
    app: linkage('apps', app.id),
    build: { data: null },
  });
  const versionLocalization = resource('appStoreVersionLocalizations', 'version-loc-en-US', {
    locale: 'en-US',
    description: 'A locally emulated App Store listing.',
    keywords: 'emulator,testing,xc',
    marketingUrl: 'https://example.com',
    promotionalText: 'Testing App Store Connect end-to-end.',
    supportUrl: 'https://example.com/support',
    whatsNew: 'Initial emulator release.',
  }, {
    appStoreVersion: linkage('appStoreVersions', version.id),
  });
  const reviewDetail = resource('appStoreReviewDetails', 'review-detail-1', {
    contactFirstName: 'App',
    contactLastName: 'Reviewer',
    contactEmail: 'review@example.com',
    contactPhone: '+15555550100',
    demoAccountName: 'demo@example.com',
    demoAccountPassword: 'password',
    demoAccountRequired: true,
    notes: 'Use the demo account.',
  }, {
    appStoreVersion: linkage('appStoreVersions', version.id),
  });
  const initial = {
    apps: { [app.id]: app },
    appInfos: { [appInfo.id]: appInfo },
    appInfoLocalizations: { [appInfoLocalization.id]: appInfoLocalization },
    appStoreVersions: { [version.id]: version },
    appStoreVersionLocalizations: { [versionLocalization.id]: versionLocalization },
    appStoreReviewDetails: { [reviewDetail.id]: reviewDetail },
    buildUploads: {},
    buildUploadFiles: {},
    uploadOperations: {},
    uploadChunks: {},
    builds: {},
    betaGroups: {},
    betaTesters: {},
    betaAppLocalizations: {},
    betaReviewSubmissions: {},
    reviewSubmissions: {},
    reviewSubmissionItems: {},
    appPriceSchedules: {
      'price-schedule-1': resource('appPriceSchedules', 'price-schedule-1', {
        baseTerritory: 'USA',
        customerPrice: '0.00',
        proceeds: '0.00',
      }, {
        app: linkage('apps', app.id),
      }),
    },
    territoryAvailabilities: {
      USA: resource('territoryAvailabilities', 'USA', { territory: 'USA', available: true }, { app: linkage('apps', app.id) }),
    },
    ageRatingDeclarations: {
      'age-rating-1': resource('ageRatingDeclarations', 'age-rating-1', {
        alcoholTobaccoOrDrugUseOrReferences: 'NONE',
        gambling: false,
        kidsAgeBand: null,
      }, {
        app: linkage('apps', app.id),
      }),
    },
    appEncryptionDeclarations: {
      'encryption-1': resource('appEncryptionDeclarations', 'encryption-1', {
        usesEncryption: false,
        exempt: true,
        uploadedDate: now(),
      }, {
        app: linkage('apps', app.id),
      }),
    },
    requests: [],
    failures: {},
    counters: {
      buildUpload: 1,
      buildUploadFile: 1,
      build: 1,
      appStoreVersion: 2,
      reviewSubmission: 1,
      reviewSubmissionItem: 1,
      betaGroup: 1,
      betaTester: 1,
      betaReviewSubmission: 1,
      localization: 2,
    },
  };
  store.setData?.('apple:asc-state', initial);
  return initial;
}

function saveAscState(store, state) {
  store.setData?.('apple:asc-state', state);
}

function linkage(type, id) {
  return { data: { type, id } };
}

function resource(type, id, attributes = {}, relationships = {}) {
  return { type, id, attributes, relationships, links: { self: `/v1/${type}/${id}` } };
}

function collection(values) {
  return { data: Object.values(values), meta: { paging: { total: Object.keys(values).length } } };
}

function single(data) {
  return { data };
}

function jsonApiError(status, title, detail = title) {
  return { errors: [{ status: String(status), title, detail }] };
}

function bodyData(body) {
  return body?.data ?? {};
}

function attrs(body) {
  return bodyData(body).attributes ?? {};
}

function rels(body) {
  return bodyData(body).relationships ?? {};
}

function relationshipId(relationships, name) {
  return relationships?.[name]?.data?.id ?? null;
}

function requestOrigin(c) {
  if (c.req.url) {
    try {
      return new URL(c.req.url).origin;
    } catch {}
  }
  const host = c.req.header?.('host');
  const proto = c.req.header?.('x-forwarded-proto') ?? 'http';
  return host ? `${proto}://${host}` : 'http://localhost';
}

function recordAscRequest(store, c, body = null) {
  const state = ascState(store);
  state.requests.push({
    method: c.req.method ?? null,
    path: c.req.path ?? null,
    url: c.req.url ?? null,
    body,
    at: now(),
  });
  saveAscState(store, state);
}

function maybeAscFailure(store, key) {
  const failures = ascState(store).failures;
  return failures[key] ?? failures['*'] ?? null;
}

function nextId(state, key, prefix) {
  const value = state.counters[key]++;
  return `${prefix}-${value}`;
}

function filterResources(values, filters = {}) {
  let items = Object.values(values);
  for (const [key, expected] of Object.entries(filters)) {
    if (!expected) continue;
    items = items.filter((item) => {
      if (item.id === expected) return true;
      if (item.attributes?.[key] === expected) return true;
      return Object.values(item.relationships ?? {}).some((relationship) => relationship?.data?.id === expected);
    });
  }
  return items;
}

async function parseRawBody(c) {
  if (c.req.arrayBuffer) return Buffer.from(await c.req.arrayBuffer());
  if (c.req.blob) return Buffer.from(await (await c.req.blob()).arrayBuffer());
  if (c.req.text) return Buffer.from(await c.req.text());
  return Buffer.alloc(0);
}

function saveApnsDelivery(store, delivery) {
  const deliveries = apnsDeliveries(store);
  store.setData?.('apple:apns-deliveries', [...deliveries, delivery]);
  store.setData?.('apple:apns-last-delivery', delivery);
}

function savePendingDelivery(store, pending) {
  const state = apnsState(store);
  if (pending.headers['apns-collapse-id']) {
    const collapseKey = `${pending.topic}:${pending.headers['apns-collapse-id']}`;
    state.pending = state.pending.filter((item) => `${item.topic}:${item.headers?.['apns-collapse-id']}` !== collapseKey);
    state.collapsed[collapseKey] = pending.apnsId;
  }
  state.pending.push(pending);
  saveApnsState(store, state);
}

function normalizeApnsFailure(body = {}) {
  const reason = typeof body.reason === 'string' ? body.reason : 'BadDeviceToken';
  return {
    reason: APNS_FAILURE_REASONS.has(reason) ? reason : 'BadDeviceToken',
    status: Number.isInteger(body.status) ? body.status : 400,
  };
}

function apnsResponse(delivery) {
  return {
    ok: true,
    apnsId: delivery.apnsId,
    deviceToken: delivery.deviceToken,
    topic: delivery.topic,
    environment: delivery.environment,
    deliveredAt: delivery.deliveredAt,
  };
}

async function parseBody(c) {
  return c.req.json().catch(() => ({}));
}

function createApnsDelivery({ token, payload, headers = {}, proxy = false }) {
  const apnsId = headers['apns-id'] ?? crypto.randomUUID();
  const topic = headers['apns-topic'] ?? payload.topic ?? null;
  return {
    apnsId,
    deviceToken: token,
    topic,
    payload,
    headers,
    proxy,
    pushType: headers['apns-push-type'] ?? payload.pushType ?? 'alert',
    collapseId: headers['apns-collapse-id'] ?? null,
    priority: headers['apns-priority'] ?? null,
    expiresAt: headers['apns-expiration'] ? Number(headers['apns-expiration']) : null,
    environment: payload.useSandbox ? 'sandbox' : 'production',
    deliveredAt: now(),
  };
}

function validateApnsAuth(state, headers = {}) {
  const authorization = headers.authorization;
  if (!authorization) return null;
  if (!String(authorization).startsWith('bearer ') && !String(authorization).startsWith('Bearer ')) {
    return { reason: 'InvalidProviderToken', status: 403 };
  }

  const token = String(authorization).replace(/^bearer\s+/i, '');
  const parts = token.split(':');
  const teamId = headers['apns-team-id'] ?? parts[0];
  const keyId = headers['apns-key-id'] ?? parts[1];

  if (Object.keys(state.teams).length > 0 && (!teamId || !state.teams[teamId] || state.teams[teamId].status === 'disabled')) {
    return { reason: 'Forbidden', status: 403 };
  }
  if (Object.keys(state.keys).length > 0) {
    const key = state.keys[keyId];
    if (!key || key.status === 'revoked') return { reason: 'InvalidProviderToken', status: 403 };
    if (teamId && key.teamId !== teamId) return { reason: 'InvalidProviderToken', status: 403 };
  }
  return null;
}

function validateApnsTopic(state, { topic, token, environment }) {
  const topicRecord = state.topics[topic];
  if (topicRecord) {
    if (topicRecord.status === 'disabled') return { reason: 'TopicDisallowed', status: 403 };
    if (topicRecord.environments && !topicRecord.environments.includes(environment)) return { reason: 'BadTopic', status: 400 };
  }

  const device = state.devices[token];
  if (device?.topic && device.topic !== topic) return { reason: 'DeviceTokenNotForTopic', status: 400 };
  if (device?.environment && device.environment !== environment) return { reason: 'BadDeviceToken', status: 400 };
  return null;
}

function consumeThrottle(state, token) {
  const throttle = state.throttles[token] ?? state.throttles['*'];
  if (!throttle) return null;

  const nowMs = Date.now();
  const windowMs = Number(throttle.windowSeconds ?? 60) * 1000;
  throttle.timestamps = (throttle.timestamps ?? []).filter((timestamp) => nowMs - timestamp < windowMs);
  if (throttle.timestamps.length >= Number(throttle.limit ?? 1)) {
    return { reason: 'TooManyRequests', status: 429 };
  }
  throttle.timestamps.push(nowMs);
  return null;
}

function validateApnsRequest(store, { token, payload, headers = {} }) {
  const state = apnsState(store);
  const topic = headers['apns-topic'] ?? payload.topic;
  const pushType = headers['apns-push-type'] ?? 'alert';
  const priority = headers['apns-priority'];
  const expiration = Number(headers['apns-expiration'] ?? 0);
  const environment = payload.useSandbox ? 'sandbox' : 'production';

  if (!token) return { reason: 'BadDeviceToken', status: 400 };
  if (!payload || Object.keys(payload).length === 0) return { reason: 'PayloadEmpty', status: 400 };
  if (!topic) return { reason: 'BadTopic', status: 400 };
  if (priority && !['5', '10'].includes(String(priority))) return { reason: 'BadPriority', status: 400 };
  if (expiration > 0 && expiration < Math.floor(Date.now() / 1000)) return { reason: 'BadExpirationDate', status: 400 };
  const authValidation = validateApnsAuth(state, headers);
  if (authValidation) return authValidation;
  if (state.devices[token]?.status === 'unregistered') return { reason: 'Unregistered', status: 410 };
  const topicValidation = validateApnsTopic(state, { topic, token, environment });
  if (topicValidation) return topicValidation;
  if (pushType === 'background' && payload.aps?.alert) return { reason: 'BadPushType', status: 400 };
  const throttleValidation = consumeThrottle(state, token);
  if (throttleValidation) return throttleValidation;
  return null;
}

function registerApnsDevice(store, body) {
  const state = apnsState(store);
  const token = body.deviceToken ?? body.token ?? crypto.randomUUID().replaceAll('-', '').slice(0, 64).padEnd(64, '0');
  state.devices[token] = {
    token,
    topic: body.topic ?? null,
    environment: body.environment ?? (body.useSandbox ? 'sandbox' : 'production'),
    status: body.status ?? 'registered',
    registeredAt: now(),
  };
  if (body.topic) state.topics[body.topic] = { topic: body.topic, updatedAt: now() };
  saveApnsState(store, state);
  return state.devices[token];
}

function registerApnsTeam(store, body) {
  const state = apnsState(store);
  const teamId = body.teamId ?? body.id ?? 'TEAMID1234';
  state.teams[teamId] = {
    teamId,
    name: body.name ?? 'Apple Emulator Team',
    status: body.status ?? 'active',
    createdAt: now(),
  };
  saveApnsState(store, state);
  return state.teams[teamId];
}

function registerApnsKey(store, body) {
  const state = apnsState(store);
  const teamId = body.teamId ?? 'TEAMID1234';
  if (!state.teams[teamId]) state.teams[teamId] = registerApnsTeam(store, { teamId });
  const keyId = body.keyId ?? body.id ?? 'KEYID12345';
  state.keys[keyId] = {
    keyId,
    teamId,
    status: body.status ?? 'active',
    createdAt: now(),
  };
  saveApnsState(store, state);
  return state.keys[keyId];
}

function registerApnsTopic(store, body) {
  const state = apnsState(store);
  const topic = body.topic ?? body.bundleId ?? 'com.example.app';
  state.topics[topic] = {
    topic,
    bundleId: body.bundleId ?? topic,
    teamId: body.teamId ?? null,
    environments: body.environments ?? ['sandbox', 'production'],
    status: body.status ?? 'active',
    updatedAt: now(),
  };
  saveApnsState(store, state);
  return state.topics[topic];
}

function pendingResponse(delivery) {
  return {
    ok: true,
    queued: true,
    apnsId: delivery.apnsId,
    deviceToken: delivery.deviceToken,
    topic: delivery.topic,
    environment: delivery.environment,
    expiresAt: delivery.expiresAt,
    queuedAt: delivery.queuedAt,
  };
}

function shouldQueueDelivery(store, token, delivery) {
  const state = apnsState(store);
  const device = state.devices[token];
  return device?.status === 'offline' && delivery.expiresAt && delivery.expiresAt > Math.floor(Date.now() / 1000);
}

function queueOrDeliverApns(store, delivery) {
  if (shouldQueueDelivery(store, delivery.deviceToken, delivery)) {
    const pending = {
      ...delivery,
      queuedAt: now(),
      deliveredAt: null,
    };
    savePendingDelivery(store, pending);
    return { delivery: pending, queued: true };
  }

  if (delivery.headers['apns-collapse-id']) {
    const state = apnsState(store);
    state.collapsed[`${delivery.topic}:${delivery.headers['apns-collapse-id']}`] = delivery.apnsId;
    saveApnsState(store, state);
  }
  saveApnsDelivery(store, delivery);
  return { delivery, queued: false };
}

function flushPendingDeliveries(store, token) {
  const state = apnsState(store);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const deliverable = [];
  const retained = [];
  for (const pending of state.pending) {
    if (token && pending.deviceToken !== token) {
      retained.push(pending);
      continue;
    }
    if (pending.expiresAt && pending.expiresAt <= nowSeconds) continue;
    deliverable.push({ ...pending, deliveredAt: now() });
  }
  state.pending = retained;
  saveApnsState(store, state);
  for (const delivery of deliverable) saveApnsDelivery(store, delivery);
  return deliverable;
}

export const plugin = {
  name: 'apple',
  register(app, store) {
    app.get('/bag.xml', (c) => c.json({
      status: 0,
      bag: {
        profile: 'AMSCore',
        profileVersion: '1',
        environment: 'emulator',
      },
      issuedAt: now(),
    }));

    app.post('/v1/signSapSetup', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      const response = fakeSignedHeaders(body);
      store.setData?.('apple:last-sign-sap-setup', body);
      store.setData?.('apple:last-sign-sap-setup-response', response);
      return c.json(response);
    });

    app.post('/auth/signin', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      store.setData?.('apple:last-signin', body);
      return c.json({
        ok: true,
        user: {
          id: 'apple-emulator-user',
          email: 'demo@apple-emulator.local',
        },
        token: 'apple-emulator-token',
        issuedAt: now(),
      });
    });

    app.post('/3/device/:deviceToken', async (c) => {
      const deviceToken = c.req.param('deviceToken');
      const failures = apnsFailures(store);
      const failure = failures[deviceToken] ?? failures['*'];
      if (failure) return c.json({ reason: failure.reason }, failure.status);

      const payload = await parseBody(c);
      const headers = {
        'apns-id': c.req.header('apns-id'),
        'apns-topic': c.req.header('apns-topic'),
        'apns-push-type': c.req.header('apns-push-type'),
        'apns-collapse-id': c.req.header('apns-collapse-id'),
        'apns-priority': c.req.header('apns-priority'),
        'apns-expiration': c.req.header('apns-expiration'),
        'apns-team-id': c.req.header('apns-team-id'),
        'apns-key-id': c.req.header('apns-key-id'),
        authorization: c.req.header('authorization'),
      };
      const validation = validateApnsRequest(store, { token: deviceToken, payload, headers });
      if (validation) return c.json({ reason: validation.reason }, validation.status);
      const delivery = createApnsDelivery({
        token: deviceToken,
        payload,
        headers,
      });
      const result = queueOrDeliverApns(store, delivery);
      return c.json(result.queued ? pendingResponse(result.delivery) : apnsResponse(result.delivery), 200);
    });

    app.post('/apns/send', async (c) => {
      const body = await parseBody(c);
      const deviceToken = body.deviceToken ?? body.token;
      if (!deviceToken) return c.json({ error: 'deviceToken is required', reason: 'BadDeviceToken' }, 400);

      const failures = apnsFailures(store);
      const failure = failures[deviceToken] ?? failures['*'];
      if (failure) return c.json({ error: failure.reason, reason: failure.reason }, failure.status);

      const headers = {
        'apns-topic': body.topic,
        'apns-collapse-id': body.payload?.collapseId,
        'apns-push-type': body.payload?.pushType ?? 'alert',
        'apns-priority': body.priority ?? body.payload?.priority,
        'apns-expiration': body.expiration ?? body.expiresAt ?? body.payload?.expiration,
        'apns-team-id': body.teamId,
        'apns-key-id': body.keyId,
        authorization: body.signingKey || body.teamId || body.keyId
          ? `bearer ${body.teamId ?? 'TEAMID1234'}:${body.keyId ?? 'KEYID12345'}:emulator-token`
          : undefined,
      };
      const validation = validateApnsRequest(store, { token: deviceToken, payload: body.payload, headers });
      if (validation) return c.json({ error: validation.reason, reason: validation.reason }, validation.status);

      const delivery = createApnsDelivery({
        token: deviceToken,
        payload: {
          ...body.payload,
          teamId: body.teamId,
          keyId: body.keyId,
          topic: body.topic,
          useSandbox: body.useSandbox === true,
        },
        headers,
        proxy: true,
      });
      const result = queueOrDeliverApns(store, delivery);
      return c.json(result.queued ? pendingResponse(result.delivery) : apnsResponse(result.delivery), 200);
    });

    app.post('/apns/control/register-team', async (c) => {
      const body = await parseBody(c);
      return c.json(registerApnsTeam(store, body));
    });

    app.post('/apns/control/register-key', async (c) => {
      const body = await parseBody(c);
      return c.json(registerApnsKey(store, body));
    });

    app.post('/apns/control/register-topic', async (c) => {
      const body = await parseBody(c);
      return c.json(registerApnsTopic(store, body));
    });

    app.post('/apns/control/register-device', async (c) => {
      const body = await parseBody(c);
      return c.json(registerApnsDevice(store, body));
    });

    app.post('/apns/control/unregister-device', async (c) => {
      const body = await parseBody(c);
      const state = apnsState(store);
      const token = body.deviceToken ?? body.token;
      if (!token || !state.devices[token]) return c.json({ reason: 'BadDeviceToken' }, 400);
      state.devices[token].status = 'unregistered';
      state.devices[token].unregisteredAt = now();
      saveApnsState(store, state);
      return c.json(state.devices[token]);
    });

    app.post('/apns/control/set-device-status', async (c) => {
      const body = await parseBody(c);
      const state = apnsState(store);
      const token = body.deviceToken ?? body.token;
      if (!token || !state.devices[token]) return c.json({ reason: 'BadDeviceToken' }, 400);
      state.devices[token].status = body.status ?? 'registered';
      state.devices[token].updatedAt = now();
      saveApnsState(store, state);
      const flushed = state.devices[token].status === 'registered' ? flushPendingDeliveries(store, token) : [];
      return c.json({ device: state.devices[token], flushed });
    });

    app.post('/apns/control/throttle', async (c) => {
      const body = await parseBody(c);
      const state = apnsState(store);
      const token = body.deviceToken ?? body.token ?? '*';
      state.throttles[token] = {
        limit: Number(body.limit ?? 1),
        windowSeconds: Number(body.windowSeconds ?? 60),
        timestamps: [],
      };
      saveApnsState(store, state);
      return c.json({ ok: true, token, throttle: state.throttles[token] });
    });

    app.post('/apns/control/flush-pending', async (c) => {
      const body = await parseBody(c);
      return c.json({ flushed: flushPendingDeliveries(store, body.deviceToken ?? body.token) });
    });

    app.post('/apns/control/fail', async (c) => {
      const body = await parseBody(c);
      const token = body.deviceToken ?? body.token ?? '*';
      const failures = apnsFailures(store);
      const failure = normalizeApnsFailure(body);
      store.setData?.('apple:apns-failures', { ...failures, [token]: failure });
      return c.json({ ok: true, token, failure });
    });

    app.post('/apns/control/reset', (c) => {
      store.setData?.('apple:apns-deliveries', []);
      store.setData?.('apple:apns-last-delivery', null);
      store.setData?.('apple:apns-failures', {});
      store.setData?.('apple:apns-state', null);
      return c.json({ ok: true });
    });

    app.get('/v1/apps', (c) => {
      const failure = maybeAscFailure(store, 'apps');
      if (failure) return c.json(jsonApiError(failure.status, failure.reason), failure.status);
      return c.json(collection(ascState(store).apps));
    });

    app.get('/v1/apps/:id', (c) => {
      const appId = c.req.param('id');
      const appResource = ascState(store).apps[appId];
      if (!appResource) return c.json(jsonApiError(404, 'Not Found', `App ${appId} not found`), 404);
      return c.json(single(appResource));
    });

    app.get('/v1/apps/:id/appInfos', (c) => {
      const appId = c.req.param('id');
      const state = ascState(store);
      return c.json({ data: filterResources(state.appInfos, { app: appId }) });
    });

    app.get('/v1/appInfos/:id/appInfoLocalizations', (c) => {
      const state = ascState(store);
      return c.json({ data: filterResources(state.appInfoLocalizations, { appInfo: c.req.param('id') }) });
    });

    app.post('/v1/buildUploads', async (c) => {
      const body = await parseBody(c);
      recordAscRequest(store, c, body);
      const failure = maybeAscFailure(store, 'buildUploads');
      if (failure) return c.json(jsonApiError(failure.status, failure.reason), failure.status);
      const state = ascState(store);
      const attributes = attrs(body);
      const appId = relationshipId(rels(body), 'app');
      if (!appId || !state.apps[appId]) return c.json(jsonApiError(409, 'Invalid Relationship', 'buildUploads requires an existing app relationship'), 409);
      const id = nextId(state, 'buildUpload', 'build-upload');
      const upload = resource('buildUploads', id, {
        cfBundleShortVersionString: attributes.cfBundleShortVersionString ?? '1.0.0',
        cfBundleVersion: attributes.cfBundleVersion ?? String(state.counters.build),
        platform: attributes.platform ?? 'IOS',
        uploaded: false,
        processingState: 'WAITING_FOR_UPLOAD',
        createdDate: now(),
      }, {
        app: linkage('apps', appId),
      });
      state.buildUploads[id] = upload;
      saveAscState(store, state);
      return c.json(single(upload), 201);
    });

    app.post('/v1/buildUploadFiles', async (c) => {
      const body = await parseBody(c);
      recordAscRequest(store, c, body);
      const failure = maybeAscFailure(store, 'buildUploadFiles');
      if (failure) return c.json(jsonApiError(failure.status, failure.reason), failure.status);
      const state = ascState(store);
      const attributes = attrs(body);
      const uploadId = relationshipId(rels(body), 'buildUpload');
      const upload = state.buildUploads[uploadId];
      if (!upload) return c.json(jsonApiError(409, 'Invalid Relationship', 'buildUploadFiles requires an existing buildUpload relationship'), 409);
      const id = nextId(state, 'buildUploadFile', 'build-upload-file');
      const fileSize = Number(attributes.fileSize ?? 0);
      const operation = {
        method: 'PUT',
        url: `${requestOrigin(c)}/asc/uploads/${id}/0`,
        offset: 0,
        length: fileSize,
        requestHeaders: [{ name: 'Content-Type', value: 'application/octet-stream' }],
      };
      const file = resource('buildUploadFiles', id, {
        fileName: attributes.fileName ?? 'App.ipa',
        fileSize,
        uti: attributes.uti ?? 'com.apple.ipa',
        assetType: attributes.assetType ?? 'ASSET',
        uploaded: false,
        uploadOperations: [operation],
      }, {
        buildUpload: linkage('buildUploads', uploadId),
      });
      state.buildUploadFiles[id] = file;
      state.uploadOperations[id] = [operation];
      saveAscState(store, state);
      return c.json(single(file), 201);
    });

    app.put?.('/asc/uploads/:fileId/:operationIndex', async (c) => {
      const state = ascState(store);
      const fileId = c.req.param('fileId');
      const file = state.buildUploadFiles[fileId];
      if (!file) return c.json({ error: 'upload file not found' }, 404);
      const chunk = await parseRawBody(c);
      state.uploadChunks[fileId] = state.uploadChunks[fileId] ?? [];
      state.uploadChunks[fileId].push({
        operationIndex: c.req.param('operationIndex'),
        length: chunk.length,
        uploadedAt: now(),
      });
      saveAscState(store, state);
      return c.json({ ok: true, fileId, receivedBytes: chunk.length });
    });

    app.patch?.('/v1/buildUploadFiles/:id', async (c) => {
      const body = await parseBody(c);
      recordAscRequest(store, c, body);
      const state = ascState(store);
      const fileId = c.req.param('id');
      const file = state.buildUploadFiles[fileId];
      if (!file) return c.json(jsonApiError(404, 'Not Found', `Build upload file ${fileId} not found`), 404);
      file.attributes = { ...file.attributes, ...attrs(body), uploaded: attrs(body).uploaded ?? true };
      const upload = state.buildUploads[file.relationships.buildUpload.data.id];
      upload.attributes.uploaded = true;
      upload.attributes.processingState = 'PROCESSING';
      const buildId = nextId(state, 'build', 'build');
      const appId = upload.relationships.app.data.id;
      const build = resource('builds', buildId, {
        version: upload.attributes.cfBundleShortVersionString,
        buildNumber: upload.attributes.cfBundleVersion,
        processingState: 'PROCESSING',
        expired: false,
        uploadedDate: now(),
      }, {
        app: linkage('apps', appId),
        buildUpload: linkage('buildUploads', upload.id),
      });
      state.builds[buildId] = build;
      upload.relationships.build = linkage('builds', buildId);
      file.relationships.build = linkage('builds', buildId);
      saveAscState(store, state);
      return c.json(single(file));
    });

    app.get('/v1/builds', (c) => {
      const state = ascState(store);
      const appId = c.req.query?.('filter[app]');
      const version = c.req.query?.('filter[version]');
      const buildNumber = c.req.query?.('filter[buildNumber]');
      let builds = Object.values(state.builds);
      if (appId) builds = builds.filter((build) => build.relationships.app?.data?.id === appId);
      if (version) builds = builds.filter((build) => build.attributes.version === version);
      if (buildNumber) builds = builds.filter((build) => build.attributes.buildNumber === buildNumber);
      return c.json({ data: builds, meta: { paging: { total: builds.length } } });
    });

    app.get('/v1/builds/:id', (c) => {
      const build = ascState(store).builds[c.req.param('id')];
      if (!build) return c.json(jsonApiError(404, 'Not Found', 'Build not found'), 404);
      return c.json(single(build));
    });

    app.patch?.('/v1/builds/:id', async (c) => {
      const body = await parseBody(c);
      const state = ascState(store);
      const build = state.builds[c.req.param('id')];
      if (!build) return c.json(jsonApiError(404, 'Not Found', 'Build not found'), 404);
      build.attributes = { ...build.attributes, ...attrs(body) };
      saveAscState(store, state);
      return c.json(single(build));
    });

    app.get('/v1/apps/:id/builds', (c) => {
      const appId = c.req.param('id');
      const builds = Object.values(ascState(store).builds).filter((build) => build.relationships.app?.data?.id === appId);
      return c.json({ data: builds });
    });

    app.get('/v1/apps/:id/appStoreVersions', (c) => {
      const appId = c.req.param('id');
      const versions = Object.values(ascState(store).appStoreVersions).filter((version) => version.relationships.app?.data?.id === appId);
      return c.json({ data: versions });
    });

    app.post('/v1/appStoreVersions', async (c) => {
      const body = await parseBody(c);
      recordAscRequest(store, c, body);
      const state = ascState(store);
      const attributes = attrs(body);
      const appId = relationshipId(rels(body), 'app');
      if (!appId || !state.apps[appId]) return c.json(jsonApiError(409, 'Invalid Relationship', 'appStoreVersions requires an existing app relationship'), 409);
      const id = nextId(state, 'appStoreVersion', 'version');
      const version = resource('appStoreVersions', id, {
        platform: attributes.platform ?? 'IOS',
        versionString: attributes.versionString ?? '1.0.0',
        appStoreState: attributes.appStoreState ?? 'PREPARE_FOR_SUBMISSION',
        releaseType: attributes.releaseType ?? 'AFTER_APPROVAL',
        earliestReleaseDate: attributes.earliestReleaseDate ?? null,
        copyright: attributes.copyright ?? '2026 Example',
      }, {
        app: linkage('apps', appId),
        build: { data: null },
      });
      state.appStoreVersions[id] = version;
      saveAscState(store, state);
      return c.json(single(version), 201);
    });

    app.get('/v1/appStoreVersions/:id', (c) => {
      const version = ascState(store).appStoreVersions[c.req.param('id')];
      if (!version) return c.json(jsonApiError(404, 'Not Found', 'App Store version not found'), 404);
      return c.json(single(version));
    });

    app.patch?.('/v1/appStoreVersions/:id', async (c) => {
      const body = await parseBody(c);
      const state = ascState(store);
      const version = state.appStoreVersions[c.req.param('id')];
      if (!version) return c.json(jsonApiError(404, 'Not Found', 'App Store version not found'), 404);
      version.attributes = { ...version.attributes, ...attrs(body) };
      saveAscState(store, state);
      return c.json(single(version));
    });

    app.patch?.('/v1/appStoreVersions/:id/relationships/build', async (c) => {
      const body = await parseBody(c);
      recordAscRequest(store, c, body);
      const state = ascState(store);
      const version = state.appStoreVersions[c.req.param('id')];
      const buildId = bodyData(body).id ?? bodyData(body).data?.id ?? body?.data?.id;
      if (!version || !state.builds[buildId]) return c.json(jsonApiError(409, 'Invalid Relationship', 'version/build relationship is invalid'), 409);
      version.relationships.build = linkage('builds', buildId);
      saveAscState(store, state);
      return c.json({ data: { type: 'builds', id: buildId } });
    });

    app.get('/v1/appStoreVersions/:id/appStoreVersionLocalizations', (c) => {
      const versionId = c.req.param('id');
      const localizations = Object.values(ascState(store).appStoreVersionLocalizations)
        .filter((localization) => localization.relationships.appStoreVersion?.data?.id === versionId);
      return c.json({ data: localizations });
    });

    app.post('/v1/appStoreVersionLocalizations', async (c) => {
      const body = await parseBody(c);
      const state = ascState(store);
      const versionId = relationshipId(rels(body), 'appStoreVersion');
      if (!state.appStoreVersions[versionId]) return c.json(jsonApiError(409, 'Invalid Relationship', 'localization requires an appStoreVersion'), 409);
      const locale = attrs(body).locale ?? 'en-US';
      const id = nextId(state, 'localization', `version-loc-${locale}`);
      const localization = resource('appStoreVersionLocalizations', id, attrs(body), {
        appStoreVersion: linkage('appStoreVersions', versionId),
      });
      state.appStoreVersionLocalizations[id] = localization;
      saveAscState(store, state);
      return c.json(single(localization), 201);
    });

    app.get('/v1/appStoreVersions/:id/appStoreReviewDetail', (c) => {
      const versionId = c.req.param('id');
      const detail = Object.values(ascState(store).appStoreReviewDetails)
        .find((candidate) => candidate.relationships.appStoreVersion?.data?.id === versionId);
      if (!detail) return c.json(jsonApiError(404, 'Not Found', 'Review detail not found'), 404);
      return c.json(single(detail));
    });

    app.patch?.('/v1/appStoreReviewDetails/:id', async (c) => {
      const body = await parseBody(c);
      const state = ascState(store);
      const detail = state.appStoreReviewDetails[c.req.param('id')];
      if (!detail) return c.json(jsonApiError(404, 'Not Found', 'Review detail not found'), 404);
      detail.attributes = { ...detail.attributes, ...attrs(body) };
      saveAscState(store, state);
      return c.json(single(detail));
    });

    app.get('/v1/betaGroups', (c) => c.json(collection(ascState(store).betaGroups)));

    app.post('/v1/betaGroups', async (c) => {
      const body = await parseBody(c);
      const state = ascState(store);
      const appId = relationshipId(rels(body), 'app');
      if (appId && !state.apps[appId]) return c.json(jsonApiError(409, 'Invalid Relationship', 'betaGroups app relationship is invalid'), 409);
      const id = nextId(state, 'betaGroup', 'beta-group');
      const group = resource('betaGroups', id, {
        name: attrs(body).name ?? `Emulator Group ${id}`,
        publicLinkEnabled: attrs(body).publicLinkEnabled ?? false,
        publicLinkLimit: attrs(body).publicLinkLimit ?? null,
        publicLink: attrs(body).publicLinkEnabled ? `https://testflight.apple.com/join/${id}` : null,
      }, appId ? { app: linkage('apps', appId) } : {});
      state.betaGroups[id] = group;
      saveAscState(store, state);
      return c.json(single(group), 201);
    });

    app.get('/v1/betaTesters', (c) => c.json(collection(ascState(store).betaTesters)));

    app.post('/v1/betaTesters', async (c) => {
      const body = await parseBody(c);
      const state = ascState(store);
      const id = nextId(state, 'betaTester', 'beta-tester');
      const tester = resource('betaTesters', id, {
        email: attrs(body).email ?? `tester-${id}@example.com`,
        firstName: attrs(body).firstName ?? 'Test',
        lastName: attrs(body).lastName ?? 'User',
        inviteType: attrs(body).inviteType ?? 'EMAIL',
      });
      state.betaTesters[id] = tester;
      saveAscState(store, state);
      return c.json(single(tester), 201);
    });

    app.post('/v1/betaGroups/:id/relationships/betaTesters', async (c) => {
      const body = await parseBody(c);
      const state = ascState(store);
      const group = state.betaGroups[c.req.param('id')];
      if (!group) return c.json(jsonApiError(404, 'Not Found', 'Beta group not found'), 404);
      const testerLinks = Array.isArray(body?.data) ? body.data : [body?.data].filter(Boolean);
      group.relationships.betaTesters = { data: testerLinks.map((item) => ({ type: 'betaTesters', id: item.id })) };
      saveAscState(store, state);
      return c.json({ data: group.relationships.betaTesters.data });
    });

    app.post('/v1/builds/:id/relationships/betaGroups', async (c) => {
      const body = await parseBody(c);
      const state = ascState(store);
      const build = state.builds[c.req.param('id')];
      if (!build) return c.json(jsonApiError(404, 'Not Found', 'Build not found'), 404);
      const groupLinks = Array.isArray(body?.data) ? body.data : [body?.data].filter(Boolean);
      build.relationships.betaGroups = { data: groupLinks.map((item) => ({ type: 'betaGroups', id: item.id })) };
      saveAscState(store, state);
      return c.json({ data: build.relationships.betaGroups.data });
    });

    app.post('/v1/betaAppReviewSubmissions', async (c) => {
      const body = await parseBody(c);
      const state = ascState(store);
      const buildId = relationshipId(rels(body), 'build');
      if (!state.builds[buildId]) return c.json(jsonApiError(409, 'Invalid Relationship', 'beta review submission requires a build'), 409);
      const id = nextId(state, 'betaReviewSubmission', 'beta-review-submission');
      const submission = resource('betaAppReviewSubmissions', id, {
        betaReviewState: 'WAITING_FOR_REVIEW',
        submittedDate: now(),
      }, {
        build: linkage('builds', buildId),
      });
      state.betaReviewSubmissions[id] = submission;
      saveAscState(store, state);
      return c.json(single(submission), 201);
    });

    app.post('/v1/reviewSubmissions', async (c) => {
      const body = await parseBody(c);
      const state = ascState(store);
      const appId = relationshipId(rels(body), 'app');
      if (!state.apps[appId]) return c.json(jsonApiError(409, 'Invalid Relationship', 'review submission requires an app'), 409);
      const id = nextId(state, 'reviewSubmission', 'review-submission');
      const submission = resource('reviewSubmissions', id, {
        platform: attrs(body).platform ?? 'IOS',
        state: attrs(body).state ?? 'READY_FOR_REVIEW',
        submittedDate: attrs(body).submittedDate ?? null,
      }, {
        app: linkage('apps', appId),
      });
      state.reviewSubmissions[id] = submission;
      saveAscState(store, state);
      return c.json(single(submission), 201);
    });

    app.post('/v1/reviewSubmissionItems', async (c) => {
      const body = await parseBody(c);
      const state = ascState(store);
      const submissionId = relationshipId(rels(body), 'reviewSubmission');
      const versionId = relationshipId(rels(body), 'appStoreVersion');
      if (!state.reviewSubmissions[submissionId] || !state.appStoreVersions[versionId]) {
        return c.json(jsonApiError(409, 'Invalid Relationship', 'review submission item requires reviewSubmission and appStoreVersion'), 409);
      }
      const id = nextId(state, 'reviewSubmissionItem', 'review-submission-item');
      const item = resource('reviewSubmissionItems', id, {
        state: 'READY_FOR_REVIEW',
      }, {
        reviewSubmission: linkage('reviewSubmissions', submissionId),
        appStoreVersion: linkage('appStoreVersions', versionId),
      });
      state.reviewSubmissionItems[id] = item;
      saveAscState(store, state);
      return c.json(single(item), 201);
    });

    app.patch?.('/v1/reviewSubmissions/:id', async (c) => {
      const body = await parseBody(c);
      const state = ascState(store);
      const submission = state.reviewSubmissions[c.req.param('id')];
      if (!submission) return c.json(jsonApiError(404, 'Not Found', 'Review submission not found'), 404);
      submission.attributes = { ...submission.attributes, ...attrs(body) };
      if (submission.attributes.submitted === true || submission.attributes.state === 'SUBMITTED') {
        submission.attributes.state = 'SUBMITTED';
        submission.attributes.submittedDate = now();
      }
      saveAscState(store, state);
      return c.json(single(submission));
    });

    app.get('/v1/apps/:id/appPriceSchedule', (c) => {
      const appId = c.req.param('id');
      const schedule = Object.values(ascState(store).appPriceSchedules).find((item) => item.relationships.app?.data?.id === appId);
      if (!schedule) return c.json(jsonApiError(404, 'Not Found', 'Price schedule not found'), 404);
      return c.json(single(schedule));
    });

    app.get('/v1/apps/:id/territoryAvailabilities', (c) => {
      const appId = c.req.param('id');
      const territories = Object.values(ascState(store).territoryAvailabilities).filter((item) => item.relationships.app?.data?.id === appId);
      return c.json({ data: territories });
    });

    app.get('/v1/apps/:id/ageRatingDeclaration', (c) => {
      const appId = c.req.param('id');
      const declaration = Object.values(ascState(store).ageRatingDeclarations).find((item) => item.relationships.app?.data?.id === appId);
      if (!declaration) return c.json(jsonApiError(404, 'Not Found', 'Age rating declaration not found'), 404);
      return c.json(single(declaration));
    });

    app.get('/v1/apps/:id/appEncryptionDeclarations', (c) => {
      const appId = c.req.param('id');
      const declarations = Object.values(ascState(store).appEncryptionDeclarations).filter((item) => item.relationships.app?.data?.id === appId);
      return c.json({ data: declarations });
    });

    app.post('/asc/control/seed', async (c) => {
      const body = await parseBody(c);
      const state = ascState(store);
      for (const [collectionName, resources] of Object.entries(body.resources ?? {})) {
        if (!state[collectionName]) state[collectionName] = {};
        for (const item of resources) state[collectionName][item.id] = item;
      }
      saveAscState(store, state);
      return c.json({ ok: true, state: ascState(store) });
    });

    app.post('/asc/control/fail', async (c) => {
      const body = await parseBody(c);
      const state = ascState(store);
      const key = body.key ?? body.route ?? '*';
      state.failures[key] = {
        status: Number(body.status ?? 500),
        reason: body.reason ?? 'Emulated ASC failure',
      };
      saveAscState(store, state);
      return c.json({ ok: true, key, failure: state.failures[key] });
    });

    app.post('/asc/control/reset', (c) => {
      store.setData?.('apple:asc-state', null);
      return c.json({ ok: true, state: ascState(store) });
    });

    app.post('/asc/control/advance-builds', async (c) => {
      const body = await parseBody(c);
      const state = ascState(store);
      const processingState = body.processingState ?? 'VALID';
      for (const build of Object.values(state.builds)) {
        if (!body.buildId || build.id === body.buildId) build.attributes.processingState = processingState;
      }
      saveAscState(store, state);
      return c.json({ ok: true, builds: Object.values(state.builds) });
    });

    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/asc/state', (c) => c.json(ascState(store)));
    app.get('/inspect/asc/apps', (c) => c.json(ascState(store).apps));
    app.get('/inspect/asc/build-uploads', (c) => c.json(ascState(store).buildUploads));
    app.get('/inspect/asc/build-upload-files', (c) => c.json(ascState(store).buildUploadFiles));
    app.get('/inspect/asc/upload-chunks', (c) => c.json(ascState(store).uploadChunks));
    app.get('/inspect/asc/builds', (c) => c.json(ascState(store).builds));
    app.get('/inspect/asc/testflight', (c) => {
      const state = ascState(store);
      return c.json({
        betaGroups: state.betaGroups,
        betaTesters: state.betaTesters,
        betaAppLocalizations: state.betaAppLocalizations,
        betaReviewSubmissions: state.betaReviewSubmissions,
      });
    });
    app.get('/inspect/asc/review-submissions', (c) => c.json(ascState(store).reviewSubmissions));
    app.get('/inspect/asc/requests', (c) => c.json(ascState(store).requests));
    app.get('/inspect/apns/state', (c) => c.json(apnsState(store)));
    app.get('/inspect/apns/teams', (c) => c.json(apnsState(store).teams));
    app.get('/inspect/apns/keys', (c) => c.json(apnsState(store).keys));
    app.get('/inspect/apns/topics', (c) => c.json(apnsState(store).topics));
    app.get('/inspect/apns/devices', (c) => c.json(apnsState(store).devices));
    app.get('/inspect/apns/collapsed', (c) => c.json(apnsState(store).collapsed));
    app.get('/inspect/apns/pending', (c) => c.json(apnsState(store).pending));
    app.get('/inspect/apns/unregistered', (c) => c.json(Object.values(apnsState(store).devices).filter((device) => device.status === 'unregistered')));
    app.get('/inspect/last-sign-sap-setup', (c) => c.json(store.getData?.('apple:last-sign-sap-setup') ?? null));
    app.get('/inspect/last-sign-sap-setup-response', (c) => c.json(store.getData?.('apple:last-sign-sap-setup-response') ?? null));
    app.get('/inspect/last-signin', (c) => c.json(store.getData?.('apple:last-signin') ?? null));
    app.get('/inspect/apns/deliveries', (c) => c.json(apnsDeliveries(store)));
    app.get('/inspect/apns/last-delivery', (c) => c.json(store.getData?.('apple:apns-last-delivery') ?? null));
    app.get('/inspect/apns/failures', (c) => c.json(apnsFailures(store)));
  },
};

export const label = 'Apple AMS auth, APNS, and App Store Connect emulator';
export const endpoints = 'bag.xml, v1/signSapSetup, auth/signin, 3/device/:deviceToken, apns/send, v1/apps, v1/buildUploads, v1/buildUploadFiles, v1/builds, v1/appStoreVersions, v1/reviewSubmissions';
export const capabilities = contract.scope;
export const initConfig = {
  apple: {
    emulatorBaseUrl: 'same emulator origin',
    apnsProxyPath: '/apns/send',
    apnsDevicePath: '/3/device/:deviceToken',
    ascBaseUrlEnv: 'ASC_API_BASE_URL',
  },
};
