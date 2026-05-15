import { fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'spectrum:state';

function defaultState(baseUrl = 'https://apis.spectrum.net') {
  return {
    baseUrl,
    token: 'spectrum_emulator_token',
    sites: [
      {
        siteId: 'site_1001',
        accountNumber: '844000000001',
        name: 'Localhost HQ',
        address: { addressLine1: '1 Emulator Plaza', city: 'Stamford', state: 'CT', zip: '06901' },
        contacts: [{ name: 'Ada Lovelace', phone: '+15555550100', email: 'noc@example.test' }],
      },
    ],
    circuits: [
      { circuitId: 'ckt_1001', siteId: 'site_1001', billingAccountNumber: '844000000001', serviceId: 'ETH-LOCAL-001', status: 'Active', bandwidth: '1 Gbps' },
    ],
    tickets: [
      {
        ticketId: '1000001',
        spectrumTicketNumber: 'SPECTRUM-1000001',
        customerTicketNumber: 'CUST-LOCAL-1',
        status: 'Open',
        priority: 'P2',
        summary: 'Packet loss on emulator circuit',
        description: 'Deterministic ticket fixture for local testing',
        billingAccountNumber: '844000000001',
        siteId: 'site_1001',
        circuitId: 'ckt_1001',
        openDate: fixedNow,
        updatedDate: fixedNow,
        notes: [{ noteId: 'note_1001', text: 'Ticket opened by emulator', createdAt: fixedNow }],
        attachments: [],
      },
    ],
    nextTicketId: 1000002,
    nextNoteId: 1002,
    nextAttachmentId: 1001,
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());
const save = (store, next) => setState(store, STATE_KEY, next);

function error(c, status, code, message) {
  return c.json({ error: { code, message, timestamp: fixedNow } }, status);
}

function requireBearer(c) {
  return /^Bearer\s+\S+/i.test(c.req.header?.('authorization') ?? c.req.header?.('Authorization') ?? '');
}

function page(items, c) {
  const pageNumber = Math.max(1, Number(c.req.query?.('page') ?? 1));
  const pageSize = Math.max(1, Math.min(Number(c.req.query?.('pageSize') ?? c.req.query?.('limit') ?? 50), 100));
  const start = (pageNumber - 1) * pageSize;
  return { data: items.slice(start, start + pageSize), pagination: { page: pageNumber, pageSize, total: items.length } };
}

function findTicket(s, id) {
  return s.tickets.find((ticket) => ticket.ticketId === id || ticket.spectrumTicketNumber === id || ticket.customerTicketNumber === id);
}

function ticketingPath(path) {
  return `/entservices/ticketing-b2b/v1${path}`;
}

export function seedFromConfig(store, baseUrl = 'https://apis.spectrum.net', config = {}) {
  return save(store, { ...defaultState(baseUrl), ...config });
}

export const contract = {
  provider: 'spectrum',
  source: 'Spectrum Enterprise Client API User Guide ticketing subset',
  docs: 'https://apis.spectrum.net/entservices/ticketing-b2b/v1',
  baseUrl: 'https://apis.spectrum.net',
  scope: ['oauth_token', 'sites', 'circuits', 'tickets', 'ticket_notes', 'ticket_attachments'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'spectrum',
  register(app, store) {
    app.post('/auth/oauth/v2/token', async (c) => {
      const body = await readBody(c);
      if ((body.grant_type ?? body.grantType) !== 'client_credentials') return error(c, 400, 'invalid_grant', 'grant_type must be client_credentials');
      return c.json({ access_token: state(store).token, token_type: 'Bearer', expires_in: 3600, scope: 'ticketing-b2b' });
    });

    app.get(ticketingPath('/sites'), (c) => {
      if (!requireBearer(c)) return error(c, 401, 'unauthorized', 'Bearer token required');
      return c.json(page(state(store).sites, c));
    });

    app.get(ticketingPath('/circuits'), (c) => {
      if (!requireBearer(c)) return error(c, 401, 'unauthorized', 'Bearer token required');
      const siteId = c.req.query('siteId') ?? c.req.query('site_id');
      const rows = state(store).circuits.filter((circuit) => !siteId || circuit.siteId === siteId);
      return c.json(page(rows, c));
    });

    app.get(ticketingPath('/tickets'), (c) => {
      if (!requireBearer(c)) return error(c, 401, 'unauthorized', 'Bearer token required');
      const status = c.req.query('status')?.toLowerCase();
      const rows = state(store).tickets.filter((ticket) => !status || ticket.status.toLowerCase() === status);
      return c.json(page(rows, c));
    });

    app.post(ticketingPath('/tickets'), async (c) => {
      if (!requireBearer(c)) return error(c, 401, 'unauthorized', 'Bearer token required');
      const s = state(store);
      const body = await readBody(c);
      const ticketId = String(s.nextTicketId++);
      const ticket = {
        ticketId,
        spectrumTicketNumber: `SPECTRUM-${ticketId}`,
        customerTicketNumber: body.customerTicketNumber ?? body.customer_ticket_number ?? `CUST-${ticketId}`,
        status: 'Open',
        priority: body.priority ?? 'P3',
        summary: body.summary ?? 'Emulator service ticket',
        description: body.description ?? '',
        billingAccountNumber: body.billingAccountNumber ?? body.billing_account_number ?? s.sites[0]?.accountNumber,
        siteId: body.siteId ?? body.site_id ?? s.sites[0]?.siteId,
        circuitId: body.circuitId ?? body.circuit_id ?? s.circuits[0]?.circuitId,
        openDate: fixedNow,
        updatedDate: fixedNow,
        notes: [],
        attachments: [],
      };
      s.tickets.push(ticket);
      save(store, s);
      return c.json({ data: ticket }, 201);
    });

    app.get(ticketingPath('/tickets/:ticketId'), (c) => {
      if (!requireBearer(c)) return error(c, 401, 'unauthorized', 'Bearer token required');
      const ticket = findTicket(state(store), c.req.param('ticketId'));
      return ticket ? c.json({ data: ticket }) : error(c, 404, 'not_found', 'Ticket not found');
    });

    app.post(ticketingPath('/tickets/:ticketId/notes'), async (c) => {
      if (!requireBearer(c)) return error(c, 401, 'unauthorized', 'Bearer token required');
      const s = state(store);
      const ticket = findTicket(s, c.req.param('ticketId'));
      if (!ticket) return error(c, 404, 'not_found', 'Ticket not found');
      const body = await readBody(c);
      const note = { noteId: `note_${s.nextNoteId++}`, text: body.text ?? body.note ?? '', createdAt: fixedNow };
      ticket.notes.push(note);
      ticket.updatedDate = fixedNow;
      save(store, s);
      return c.json({ data: note }, 201);
    });

    app.post(ticketingPath('/tickets/:ticketId/attachments'), async (c) => {
      if (!requireBearer(c)) return error(c, 401, 'unauthorized', 'Bearer token required');
      const s = state(store);
      const ticket = findTicket(s, c.req.param('ticketId'));
      if (!ticket) return error(c, 404, 'not_found', 'Ticket not found');
      const body = await readBody(c);
      const attachment = { attachmentId: `att_${s.nextAttachmentId++}`, fileName: body.fileName ?? body.file_name ?? 'emulator.txt', contentType: body.contentType ?? body.content_type ?? 'text/plain', uploadedAt: fixedNow };
      ticket.attachments.push(attachment);
      ticket.updatedDate = fixedNow;
      save(store, s);
      return c.json({ data: attachment }, 201);
    });

    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Spectrum Enterprise ticketing API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { spectrum: { clientId: 'spectrum_emulator_client', clientSecret: 'spectrum_emulator_secret' } };
export default plugin;
