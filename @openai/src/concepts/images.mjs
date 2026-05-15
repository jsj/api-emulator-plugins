import { IMAGE_BASE64 } from '../store.mjs';

export function imageGenerationResponse(id) {
  return { id, data: [{ b64_json: IMAGE_BASE64 }] };
}

export function editSummary(body) {
  return {
    model: body.model,
    prompt: body.prompt,
    size: body.size,
    quality: body.quality,
    output_format: body.output_format,
    output_compression: body.output_compression,
    background: body.background,
    moderation: body.moderation,
    hasImage: Boolean(body.image),
  };
}
