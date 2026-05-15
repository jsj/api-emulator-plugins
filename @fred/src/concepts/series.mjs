export function queryParam(c, name, fallback = '') {
  return c.req.query?.(name) ?? fallback;
}

export function matchingSeries(series, searchText, limit) {
  return series
    .filter((item) => !searchText || `${item.id} ${item.title}`.toLowerCase().includes(searchText))
    .slice(0, limit);
}
