const STATE_KEY = 'docusign:state';
const NOW = '2026-05-15T12:00:00Z';

function initialState(config = {}) {
  return {
    account: { account_id: 'acc_emulator', account_name: 'Emulator Law Firm', base_uri: 'https://demo.docusign.net' },
    users: [{ userId: 'usr_ada', userName: 'Ada Lovelace', email: 'ada@example.com', userStatus: 'ActivationSent' }],
    templates: [{ templateId: 'tpl_nda', name: 'Mutual NDA', shared: 'true', created: NOW }],
    envelopes: [{
      envelopeId: 'env_1',
      status: 'sent',
      emailSubject: 'Please sign the emulator NDA',
      createdDateTime: NOW,
      sentDateTime: NOW,
      recipients: { signers: [{ recipientId: '1', name: 'Grace Hopper', email: 'grace@example.com', status: 'sent' }] },
    }],
    connectConfigurations: [{ connectId: 'connect_1', name: 'Emulator Connect', urlToPublishTo: 'https://example.com/webhooks/docusign', allUsers: 'true' }],
    nextId: 2,
    ...config,
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

async function json(c) {
  return c.req.json().catch(() => ({}));
}

function envelopeSummary(envelope) {
  return {
    envelopeId: envelope.envelopeId,
    status: envelope.status,
    emailSubject: envelope.emailSubject,
    createdDateTime: envelope.createdDateTime,
    sentDateTime: envelope.sentDateTime,
  };
}

function error(c, message, status = 400) {
  return c.json({ errorCode: status === 404 ? 'ENVELOPE_NOT_FOUND' : 'INVALID_REQUEST_BODY', message }, status);
}

export const contract = {
  provider: 'docusign',
  source: 'Docusign official OpenAPI specifications and eSignature REST API reference',
  docs: 'https://developers.docusign.com/docs/esign-rest-api/reference/',
  baseUrl: 'https://demo.docusign.net/restapi',
  scope: ['oauth-userinfo', 'accounts', 'users', 'templates', 'envelopes', 'recipients', 'connect', 'inspection'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'docusign',
  register(app, store) {
    app.get('/oauth/userinfo', (c) => {
      const s = state(store);
      return c.json({
        sub: s.users[0].userId,
        name: s.users[0].userName,
        email: s.users[0].email,
        accounts: [{ ...s.account, is_default: true }],
      });
    });

    app.get('/restapi/v2.1/accounts/:accountId/users', (c) => c.json({ users: state(store).users }));
    app.get('/restapi/v2.1/accounts/:accountId/templates', (c) => c.json({ envelopeTemplates: state(store).templates }));
    app.get('/restapi/v2.1/accounts/:accountId/envelopes', (c) => c.json({ resultSetSize: String(state(store).envelopes.length), envelopes: state(store).envelopes.map(envelopeSummary) }));
    app.post('/restapi/v2.1/accounts/:accountId/envelopes', async (c) => {
      const s = state(store);
      const body = await json(c);
      const envelope = {
        envelopeId: `env_${s.nextId++}`,
        status: body.status ?? 'created',
        emailSubject: body.emailSubject ?? 'Emulator signature request',
        createdDateTime: new Date().toISOString(),
        sentDateTime: body.status === 'sent' ? new Date().toISOString() : undefined,
        recipients: body.recipients ?? { signers: [] },
        documents: body.documents ?? [],
      };
      s.envelopes.unshift(envelope);
      saveState(store, s);
      return c.json(envelopeSummary(envelope), 201);
    });
    app.get('/restapi/v2.1/accounts/:accountId/envelopes/:envelopeId', (c) => {
      const envelope = state(store).envelopes.find((item) => item.envelopeId === c.req.param('envelopeId'));
      return envelope ? c.json(envelope) : error(c, 'Envelope not found', 404);
    });
    app.get('/restapi/v2.1/accounts/:accountId/envelopes/:envelopeId/recipients', (c) => {
      const envelope = state(store).envelopes.find((item) => item.envelopeId === c.req.param('envelopeId'));
      return envelope ? c.json(envelope.recipients ?? { signers: [] }) : error(c, 'Envelope not found', 404);
    });
    app.get('/restapi/v2.1/accounts/:accountId/connect', (c) => c.json({ configurations: state(store).connectConfigurations }));
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Docusign API emulator';
export const endpoints = 'OAuth userinfo, users, templates, envelopes, recipients, and Connect configurations';
export const capabilities = contract.scope;
export const initConfig = { docusign: initialState() };
export default plugin;
