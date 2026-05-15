function queryParam(c, name) {
  return c.req.query?.(name);
}

function countParam(c, fallback = 10) {
  return Math.max(0, Math.min(20, Number(queryParam(c, 'count') ?? fallback)));
}

function offsetParam(c) {
  return Math.max(0, Number(queryParam(c, 'offset') ?? 0));
}

function decorate(result, query, index) {
  const safeQuery = query || 'empty query';
  return {
    ...result,
    title: `${result.title}: ${safeQuery}`,
    description: `${result.description} Query: ${safeQuery}.`,
    profile: { name: new URL(result.url).hostname, url: result.url },
    extra_snippets: [`${safeQuery} deterministic snippet ${index + 1}`],
  };
}

export function recordWebSearch(current, c) {
  const q = String(queryParam(c, 'q') ?? '').trim();
  const count = countParam(c);
  const offset = offsetParam(c);
  const results = current.webResults.slice(offset, offset + count).map((result, index) => decorate(result, q, offset + index));
  current.searches.push({ type: 'web', q, count, offset, requestedAt: new Date().toISOString() });
  return {
    type: 'search',
    query: { original: q, show_strict_warning: false, is_navigational: false },
    web: { type: 'search', results },
  };
}

export function recordNewsSearch(current, c) {
  const q = String(queryParam(c, 'q') ?? '').trim();
  const count = countParam(c);
  const results = current.newsResults.slice(0, count).map((result, index) => decorate(result, q, index));
  current.searches.push({ type: 'news', q, count, requestedAt: new Date().toISOString() });
  return {
    type: 'news',
    query: { original: q },
    news: { type: 'news', results },
  };
}

export function recordSuggest(current, c) {
  const q = String(queryParam(c, 'q') ?? '').trim();
  const results = [q, `${q} api`, `${q} examples`, `${q} pricing`].filter(Boolean);
  current.suggestions.push({ q, requestedAt: new Date().toISOString() });
  return { type: 'suggest', query: { original: q }, results };
}
