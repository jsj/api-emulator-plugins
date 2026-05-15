import { findRecordedResponse, recordInteraction } from '../store.mjs';

function shotListResponse(prompt) {
  let sceneId = 'scene-01';
  try {
    const parsed = JSON.parse(prompt);
    sceneId = parsed.scenes?.[0]?.id ?? sceneId;
  } catch {
    // Keep the default scene id for non-JSON prompts.
  }

  return JSON.stringify({
    scenes: [{
      id: sceneId,
      shots: [{
        id: `${sceneId}-shot-emulator-01`,
        durationSeconds: 12,
        camera: 'wide hallway angle with a slow push toward the fridge',
        action: 'Roco enters the old apartment, stops at the fridge, and notices the Polaroid.',
        references: ['apartment', 'hallway', 'fridge', 'polaroid'],
      }],
    }],
  });
}

export function messageResponse(store, body) {
  const recorded = findRecordedResponse(store, '/v1/messages', body);
  if (recorded) return recorded;
  const userMessage = body.messages?.findLast?.((message) => message.role === 'user')?.content ?? '';
  const prompt = Array.isArray(userMessage)
    ? userMessage.map((part) => part.text ?? '').join('\n')
    : String(userMessage);
  const response = {
    id: 'msg_emulator_123',
    type: 'message',
    role: 'assistant',
    model: body.model ?? 'claude-sonnet-4-20250514',
    content: [{ type: 'text', text: shotListResponse(prompt) }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 20 },
  };
  recordInteraction(store, '/v1/messages', body, response);
  return response;
}
