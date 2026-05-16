import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);

const hourly = await harness.call('GET', '/forecast/hourly?latitude=47.6061&longitude=-122.3328&timezone=local&units=metric', undefined, { 'x-api-key': 'silurian_emulator_key' });
assert.equal(hourly.status, 200);
assert.equal(hourly.payload.hourly[0].weather_code, 'partly_cloudy');
assert.equal(hourly.payload.units.temperature, 'C');

const daily = await harness.call('GET', '/past/forecast/daily?latitude=47.6061&longitude=-122.3328&time=2024-01-01T00%3A00%3A00Z');
assert.equal(daily.payload.daily[0].max_temperature, 17);

const regional = await harness.call('GET', '/experimental/regional/usa?latitude=47.6061&longitude=-122.3328');
assert.equal(regional.payload.hourly[0].wind_gust, 8.9);
assert.equal(regional.payload.units.wind_speed_80m, 'm/s');

const features = await harness.call('GET', '/portfolios/portfolio_emulator/features?x=1&y=1&z=1&country=US');
assert.equal(features.payload.type, 'FeatureCollection');
assert.equal(features.payload.features[0].properties.kind, 'features');

const forecasts = await harness.call('GET', '/portfolios/portfolio_emulator/forecasts?init_time=2026-01-01T06%3A00%3A00Z');
assert.equal(forecasts.payload.features[0].properties.datetimes[0], '2026-01-01T00:00:00.000Z');

const initTime = await harness.call('GET', '/portfolios/portfolio_emulator/init_time?time=2026-01-01T00%3A00%3A00Z');
assert.equal(initTime.payload, '2026-01-01T06:00:00Z');

const cyclones = await harness.call('GET', '/cyclones/forecasts?model=OFCL');
assert.equal(cyclones.payload[0].storm_id, 'AL012026');

const track = await harness.call('GET', '/cyclones/forecasts/AL012026/track?model=OFCL');
assert.equal(track.payload.features[0].geometry.type, 'LineString');

const cone = await harness.call('GET', '/cyclones/forecasts/AL012026/cone?smooth_cone=true');
assert.equal(cone.payload.features[0].geometry.type, 'Polygon');

console.log('silurian smoke ok');
