export const IMAGE_BYTES = Buffer.from('replicate-emulator-image');
export const VIDEO_BYTES = Buffer.from('replicate-emulator-video');

export function outputUrl(requestUrl, modelName) {
  const origin = new URL(requestUrl).origin;
  return modelName.includes('seedance') || modelName.includes('omni-human')
    ? `${origin}/assets/video.mp4`
    : `${origin}/assets/image.png`;
}

export function predictionResponse(requestUrl, model) {
  return {
    id: 'emu_replicate_prediction_123',
    status: 'succeeded',
    output: outputUrl(requestUrl, model),
  };
}
