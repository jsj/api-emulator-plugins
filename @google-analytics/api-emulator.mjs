import { createSaasProvider, fixedNow } from '../scripts/saas-emulator-kit.mjs';

const config = {
  name: 'google-analytics',
  label: 'Google Analytics Data API emulator',
  source: 'Google Analytics Data API v1 documented subset',
  docs: 'https://developers.google.com/analytics/devguides/reporting/data/v1/rest',
  baseUrl: 'https://analyticsdata.googleapis.com',
  scope: ["properties","runReport","realtime"],
  endpoints: 'properties, runReport, realtime',
  initConfig: { googleAnalytics: { accessToken: 'ga-emulator-token', propertyId: 'properties/1234' } },
  collections: { properties: [{ name: 'properties/1234', displayName: 'Emulator GA4 Property', propertyType: 'PROPERTY_TYPE_ORDINARY', createTime: fixedNow }], metadata: [{ apiName: 'activeUsers', uiName: 'Active users', type: 'TYPE_INTEGER' }] },
  routes: [
      { method: 'GET', path: '/v1beta/properties/:property/metadata', response: () => ({ dimensions: [{ apiName: 'country', uiName: 'Country' }], metrics: [{ apiName: 'activeUsers', uiName: 'Active users', type: 'TYPE_INTEGER' }] }) },
      { method: 'POST', path: '/v1beta/properties/1234:runReport', response: () => ({ dimensionHeaders: [{ name: 'country' }], metricHeaders: [{ name: 'activeUsers', type: 'TYPE_INTEGER' }], rows: [{ dimensionValues: [{ value: 'United States' }], metricValues: [{ value: '42' }] }], totals: [{ metricValues: [{ value: '42' }] }], rowCount: 1, metadata: { currencyCode: 'USD', timeZone: 'America/Los_Angeles' }, propertyQuota: { tokensPerDay: { consumed: 1, remaining: 24999 } } }) },
      { method: 'POST', path: '/v1beta/properties/1234:runRealtimeReport', response: () => ({ dimensionHeaders: [{ name: 'country' }], metricHeaders: [{ name: 'activeUsers', type: 'TYPE_INTEGER' }], rows: [{ dimensionValues: [{ value: 'United States' }], metricValues: [{ value: '7' }] }] }) },
      { method: 'POST', path: '/v1beta/properties/1234:batchRunReports', response: () => ({ reports: [{ dimensionHeaders: [{ name: 'country' }], metricHeaders: [{ name: 'activeUsers', type: 'TYPE_INTEGER' }], rows: [{ dimensionValues: [{ value: 'United States' }], metricValues: [{ value: '42' }] }], rowCount: 1 }] }) },
      { method: 'POST', path: '/v1beta/properties/:property:runReport', response: () => ({ dimensionHeaders: [{ name: 'country' }], metricHeaders: [{ name: 'activeUsers', type: 'TYPE_INTEGER' }], rows: [{ dimensionValues: [{ value: 'United States' }], metricValues: [{ value: '42' }] }], totals: [{ metricValues: [{ value: '42' }] }], rowCount: 1, metadata: { currencyCode: 'USD', timeZone: 'America/Los_Angeles' } }) },
      { method: 'POST', path: '/v1beta/properties/:property:runRealtimeReport', response: () => ({ dimensionHeaders: [{ name: 'country' }], metricHeaders: [{ name: 'activeUsers', type: 'TYPE_INTEGER' }], rows: [{ dimensionValues: [{ value: 'United States' }], metricValues: [{ value: '7' }] }] }) },
      { method: 'POST', path: '/v1beta/properties/:property:batchRunReports', response: () => ({ reports: [{ dimensionHeaders: [{ name: 'country' }], metricHeaders: [{ name: 'activeUsers', type: 'TYPE_INTEGER' }], rows: [{ dimensionValues: [{ value: 'United States' }], metricValues: [{ value: '42' }] }], rowCount: 1 }] }) },
    ],
};

export const { contract, plugin, seedFromConfig, label, endpoints, initConfig } = createSaasProvider(config);

export default plugin;
