import { createToken, fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'bland:state';

function initialState(config = {}) {
  return {
    account: { id: 'org_emulator', name: 'Bland Emulator', balance: 120.5 },
    calls: [{
      call_id: 'call_emulator_1',
      to: '+15551234567',
      from: '+15557654321',
      status: 'completed',
      created_at: fixedNow,
      completed: true,
      summary: 'Deterministic emulator call.',
      transcript: [{ user: 'Hello', assistant: 'Thanks for calling the emulator.' }],
    }],
    pathways: [{ pathway_id: 'pathway_emulator', name: 'Emulator Intake', description: 'A local test pathway', created_at: fixedNow }],
    tools: [{ tool_id: 'tool_emulator', name: 'lookup_customer', description: 'Local customer lookup', created_at: fixedNow }],
    batches: [{ batch_id: 'batch_emulator_1', status: 'completed', label: 'Emulator Batch', total_calls: 1, completed_calls: 1, created_at: fixedNow }],
    contacts: [{ contact_id: 'contact_emulator_1', phone_number: '+15551234567', email: 'patient@example.com', name: 'Pat Example', created_at: fixedNow }],
    numbers: [{ phone_number: '+15557654321', label: 'Emulator Line', inbound_agent: { prompt: 'Answer as the emulator.' }, created_at: fixedNow }],
    nextCall: 2,
    nextPathway: 2,
    nextTool: 2,
    nextBatch: 2,
    nextContact: 2,
    ...config,
  };
}

const state = (store) => getState(store, STATE_KEY, () => initialState());
const save = (store, next) => setState(store, STATE_KEY, next);

function error(c, message, status = 400) {
  return c.json({ status: 'error', message }, status);
}

export function seedFromConfig(store, _baseUrl, config = {}) {
  return save(store, initialState(config));
}

export const contract = {
  provider: 'bland',
  source: 'Bland API docs and llms.txt API reference subset',
  docs: 'https://docs.bland.ai/llms.txt',
  baseUrl: 'https://api.bland.ai',
  scope: ['me', 'calls', 'call_details', 'call_actions', 'pathways', 'tools', 'batches', 'contacts', 'numbers'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'bland',
  register(app, store) {
    app.get('/v1/me', (c) => c.json(state(store).account));
    app.get('/v1/calls', (c) => c.json({ calls: state(store).calls }));
    app.get('/v1/active', (c) => c.json({ calls: state(store).calls.filter((call) => !call.completed) }));
    app.post('/v1/calls', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      const call = {
        call_id: createToken('call_emulator', current.nextCall++),
        to: body.phone_number ?? body.to,
        from: body.from ?? '+15550000000',
        status: 'queued',
        created_at: fixedNow,
        completed: false,
        task: body.task,
        pathway_id: body.pathway_id,
        variables: body.variables ?? {},
      };
      current.calls.unshift(call);
      save(store, current);
      return c.json({ status: 'success', message: 'Call successfully queued.', call_id: call.call_id }, 200);
    });
    app.get('/v1/calls/:id', (c) => {
      const call = state(store).calls.find((item) => item.call_id === c.req.param('id'));
      return call ? c.json(call) : error(c, 'Call not found', 404);
    });
    app.post('/v1/calls/:id/analyze', async (c) => {
      const call = state(store).calls.find((item) => item.call_id === c.req.param('id'));
      if (!call) return error(c, 'Call not found', 404);
      const body = await readBody(c);
      return c.json({
        status: 'success',
        call_id: call.call_id,
        answers: (body.questions ?? []).map((question, index) => ({ question, answer: `emulator_answer_${index + 1}` })),
        summary: call.summary ?? 'Queued emulator call.',
      });
    });
    app.get('/v1/calls/:id/recording', (c) => {
      const call = state(store).calls.find((item) => item.call_id === c.req.param('id'));
      return call ? c.json({ call_id: call.call_id, recording_url: `https://api.bland.ai/v1/calls/${call.call_id}/recording.mp3` }) : error(c, 'Call not found', 404);
    });
    app.post('/v1/calls/:id/stop', (c) => {
      const current = state(store);
      const call = current.calls.find((item) => item.call_id === c.req.param('id'));
      if (!call) return error(c, 'Call not found', 404);
      call.status = 'completed';
      call.completed = true;
      save(store, current);
      return c.json({ status: 'success', call_id: call.call_id });
    });
    app.get('/v1/all_pathways', (c) => c.json({ pathways: state(store).pathways }));
    app.post('/v1/pathways', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      const pathway = { pathway_id: createToken('pathway_emulator', current.nextPathway++), name: body.name ?? 'Untitled Pathway', description: body.description ?? '', nodes: body.nodes ?? [], edges: body.edges ?? [], created_at: fixedNow };
      current.pathways.push(pathway);
      save(store, current);
      return c.json({ status: 'success', pathway_id: pathway.pathway_id, pathway }, 201);
    });
    app.get('/v1/pathway/:id', (c) => {
      const pathway = state(store).pathways.find((item) => item.pathway_id === c.req.param('id'));
      return pathway ? c.json(pathway) : error(c, 'Pathway not found', 404);
    });
    app.get('/v2/tools', (c) => c.json({ data: state(store).tools, has_more: false }));
    app.post('/v2/tools', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      const tool = { tool_id: createToken('tool_emulator', current.nextTool++), name: body.name ?? 'emulator_tool', description: body.description ?? '', created_at: fixedNow, configuration: body };
      current.tools.push(tool);
      save(store, current);
      return c.json(tool, 201);
    });
    app.get('/v2/batches', (c) => c.json({ data: state(store).batches, has_more: false }));
    app.post('/v2/batches', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      const recipients = body.recipients ?? [];
      const batch = { batch_id: createToken('batch_emulator', current.nextBatch++), status: 'queued', label: body.label ?? 'Emulator Batch', total_calls: recipients.length, completed_calls: 0, created_at: fixedNow };
      current.batches.unshift(batch);
      recipients.forEach((recipient) => current.calls.unshift({ call_id: createToken('call_emulator', current.nextCall++), to: recipient.phone_number ?? recipient.to, from: body.from ?? '+15550000000', status: 'queued', created_at: fixedNow, completed: false, batch_id: batch.batch_id }));
      save(store, current);
      return c.json(batch, 201);
    });
    app.get('/v2/batches/:id', (c) => {
      const batch = state(store).batches.find((item) => item.batch_id === c.req.param('id'));
      return batch ? c.json(batch) : error(c, 'Batch not found', 404);
    });
    app.post('/v2/batches/:id/stop', (c) => {
      const current = state(store);
      const batch = current.batches.find((item) => item.batch_id === c.req.param('id'));
      if (!batch) return error(c, 'Batch not found', 404);
      batch.status = 'stopped';
      save(store, current);
      return c.json(batch);
    });
    app.get('/v1/contacts', (c) => c.json({ contacts: state(store).contacts }));
    app.post('/v1/contacts/resolve', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      let contact = current.contacts.find((item) => item.phone_number === body.phone_number || item.email === body.email);
      if (!contact) {
        contact = { contact_id: createToken('contact_emulator', current.nextContact++), phone_number: body.phone_number, email: body.email, name: body.name ?? '', created_at: fixedNow };
        current.contacts.push(contact);
        save(store, current);
      }
      return c.json(contact);
    });
    app.get('/v1/inbound', (c) => c.json({ numbers: state(store).numbers }));
    app.get('/v1/inbound/:phoneNumber', (c) => {
      const number = state(store).numbers.find((item) => item.phone_number === c.req.param('phoneNumber'));
      return number ? c.json(number) : error(c, 'Number not found', 404);
    });
    app.get('/bland/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Bland API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { bland: initialState() };
export default plugin;
