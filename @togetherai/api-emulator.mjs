import { createSaasProvider, fixedNow } from '../scripts/saas-emulator-kit.mjs';

const models = [
  { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', object: 'model', created: 1767225600, owned_by: 'Meta' },
  { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', object: 'model', created: 1767225600, owned_by: 'Mistral AI' },
  { id: 'togethercomputer/m2-bert-80M-8k-retrieval', object: 'model', created: 1767225600, owned_by: 'Together AI' },
];

function chatCompletion() {
  return {
    id: 'chatcmpl-together-emulator',
    object: 'chat.completion',
    created: 1767225600,
    model: models[0].id,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: 'Together AI emulator response' },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 7, completion_tokens: 5, total_tokens: 12 },
  };
}

function textCompletion() {
  return {
    id: 'cmpl-together-emulator',
    object: 'text_completion',
    created: 1767225600,
    model: models[1].id,
    choices: [{ index: 0, text: 'Together AI emulator completion', finish_reason: 'stop' }],
    usage: { prompt_tokens: 4, completion_tokens: 5, total_tokens: 9 },
  };
}

function embeddings() {
  return {
    object: 'list',
    model: models[2].id,
    data: [{ object: 'embedding', index: 0, embedding: [0.2, 0.1, 0.05, 0.025] }],
    usage: { prompt_tokens: 1, total_tokens: 1 },
  };
}

function rerank() {
  return {
    id: 'rerank-together-emulator',
    model: 'Salesforce/Llama-Rank-V1',
    results: [
      { index: 0, relevance_score: 0.97, document: { text: 'emulator document' } },
      { index: 1, relevance_score: 0.42, document: { text: 'secondary document' } },
    ],
  };
}

const config = {
  name: 'togetherai',
  label: 'Together AI API emulator',
  source: 'Together AI OpenAI-compatible inference and rerank API documented subset',
  docs: 'https://docs.together.ai/reference/chat-completions-1',
  baseUrl: 'https://api.together.xyz/v1',
  scope: ['models', 'chat_completions', 'completions', 'embeddings', 'rerank'],
  endpoints: 'models, chat completions, completions, embeddings, rerank',
  initConfig: { togetherai: { apiKey: 'together-emulator-key', model: models[0].id } },
  collections: { models: models.map((model) => ({ ...model, created_at: fixedNow })) },
  routes: [
    { method: 'GET', path: '/v1/models', response: () => ({ object: 'list', data: models }) },
    { method: 'GET', path: '/together/v1/models', response: () => ({ object: 'list', data: models }) },
    { method: 'GET', path: '/models', response: () => ({ object: 'list', data: models }) },
    { method: 'POST', path: '/v1/chat/completions', response: chatCompletion },
    { method: 'POST', path: '/together/v1/chat/completions', response: chatCompletion },
    { method: 'POST', path: '/v1/completions', response: textCompletion },
    { method: 'POST', path: '/together/v1/completions', response: textCompletion },
    { method: 'POST', path: '/v1/embeddings', response: embeddings },
    { method: 'POST', path: '/together/v1/embeddings', response: embeddings },
    { method: 'POST', path: '/v1/rerank', response: rerank },
    { method: 'POST', path: '/together/v1/rerank', response: rerank },
  ],
};

export const { contract, plugin, seedFromConfig, label, endpoints, initConfig } = createSaasProvider(config);

export default plugin;
