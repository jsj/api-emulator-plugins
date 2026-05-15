const IMAGE_BASE64 = Buffer.from('openrouter-emulator-image').toString('base64');
export const VIDEO_BYTES = Buffer.from('openrouter-emulator-video');

export function chatCompletionResponse(body, requestUrl) {
  const modalities = body.modalities || [];
  if (modalities.includes('video')) {
    return {
      id: 'emu_openrouter_video_123',
      model: body.model,
      choices: [{
        index: 0,
        finish_reason: 'stop',
        message: {
          role: 'assistant',
          content: [{ type: 'video_url', video_url: { url: `${new URL(requestUrl).origin}/assets/video.mp4` } }],
        },
      }],
    };
  }

  return {
    id: 'emu_openrouter_image_123',
    model: body.model,
    choices: [{
      index: 0,
      finish_reason: 'stop',
      message: {
        role: 'assistant',
        content: [{ type: 'image_url', image_url: { url: `data:image/png;base64,${IMAGE_BASE64}` } }],
      },
    }],
  };
}
