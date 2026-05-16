import { getState, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'google-maps:state';

function defaultState() {
  return {
    places: [
      { id: 'places/apple-park', name: 'places/apple-park', displayName: { text: 'Apple Park', languageCode: 'en' }, formattedAddress: 'One Apple Park Way, Cupertino, CA 95014, USA', location: { latitude: 37.3349, longitude: -122.0090 }, types: ['point_of_interest', 'establishment'], rating: 4.7, userRatingCount: 1200, businessStatus: 'OPERATIONAL', regularOpeningHours: { openNow: true }, nationalPhoneNumber: '(408) 996-1010', websiteUri: 'https://www.apple.com/', photos: [{ name: 'places/apple-park/photos/photo-emulator', widthPx: 1200, heightPx: 800 }] },
      { id: 'places/coffee-emulator', name: 'places/coffee-emulator', displayName: { text: 'Emulator Coffee', languageCode: 'en' }, formattedAddress: '123 Localhost Ave, Test City, CA 94000, USA', location: { latitude: 37.78, longitude: -122.41 }, types: ['cafe', 'food', 'establishment'], rating: 4.5, userRatingCount: 42, businessStatus: 'OPERATIONAL', regularOpeningHours: { openNow: true }, nationalPhoneNumber: '(555) 0100-0000', websiteUri: 'https://example.com/coffee', photos: [{ name: 'places/coffee-emulator/photos/photo-emulator', widthPx: 1200, heightPx: 800 }] },
    ],
  };
}

const state = (store) => getState(store, STATE_KEY, defaultState);
const save = (store, next) => setState(store, STATE_KEY, next);
const googleError = (c, status, message, code = 'INVALID_ARGUMENT') => c.json({ error: { code: status, message, status: code } }, status);

export const contract = {
  provider: 'google-maps',
  source: 'Google Places API (New) REST discovery document',
  docs: 'https://developers.google.com/maps/documentation/places/web-service/reference/rest',
  baseUrl: 'https://places.googleapis.com',
  auth: 'X-Goog-Api-Key or key query parameter',
  scope: ['places-search-text', 'places-search-nearby', 'place-details', 'autocomplete'],
  fidelity: 'deterministic-places-rest-emulator',
};

export const plugin = {
  name: 'google-maps',
  register(app, store) {
    app.post('/v1/places:searchText', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      const query = String(body.textQuery ?? '').toLowerCase();
      const places = state(store).places.filter((place) => !query || place.displayName.text.toLowerCase().includes(query) || place.formattedAddress.toLowerCase().includes(query));
      return c.json({ places: applyFieldMask(c, places), nextPageToken: '' });
    });
    app.post('/v1/places:searchNearby', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      const included = body.includedTypes ?? [];
      const places = state(store).places.filter((place) => included.length === 0 || included.some((type) => place.types.includes(type)));
      return c.json({ places: applyFieldMask(c, places) });
    });
    app.post('/v1/places:autocomplete', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      const input = String(body.input ?? '').toLowerCase();
      const suggestions = state(store).places.filter((place) => !input || place.displayName.text.toLowerCase().includes(input)).map((place) => ({ placePrediction: { place: place.name, placeId: place.id.split('/').pop(), text: place.displayName } }));
      return c.json({ suggestions });
    });
    app.get('/v1/places/:placeId/photos/:photoId/media', (c) => {
      const name = `places/${c.req.param('placeId')}/photos/${c.req.param('photoId')}`;
      const photo = state(store).places.flatMap((place) => place.photos ?? []).find((item) => item.name === name);
      if (!photo) return googleError(c, 404, 'Photo not found', 'NOT_FOUND');
      return c.json({ name, photoUri: `https://lh3.googleusercontent.com/emulator/${encodeURIComponent(name)}` });
    });
    app.get('/v1/places/:placeId', (c) => {
      const id = c.req.param('placeId');
      const place = state(store).places.find((item) => item.id === id || item.name === `places/${id}` || item.id === `places/${id}`);
      if (!place) return googleError(c, 404, 'Place not found', 'NOT_FOUND');
      return c.json(applyFieldMask(c, [place])[0]);
    });
    app.get('/google-maps/inspect/state', (c) => c.json(state(store)));
  },
};

function applyFieldMask(c, places) {
  const raw = c.req.header('x-goog-fieldmask') ?? c.req.header('X-Goog-FieldMask') ?? c.req.query('$fields') ?? '';
  if (!raw || raw === '*') return places;
  const fields = raw.split(',').map((field) => field.trim().replace(/^places\./, '')).filter(Boolean);
  return places.map((place) => Object.fromEntries(fields.filter((field) => field in place).map((field) => [field, place[field]])));
}

export function seedFromConfig(store, _baseUrl, config = {}) {
  return save(store, { ...defaultState(), ...config });
}

export const label = 'Google Maps Places API emulator';
export const endpoints = 'Places text search, nearby search, details, and autocomplete';
export const capabilities = contract.scope;
export const initConfig = { 'google-maps': { apiKey: 'google_maps_emulator_key' } };
export default plugin;
