import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'wolfram');

const short = await harness.call('GET', '/v1/result?appid=dummy&i=2%2B2');
assert.equal(short.payload, '4');

const spoken = await harness.call('GET', '/v1/spoken?appid=dummy&i=capital%20of%20france');
assert.equal(spoken.payload, 'The capital of France is Paris.');

const full = await harness.call('GET', '/v2/query?appid=dummy&input=2%2B2&output=json');
assert.equal(full.payload.queryresult.success, true);
assert.equal(full.payload.queryresult.pods.find((pod) => pod.primary).subpods[0].plaintext, '4');

const resultOnly = await harness.call('GET', '/v2/query?appid=dummy&input=2%2B2&includepodid=result');
assert.equal(resultOnly.payload.queryresult.numpods, 1);
assert.equal(resultOnly.payload.queryresult.pods[0].id, 'result');

const noInputPod = await harness.call('GET', '/v2/query?appid=dummy&input=2%2B2&excludepodid=inputinterpretation');
assert.ok(noInputPod.payload.queryresult.pods.every((pod) => pod.id !== 'inputinterpretation'));

const imageFormat = await harness.call('GET', '/v2/query?appid=dummy&input=2%2B2&format=plaintext,image&podtitle=result');
assert.equal(imageFormat.payload.queryresult.pods[0].subpods[0].img.alt, '4');

const unknown = await harness.call('GET', '/v2/query?appid=dummy&input=unknown');
assert.equal(unknown.payload.queryresult.success, false);

const llm = await harness.call('GET', '/api/v1/llm-api?appid=dummy&input=2%2B2');
assert.match(llm.payload, /Answer: 4/);

console.log('wolfram smoke ok');
