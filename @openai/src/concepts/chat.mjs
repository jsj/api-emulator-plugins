import { findRecordedResponse, recordInteraction } from '../store.mjs';

export function chatCompletion(store, body) {
  const recorded = findRecordedResponse(store, 'openai', '/v1/chat/completions', body);
  if (recorded) return recorded;
  const userMessage = body.messages?.findLast?.((message) => message.role === 'user')?.content ?? '';
  const response = {
    id: 'emu_openai_chat_123',
    choices: [{ message: { role: 'assistant', content: `openai-emulator-text: ${userMessage}` } }],
  };
  recordInteraction(store, 'openai', '/v1/chat/completions', body, response);
  return response;
}
