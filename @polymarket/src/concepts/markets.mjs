export function includesQuery(market, query) {
  if (!query) return true;
  const haystack = `${market.question} ${market.description ?? ''}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function marketFromBody(body) {
  const id = String(body.id ?? crypto.randomUUID());
  return {
    id,
    question: body.question ?? 'Emulated Polymarket question',
    outcomes: typeof body.outcomes === 'string' ? body.outcomes : JSON.stringify(body.outcomes ?? ['Yes', 'No']),
    outcomePrices: typeof body.outcomePrices === 'string' ? body.outcomePrices : JSON.stringify(body.outcomePrices ?? ['0.5', '0.5']),
    volume: String(body.volume ?? '0'),
    endDate: body.endDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    description: body.description ?? '',
  };
}
