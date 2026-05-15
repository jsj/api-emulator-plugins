import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, developerToken, initConfig, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'weatherkit');
assert.match(developerToken(), /^[^.]+\.[^.]+\.emulator-signature$/);
assert.match(initConfig.weatherkit.developerToken, /^[^.]+\.[^.]+\.emulator-signature$/);

const availability = await harness.call('GET', '/api/v1/availability/37.3317/-122.0301');
assert.ok(availability.payload.datasets.includes('currentWeather'));

const weather = await harness.call('GET', '/api/v1/weather/en/37.3317/-122.0301?dataSets=currentWeather,forecastDaily');
assert.equal(weather.payload.currentWeather.conditionCode, 'Clear');
assert.equal(weather.payload.forecastDaily.days.length, 1);

console.log('weatherkit smoke ok');
