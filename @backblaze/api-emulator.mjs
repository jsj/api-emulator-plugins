import { fixedNow, getState, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'backblaze:state';

function defaultState() {
  return {
    accountId: 'b2_account_emulator',
    authorizationToken: 'b2_authorization_emulator',
    buckets: [{ bucketId: 'bucket_emulator', bucketName: 'emulator-bucket', bucketType: 'allPrivate', accountId: 'b2_account_emulator', bucketInfo: {}, corsRules: [], lifecycleRules: [], revision: 1, options: [], defaultServerSideEncryption: { mode: 'none' }, createdAt: fixedNow }],
    nextBucket: 2,
  };
}

const state = (store) => getState(store, STATE_KEY, defaultState);
const save = (store, next) => setState(store, STATE_KEY, next);
const b2Error = (c, status, code, message) => c.json({ status, code, message }, status);

export const contract = {
  provider: 'backblaze',
  source: 'Backblaze B2 Native API reference',
  docs: 'https://www.backblaze.com/apidocs/introduction-to-the-b2-native-api',
  baseUrl: 'https://api.backblazeb2.com/b2api/v4',
  auth: 'Basic application key for authorize; authorization token for subsequent calls',
  scope: ['authorize-account', 'list-buckets', 'create-bucket', 'delete-bucket'],
  fidelity: 'stateful-b2-native-api-emulator',
};

export const plugin = {
  name: 'backblaze',
  register(app, store) {
    app.get('/b2api/v4/b2_authorize_account', (c) => authorize(c, store));
    app.get('/b2api/v3/b2_authorize_account', (c) => authorize(c, store));
    app.post('/b2api/v4/b2_list_buckets', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      const buckets = state(store).buckets.filter((bucket) => !body.bucketName || bucket.bucketName === body.bucketName);
      return c.json({ buckets });
    });
    app.post('/b2api/v4/b2_create_bucket', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      if (!body.bucketName) return b2Error(c, 400, 'bad_request', 'bucketName is required');
      if (s.buckets.some((bucket) => bucket.bucketName === body.bucketName)) return b2Error(c, 400, 'duplicate_bucket_name', 'Bucket name is already in use');
      const bucket = { bucketId: `bucket_${s.nextBucket++}`, bucketName: body.bucketName, bucketType: body.bucketType ?? 'allPrivate', accountId: s.accountId, bucketInfo: body.bucketInfo ?? {}, corsRules: [], lifecycleRules: [], revision: 1, options: [], defaultServerSideEncryption: { mode: 'none' }, createdAt: fixedNow };
      s.buckets.push(bucket);
      save(store, s);
      return c.json(bucket);
    });
    app.post('/b2api/v4/b2_delete_bucket', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const bucket = s.buckets.find((item) => item.bucketId === body.bucketId);
      if (!bucket) return b2Error(c, 400, 'no_such_bucket', 'Bucket not found');
      s.buckets = s.buckets.filter((item) => item.bucketId !== body.bucketId);
      save(store, s);
      return c.json(bucket);
    });
    app.get('/backblaze/inspect/state', (c) => c.json(state(store)));
  },
};

function authorize(c, store) {
  const s = state(store);
  const apiUrl = c.req.header('host') ? `http://${c.req.header('host')}` : 'http://localhost';
  return c.json({ accountId: s.accountId, authorizationToken: s.authorizationToken, apiInfo: { storageApi: { apiUrl, downloadUrl: apiUrl, recommendedPartSize: 100000000, absoluteMinimumPartSize: 5000000, s3ApiUrl: apiUrl, bucketId: null, bucketName: null, capabilities: ['listBuckets', 'writeBuckets', 'deleteBuckets'] } } });
}

export function seedFromConfig(store, _baseUrl, config = {}) {
  return save(store, { ...defaultState(), ...config });
}

export const label = 'Backblaze B2 Native API emulator';
export const endpoints = 'authorize account, list buckets, create bucket, delete bucket';
export const capabilities = contract.scope;
export const initConfig = { backblaze: { accountId: defaultState().accountId } };
export default plugin;
