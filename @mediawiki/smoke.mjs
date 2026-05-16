import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'mediawiki');

const wikipediaSearch = await harness.call('GET', '/w/api.php?action=query&list=search&srsearch=MediaWiki&format=json');
assert.equal(wikipediaSearch.status, 200);
assert.equal(wikipediaSearch.payload.query.searchinfo.totalhits, 1);
assert.equal(wikipediaSearch.payload.query.search[0].title, 'MediaWiki');

const wookieepediaSearch = await harness.call('GET', '/api.php?action=query&list=search&site=wookieepedia&srsearch=Luke%20Skywalker&format=json');
assert.equal(wookieepediaSearch.status, 200);
assert.equal(wookieepediaSearch.payload.query.search[0].title, 'Luke Skywalker');

const siteinfo = await harness.call('GET', '/w/api.php?action=query&meta=siteinfo&siprop=general|statistics&format=json');
assert.equal(siteinfo.payload.query.general.sitename, 'Wikipedia');
assert.ok(siteinfo.payload.query.statistics.articles > 1000000);

const page = await harness.call('GET', '/w/api.php?action=query&prop=info|extracts|revisions&titles=MediaWiki&format=json');
const pagePayload = page.payload.query.pages['12345'];
assert.equal(pagePayload.title, 'MediaWiki');
assert.match(pagePayload.extract, /open-source wiki software/);
assert.match(pagePayload.revisions[0].slots.main['*'], /MediaWiki/);

const parsed = await harness.call('GET', '/api.php?action=parse&site=wookieepedia&page=Luke_Skywalker&format=json');
assert.equal(parsed.payload.parse.pageid, 1138);
assert.match(parsed.payload.parse.text['*'], /legendary Jedi Master/);

const opensearch = await harness.call('GET', '/api.php?action=opensearch&site=wookieepedia&search=Wookieepedia&limit=5&format=json');
assert.equal(opensearch.payload[1][0], 'Wookieepedia');
assert.match(opensearch.payload[3][0], /starwars\.fandom\.com/);

const summary = await harness.call('GET', '/api/rest_v1/page/summary/MediaWiki');
assert.equal(summary.payload.title, 'MediaWiki');
assert.match(summary.payload.extract, /Wikipedia/);

const popular = await harness.call('GET', '/mediawiki/inspect/popular');
assert.deepEqual(popular.payload.map((site) => site.key), ['wikipedia', 'commons', 'wiktionary', 'wikidata', 'wookieepedia']);

const unknown = await harness.call('GET', '/api.php?action=unknown');
assert.equal(unknown.status, 400);
assert.equal(unknown.payload.error.code, 'unknown_action');

console.log('mediawiki smoke ok');
