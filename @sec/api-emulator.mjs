import { registerRoutes } from './src/routes/http.mjs';

export const contract = {
  provider: 'sec',
  source: 'SEC EDGAR compatible company submissions subset',
  docs: 'https://www.sec.gov/search-filings/edgar-application-programming-interfaces',
  scope: ['company-tickers', 'submissions'],
  fidelity: 'resource-model-subset',
};

export const plugin = {
  name: 'sec',
  register(app, store) {
    registerRoutes(app, store);
  },
};

export const label = 'SEC EDGAR API emulator';
export const endpoints = 'files/company_tickers.json, submissions/CIK:cik.json';
export const initConfig = { sec: {} };
