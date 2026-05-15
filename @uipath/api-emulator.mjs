import { fixedNow, getState, readBody, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'uipath:state';

function defaultState(baseUrl = 'https://cloud.uipath.com/emulator/default/orchestrator_') {
  return {
    baseUrl,
    folders: [{ Id: 10, Key: 'folder-key-001', DisplayName: 'Shared', FullyQualifiedName: 'Shared', ProvisionType: 'Manual' }],
    currentUser: { Id: 100, Key: 'user-key-001', UserName: 'ada@example.test', Name: 'Ada Lovelace', PersonalWorkspace: { Id: 11, DisplayName: 'Ada Workspace' } },
    releases: [{ Id: 200, Key: 'release-key-001', Name: 'Invoice Processor', ProcessKey: 'InvoiceProcessor', EnvironmentName: 'Shared' }],
    jobs: [{ Id: 300, Key: 'job-key-001', ReleaseName: 'Invoice Processor', State: 'Successful', StartTime: fixedNow, EndTime: fixedNow }],
    queueDefinitions: [{ Id: 400, Key: 'queue-key-001', Name: 'Invoices', Description: 'Emulator queue' }],
    queueItems: [{ Id: 500, Key: 'queue-item-key-001', QueueDefinitionId: 400, Status: 'New', Reference: 'INV-001', CreationTime: fixedNow }],
    robots: [{ Id: 600, Name: 'emulator-robot', Type: 'Unattended', MachineName: 'emulator-machine' }],
    assets: [{ Id: 700, Name: 'ApiBaseUrl', ValueScope: 'Global', Value: 'https://example.test' }],
    nextId: 1000,
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());
const save = (store, next) => setState(store, STATE_KEY, next);
const odata = (c, value) => c.json({ '@odata.context': `${state({}).baseUrl}/$metadata`, '@odata.count': value.length, value });
const list = (store, c, key) => c.json({ '@odata.context': `${state(store).baseUrl}/$metadata#${key}`, '@odata.count': state(store)[key].length, value: state(store)[key] });

async function startJobs(c, store) {
  const s = state(store);
  const body = await readBody(c);
  const releaseKey = body.startInfo?.ReleaseKey ?? s.releases[0]?.Key;
  const release = s.releases.find((item) => item.Key === releaseKey) ?? s.releases[0];
  const job = {
    Id: s.nextId++,
    Key: `job-key-${s.nextId}`,
    ReleaseName: release?.Name ?? 'Emulator Process',
    State: 'Pending',
    StartTime: fixedNow,
    InputArguments: body.startInfo?.InputArguments ?? null,
  };
  s.jobs.push(job);
  save(store, s);
  return c.json({ '@odata.context': `${s.baseUrl}/$metadata#Jobs`, value: [job] }, 201);
}

function registerOData(app, store, prefix) {
  app.get(`${prefix}/Folders`, (c) => list(store, c, 'folders'));
  app.get(`${prefix}/Users/UiPath.Server.Configuration.OData.GetCurrentUserExtended`, (c) => c.json(state(store).currentUser));
  app.get(`${prefix}/Releases/UiPath.Server.Configuration.OData.ListReleases`, (c) => list(store, c, 'releases'));
  app.get(`${prefix}/Jobs`, (c) => list(store, c, 'jobs'));
  app.post(`${prefix}/Jobs/UiPath.Server.Configuration.OData.StartJobs`, (c) => startJobs(c, store));
  app.get(`${prefix}/QueueDefinitions`, (c) => list(store, c, 'queueDefinitions'));
  app.get(`${prefix}/QueueItems`, (c) => list(store, c, 'queueItems'));
  app.get(`${prefix}/Robots`, (c) => list(store, c, 'robots'));
  app.get(`${prefix}/Assets`, (c) => list(store, c, 'assets'));
}

export function seedFromConfig(store, baseUrl = 'https://cloud.uipath.com/emulator/default/orchestrator_', config = {}) {
  return save(store, { ...defaultState(baseUrl), ...config });
}

export const contract = {
  provider: 'uipath',
  source: 'UiPath Orchestrator OData API documentation-informed subset',
  docs: 'https://docs.uipath.com/orchestrator/automation-cloud/latest/api-guide/introduction',
  baseUrl: 'https://cloud.uipath.com/{organization}/{tenant}/orchestrator_',
  scope: ['folders', 'current-user', 'releases', 'jobs', 'start-jobs', 'queues', 'robots', 'assets'],
  fidelity: 'stateful-odata-emulator',
  cliSmoke: { supported: true, env: ['UIPATH_URL', 'UIPATH_ACCESS_TOKEN'] },
};

export const plugin = {
  name: 'uipath',
  register(app, store) {
    registerOData(app, store, '/orchestrator_/odata');
    registerOData(app, store, '/:organization/:tenant/orchestrator_/odata');
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'UiPath Orchestrator API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { uipath: { url: 'same emulator origin/orchestrator_', accessToken: 'uipath-emulator-token' } };
export default plugin;
