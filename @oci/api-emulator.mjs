import { fixedNow, getState, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'oci:state';

function defaultState() {
  return {
    compartmentId: 'ocid1.compartment.oc1..emulator',
    regions: [{ key: 'PHX', name: 'us-phoenix-1' }, { key: 'IAD', name: 'us-ashburn-1' }],
    availabilityDomains: [{ id: 'ocid1.availabilitydomain.oc1..emulator', name: 'kIdk:PHX-AD-1', compartmentId: 'ocid1.compartment.oc1..emulator' }],
    instances: [{ id: 'ocid1.instance.oc1.phx.emulator', compartmentId: 'ocid1.compartment.oc1..emulator', displayName: 'emulator-instance', lifecycleState: 'RUNNING', availabilityDomain: 'kIdk:PHX-AD-1', shape: 'VM.Standard.E5.Flex', timeCreated: fixedNow }],
  };
}

const state = (store) => getState(store, STATE_KEY, defaultState);
const save = (store, next) => setState(store, STATE_KEY, next);
const headers = { 'opc-request-id': 'oci_req_emulator' };
const ociError = (c, status, code, message) => c.json({ code, message }, status, headers);

export const contract = {
  provider: 'oci',
  source: 'Oracle Cloud Infrastructure REST API reference',
  docs: 'https://docs.oracle.com/iaas/api/',
  baseUrl: 'https://iaas.{region}.oraclecloud.com/20160918',
  auth: 'OCI Signature',
  scope: ['regions', 'availability-domains', 'instances'],
  fidelity: 'stateful-core-rest-emulator',
};

export const plugin = {
  name: 'oci',
  register(app, store) {
    app.get('/20160918/regions', (c) => c.json(state(store).regions, 200, headers));
    app.get('/20160918/availabilityDomains', (c) => {
      const compartmentId = c.req.query('compartmentId');
      const rows = state(store).availabilityDomains.filter((item) => !compartmentId || item.compartmentId === compartmentId);
      return c.json(rows, 200, headers);
    });
    app.get('/20160918/instances', (c) => {
      const compartmentId = c.req.query('compartmentId');
      const rows = state(store).instances.filter((item) => !compartmentId || item.compartmentId === compartmentId);
      return c.json(rows, 200, headers);
    });
    app.get('/20160918/instances/:instanceId', (c) => {
      const instance = state(store).instances.find((item) => item.id === c.req.param('instanceId'));
      if (!instance) return ociError(c, 404, 'NotAuthorizedOrNotFound', 'Authorization failed or requested resource not found.');
      return c.json(instance, 200, headers);
    });
    app.post('/20160918/instances/:instanceId', async (c) => {
      const action = c.req.query('action');
      if (!['START', 'STOP', 'RESET', 'SOFTSTOP'].includes(action)) return ociError(c, 400, 'InvalidParameter', 'Unsupported instance action.');
      const s = state(store);
      const instance = s.instances.find((item) => item.id === c.req.param('instanceId'));
      if (!instance) return ociError(c, 404, 'NotAuthorizedOrNotFound', 'Authorization failed or requested resource not found.');
      instance.lifecycleState = action === 'START' ? 'RUNNING' : 'STOPPED';
      save(store, s);
      return c.json(instance, 200, headers);
    });
    app.get('/oci/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  return save(store, { ...defaultState(), ...config });
}

export const label = 'Oracle Cloud Infrastructure API emulator';
export const endpoints = 'regions, availability domains, and compute instances';
export const capabilities = contract.scope;
export const initConfig = { oci: { compartmentId: defaultState().compartmentId } };
export default plugin;
