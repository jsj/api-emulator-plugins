import { createSaasProvider, fixedNow } from '../scripts/saas-emulator-kit.mjs';

const config = {
  name: 'google-flights',
  label: 'Google Flights API emulator',
  source: 'Google Travel flights search documented workflow subset',
  docs: 'https://developers.google.com/travel/flights',
  baseUrl: 'https://www.googleapis.com/travel/flights',
  scope: ["airports","flight_offers","price_insights"],
  endpoints: 'airports, flight_offers, price_insights',
  initConfig: { googleFlights: { apiKey: 'google-flights-emulator-key' } },
  collections: { airports: [{ code: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco' }, { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York' }], offers: [{ id: 'flt_001', origin: 'SFO', destination: 'JFK', departure_date: '2026-06-01', price: { currency: 'USD', amount: 329 }, segments: [{ carrier: 'Emulator Air', flight_number: 'EA101' }] }] },
  routes: [
      { method: 'GET', path: '/v1/airports', collection: 'airports', action: 'list', envelope: 'airports' },
      { method: 'POST', path: '/v1/flights:search', response: (c, state) => ({ flights: state.collections.offers, best_price: state.collections.offers[0].price }) },
      { method: 'GET', path: '/v1/flights/:id', collection: 'offers', action: 'get', param: 'id', envelope: 'flight' },
      { method: 'POST', path: '/v1/priceInsights:query', response: () => ({ insight: 'typical', price_level: 'low', recommendation: 'book_now' }) },
    ],
};

export const { contract, plugin, seedFromConfig, label, endpoints, initConfig } = createSaasProvider(config);

export default plugin;
