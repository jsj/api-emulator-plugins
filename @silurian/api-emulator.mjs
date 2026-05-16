import { fixedNow, getState, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'silurian:state';

const metricUnits = {
  elevation: 'm',
  temperature: 'C',
  feels_like_temperature: 'C',
  precipitation_accumulation: 'mm',
  precipitation_probability: '%',
  snowfall_accumulation: 'mm',
  cloud_cover: '%',
  humidity: '%',
  wind_speed: 'm/s',
  wind_direction: 'degrees',
  dewpoint_temperature: 'C',
  pressure: 'hPa',
  downward_solar_radiation: 'W/m^2',
  wind_speed_100m: 'm/s',
  wind_direction_100m: 'degrees',
  global_horizontal_irradiation: 'W/m^2',
  direct_normal_irradiation: 'W/m^2',
  diffuse_horizontal_irradiation: 'W/m^2',
};

const gftusUnits = {
  elevation: 'm',
  temperature: 'C',
  humidity: '%',
  wind_speed: 'm/s',
  wind_direction: 'degrees',
  wind_speed_80m: 'm/s',
  wind_direction_80m: 'degrees',
  dewpoint_temperature: 'C',
  feels_like_temperature: 'C',
  pressure: 'hPa',
  downward_solar_radiation: 'W/m^2',
  precipitation_accumulation: 'mm',
  precipitation_probability: '%',
  cloud_cover: '%',
};

function defaultState() {
  return {
    forecastTime: '2026-01-01T06:00:00Z',
    portfolioId: 'portfolio_emulator',
    cycloneStormId: 'AL012026',
    cycloneStormName: 'Ada',
    baseWeather: {
      latitude: 47.6061,
      longitude: -122.3328,
      timezone: 'local',
      utc_offset: -28800,
      elevation: 52,
      temperature: 12.4,
      wind_speed: 4.8,
      wind_direction: 215,
      pressure: 1015,
      humidity: 71,
      cloud_cover: 42,
    },
  };
}

const state = (store) => getState(store, STATE_KEY, defaultState);

function numberQuery(c, name, fallback) {
  const value = c.req.query?.(name);
  return value === undefined ? fallback : Number(value);
}

function weatherBase(c, current) {
  return {
    latitude: numberQuery(c, 'latitude', current.baseWeather.latitude),
    longitude: numberQuery(c, 'longitude', current.baseWeather.longitude),
    forecast_time: current.forecastTime,
    timezone: c.req.query?.('timezone') ?? current.baseWeather.timezone,
    utc_offset: current.baseWeather.utc_offset,
    elevation: current.baseWeather.elevation,
  };
}

function hourlyCondition(current, timestamp = fixedNow) {
  return {
    timestamp,
    temperature: current.baseWeather.temperature,
    precipitation_accumulation: 0.4,
    precipitation_probability: 18,
    precipitation_type: 'rain',
    snowfall_accumulation: 0,
    cloud_cover: current.baseWeather.cloud_cover,
    humidity: current.baseWeather.humidity,
    wind_speed: current.baseWeather.wind_speed,
    wind_direction: current.baseWeather.wind_direction,
    dewpoint_temperature: 7.1,
    pressure: current.baseWeather.pressure,
    downward_solar_radiation: 180,
    wind_speed_100m: 7.2,
    wind_direction_100m: 220,
    feels_like_temperature: 11.8,
    weather_code: 'partly_cloudy',
    global_horizontal_irradiation: 210,
    direct_normal_irradiation: 80,
    diffuse_horizontal_irradiation: 130,
  };
}

function dailyCondition(current, timestamp = '2026-01-01T00:00:00Z') {
  return {
    ...hourlyCondition(current, timestamp),
    max_temperature: current.baseWeather.temperature + 4.6,
    min_temperature: current.baseWeather.temperature - 3.1,
  };
}

function hourlyWeather(c, current, gftus = false) {
  const condition = gftus
    ? {
        timestamp: fixedNow,
        temperature: current.baseWeather.temperature,
        humidity: current.baseWeather.humidity,
        wind_speed: current.baseWeather.wind_speed,
        wind_gust: 8.9,
        wind_direction: current.baseWeather.wind_direction,
        wind_speed_80m: 6.7,
        wind_direction_80m: 218,
        dewpoint_temperature: 7.1,
        feels_like_temperature: 11.8,
        pressure: current.baseWeather.pressure,
        precipitation_accumulation: 0.4,
        precipitation_probability: 18,
        cloud_cover: current.baseWeather.cloud_cover,
        downward_solar_radiation: 180,
      }
    : hourlyCondition(current);
  return {
    ...weatherBase(c, current),
    units: gftus ? gftusUnits : metricUnits,
    hourly: [condition],
  };
}

function dailyWeather(c, current) {
  return {
    ...weatherBase(c, current),
    units: metricUnits,
    daily: [dailyCondition(current)],
  };
}

function featureCollection(kind, current) {
  const coordinates = [current.baseWeather.longitude, current.baseWeather.latitude];
  return {
    bbox: [coordinates[0] - 0.1, coordinates[1] - 0.1, coordinates[0] + 0.1, coordinates[1] + 0.1],
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates },
        properties: { id: 'silurian_feature_1', kind, country: 'US', temperature: current.baseWeather.temperature },
        id: 'silurian_feature_1',
      },
    ],
  };
}

