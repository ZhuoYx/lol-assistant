// Run with: node packages/desktop/scripts/check-data.cjs
// Exercise real adapters/stores using captured public data and a mocked IPC boundary.
const { readFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const root = resolve(__dirname, '..');
const scopedRequire = createRequire(join(root, 'package.json'));
const ts = scopedRequire('typescript');
const { createPinia, setActivePinia } = scopedRequire('pinia');
function load(file, mocks = {}) {
  const output = ts.transpileModule(readFileSync(join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => mocks[name] ?? scopedRequire(name), mod, mod.exports);
  return mod.exports;
}
const fixtures = JSON.parse(readFileSync(join(__dirname, 'fixtures/qq101.json'), 'utf8'));
const { QQ101Scraper, unpack101 } = load('src/main/scraper/qq101.ts');

test('101 source decodes captured ranked, rune, item and counter responses', async () => {
  const scraper = new QQ101Scraper();
  scraper.http = { get: async (url, options) => {
    if (url.includes('versionlist')) return { data: { code: 0, data: [{ name: '16.21' }] } };
    assert.equal(options.params.version_id, '16.21');
    const kind = url.split('lol_101strategy')[1].replace(/^_/, '') || 'rank';
    return { data: fixtures[kind] };
  } };
  const ranking = await scraper.getChampionRankings();
  assert.ok(ranking.rankings.some(r => r.championId === 99 && r.position === 'mid'));
  const builds = await scraper.getChampionBuilds(99, 'mid');
  assert.equal(builds.dataSource, 'qq101');
  const comet = builds.runeBuilds.find(r => r.primaryPerks[0] === 8229);
  assert.equal(comet.primaryTree, 8200);
  assert.equal(comet.secondaryTree, 8100);
  assert.equal(comet.primaryPerks.length + comet.secondaryPerks.length + comet.statShards.length, 9);
  assert.deepEqual(builds.itemBuilds[0].items, [6655, 4646, 4645]);
  assert.deepEqual(builds.skillPriority, ['E', 'Q', 'W']);
  assert.deepEqual(builds.skillOrder, []); // Do not invent a full 18-level order.
  const counters = await scraper.getChampionCounters(99, 'mid');
  assert.ok(Math.abs(counters.hardCounters[0].winRate - 62.16) < 0.001);
  assert.throws(() => unpack101({ code: 500 }), /数据请求失败/);
});

test('pagination uses the unfiltered cursor and stops a repeated LCU page', async () => {
  setActivePinia(createPinia());
  const calls = [];
  const pageIds = Array.from({ length: 20 }, (_, i) => i + 1);
  global.window = { electronAPI: { getMatchList: async params => {
    calls.push(params);
    return { matches: [{ gameId: 1 }], totalGames: 20, pageGameIds: pageIds, nextIndex: params.begIndex + 20, hasMore: true };
  } } };
  const { useMatchStore } = load('src/renderer/src/stores/match.ts', { './summoner': { useSummonerStore: () => ({ activePUUID: 'test-player' }) } });
  const store = useMatchStore();
  store.setFilters({ queue: 420 });
  await store.fetchMatchList(true);
  assert.equal(store.hasMore, true);
  await store.fetchMatchList(false);
  assert.equal(calls[1].begIndex, 20);
  assert.equal(store.matchList.length, 1);
  assert.equal(store.hasMore, false);
  assert.match(store.paginationNotice, /重复/);
});

test('history continues through 20, 40, 60 and 65 games using raw page offsets', async () => {
  setActivePinia(createPinia());
  const calls = [];
  const history = Array.from({ length: 65 }, (_, i) => ({ gameId: i + 1 }));
  global.window = { electronAPI: { getMatchList: async params => {
    calls.push(params);
    const page = history.slice(params.begIndex, params.endIndex + 1);
    return { matches: page, totalGames: page.length, pageGameIds: page.map(m => m.gameId), nextIndex: params.begIndex + page.length, hasMore: page.length === 20 };
  } } };
  const { useMatchStore } = load('src/renderer/src/stores/match.ts', { './summoner': { useSummonerStore: () => ({ activePUUID: 'test-player' }) } });
  const store = useMatchStore();
  for (const [index, count] of [20, 40, 60, 65].entries()) {
    assert.equal(await store.fetchMatchList(index === 0), true);
    assert.equal(store.matchList.length, count);
  }
  assert.deepEqual(calls.map(p => [p.begIndex, p.endIndex]), [[0, 19], [20, 39], [40, 59], [60, 79]]);
  assert.equal(store.hasMore, false);
  assert.equal(new Set(store.matchList.map(m => m.gameId)).size, 65);
});

test('a failed older-history request preserves records and retries the same cursor', async () => {
  setActivePinia(createPinia());
  const calls = [];
  let attempts = 0;
  global.window = { electronAPI: { getMatchList: async params => {
    calls.push(params.begIndex);
    if (++attempts === 2) throw new Error('temporary history failure');
    const page = Array.from({ length: 20 }, (_, i) => ({ gameId: params.begIndex + i + 1 }));
    return { matches: params.begIndex ? [...page, page[0]] : page, totalGames: 20, pageGameIds: page.map(m => m.gameId), nextIndex: params.begIndex + 20, hasMore: true };
  } } };
  const { useMatchStore } = load('src/renderer/src/stores/match.ts', { './summoner': { useSummonerStore: () => ({ activePUUID: 'test-player' }) } });
  const store = useMatchStore();
  await store.fetchMatchList(true);
  const originalCount = store.matchList.length;
  assert.equal(await store.fetchMatchList(false), false);
  assert.equal(store.matchList.length, originalCount);
  assert.equal(store.hasMore, true);
  assert.match(store.error, /temporary history failure/);
  assert.equal(await store.fetchMatchList(false), true);
  assert.deepEqual(calls, [0, 20, 20]);
  assert.equal(store.error, null);
  assert.equal(store.matchList.length, 40);
  assert.equal(store.matchList.filter(m => m.gameId === 21).length, 1);
});

test('an empty filtered page still allows loading older matching records', async () => {
  setActivePinia(createPinia());
  const calls = [];
  global.window = { electronAPI: { getMatchList: async params => {
    calls.push(params.begIndex);
    return { matches: params.begIndex === 0 ? [] : [{ gameId: 21 }], totalGames: 20, pageGameIds: Array.from({ length: 20 }, (_, i) => params.begIndex + i + 1), nextIndex: params.begIndex + 20, hasMore: true };
  } } };
  const { useMatchStore } = load('src/renderer/src/stores/match.ts', { './summoner': { useSummonerStore: () => ({ activePUUID: 'test-player' }) } });
  const store = useMatchStore();
  store.setFilters({ queue: 420 });
  await store.fetchMatchList(true);
  assert.equal(store.matchList.length, 0);
  assert.equal(store.hasMore, true);
  await store.fetchMatchList(false);
  assert.deepEqual(calls, [0, 20]);
  assert.equal(store.matchList[0].gameId, 21);
});

test('changing player invalidates an in-flight match result', async () => {
  setActivePinia(createPinia());
  let resolveRequest;
  global.window = { electronAPI: { getMatchList: () => new Promise(resolve => { resolveRequest = resolve; }) } };
  const { useMatchStore } = load('src/renderer/src/stores/match.ts', { './summoner': { useSummonerStore: () => ({ activePUUID: 'old-player' }) } });
  const store = useMatchStore();
  const pending = store.fetchMatchList(true);
  store.clear();
  resolveRequest({ matches: [{ gameId: 99 }], totalGames: 1 });
  await pending;
  assert.equal(store.matchList.length, 0);
});

test('live analysis keeps reactive state when async data arrives and refresh fails', async () => {
  setActivePinia(createPinia());
  const vue = scopedRequire('vue');
  const { useLiveGameStore } = load('src/renderer/src/stores/live-game.ts');
  const store = useLiveGameStore();
  const { useLiveGame } = load('src/renderer/src/composables/useLiveGame.ts', {
    vue: { ...vue, onMounted() {}, onUnmounted() {} },
    '@/stores/live-game': { useLiveGameStore: () => store },
    '@/stores/app': { useAppStore: () => ({ gamePhase: 'None' }) },
  });
  let finish;
  global.window = { electronAPI: { analyzeLiveGame: () => new Promise(resolve => { finish = resolve; }) } };
  const live = useLiveGame();
  assert.equal(live.analysis.value, null);
  const pending = live.analyze();
  assert.equal(live.loading.value, true);
  finish({ gameId: 101, gameMode: 'CLASSIC', teams: [] });
  await pending;
  assert.equal(live.analysis.value.gameId, 101);
  assert.equal(live.loading.value, false);
  global.window.electronAPI.analyzeLiveGame = async () => { throw new Error('refresh unavailable'); };
  await live.analyze(3); // Last attempt skips the scheduled retry in this regression check.
  assert.match(live.error.value, /refresh unavailable/);
  assert.equal(live.analysis.value.gameId, 101);
});

test('system theme responds to OS changes and releases the listener', async () => {
  setActivePinia(createPinia());
  const saved = new Map([['lol-assistant-theme', 'system']]);
  global.localStorage = { getItem: k => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v) };
  let listener;
  let removed = false;
  const media = { matches: false, addEventListener: (_name, fn) => { listener = fn; }, removeEventListener: () => { removed = true; } };
  global.window = { matchMedia: () => media };
  global.document = { documentElement: { setAttribute() {}, style: { setProperty() {} } } };
  const { useAppStore } = load('src/renderer/src/stores/app.ts', { '@/styles/wallpapers': { wallpapers: [{ id: 'anime' }] } });
  const store = useAppStore();
  assert.equal(store.isDarkTheme, false);
  listener({ matches: true });
  assert.equal(store.isDarkTheme, true);
  store.updateSettings({ theme: 'light' });
  assert.equal(store.isDarkTheme, false);
  assert.equal(saved.get('lol-assistant-theme'), 'light');
  store.$dispose();
  assert.equal(removed, true);
});

test('source caches stay isolated and a provider error is propagated', async () => {
  let savedSource = 'opgg';
  class Storage {
    constructor(source) { this.source = source; this.data = new Map(); }
    async getChampionBuilds(id, role) { return this.data.get(`${id}/${role}`); }
    async saveChampionBuilds(data) { this.data.set(`${data.championId}/${data.role}`, data); }
    async saveDataVersion() {}
  }
  const provider = source => class {
    async getChampionBuilds(id, role) {
      if (id === 999) throw new Error('source unavailable');
      return { championId: id, role, dataSource: source, availableRoles: [role] };
    }
  };
  const { ScraperManager } = load('src/main/scraper/index.ts', {
    './opgg': { OPGGScraper: provider('opgg') }, './qq101': { QQ101Scraper: provider('qq101') },
    './storage': { ScraperStorage: Storage }, './scheduler': { ScraperScheduler: class {} },
    '../cache/store': { cacheStore: { getSetting: () => savedSource, setSetting: (_k, v) => { savedSource = v; } } },
  });
  const manager = new ScraperManager();
  assert.equal((await manager.getChampionBuilds(99, 'mid')).dataSource, 'opgg');
  manager.setSource('qq101');
  assert.equal((await manager.getChampionBuilds(99, 'mid')).dataSource, 'qq101');
  assert.equal(savedSource, 'qq101');
  await assert.rejects(manager.getChampionBuilds(999, 'mid'), /source unavailable/);
  assert.throws(() => manager.setSource('local'), /不支持/);
});
