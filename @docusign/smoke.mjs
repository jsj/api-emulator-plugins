import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);

const userinfo = await harness.call('GET', '/oauth/userinfo');
assert.equal(userinfo.payload.accounts[0].account_id, 'acc_emulator');

const users = await harness.call('GET', '/restapi/v2.1/accounts/acc_emulator/users');
assert.equal(users.payload.users[0].email, 'ada@example.com');

const created = await harness.call('POST', '/restapi/v2.1/accounts/acc_emulator/envelopes', {
  status: 'sent',
  emailSubject: 'Please sign',
  recipients: { signers: [{ recipientId: '1', name: 'Grace Hopper', email: 'grace@example.com' }] },
});
assert.equal(created.status, 201);
assert.equal(created.payload.status, 'sent');

const envelope = await harness.call('GET', `/restapi/v2.1/accounts/acc_emulator/envelopes/${created.payload.envelopeId}`);
assert.equal(envelope.payload.emailSubject, 'Please sign');

const recipients = await harness.call('GET', `/restapi/v2.1/accounts/acc_emulator/envelopes/${created.payload.envelopeId}/recipients`);
assert.equal(recipients.payload.signers[0].email, 'grace@example.com');

console.log('docusign smoke ok');
