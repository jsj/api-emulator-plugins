import { createSaasProvider, fixedNow } from '../scripts/saas-emulator-kit.mjs';

const config = {
  name: 'retool',
  label: 'Retool API emulator',
  source: 'Retool API v2 documentation-informed organization management subset',
  docs: 'https://docs.retool.com/reference/api/v2',
  baseUrl: 'https://{org}.retool.com/api/v2',
  scope: ['users', 'groups', 'folders', 'apps', 'resources', 'spaces', 'source-control', 'permissions'],
  endpoints: 'users, groups, folders, apps, resources, spaces, source control, permissions',
  initConfig: { retool: { host: 'same emulator origin', accessToken: 'retool-emulator-token' } },
  collections: {
    users: [{ id: '1001', email: 'ada@example.test', firstName: 'Ada', lastName: 'Lovelace', active: true, createdAt: fixedNow }],
    groups: [{ id: '2001', name: 'Engineering', memberIds: ['1001'], createdAt: fixedNow }],
    folders: [{ id: 'folder_001', name: 'Emulator Apps', parentFolderId: null, createdAt: fixedNow }],
    apps: [{ id: 'app_001', name: 'Incident Console', folderId: 'folder_001', pageUuid: 'page_001', createdAt: fixedNow, updatedAt: fixedNow }],
    resources: [{ id: 'resource_001', name: 'Emulator Postgres', type: 'postgresql', createdAt: fixedNow, updatedAt: fixedNow }],
    spaces: [{ id: 'space_001', name: 'Default', domain: 'emulator', default: true }],
    permissionObjects: [{ id: 'app_001', type: 'app', name: 'Incident Console', permissions: [{ subjectType: 'group', subjectId: '2001', accessLevel: 'edit' }] }],
  },
  routes: [
    { method: 'GET', path: '/api/v2/users', collection: 'users', action: 'list' },
    { method: 'GET', path: '/api/v2/users/:id', collection: 'users', action: 'get', param: 'id' },
    { method: 'GET', path: '/api/v2/groups', collection: 'groups', action: 'list' },
    { method: 'GET', path: '/api/v2/folders', collection: 'folders', action: 'list' },
    { method: 'GET', path: '/api/v2/apps', collection: 'apps', action: 'list' },
    { method: 'GET', path: '/api/v2/resources', collection: 'resources', action: 'list' },
    { method: 'GET', path: '/api/v2/resource_configurations', collection: 'resources', action: 'list' },
    { method: 'GET', path: '/api/v2/spaces', collection: 'spaces', action: 'list' },
    { method: 'GET', path: '/api/v2/source_control/config', response: () => ({ provider: 'github', branch: 'main', enabled: true }) },
    { method: 'GET', path: '/api/v2/source_control/settings', response: () => ({ sourceControlEnabled: true, autoBranchNamingEnabled: false }) },
    { method: 'GET', path: '/api/v2/sso/config', response: () => ({ enabled: false, provider: null }) },
    { method: 'POST', path: '/api/v2/permissions/listObjects', response: (_c, current) => ({ objects: current.collections.permissionObjects, next_token: null }) },
  ],
};

export const { contract, plugin, seedFromConfig, label, endpoints, initConfig } = createSaasProvider(config);
export const capabilities = contract.scope;
export default plugin;
