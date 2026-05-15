export function tickerRows(companies) {
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

export function companyFromBody(body) {
  const cik = String(body.cik ?? crypto.randomUUID().replaceAll('-', '').slice(0, 10)).padStart(10, '0');
  return {
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
}