function timeSeriesFeatureCollection(kind, current) {
  const payload = featureCollection(kind, current);
  payload.features[0].properties = {
    datetimes: [fixedNow],
    static: { id: 'silurian_feature_1', kind, country: 'US' },
    temperature: [current.baseWeather.temperature],
    wind_speed: [current.baseWeather.wind_speed],
  };
  return payload;
}

function cycloneForecast(current) {
  return {
    storm_id: current.cycloneStormId,
    storm_name: current.cycloneStormName,
    type: 'tropical_cyclone',
    category: 2,
    position: { latitude: 25.4, longitude: -71.2 },
    forecast_time: current.forecastTime,
    forecast_source_info: 'OFCL emulator deterministic forecast',
    forecast_last_updated: fixedNow,
  };
}

function cycloneTrack(current) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [-71.2, 25.4],
            [-70.1, 26.0],
            [-68.7, 26.8],
          ],
        },
        properties: { storm_id: current.cycloneStormId, model: 'OFCL', datetimes: [fixedNow] },
        id: `${current.cycloneStormId}-track`,
      },
    ],
  };
}

function cycloneCone(current) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-72, 25], [-69, 25.5], [-67, 27.5], [-70, 28], [-72, 25]]],
        },
        properties: { storm_id: current.cycloneStormId, model: 'OFCL', max_lead_time: '72h' },
        id: `${current.cycloneStormId}-cone`,
      },
    ],
  };
}

export function seedFromConfig(store, baseUrl = 'https://earth.weather.silurian.ai/api/v1', config = {}) {
  return setState(store, STATE_KEY, { ...defaultState(), baseUrl, ...config });
}

export const contract = {
  provider: 'silurian',
  source: 'silurian-ai/silurian-ts Fern-generated SDK reference and wire tests',
  docs: 'https://github.com/silurian-ai/silurian-ts/blob/HEAD/reference.md',
  baseUrl: 'https://earth.weather.silurian.ai/api/v1',
  auth: { header: 'X-API-KEY' },
  scope: ['weather forecast', 'past weather forecast', 'portfolio GeoJSON', 'cyclone forecasts'],
  fidelity: 'deterministic-subset',
};

export const plugin = {
  name: 'silurian',
  register(app, store) {
    app.get('/forecast/daily', (c) => c.json(dailyWeather(c, state(store))));
    app.get('/forecast/hourly', (c) => c.json(hourlyWeather(c, state(store))));
    app.get('/past/forecast/daily', (c) => c.json(dailyWeather(c, state(store))));
    app.get('/past/forecast/hourly', (c) => c.json(hourlyWeather(c, state(store))));
    app.get('/experimental/extended', (c) => c.json(hourlyWeather(c, state(store))));
    app.get('/experimental/regional/usa', (c) => c.json(hourlyWeather(c, state(store), true)));
    app.get('/experimental/past/regional/usa', (c) => c.json(hourlyWeather(c, state(store), true)));
    app.get('/experimental/personalized/total-energies', (c) => c.body(null, 204));
    app.get('/portfolios/:portfolioId/features', (c) => c.json(featureCollection('features', state(store))));
    app.get('/portfolios/:portfolioId/forecasts', (c) => c.json(timeSeriesFeatureCollection('forecasts', state(store))));
    app.get('/portfolios/:portfolioId/observations', (c) => c.json(timeSeriesFeatureCollection('observations', state(store))));
    app.get('/portfolios/:portfolioId/init_time', (c) => c.json(state(store).forecastTime));
    app.get('/cyclones/forecasts', (c) => c.json([cycloneForecast(state(store))]));
    app.get('/cyclones/forecasts/:stormId/track', (c) => c.json(cycloneTrack(state(store))));
    app.get('/cyclones/forecasts/:stormId/cone', (c) => c.json(cycloneCone(state(store))));
    app.get('/silurian/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Silurian Earth API emulator';
export const endpoints = 'forecast daily/hourly, past forecast, experimental regional, portfolios, cyclone forecasts';
export const initConfig = { silurian: { apiKey: 'silurian_emulator_key' } };

export default plugin;
