const IMAGE_BASE64 = Buffer.from('gemini-emulator-image').toString('base64');

export function modelFromUrl(url) {
  return new URL(url).pathname
    .replace('/v1beta/models/', '')
    .replace(':generateContent', '');
}

export function generateContentResponse() {
  return {
    candidates: [{
      content: {
        parts: [{ inlineData: { data: IMAGE_BASE64, mimeType: 'image/png' } }],
      },
    }],
  };
}
