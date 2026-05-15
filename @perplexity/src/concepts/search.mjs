export function resultForQuery(query, result, index) {
  return {
    ...result,
    title: `${result.title}: ${query}`,
    snippet: `${result.snippet} Query: ${query}.`,
    rank: index + 1,
  };
}

export function recordSearch(current, body) {
  const query = String(body.query ?? '').trim();
  const maxResults = Math.max(0, Number(body.max_results ?? body.maxResults ?? 10));
  current.searches.push({
    query,
    maxResults,
    requestedAt: new Date().toISOString(),
  });
  return {
    query,
    maxResults,
    results: current.results.slice(0, maxResults).map((result, index) => resultForQuery(query || 'empty query', result, index)),
  };
}
