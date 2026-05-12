const COMPANIES = [
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

export const contract = {
  provider: 'sec',
  source: 'SEC EDGAR compatible company submissions subset',
  docs: 'https://www.sec.gov/search-filings/edgar-application-programming-interfaces',
  scope: ['company-tickers', 'submissions'],
  fidelity: 'resource-model-subset',
};

function state(store) {
  const existing = store.getData?.('sec:state');
  if (existing) return existing;
  const initial = {
    companies: Object.fromEntries(COMPANIES.map((company) => [company.cik, company])),
    requests: [],
  };
  store.setData?.('sec:state', initial);
  return initial;
}

function saveState(store, value) {
  store.setData?.('sec:state', value);
}

function tickerRows(companies) {
  return Object.fromEntries(
    Object.values(companies).map((company, index) => [
      String(index),
      {
        cik_str: Number(company.cik),
        ticker: company.tickers?.[0] ?? '',
        title: company.name,
      },
    ]),
  );
}

export const plugin = {
  name: 'sec',
  register(app, store) {
    app.get('/files/company_tickers.json', (c) => {
      const current = state(store);
      current.requests.push({ endpoint: '/files/company_tickers.json', requestedAt: new Date().toISOString() });
      saveState(store, current);
      return c.json(tickerRows(current.companies));
    });

    app.get('/submissions/:filename', (c) => {
      const current = state(store);
      const filename = String(c.req.param('filename') ?? '');
      const cik = filename.replace(/^CIK/i, '').replace(/\.json$/i, '').padStart(10, '0');
      current.requests.push({ endpoint: `/submissions/CIK${cik}.json`, requestedAt: new Date().toISOString() });
      saveState(store, current);
      const company = current.companies[cik];
      if (!company) return c.json({ error: 'Company not found' }, 404);
      return c.json(company);
    });

    app.post('/control/companies', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      const cik = String(body.cik ?? crypto.randomUUID().replaceAll('-', '').slice(0, 10)).padStart(10, '0');
      const company = {
        cik,
        name: body.name ?? 'Example Company Inc.',
        tickers: body.tickers ?? ['EXCO'],
        sic: body.sic ?? '0000',
        sicDescription: body.sicDescription ?? 'Emulator Company',
        exchanges: body.exchanges ?? ['NYSE'],
        fiscalYearEnd: body.fiscalYearEnd ?? '1231',
        stateOfIncorporation: body.stateOfIncorporation ?? 'DE',
        filings: body.filings ?? { recent: { accessionNumber: [], form: [], filingDate: [], primaryDocument: [] } },
      };
      const current = state(store);
      current.companies[cik] = company;
      saveState(store, current);
      return c.json(company, 201);
    });

    app.get('/inspect/companies', (c) => c.json(Object.values(state(store).companies)));
    app.get('/inspect/requests', (c) => c.json(state(store).requests));
  },
};

export const label = 'SEC EDGAR API emulator';
export const endpoints = 'files/company_tickers.json, submissions/CIK:cik.json';
export const initConfig = { sec: {} };
