export const COMPANIES = [
  {
    cik: '0000001001',
    name: 'Example Robotics Inc.',
    tickers: ['EXRB'],
    sic: '3571',
    sicDescription: 'Electronic Computers',
    exchanges: ['NYSE'],
    fiscalYearEnd: '1231',
    stateOfIncorporation: 'DE',
    filings: {
      recent: {
        accessionNumber: ['0000001001-26-000001', '0000001001-25-000010'],
        form: ['10-K', '10-Q'],
        filingDate: ['2026-02-15', '2025-11-05'],
        primaryDocument: ['exrb-20261231.htm', 'exrb-20250930.htm'],
      },
    },
  },
  {
    cik: '0000001002',
    name: 'Example Foods Corp.',
    tickers: ['EXFD'],
    sic: '2000',
    sicDescription: 'Food and Kindred Products',
    exchanges: ['NASDAQ'],
    fiscalYearEnd: '0630',
    stateOfIncorporation: 'CA',
    filings: {
      recent: {
        accessionNumber: ['0000001002-26-000001'],
        form: ['8-K'],
        filingDate: ['2026-01-20'],
        primaryDocument: ['exfd-8k.htm'],
      },
    },
  },
];

export function state(store) {
  const existing = store.getData?.('sec:state');
  if (existing) return existing;
  const initial = {
    companies: Object.fromEntries(COMPANIES.map((company) => [company.cik, company])),
    requests: [],
  };
  store.setData?.('sec:state', initial);
  return initial;
}

export function saveState(store, value) {
  store.setData?.('sec:state', value);
}
