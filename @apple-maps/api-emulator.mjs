import { fixedNow, getState, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'apple-maps:state';

function defaultState(baseUrl = 'https://maps-api.apple.com') {
  return {
    baseUrl,
    places: [{ id: 'apple-park', displayMapRegion: { southLatitude: 37.3301, westLongitude: -122.0328, northLatitude: 37.3342, eastLongitude: -122.0054 }, coordinate: { latitude: 37.3349, longitude: -122.0090 }, name: 'Apple Park', formattedAddressLines: ['One Apple Park Way', 'Cupertino, CA 95014'] }],
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());

export function seedFromConfig(store, baseUrl = 'https://maps-api.apple.com', config = {}) {
  return setState(store, STATE_KEY, { ...defaultState(baseUrl), ...config });
}

export const contract = {
  provider: 'apple-maps',
  source: 'Apple Maps Server API documented subset',
  docs: 'https://developer.apple.com/documentation/applemapsserverapi/',
  baseUrl: 'https://maps-api.apple.com',
  scope: ['token', 'search', 'geocode', 'reverse_geocode'],
  fidelity: 'deterministic-subset',
};

export const plugin = {
  name: 'apple-maps',
  register(app, store) {
    app.get('/v1/token', (c) => c.json({ accessToken: 'apple_maps_access_emulator', expiresInSeconds: 1800, issuedAt: fixedNow }));
    app.get('/v1/search', (c) => {
      const q = c.req.query('q')?.toLowerCase();
      const results = state(store).places.filter((place) => !q || place.name.toLowerCase().includes(q) || place.formattedAddressLines.join(' ').toLowerCase().includes(q));
      return c.json({ results });
    });
    app.get('/v1/geocode', (c) => c.json({ results: state(store).places }));
    app.get('/v1/reverseGeocode', (c) => c.json({ results: state(store).places }));
    app.get('/apple-maps/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Apple Maps Server API emulator';
export const endpoints = 'token, search, geocode, reverse geocode';
export const initConfig = { 'apple-maps': { teamId: 'TEAMID1234', mapsId: 'maps.example', keyId: 'KEYID1234' } };

export default plugin;
