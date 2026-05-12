import assert from 'node:assert/strict';
import { plugin, contract } from './api-emulator.mjs';

function createHarness() {
  const routes = new Map();
  const data = new Map();
  const app = {
    get: (path, handler) => routes.set(`GET ${path}`, handler),
    post: (path, handler) => routes.set(`POST ${path}`, handler),
    patch: (path, handler) => routes.set(`PATCH ${path}`, handler),
    put: (path, handler) => routes.set(`PUT ${path}`, handler),
    delete: (path, handler) => routes.set(`DELETE ${path}`, handler),
  };
  const store = {
    getData: (key) => data.get(key),
    setData: (key, value) => data.set(key, value),
    collection: (key) => ({
      all: () => data.get(key) ?? [],
      insert: (value) => {
        const items = data.get(key) ?? [];
        const item = { ...value, id: crypto.randomUUID() };
        data.set(key, [...items, item]);
        return item;
      },
      findOneBy: (field, value) => (data.get(key) ?? []).find((item) => item[field] === value) ?? null,
      update: (id, updates) => {
        const items = data.get(key) ?? [];
        const index = items.findIndex((item) => item.id === id);
        if (index < 0) return null;
        const updated = { ...items[index], ...updates };
        items[index] = updated;
        data.set(key, items);
        return updated;
      },
      delete: (id) => {
        data.set(key, (data.get(key) ?? []).filter((item) => item.id !== id));
      },
    }),
  };
  plugin.seed?.(store, 'http://apple.test');
  plugin.register(app, store, undefined, 'http://apple.test');
  return {
    async call(method, path, body = {}, headers = {}, params = {}, query = {}) {
      const handler = routes.get(`${method} ${path}`);
      assert.ok(handler, `missing route ${method} ${path}`);
      let status = 200;
      let payload;
      await handler({
        req: {
          method,
          path,
          url: `http://apple.test${path}`,
          json: async () => body,
          arrayBuffer: async () => Buffer.from(body?.raw ?? ''),
          header: (name) => headers[name.toLowerCase()] ?? headers[name],
          param: (name) => params[name],
          query: (name) => query[name],
        },
        json: (value, nextStatus = 200) => {
          status = nextStatus;
          payload = value;
          return { status, payload };
        },
        body: (value, nextStatus = 200) => {
          status = nextStatus;
          payload = value;
          return { status, payload };
        },
        header: () => {},
      });
      return { status, payload };
    },
  };
}

const harness = createHarness();
assert.equal(contract.provider, 'apple');
await harness.call('POST', '/apns/control/register-team', { teamId: 'TEAMID1234' });
await harness.call('POST', '/apns/control/register-key', { teamId: 'TEAMID1234', keyId: 'KEYID12345' });
await harness.call('POST', '/apns/control/register-topic', { topic: 'com.example.app' });
await harness.call('POST', '/apns/control/register-device', {
  deviceToken: 'token-1',
  topic: 'com.example.app',
  status: 'offline',
});
const queued = await harness.call('POST', '/apns/send', {
  deviceToken: 'token-1',
  teamId: 'TEAMID1234',
  keyId: 'KEYID12345',
  topic: 'com.example.app',
  expiration: Math.floor(Date.now() / 1000) + 60,
  payload: { aps: { alert: 'hello' }, collapseId: 'welcome' },
});
assert.equal(queued.payload.queued, true);
const online = await harness.call('POST', '/apns/control/set-device-status', { deviceToken: 'token-1', status: 'registered' });
assert.equal(online.payload.flushed.length, 1);
const deliveries = await harness.call('GET', '/inspect/apns/deliveries');
assert.equal(deliveries.payload.length, 1);

const apps = await harness.call('GET', '/v1/apps');
assert.equal(apps.payload.data[0].id, '1234567890');

