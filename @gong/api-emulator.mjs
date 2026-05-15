import { createSaasProvider, fixedNow } from '../scripts/saas-emulator-kit.mjs';

const config = {
  name: 'gong',
  label: 'Gong API emulator',
  source: 'Gong REST API documented subset',
  docs: 'https://help.gong.io/docs/what-the-gong-api-provides',
  baseUrl: 'https://api.gong.io',
  scope: ["users","calls","transcripts"],
  endpoints: 'users, calls, transcripts',
  initConfig: { gong: { accessKey: 'gong-emulator-key', secret: 'gong-emulator-secret' } },
  collections: { users: [{ id: 'usr_001', emailAddress: 'emulator@example.test', firstName: 'Gong', lastName: 'Emulator' }], calls: [{ id: 'call_001', title: 'Discovery Call', started: fixedNow, duration: 1800, primaryUserId: 'usr_001' }], transcripts: [{ callId: 'call_001', transcript: [{ speakerId: 'usr_001', topic: 'Intro', sentences: [{ start: 0, end: 1000, text: 'Thanks for joining.' }] }] }] },
  routes: [
      { method: 'GET', path: '/v2/users', collection: 'users', action: 'list', envelope: 'users' },
      { method: 'POST', path: '/v2/calls', response: (c, state) => ({ calls: state.collections.calls, records: { totalRecords: state.collections.calls.length, currentPageSize: state.collections.calls.length } }) },
      { method: 'POST', path: '/v2/calls/transcript', response: (c, state) => ({ callTranscripts: state.collections.transcripts }) },
      { method: 'POST', path: '/v2/calls/extensive', response: (c, state) => ({ calls: state.collections.calls.map((call) => ({ ...call, parties: [{ userId: call.primaryUserId, emailAddress: 'emulator@example.test' }] })) }) },
    ],
};

export const { contract, plugin, seedFromConfig, label, endpoints, initConfig } = createSaasProvider(config);

export default plugin;
