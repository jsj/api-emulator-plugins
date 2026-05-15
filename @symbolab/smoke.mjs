import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'symbolab');

const solution = await harness.call('POST', '/pub_api/bridge/solution', {
  origin: 'input',
  language: 'en',
  query: '2x+3=7',
  referer: '',
  useDelimiters: 'true',
});
assert.equal(solution.payload.mainAlternative.symbolab_question, 'EQUATION#2x+3=7');
assert.equal(solution.payload.solution.solution.default, 'x=2');
assert.equal(solution.payload.queryDisplay, '$$2x+3=7$$');

const steps = await harness.call('POST', '/pub_api/bridge/steps', {
  appName: 'Symbolab',
  symbolabQuestion: '2x+3=7',
  language: 'en',
  origin: 'input',
  userRequestsFreeSteps: 'true',
});
assert.equal(steps.payload.solution.steps.steps.length, 2);
assert.equal(steps.payload.solution.steps.steps[1].result, 'x=2');

const correct = await harness.call('POST', '/pub_api/bridge/verify', {
  symbolabQuestion: '2x+3=7',
  answer: 'x=2',
  language: 'en',
  appName: 'Symbolab',
  origin: 'input',
});
assert.equal(correct.payload.correct, true);

const incorrect = await harness.call('POST', '/pub_api/bridge/verifyProblem', {
  problem: '2x+3=7',
  answer: 'x=3',
  language: 'en',
  appName: 'Symbolab',
  origin: 'input',
});
assert.equal(incorrect.payload.correct, false);

const graph = await harness.call('POST', '/pub_api/graph/plottingInfo', {
  userGraph: JSON.stringify({ formulas: [{ fst: 'y=x^2' }] }),
  origin: 'input',
  language: 'en',
  nolog: 'true',
});
assert.equal(graph.payload.funcsToDraw.funcs[0].derivativeFormula, '2x');

const state = await harness.call('GET', '/symbolab/inspect/state');
assert.equal(state.payload.requests.length, 5);

console.log('symbolab smoke ok');