const upload = await harness.call('POST', '/v1/buildUploads', {
  data: {
    type: 'buildUploads',
    attributes: {
      cfBundleShortVersionString: '2.0.0',
      cfBundleVersion: '42',
      platform: 'IOS',
    },
    relationships: { app: { data: { type: 'apps', id: '1234567890' } } },
  },
});
assert.equal(upload.status, 201);

const uploadFile = await harness.call('POST', '/v1/buildUploadFiles', {
  data: {
    type: 'buildUploadFiles',
    attributes: {
      fileName: 'App.ipa',
      fileSize: 5,
      uti: 'com.apple.ipa',
      assetType: 'ASSET',
    },
    relationships: { buildUpload: { data: { type: 'buildUploads', id: upload.payload.data.id } } },
  },
});
assert.equal(uploadFile.status, 201);
assert.equal(uploadFile.payload.data.attributes.uploadOperations[0].url, `http://apple.test/asc/uploads/${uploadFile.payload.data.id}/0`);

const chunk = await harness.call('PUT', '/asc/uploads/:fileId/:operationIndex', { raw: '12345' }, {}, {
  fileId: uploadFile.payload.data.id,
  operationIndex: '0',
});
assert.equal(chunk.payload.receivedBytes, 5);

const patchedFile = await harness.call('PATCH', '/v1/buildUploadFiles/:id', {
  data: {
    type: 'buildUploadFiles',
    id: uploadFile.payload.data.id,
    attributes: { uploaded: true },
  },
}, {}, { id: uploadFile.payload.data.id });
assert.equal(patchedFile.payload.data.attributes.uploaded, true);

const builds = await harness.call('GET', '/v1/builds', {}, {}, {}, { 'filter[app]': '1234567890' });
assert.equal(builds.payload.data.length, 1);
assert.equal(builds.payload.data[0].attributes.buildNumber, '42');

const advanced = await harness.call('POST', '/asc/control/advance-builds', { processingState: 'VALID' });
assert.equal(advanced.payload.builds[0].attributes.processingState, 'VALID');

const version = await harness.call('POST', '/v1/appStoreVersions', {
  data: {
    type: 'appStoreVersions',
    attributes: { versionString: '2.0.0', platform: 'IOS' },
    relationships: { app: { data: { type: 'apps', id: '1234567890' } } },
  },
});
assert.equal(version.status, 201);

const attached = await harness.call('PATCH', '/v1/appStoreVersions/:id/relationships/build', {
  data: { type: 'builds', id: builds.payload.data[0].id },
}, {}, { id: version.payload.data.id });
assert.equal(attached.payload.data.id, builds.payload.data[0].id);

const reviewSubmission = await harness.call('POST', '/v1/reviewSubmissions', {
  data: {
    type: 'reviewSubmissions',
    attributes: { platform: 'IOS' },
    relationships: { app: { data: { type: 'apps', id: '1234567890' } } },
  },
});
assert.equal(reviewSubmission.status, 201);

const reviewItem = await harness.call('POST', '/v1/reviewSubmissionItems', {
  data: {
    type: 'reviewSubmissionItems',
    relationships: {
      reviewSubmission: { data: { type: 'reviewSubmissions', id: reviewSubmission.payload.data.id } },
      appStoreVersion: { data: { type: 'appStoreVersions', id: version.payload.data.id } },
    },
  },
});
assert.equal(reviewItem.status, 201);

const betaGroup = await harness.call('POST', '/v1/betaGroups', {
  data: {
    type: 'betaGroups',
    attributes: { name: 'External Testers' },
    relationships: { app: { data: { type: 'apps', id: '1234567890' } } },
  },
});
assert.equal(betaGroup.status, 201);

const readiness = await harness.call('GET', '/v1/apps/:id/appPriceSchedule', {}, {}, { id: '1234567890' });
assert.equal(readiness.payload.data.type, 'appPriceSchedules');

const inspect = await harness.call('GET', '/inspect/asc/state');
assert.equal(Object.keys(inspect.payload.builds).length, 1);

console.log('apple smoke ok');
