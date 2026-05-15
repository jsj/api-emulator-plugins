import { fixedNow, getState, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'weatherkit:state';

function base64Url(input) {
  return Buffer.from(JSON.stringify(input)).toString('base64url');
}

export function developerToken({ teamId = 'TEAMID1234', serviceId = 'com.example.weather', keyId = 'KEYID1234', expiresInSeconds = 3600 } = {}) {
  const issuedAt = Math.floor(Date.parse(fixedNow) / 1000);
  return [
    base64Url({ alg: 'ES256', kid: keyId, typ: 'JWT' }),
    base64Url({
      iss: teamId,
      iat: issuedAt,
      exp: issuedAt + expiresInSeconds,
      sub: serviceId,
      origin: 'weatherkit-emulator',
    }),
    'emulator-signature',
  ].join('.');
}

function defaultState() {
  return {
    attribution: { serviceName: 'Apple Weather', legalPageURL: 'https://weatherkit.apple.com/legal-attribution.html' },
    conditionCode: 'Clear',
    temperature: 21.4,
  };
}

const state = (store) => getState(store, STATE_KEY, defaultState);

function weatherPayload(current, lat, lon) {
  return {
    currentWeather: {
      name: 'CurrentWeather',
      metadata: { attributionURL: 'https://weatherkit.apple.com/legal-attribution.html', expireTime: fixedNow, latitude: Number(lat), longitude: Number(lon), readTime: fixedNow, reportedTime: fixedNow, units: 'm', version: 1 },
      asOf: fixedNow,
      cloudCover: 0.1,
      conditionCode: current.conditionCode,
      daylight: true,
      humidity: 0.45,
      precipitationIntensity: 0,
      pressure: 101.2,
      temperature: current.temperature,
      temperatureApparent: current.temperature,
      uvIndex: 3,
      visibility: 25000,
      windDirection: 270,
      windSpeed: 2.4,
    },
    forecastDaily: { name: 'DailyForecast', metadata: { readTime: fixedNow, units: 'm', version: 1 }, days: [{ forecastStart: '2026-01-01T00:00:00Z', forecastEnd: '2026-01-02T00:00:00Z', conditionCode: current.conditionCode, temperatureMax: current.temperature + 4, temperatureMin: current.temperature - 5 }] },
    forecastHourly: { name: 'HourlyForecast', metadata: { readTime: fixedNow, units: 'm', version: 1 }, hours: [{ forecastStart: fixedNow, conditionCode: current.conditionCode, temperature: current.temperature }] },
  };
}

export function seedFromConfig(store, baseUrl = 'https://weatherkit.apple.com', config = {}) {
  return setState(store, STATE_KEY, { ...defaultState(), baseUrl, ...config });
}

export const contract = {
  provider: 'weatherkit',
  source: 'Apple WeatherKit REST API documented subset',
  docs: 'https://developer.apple.com/documentation/weatherkitrestapi/',
  baseUrl: 'https://weatherkit.apple.com',
  scope: ['availability', 'weather'],
  fidelity: 'deterministic-subset',
};

export const plugin = {
  name: 'weatherkit',
  register(app, store) {
    app.get('/api/v1/availability/:latitude/:longitude', (c) => c.json({ datasets: ['currentWeather', 'forecastDaily', 'forecastHourly'], country: 'US' }));
    app.get('/api/v1/weather/:language/:latitude/:longitude', (c) => c.json(weatherPayload(state(store), c.req.param('latitude'), c.req.param('longitude'))));
    app.get('/weatherkit/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Apple WeatherKit API emulator';
export const endpoints = 'availability, current weather, daily forecast, hourly forecast';
export const initConfig = { weatherkit: { teamId: 'TEAMID1234', serviceId: 'com.example.weather', keyId: 'KEYID1234', developerToken: developerToken() } };

export default plugin;
