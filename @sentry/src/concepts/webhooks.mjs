import { now } from '../store.mjs';

async function hmacSha256Hex(secret, payload) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function deliver(target, payload, secret) {
  const body = JSON.stringify(payload);
  const headers = {
    'content-type': 'application/json',
    'sentry-hook-resource': 'issue',
    'sentry-hook-timestamp': String(Math.floor(Date.now() / 1000)),
  };
  if (secret) headers['sentry-hook-signature'] = await hmacSha256Hex(secret, body);

  const response = await fetch(target.url, {
    method: 'POST',
    headers,
    body,
  });
  const responseBody = await response.text();
  return {
    targetUrl: target.url,
    status: response.status,
    ok: response.ok,
    body: responseBody,
    deliveredAt: now(),
  };
}
