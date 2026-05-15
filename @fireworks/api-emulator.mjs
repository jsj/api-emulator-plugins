import { createSaasProvider, fixedNow } from '../scripts/saas-emulator-kit.mjs';

const models = [
  {
    id: 'accounts/fireworks/models/llama-v3p1-8b-instruct',
    object: 'model',
    created: 1767225600,
    owned_by: 'fireworks',
    context_length: 131072,
  },
  {
    id: 'accounts/fireworks/models/deepseek-v3p1',
    object: 'model',
    created: 1767225600,
    owned_by: 'fireworks',
    context_length: 163840,
  },
];

function chatResponse(body) {
  return {
    id: 'chatcmpl-fireworks-emulator',
    object: 'chat.completion',
    created: 1767225600,
    model: body.model ?? models[0].id,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: 'Fireworks emulator response',
        },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 },
  };
}

function completionResponse(body) {
  return {
    id: 'cmpl-fireworks-emulator',
    object: 'text_completion',
    created: 1767225600,
    model: body.model ?? models[0].id,
    choices: [{ index: 0, text: 'Fireworks emulator completion', finish_reason: 'stop' }],
    usage: { prompt_tokens: 5, completion_tokens: 4, total_tokens: 9 },
  };
}

function embeddingResponse(body) {
  const input = Array.isArray(body.input) ? body.input : [body.input ?? ''];
  return {
    object: 'list',
    model: body.model ?? 'nomic-ai/nomic-embed-text-v1.5',
    data: input.map((_item, index) => ({
      object: 'embedding',
      index,
      embedding: [0.0125, 0.025, 0.05, 0.1],
    })),
    usage: { prompt_tokens: input.length, total_tokens: input.length },
  };
}

const routeSet = (prefix) => [
  { method: 'GET', path: `${prefix}/models`, response: () => ({ object: 'list', data: models }) },
  { method: 'POST', path: `${prefix}/chat/completions`, response: () => chatResponse({}) },
  { method: 'POST', path: `${prefix}/completions`, response: () => completionResponse({}) },
  { method: 'POST', path: `${prefix}/embeddings`, response: () => embeddingResponse({}) },
];

const config = {
  name: 'fireworks',
  label: 'Fireworks AI API emulator',
  source: 'Fireworks AI OpenAI-compatible inference API documented subset',
  docs: 'https://docs.fireworks.ai/api-reference/post-chatcompletions',
  baseUrl: 'https://api.fireworks.ai/inference/v1',
  scope: ['models', 'chat_completions', 'completions', 'embeddings'],
  endpoints: 'models, chat completions, completions, embeddings',
  initConfig: { fireworks: { apiKey: 'fw-emulator-key', model: models[0].id } },
  collections: { models: models.map((model) => ({ ...model, created_at: fixedNow })) },
  routes: [
    ...routeSet('/inference/v1'),
    ...routeSet('/v1'),
  ],
};

export const { contract, plugin, seedFromConfig, label, endpoints, initConfig } = createSaasProvider(config);

export default plugin;
