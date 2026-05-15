export const fixedNow = '2026-01-01T00:00:00.000Z';

export function routeError(c, message, status = 400, code = 'bad_request', extra = {}) {
  return c.json({ error: { message, code, ...extra } }, status);
}

export async function readBody(c) {
  const contentType = c.req.header?.('content-type') ?? c.req.header?.('Content-Type') ?? '';
  if (contentType.includes('application/json')) return c.req.json();
  if (c.req.parseBody) return c.req.parseBody();
  if (c.req.text) return Object.fromEntries(new URLSearchParams(await c.req.text()));
  return {};
}

export function getState(store, key, makeDefault) {
  const existing = store.getData?.(key);
  if (existing) return existing;
  const seeded = makeDefault();
  store.setData?.(key, seeded);
  return seeded;
}

export function setState(store, key, state) {
  store.setData?.(key, state);
  return state;
}

export function createToken(prefix, index = 1) {
  return `${prefix}_${String(index).padStart(6, '0')}`;
}

export function cursorPage(items, c, defaultLimit = 50) {
  const limit = Math.max(1, Math.min(Number(c.req.query?.('limit') ?? c.req.query?.('per_page') ?? defaultLimit), 100));
  const cursor = c.req.query?.('cursor') ?? c.req.query?.('page_info') ?? '';
  const offset = cursor ? Number(Buffer.from(cursor, 'base64url').toString('utf8')) || 0 : 0;
  const page = items.slice(offset, offset + limit);
  const nextOffset = offset + limit;
  const nextCursor = nextOffset < items.length ? Buffer.from(String(nextOffset)).toString('base64url') : undefined;
  return { page, nextCursor };
}
