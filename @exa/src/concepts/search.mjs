function clampCount(value, fallback = 10) {
  return Math.max(0, Math.min(50, Number(value ?? fallback)));
}

function withQuery(result, query, index) {
  const safeQuery = query || 'empty query';
  return {
    ...result,
    title: `${result.title}: ${safeQuery}`,
    text: `${result.text} Query: ${safeQuery}.`,
    highlights: [...result.highlights, safeQuery],
    score: Number((result.score - index * 0.03).toFixed(2)),
  };
}

export function recordSearch(current, body) {
  const query = String(body.query ?? '').trim();
  const numResults = clampCount(body.numResults ?? body.num_results);
  const results = current.results.slice(0, numResults).map((result, index) => withQuery(result, query, index));
  current.searches.push({
    query,
    numResults,
    type: body.type ?? 'neural',
    requestedAt: new Date().toISOString(),
  });
  return { requestId: `exa_req_${current.searches.length}`, autopromptString: query, results };
}

export function recordContents(current, body) {
  const ids = Array.isArray(body.ids) ? body.ids : [];
  const urls = Array.isArray(body.urls) ? body.urls : [];
  const requested = [...ids, ...urls];
  const results = (requested.length ? requested : current.results.map((result) => result.id)).map((item, index) => {
    const result = current.results[index % current.results.length];
    return {
      id: item,
      url: urls[index] ?? result.url,
      title: result.title,
      text: result.text,
      highlights: result.highlights,
    };
  });
  current.contents.push({ ids, urls, requestedAt: new Date().toISOString() });
  return { results };
}

export function recordFindSimilar(current, body) {
  const url = String(body.url ?? '').trim() || current.results[0].url;
  const numResults = clampCount(body.numResults ?? body.num_results, 5);
  const results = current.results.slice(0, numResults).map((result, index) => ({
    ...result,
    title: `Similar to ${url}: ${result.title}`,
    score: Number((0.95 - index * 0.04).toFixed(2)),
  }));
  current.similarities.push({ url, numResults, requestedAt: new Date().toISOString() });
  return { results };
}

export function recordAnswer(current, body) {
  const query = String(body.query ?? '').trim() || 'empty query';
  const result = {
    answer: `Deterministic Exa emulator answer for: ${query}`,
    citations: current.results.slice(0, 2).map(({ id, url, title }) => ({ id, url, title })),
  };
  current.answers.push({ query, requestedAt: new Date().toISOString() });
  return result;
}
