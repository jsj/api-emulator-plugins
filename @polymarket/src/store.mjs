export const DEFAULT_MARKETS = [
  {
    id: 'polymarket-weather-2026',
    question: 'Will global average temperature set a new record in 2026?',
    outcomes: JSON.stringify(['Yes', 'No']),
    outcomePrices: JSON.stringify(['0.58', '0.42']),
    volume: '4200000',
    endDate: '2026-06-30T00:00:00Z',
    description: 'Emulated Polymarket climate and weather market.',
  },
  {
    id: 'polymarket-space-launch-2026',
    question: 'Will there be more than 200 orbital launch attempts in 2026?',
    outcomes: JSON.stringify(['Yes', 'No']),
    outcomePrices: JSON.stringify(['0.47', '0.53']),
    volume: '1900000',
    endDate: '2026-12-31T00:00:00Z',
    description: 'Emulated Polymarket space industry market.',
  },
];

export function state(store) {
  const existing = store.getData?.('polymarket:state');
  if (existing) return existing;
  const initial = {
    markets: Object.fromEntries(DEFAULT_MARKETS.map((market) => [market.id, market])),
    requests: [],
  };
  store.setData?.('polymarket:state', initial);
  return initial;
}

export function saveState(store, value) {
  store.setData?.('polymarket:state', value);
}
