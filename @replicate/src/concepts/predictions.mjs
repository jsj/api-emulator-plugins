export const IMAGE_BYTES = Buffer.from('replicate-emulator-image');
export const VIDEO_BYTES = Buffer.from('replicate-emulator-video');

export function outputUrl(requestUrl, modelName) {
  const origin = new URL(requestUrl).origin;
  return modelName.includes('seedance') || modelName.includes('omni-human')
    ? `${origin}/assets/video.mp4`
    : `${origin}/assets/image.png`;
}

export function predictionResponse(requestUrl, model) {
  const origin = new URL(requestUrl).origin;
  const now = new Date().toISOString();
  return {
    id: 'emu_replicate_prediction_123',
    status: 'succeeded',
    model,
    version: 'emu_replicate_version_123',
    input: {},
    output: outputUrl(requestUrl, model),
    source: 'api',
    urls: {
      get: `${origin}/v1/predictions/emu_replicate_prediction_123`,
      cancel: `${origin}/v1/predictions/emu_replicate_prediction_123/cancel`,
    },
    created_at: now,
    started_at: now,
    completed_at: now,
  };
}
