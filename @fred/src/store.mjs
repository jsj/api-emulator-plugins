export const SERIES = [
  {
    id: 'EMU_RATE',
    title: 'Emulator Policy Rate',
    frequency: 'Monthly',
    frequency_short: 'M',
    units: 'Percent',
    units_short: '%',
    last_updated: '2026-01-01 00:00:00-06',
    popularity: 99,
  },
  {
    id: 'EMU_PRICE_INDEX',
    title: 'Emulator Price Index',
    frequency: 'Monthly',
    frequency_short: 'M',
    units: 'Index 2020=100',
    units_short: 'Index',
    last_updated: '2026-01-01 00:00:00-06',
    popularity: 80,
  },
];

export const OBSERVATIONS = {
  EMU_RATE: [
    { date: '2026-01-01', value: '4.25' },
    { date: '2025-12-01', value: '4.50' },
    { date: '2025-11-01', value: '4.50' },
  ],
  EMU_PRICE_INDEX: [
    { date: '2026-01-01', value: '112.4' },
    { date: '2025-12-01', value: '111.9' },
    { date: '2025-11-01', value: '111.2' },
  ],
};

export function state(store) {
  const existing = store.getData?.('fred:state');
  if (existing) return existing;
  const initial = { requests: [], series: SERIES, observations: OBSERVATIONS };
  store.setData?.('fred:state', initial);
  return initial;
}

export function saveState(store, value) {
  store.setData?.('fred:state', value);
}
