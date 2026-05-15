import { fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'applecare:state';

function initialState(config = {}) {
  return {
    org: { id: 'org_applecare_1', name: 'Emulator Devices Inc.' },
    devices: [
      { id: 'dev_apple_1', serialNumber: 'C02EMULATOR1', assetTag: 'MBP-001', productType: 'MacBook Pro', model: 'MacBook Pro 14-inch', assignedUser: 'ada@example.test' },
      { id: 'dev_apple_2', serialNumber: 'F2LEMULATOR2', assetTag: 'IPH-001', productType: 'iPhone', model: 'iPhone 16 Pro', assignedUser: 'grace@example.test' },
    ],
    coverages: [
      { id: 'cov_apple_1', deviceId: 'dev_apple_1', serialNumber: 'C02EMULATOR1', status: 'covered', plan: 'AppleCare+ for Mac', agreementNumber: 'AC-10001', coverageEndDate: '2028-01-01', eligibleForService: true },
      { id: 'cov_apple_2', deviceId: 'dev_apple_2', serialNumber: 'F2LEMULATOR2', status: 'covered', plan: 'AppleCare+ with Theft and Loss', agreementNumber: 'AC-10002', coverageEndDate: '2027-09-15', eligibleForService: true },
    ],
    repairCases: [],
    nextId: 3,
    ...config,
  };
}

const state = (store) => getState(store, STATE_KEY, () => initialState());
const save = (store, next) => setState(store, STATE_KEY, next);
const list = (data) => ({ data, paging: { next: null, count: data.length } });
const error = (c, message, status = 404) => c.json({ errors: [{ status: String(status), code: status === 404 ? 'NOT_FOUND' : 'BAD_REQUEST', title: message }] }, status);

export const contract = {
  provider: 'applecare',
  source: 'Apple Business Manager API AppleCare coverage status documentation-informed subset',
  docs: 'https://support.apple.com/guide/apple-business-manager/create-an-api-account-axm33189f66a/web',
  baseUrl: 'https://api-business.apple.com/v1',
  scope: ['org-devices', 'applecare-coverage', 'repair-cases', 'inspection'],
  fidelity: 'stateful-rest-emulator',
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  return save(store, initialState(config));
}

export const plugin = {
  name: 'applecare',
  register(app, store) {
    app.get('/v1/orgDevices', (c) => c.json(list(state(store).devices)));
    app.get('/v1/orgDevices/:deviceId', (c) => {
      const device = state(store).devices.find((item) => item.id === c.req.param('deviceId') || item.serialNumber === c.req.param('deviceId'));
      return device ? c.json(device) : error(c, 'Device not found');
    });
    app.get('/v1/orgDevices/:deviceId/appleCareCoverage', (c) => {
      const coverage = state(store).coverages.find((item) => item.deviceId === c.req.param('deviceId') || item.serialNumber === c.req.param('deviceId'));
      return coverage ? c.json(coverage) : error(c, 'AppleCare coverage not found');
    });
    app.get('/v1/coverage/:serialNumber', (c) => {
      const coverage = state(store).coverages.find((item) => item.serialNumber === c.req.param('serialNumber'));
      return coverage ? c.json(coverage) : error(c, 'AppleCare coverage not found');
    });
    app.post('/v1/repairCases', async (c) => {
      const s = state(store);
      const body = await readBody(c);
      const repairCase = { id: `rep_apple_${s.nextId++}`, status: 'created', createdAt: fixedNow, ...body };
      s.repairCases.unshift(repairCase);
      save(store, s);
      return c.json(repairCase, 201);
    });
    app.get('/v1/repairCases/:caseId', (c) => {
      const repairCase = state(store).repairCases.find((item) => item.id === c.req.param('caseId'));
      return repairCase ? c.json(repairCase) : error(c, 'Repair case not found');
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'AppleCare Coverage API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { applecare: initialState() };
export default plugin;
