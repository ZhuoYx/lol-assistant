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

const logExport = load('src/main/utils/log-export.ts');
const logContext = { appVersion:'0.1.0',system:'Windows test',arch:'x64',electronVersion:'33',nodeVersion:'20',connectionStatus:'disconnected' };
async function temporaryLogDirectory(run) {
  const fs=require('node:fs/promises');const path=require('node:path');const base=require('node:os').tmpdir();
  const directory=await fs.mkdtemp(join(base,'lol-log-export-test-'));
  try {return await run(fs,directory);} finally {
    assert.ok(path.resolve(directory).startsWith(path.resolve(base)+path.sep+'lol-log-export-test-'));
    await fs.rm(directory,{recursive:true,force:true});
  }
}

test('exported logs hide credentials while preserving endpoint errors and readable Chinese', () => {
  const source=[
    '[2026-11-01 16:23:45] LCU 请求失败 GET /lol-match-history/v1/products/lol/abc (500)',
    '--remoting-auth-token=command-secret --password "quoted secret"',
    'https://riot:url-secret@127.0.0.1:1234/path',
    'Authorization: Basic YmFzaWMtc2VjcmV0',
    'Cookie: session=cookie-secret; other=second-cookie',
    JSON.stringify({accessToken:'opaque-access',refresh_token:'refresh-secret',password:'json-secret',puuid:'private-player'}),
    'LeagueClient:99:1234:lock-secret:https',
    'Bearer eyJhbGciOiJub25lIn0.eyJleHAiOjEyM30.signature',
    'C:\\Users\\ExampleUser\\AppData\\Roaming\\lol-assistant 01234567-1234-5678-9123-0123456789ab',
  ].join('\n');
  const safe=logExport.redactLogText(source);
  for(const secret of ['command-secret','quoted secret','url-secret','YmFzaWMtc2VjcmV0','cookie-secret','second-cookie','opaque-access','refresh-secret','json-secret','private-player','lock-secret','eyJhbGci','ExampleUser','01234567-1234-5678-9123-0123456789ab'])assert.ok(!safe.includes(secret),secret);
  assert.ok(safe.includes('/lol-match-history/v1/products/lol/abc (500)'));assert.ok(safe.includes('LCU 请求失败'));assert.ok(safe.includes('2026-11-01 16:23:45'));
});

test('log reports combine recent rotated logs, skip unrelated files and bound oversized tails', async () => {
  await temporaryLogDirectory(async(fs,directory)=>{
    const now=new Date();
    await fs.writeFile(join(directory,'recent.log'),'中文错误: password=fixture-password\nHTTP 500\n');
    await fs.writeFile(join(directory,'recent.old.log'),'之前的错误\n');
    await fs.writeFile(join(directory,'old.log'),'too old');await fs.utimes(join(directory,'old.log'),new Date(now.getTime()-9*86400000),new Date(now.getTime()-9*86400000));
    await fs.writeFile(join(directory,'settings.json'),'not a log');await fs.mkdir(join(directory,'folder.log'));
    const report=await logExport.buildLogReport(directory,logContext,now);
    assert.equal(report.fileCount,2);assert.ok(report.text.includes('之前的错误'));assert.ok(report.text.includes('应用版本：0.1.0'));
    assert.ok(!report.text.includes('fixture-password'));assert.ok(!report.text.includes('too old'));assert.ok(!report.text.includes('not a log'));
    assert.ok((await fs.readFile(join(directory,'recent.log'),'utf8')).includes('fixture-password'));
    await fs.writeFile(join(directory,'large.log'),'旧消息\n'.repeat(400000)+'LATEST ERROR\n');
    const large=await logExport.buildLogReport(directory,logContext);
    assert.equal(large.truncated,true);assert.ok(large.text.includes('LATEST ERROR'));assert.ok(Buffer.byteLength(large.text)<2.1*1024*1024);
    assert.equal((await logExport.buildLogReport(join(directory,'missing'),logContext)).fileCount,0);
  });
});

test('log IPC saves a real UTF-8 report and handles cancellation, failure and duplicate requests', async () => {
  await temporaryLogDirectory(async(fs,directory)=>{
    const handlers=new Map();let dialogResult={canceled:true},revealed=null;
    const {registerLogIpcHandlers}=load('src/main/ipc/log.ts',{
      electron:{app:{getVersion:()=>'0.1.0',getPath:()=>directory},BrowserWindow:{fromWebContents:()=>null},
        dialog:{showSaveDialog:async options=>{assert.equal(options.filters[0].extensions[0],'txt');return dialogResult;}},
        ipcMain:{handle:(key,fn)=>handlers.set(key,fn)},shell:{showItemInFolder:file=>{revealed=file;}}},
      '../utils/logger':{getLogDirectory:()=>directory,logger:{info(){},warn(){}}},
      '../utils/log-export':logExport,'../lcu/client':{lcuClient:{status:'disconnected'}},
    });
    registerLogIpcHandlers();const exportLogs=()=>handlers.get('log:export')({sender:{}}),reveal=handlers.get('log:revealExport');
    assert.equal(await reveal(),false);assert.equal((await exportLogs()).status,'empty');
    await fs.writeFile(join(directory,'today.log'),'中文连接失败 HTTP 500\naccessToken=fixture-secret\n');
    assert.equal((await exportLogs()).status,'cancelled');assert.equal(await reveal(),false);
    const destination=join(directory,'report.txt');dialogResult={canceled:false,filePath:destination};
    const saved=await exportLogs();assert.equal(saved.status,'saved');assert.equal(saved.fileCount,1);assert.equal(saved.filePath,destination);
    const report=await fs.readFile(destination,'utf8');assert.equal(report.charCodeAt(0),0xfeff);assert.ok(report.includes('中文连接失败'));assert.ok(!report.includes('fixture-secret'));
    assert.equal(await reveal(),true);assert.equal(revealed,destination);
    dialogResult={canceled:false,filePath:join(directory,'today.log')};assert.equal((await exportLogs()).status,'error');
    assert.ok((await fs.readFile(join(directory,'today.log'),'utf8')).includes('fixture-secret'));
    dialogResult={canceled:false,filePath:join(directory,'not-created','report.txt')};assert.equal((await exportLogs()).status,'error');
    dialogResult={canceled:true};const pending=exportLogs();assert.equal((await exportLogs()).status,'busy');assert.equal((await pending).status,'cancelled');
    await fs.unlink(destination);assert.equal(await reveal(),false);
  });
});

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

test('pagination requests exactly one server page and replaces previous rows', async () => {
  setActivePinia(createPinia()); const calls=[];
  const history=Array.from({length:65},(_,i)=>({gameId:i+1}));
  global.window={electronAPI:{getMatchList:async p=>{calls.push(p);const matches=history.slice(p.begIndex,p.endIndex+1);return {matches,totalGames:0,hasMore:matches.length===10,pageGameIds:matches.map(m=>m.gameId),source:'sgp'};}}};
  const {useMatchStore}=load('src/renderer/src/stores/match.ts',{'./summoner':{useSummonerStore:()=>({activePUUID:'player'})}});
  const store=useMatchStore();
  for(let page=1;page<=7;page++) {assert.equal(await store.fetchMatchList(page),true);assert.equal(store.currentPage,page);assert.equal(store.matchList[0].gameId,(page-1)*10+1);assert.equal(store.matchList.length,page===7?5:10);}
  assert.equal(store.hasMore,false);
  await store.fetchMatchList(2); assert.equal(store.matchList[0].gameId,11);
  assert.deepEqual(calls.map(p=>p.begIndex),[0,10,20,30,40,50,60,10]);
  assert.ok(calls.every(p=>p.endIndex-p.begIndex===9));
});

test('failed and repeated pages preserve the current page and retry its target', async () => {
  setActivePinia(createPinia()); const calls=[];let attempt=0;
  global.window={electronAPI:{getMatchList:async p=>{calls.push(p.begIndex);attempt++;if(attempt===2)throw Error('temporary');const start=attempt===3?0:p.begIndex;const matches=Array.from({length:10},(_,i)=>({gameId:start+i+1}));return {matches,totalGames:0,hasMore:true};}}};
  const {useMatchStore}=load('src/renderer/src/stores/match.ts',{'./summoner':{useSummonerStore:()=>({activePUUID:'player'})}});
  const store=useMatchStore(); await store.fetchMatchList(1);
  assert.equal(await store.fetchMatchList(2),false);assert.equal(store.currentPage,1);assert.equal(store.matchList.length,10);
  assert.equal(await store.fetchMatchList(2),false);assert.match(store.error,/重复/);
  assert.equal(await store.fetchMatchList(2),true);assert.equal(store.matchList[0].gameId,11);
  assert.deepEqual(calls,[0,10,10,10]);
});

test('queue requests reset to server offset zero and discard an older in-flight response', async () => {
  setActivePinia(createPinia());const calls=[];let finish;
  global.window={electronAPI:{getMatchList:p=>{calls.push(p);if(!p.queue)return new Promise(r=>{finish=r;});return Promise.resolve({matches:[{gameId:440}],totalGames:0,hasMore:false});}}};
  const {useMatchStore}=load('src/renderer/src/stores/match.ts',{'./summoner':{useSummonerStore:()=>({activePUUID:'player'})}});
  const store=useMatchStore();const old=store.fetchMatchList(1);store.setFilters({queue:440});await store.fetchMatchList(1);
  finish({matches:[{gameId:1}],totalGames:0});await old;
  assert.equal(store.matchList[0].gameId,440);assert.equal(calls[1].queue,440);assert.equal(calls[1].begIndex,0);assert.equal(store.currentPage,1);
});

test('home requests eight latest games independently of history filters and page', async () => {
  setActivePinia(createPinia());const calls=[];
  global.window={electronAPI:{getMatchList:async p=>{calls.push(p);return {matches:[{gameId:p.queue?420:1}],totalGames:0};}}};
  const {useMatchStore}=load('src/renderer/src/stores/match.ts',{'./summoner':{useSummonerStore:()=>({activePUUID:'player'})}});
  const store=useMatchStore();store.setFilters({queue:420});await store.fetchMatchList(4);await store.fetchRecentMatches();await store.fetchRecentMatches();
  assert.deepEqual(calls.slice(1).map(p=>[p.begIndex,p.endIndex,p.queue]),[[0,7,undefined],[0,7,undefined]]);
  assert.equal(store.currentPage,4);assert.equal(store.matchList[0].gameId,420);assert.equal(store.recentMatches[0].gameId,1);
});

test('changing player invalidates an in-flight match result', async () => {
  setActivePinia(createPinia());
  let resolveRequest;
  global.window = { electronAPI: { getMatchList: () => new Promise(resolve => { resolveRequest = resolve; }) } };
  const { useMatchStore } = load('src/renderer/src/stores/match.ts', { './summoner': { useSummonerStore: () => ({ activePUUID: 'old-player' }) } });
  const store = useMatchStore();
  const pending = store.fetchMatchList(1);
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

async function gameNavigationFixture(getGameflowState = async () => ({ phase: 'ChampSelect', queueId: 2400 })) {
  const vue = scopedRequire('vue');
  const { createRouter, createMemoryHistory } = scopedRequire('vue-router');
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [['/', 'Home'], ['/draft-assistant', 'DraftAssistant'], ['/live-game', 'LiveGame'], ['/mayhem-augments', 'MayhemAugments']]
      .map(([path, name]) => ({ path, name, component: {} })),
  });
  await router.push('/');
  const mounted = [];
  const unmounted = [];
  const listeners = {};
  const store = { gamePhase: 'None', setGamePhase(value) { this.gamePhase = value; } };
  const api = { getGameflowState };
  for (const key of ['onGamePhaseChange', 'onConnectionChange']) {
    api[key] = (callback) => { listeners[key] = callback; return () => delete listeners[key]; };
  }
  global.window = { electronAPI: api };
  const { useGameNotification } = load('src/renderer/src/composables/useGameNotification.ts', {
    vue: { ...vue, onMounted: (fn) => mounted.push(fn), onUnmounted: (fn) => unmounted.push(fn) },
    'vue-router': { useRouter: () => router },
    '@/stores/app': { useAppStore: () => store },
  });
  useGameNotification();
  mounted.forEach((fn) => fn());
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  return { router, store, listeners, flush, dispose: () => unmounted.forEach((fn) => fn()) };
}

test('Mayhem stays on the draft assistant and opens live analysis at game start', async () => {
  const f = await gameNavigationFixture();
  await f.flush();
  assert.equal(f.router.currentRoute.value.name, 'DraftAssistant');
  await f.router.push('/');
  f.listeners.onGamePhaseChange('ChampSelect');
  await f.flush();
  assert.equal(f.router.currentRoute.value.name, 'Home');
  f.listeners.onGamePhaseChange('GameStart');
  await f.flush();
  assert.equal(f.router.currentRoute.value.name, 'LiveGame');
  f.listeners.onConnectionChange('disconnected');
  assert.equal(f.store.gamePhase, 'None');
  f.dispose();
  assert.deepEqual(Object.keys(f.listeners), []);
});

test('a late gameflow snapshot cannot navigate after a newer phase event', async () => {
  let resolveState;
  const f = await gameNavigationFixture(() => new Promise((resolve) => { resolveState = resolve; }));
  f.listeners.onGamePhaseChange('Lobby');
  resolveState({ phase: 'ChampSelect', queueId: 2400 });
  await f.flush();
  assert.equal(f.router.currentRoute.value.name, 'Home');
  f.dispose();
});

test('recent form labels weigh wins and KDA without treating a short or deathless run as a carry', () => {
  const { formatLiveGameSummary } = scopedRequire('@lol-assistant/shared');
  const player = { summonerName: '小魄罗', tagLine: 'CN1' };
  const summarize = (wins, kills, deaths = 5, games = 10) =>
    formatLiveGameSummary({
      ...player,
      recentMatches: Array.from({ length: games }, (_, index) => ({
        win: index < wins,
        kills,
        deaths,
        assists: 0,
      })),
    });

  assert.match(summarize(3, 9), /^【下等马】/);
  assert.match(summarize(4, 12), /^【中等马】/);
  assert.match(summarize(8, 10), /^【中等马】/);
  assert.equal(summarize(6, 16), '【中等马】小魄罗#CN1 · 近10场 6胜4负 · KDA 3.20');
  assert.match(summarize(7, 23), /^【上等马】/);
  assert.match(summarize(8, 35), /^【小代】/);
  assert.match(summarize(9, 50), /^【通天代】/);
  assert.match(summarize(8, 50), /^【小代】/);
  assert.match(summarize(9, 49), /^【小代】/);
  assert.match(summarize(8, 34), /^【上等马】/);
  assert.match(summarize(6, 50), /^【中等马】/);
  assert.match(summarize(4, 40, 5, 4), /^【中等马】/);
  assert.match(summarize(10, 1, 0), /^【中等马】.*KDA 完美（零死亡）$/);
  assert.equal(formatLiveGameSummary(player), null);
});

test('recent stats can only be posted to the current champion-select room and otherwise copy safely', async () => {
  const handlers = new Map();
  const sent = [];
  const copied = [];
  let phase = 'ChampSelect';
  let conversationId = 'draft-one';
  const { registerLiveGameIpcHandlers } = load('src/main/ipc/live-game.ts', {
    electron: {
      ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
      clipboard: { writeText: (body) => copied.push(body) },
    },
    'p-limit': { default: () => (run) => run() },
    '../utils/logger': { logger: quietLog },
    '../lcu/api': {
      lcuAPI: {
        getGameflowSession: async () => ({ phase }),
        getChatConversations: async () => [
          { id: conversationId, type: 'championSelect' },
          { id: 'friend', type: 'chat' },
        ],
        sendGroupChatMessage: async (id, body) => sent.push({ id, body }),
      },
    },
  });
  registerLiveGameIpcHandlers();
  const share = handlers.get('live-game:share-summary');
  const body = '【上等马】小魄罗#CN1 · 近10场 6胜4负 · KDA 3.20';
  assert.equal(await share(null, body, 'draft-one'), 'sent');
  conversationId = 'draft-two';
  assert.equal(await share(null, body, 'draft-one'), 'copied');
  assert.equal(await share(null, body, 'friend'), 'copied');
  phase = 'InProgress';
  assert.equal(await share(null, body, 'draft-two'), 'copied');
  await assert.rejects(share(null, body + '\n/all test', 'draft-two'), /无效的战绩摘要/);
  await assert.rejects(share(null, body.replace('上等马', '未知评级')), /无效的战绩摘要/);
  assert.deepEqual(sent, [{ id: 'draft-one', body }]);
  assert.deepEqual(copied, [body, body, body]);
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

const quietLog = { debug() {}, info() {}, warn() {}, error() {} };
function matchModule(api, sgp, cache = new Map()) {
  return {
    cache,
    ...load('src/main/ipc/match.ts', {
      electron: { ipcMain: { handle() {} } },
      '../lcu/api': { lcuAPI: api },
      '../lcu/sgp': { getSgpMatchPage: sgp },
      '../cache/store': { cacheStore: { get: (category, key) => cache.get(`${category}/${key}`), set: (category, key, value) => cache.set(`${category}/${key}`, value) } },
      '../utils/logger': { logger: quietLog },
    }),
  };
}
function rawGame(id, target = 'player') {
  return {
    gameId: id, queueId: 420, gameDuration: 1800, gameCreation: 1000,
    participants: [{ participantId: 1, puuid: target, teamId: 100, championId: 99,
      stats: { win: true, kills: 9, deaths: 2, assists: 11, totalDamageDealtToChampions: 30000, totalDamageDealt: 200000, totalDamageTaken: 15000, goldEarned: 12000, item0: 1056 } }],
  };
}

test('repeated real LCU pages fall back to SGP and select the requested player', async () => {
  const first = Array.from({ length: 20 }, (_, i) => rawGame(i + 1));
  let sgpCalls = 0;
  const { fetchMatchList, cache } = matchModule({
    getMatchListByPUUID: async () => ({ platformId: 'HN1', games: { games: first } }),
    getCurrentSummoner: async () => ({ puuid: 'player' }),
    getMatchList: async () => ({ games: { games: first } }),
  }, async (puuid, start, count, platform) => {
    assert.deepEqual([puuid, start, count, platform], ['player', 20, 20, 'HN1']);
    sgpCalls++;
    return Array.from({ length: 20 }, (_, i) => {
      const game = rawGame(21 + i);
      game.participants.unshift({ ...game.participants[0], participantId: 2, puuid: 'other', stats: { ...game.participants[0].stats, kills: 1 } });
      return game;
    });
  });
  const page = await fetchMatchList({ puuid: 'player', begIndex: 20, endIndex: 39, historySource: 'lcu', knownGameIds: first.map(g => g.gameId) });
  assert.equal(sgpCalls, 1);
  assert.equal(page.source, 'sgp');
  assert.equal(page.nextIndex, 40);
  assert.equal(page.matches[0].gameId, 21);
  assert.equal(page.matches[0].kills, 9);
  assert.equal(cache.get('matchDetail/v5_21').participants.length, 2);
  assert.equal(cache.get('matchDetail/v5_21').participants[0].totalDamageDealt, 30000);
});

test('short LCU batches advance by the raw count until the next page is empty', async () => {
  const { fetchMatchList } = matchModule({
    getMatchListByPUUID: async (_puuid, p) => ({ games: { games: p.begIndex === 0 ? Array.from({ length: 10 }, (_, i) => rawGame(i + 1)) : [] } }),
  }, async () => { throw Error('must not request SGP'); });
  const page = await fetchMatchList({ puuid: 'player', begIndex: 0, endIndex: 19, historySource: 'lcu' });
  assert.equal(page.matches.length, 10);
  assert.equal(page.nextIndex, 10);
  assert.equal(page.hasMore, true);
  const end = await fetchMatchList({ puuid: 'player', begIndex: 10, endIndex: 29, historySource: 'lcu' });
  assert.equal(end.hasMore, false);
});

test('SGP uses allowlisted origins and never propagates credentials on failure', async () => {
  let requested;
  let fail = false;
  const token = 'private-test-token';
  const { getSgpMatchPage, resolveSgpOrigin } = load('src/main/lcu/sgp.ts', {
    './client': { lcuClient: { get: async endpoint => endpoint === '/entitlements/v1/token' ? { accessToken: token } : { region: 'TENCENT' } } },
    axios: { default: { get: async (url, options) => { requested = { url, options }; if (fail) throw { response: { status: 503 }, config: { secret: token } }; return { data: { games: [{ json: rawGame(1) }] } }; }, isAxiosError: error => !!error?.response } },
  });
  const games = await getSgpMatchPage('player', 20, 20, 'HN1');
  assert.equal(games[0].gameId, 1);
  assert.equal(requested.url.startsWith('https://hn1-k8s-sgp.lol.qq.com:21019/'), true);
  assert.deepEqual(requested.options.params, { startIndex: 20, count: 20 });
  assert.equal(requested.options.headers.Authorization, `Bearer ${token}`);
  assert.equal(requested.options.maxRedirects, 0);
  assert.throws(() => resolveSgpOrigin('attacker.example'), /大区/);
  fail = true;
  await assert.rejects(getSgpMatchPage('player', 20, 20, 'HN1'), error => !error.message.includes(token) && error.message.includes('503'));
});

test('LCU identities are matched by participant ID and total damage is not hero damage', () => {
  const { transformMatchDetail } = matchModule({}, async () => []);
  const game = rawGame(1);
  game.participants.push({ participantId: 2, championId: 17, teamId: 200, stats: { totalDamageDealt: 999999, kills: 1, deaths: 2, assists: 3 } });
  game.participantIdentities = [{ participantId: 2, player: { puuid: 'two', gameName: '第二位' } }, { participantId: 1, player: { puuid: 'one', gameName: '第一位' } }];
  const detail = transformMatchDetail(game);
  assert.equal(detail.participants[0].summonerName, '第一位');
  assert.equal(detail.participants[1].summonerName, '第二位');
  assert.equal(detail.participants[1].totalDamageDealtToChampions, undefined);
  assert.equal(detail.participants[1].totalDamageTaken, undefined);
  const sgp = transformMatchDetail({ ...game, participantIdentities: [], participants: [{
    participantId: 1, puuid: 'one', championId: 99, summonerName: 'old-name', riotIdGameName: '当前ID', riotIdTagline: 'CN',
    kills: 9, deaths: 2, assists: 8, totalDamageDealtToChampions: 40000, totalDamageDealt: 300000, item0: 1056,
    perks: { styles: [{ style: 8200, selections: [{ perk: 8229 }] }, { style: 8100, selections: [{ perk: 8126 }] }] },
  }] });
  assert.equal(sgp.participants[0].summonerName, '当前ID');
  assert.equal(sgp.participants[0].tagLine, 'CN');
  assert.equal(sgp.participants[0].items[0], 1056);
  assert.equal(sgp.participants[0].totalDamageDealt, 40000);
  assert.deepEqual(sgp.participants[0].perks, { perkStyle: 8200, perkSubStyle: 8100, perkIds: [8229, 8126] });
});

test('performance tags preserve ties and omit missing, zero and non-finite metrics', () => {
  const { getMatchHighlights } = scopedRequire('@lol-assistant/shared');
  const players = [
    { participantId: 1, kills: 3, assists: 5, totalDamageDealtToChampions: 200, totalDamageTaken: 100, visionScore: 0 },
    { participantId: 2, kills: 3, assists: 2, totalDamageDealtToChampions: 100, totalDamageTaken: 200, visionScore: 0 },
    { participantId: 3, kills: 1, assists: 1, totalDamageDealtToChampions: 50, totalDamageTaken: 50, visionScore: 0 },
  ];
  const tags = getMatchHighlights(players);
  assert.ok(tags[1].some(t => t.label === '输出最高'));
  assert.ok(tags[2].some(t => t.label === '承伤最高'));
  assert.ok(tags[1].some(t => t.label === '并列击杀最多'));
  assert.equal(tags[1].some(t => t.key === 'goldEarned' || t.key === 'visionScore'), false);
  players[0].totalDamageDealtToChampions = NaN;
  assert.equal(getMatchHighlights(players)[2].some(t => t.key === 'totalDamageDealtToChampions'), false);
});

test('profile icon IPC loads from the local client, validates IDs and falls back offline', async () => {
  const handlers = new Map();
  let offline = false;
  const { registerSummonerIpcHandlers } = load('src/main/ipc/summoner.ts', {
    electron: { ipcMain: { handle: (name, fn) => handlers.set(name, fn) } },
    '../lcu/api': { lcuAPI: {} },
    '../lcu/client': { lcuClient: { request: async (endpoint, options) => { assert.equal(options.responseType, 'buffer'); assert.ok(endpoint.endsWith('/12345.jpg')); if (offline) throw Error('offline'); return Buffer.from([0xff, 0xd8, 0xff]); } } },
    '../cache/store': { cacheStore: {} }, '../utils/logger': { logger: quietLog },
  });
  registerSummonerIpcHandlers();
  const getIcon = handlers.get('summoner:getIcon');
  assert.equal((await getIcon(null, 12345)).startsWith('data:image/jpeg;base64,'), true);
  offline = true;
  assert.ok((await getIcon(null, 12345)).includes('/latest/'));
  await assert.rejects(getIcon(null, -1), /无效/);
});

test('LCU binary responses and split UTF-8 JSON chunks survive transport unchanged', async () => {
  const { EventEmitter } = require('node:events');
  let bytes = Buffer.from([0xff, 0xd8, 0x00, 0x80, 0xff]);
  const accepts = [];
  const https = { Agent: class {}, request: (options, callback) => {
    accepts.push(options.headers.Accept);
    const req = new EventEmitter(); req.write = () => {}; req.destroy = () => {};
    req.end = () => { const res = new EventEmitter(); res.statusCode = 200; callback(res); res.emit('data', bytes.subarray(0, 10)); res.emit('data', bytes.subarray(10)); res.emit('end'); };
    return req;
  } };
  const { LCUClient } = load('src/main/lcu/client.ts', {
    https: { default: https }, './lockfile': {}, '../utils/logger': { logger: quietLog }, '../cache/store': { cacheStore: {} },
  });
  const client = new LCUClient();
  client.credentials = { port: 1234, password: 'test' };
  assert.deepEqual(await client.request('/icon', { responseType: 'buffer' }), bytes);
  bytes = Buffer.from(JSON.stringify({ name: '星光' }));
  assert.deepEqual(await client.request('/json'), { name: '星光' });
  assert.deepEqual(accepts, ['*/*', 'application/json']);
});

test('Tencent tokens without cpid discover the platform and refresh it after login changes', async () => {
  const connection = {};
  let token = 'client-token-one';
  let platform = 'HN1';
  let lookups = 0;
  let requestedUrl;
  const { getSgpMatchPage } = load('src/main/lcu/sgp.ts', {
    './client': { lcuClient: {
      getCredentials: () => connection,
      get: async endpoint => {
        if (endpoint === '/entitlements/v1/token') return { accessToken: token };
        if (endpoint === '/riotclient/region-locale') return { region: 'TENCENT' };
        assert.equal(endpoint, '/lol-match-history/v1/products/lol/current-summoner/matches?begIndex=0&endIndex=0');
        lookups++; return { platformId: platform, games: { games: [] } };
      },
    } },
    axios: { default: {
      get: async (url, options) => { requestedUrl = url; assert.equal(options.params.tag, 'q_420'); return { data: { games: [{ json: rawGame(1) }] } }; },
      isAxiosError: () => false,
    } },
  });
  await Promise.all([getSgpMatchPage('player',0,10,undefined,420),getSgpMatchPage('player',10,10,undefined,420)]);
  assert.equal(lookups,1);
  assert.ok(requestedUrl.startsWith('https://hn1-k8s-sgp.lol.qq.com:21019/'));
  token = 'client-token-two'; platform = 'HN10';
  await getSgpMatchPage('player',0,10,undefined,420);
  assert.equal(lookups,2);
  assert.ok(requestedUrl.startsWith('https://hn10-k8s-sgp.lol.qq.com:21019/'));
});

test('six-axis comparison keeps a shared scale and computes raw team averages', () => {
  const { buildMatchRadar } = scopedRequire('@lol-assistant/shared');
  const player = (participantId, teamId, damage, kills, assists) => ({ participantId, teamId,
    totalDamageDealtToChampions: damage, totalDamageTaken: damage * 2, goldEarned: 10000,
    visionScore: 20, timeCCingOthers: 10, kills, assists });
  const model = buildMatchRadar([player(1,100,100,2,3),player(2,100,300,8,1),player(3,200,800,3,2),player(4,200,1000,5,1)]);
  assert.equal(model.limits[0], 1000);
  assert.equal(model.limits[3], 100);
  assert.equal(model.teams[0].average[0], 200);
  assert.equal(model.teams[1].average[0], 900);
  assert.equal(model.players[1][3], 50);
  assert.equal(model.players[2][3], 90);
  assert.equal(model.teams[0].average[3], 70);
  assert.deepEqual(model.teams[0].coverage, [2,2,2,2,2,2]);
});

test('radar averages never replace missing statistics with zero', () => {
  const { buildMatchRadar } = scopedRequire('@lol-assistant/shared');
  const model = buildMatchRadar([
    { participantId:1,teamId:100,kills:1,assists:0,visionScore:20,totalDamageDealtToChampions:NaN,timeCCingOthers:-1 },
    { participantId:2,teamId:100,kills:2,assists:0,visionScore:undefined,totalDamageDealtToChampions:100,timeCCingOthers:4 },
    { participantId:3,teamId:200,kills:1,assists:0,visionScore:40,totalDamageDealtToChampions:200,timeCCingOthers:5 },
  ]);
  assert.equal(model.teams[0].average[0], null);
  assert.equal(model.teams[0].average[4], null);
  assert.equal(model.teams[0].average[5], null);
  assert.equal(model.teams[0].coverage[4], 1);
  assert.equal(model.teams[1].average[4], 40);
  assert.equal(model.limits[0], 200);
});

test('zero-kill teams and empty radar data remain finite', () => {
  const { buildMatchRadar } = scopedRequire('@lol-assistant/shared');
  const model = buildMatchRadar([{ participantId:1,teamId:100,kills:0,assists:0,totalDamageDealtToChampions:0,
    totalDamageTaken:0,goldEarned:0,visionScore:0,timeCCingOthers:0 }]);
  assert.deepEqual(model.teams[0].average, [0,0,0,0,0,0]);
  assert.equal(model.limits[3], 100);
  assert.ok(buildMatchRadar([]).limits.every(Number.isFinite));
});

test('chart statistics preserve nested and flat values and never confuse all-target and champion damage', () => {
  const { transformMatchDetail } = matchModule({}, async () => []);
  const raw = rawGame(1);
  const values = {physicalDamageDealtToChampions:15000,magicDamageDealtToChampions:14000,trueDamageDealtToChampions:1000,
    physicalDamageDealt:100000,magicDamageDealt:90000,trueDamageDealt:10000,physicalDamageTaken:8000,magicDamageTaken:6000,trueDamageTaken:1000,
    damageDealtToObjectives:2500,goldSpent:11000,wardsPlaced:8,wardsKilled:0,visionWardsBoughtInGame:2,totalTimeSpentDead:55};
  Object.assign(raw.participants[0].stats,values);
  const nested = transformMatchDetail(raw).participants[0];
  const flat = transformMatchDetail({...raw,participants:[{...raw.participants[0],...raw.participants[0].stats,stats:undefined}]}).participants[0];
  for(const [key,value] of Object.entries(values)){assert.equal(nested[key],value);assert.equal(flat[key],value);}
  assert.equal(nested.totalDamageDealtAllTargets,200000);assert.equal(nested.totalDamageDealtToChampions,30000);
  const normalized = transformMatchDetail({...raw,participants:[nested]}).participants[0];
  assert.equal(normalized.totalDamageDealtAllTargets,200000);
  const old={...nested};delete old.totalDamageDealtAllTargets;
  assert.equal(transformMatchDetail({...raw,participants:[old]}).participants[0].totalDamageDealtAllTargets,undefined);
  Object.assign(raw.participants[0].stats,{physicalDamageTaken:-1,magicDamageTaken:NaN,wardsPlaced:'8',wardsKilled:0});
  const invalid=transformMatchDetail(raw).participants[0];
  for(const key of ['physicalDamageTaken','magicDamageTaken','wardsPlaced'])assert.equal(invalid[key],undefined);
  assert.equal(invalid.wardsKilled,0);
});

test('bar comparisons share a scale, preserve missing versus zero and offer only available metrics', () => {
  const {MATCH_COMPARISON_METRICS,availableMatchMetrics,buildMatchComparison}=scopedRequire('@lol-assistant/shared');
  const players=[{participantId:1,teamId:100,totalDamageDealtToChampions:10000,totalHeal:0,totalMinionsKilled:100,neutralMinionsKilled:20},
    {participantId:2,teamId:200,totalDamageDealtToChampions:20000,totalMinionsKilled:80},
    {participantId:3,teamId:200,totalDamageDealtToChampions:0}];
  const metrics=availableMatchMetrics(players,1200),keys=metrics.map(m=>m.key);
  assert.ok(keys.includes('totalHeal'));assert.ok(!keys.includes('physicalDamageDealtToChampions'));
  const damage=metrics.find(m=>m.key==='totalDamageDealtToChampions');const model=buildMatchComparison(players,damage,1200);
  assert.equal(model.teams.length,2);assert.equal(model.limit,20000);
  assert.equal(model.teams[0].rows[0].percent,50);assert.equal(model.teams[1].rows[0].percent,100);assert.equal(model.teams[1].rows[1].value,0);
  const heal=buildMatchComparison(players,metrics.find(m=>m.key==='totalHeal'),1200);
  assert.equal(heal.available,1);assert.equal(heal.teams[0].rows[0].value,0);assert.equal(heal.teams[1].rows[0].value,null);
  assert.ok(heal.ticks.every(t=>Number.isFinite(t.value)&&Number.isFinite(t.percent)));
  const cs=metrics.find(m=>m.key==='totalCS');assert.equal(cs.read(players[0],1200),120);assert.equal(cs.read(players[1],1200),null);
  const dpm=metrics.find(m=>m.key==='damagePerMinute');assert.equal(dpm.read(players[0],1200),500);
  assert.ok(!availableMatchMetrics(players,0).some(m=>m.key==='damagePerMinute'));
  for(const value of [-1,NaN,Infinity,'100',undefined])assert.equal(damage.read({totalDamageDealtToChampions:value},1200),null);
  assert.deepEqual(availableMatchMetrics([],1200),[]);assert.equal(new Set(MATCH_COMPARISON_METRICS.map(m=>m.key)).size,MATCH_COMPARISON_METRICS.length);
});

test('expanded chart stats bypass old detail caches and reuse the new schema', async () => {
  const handlers=new Map();let calls=0;
  const raw=rawGame(7);raw.participants[0].stats.physicalDamageDealtToChampions=1234;
  const cached=new Map([['v4_7',{gameId:7,participants:[]}]]);
  const {registerMatchIpcHandlers}=load('src/main/ipc/match.ts',{
    electron:{ipcMain:{handle:(key,fn)=>handlers.set(key,fn)}},'../lcu/api':{lcuAPI:{getMatchDetail:async()=>{calls++;return raw;}}},
    '../cache/store':{cacheStore:{get:(_category,key)=>cached.get(key),set:(_category,key,value)=>cached.set(key,value)}},
    '../utils/logger':{logger:quietLog},'../lcu/sgp':{},
  });
  registerMatchIpcHandlers();const get=handlers.get('match:getDetail');
  assert.equal((await get(null,7)).participants[0].physicalDamageDealtToChampions,1234);
  assert.equal((await get(null,7)).participants[0].physicalDamageDealtToChampions,1234);assert.equal(calls,1);assert.ok(cached.has('v5_7'));
});

test('healing, teammate healing and teammate shields keep their own values', () => {
  const { transformMatchDetail } = matchModule({}, async () => []);
  const game = rawGame(1);
  Object.assign(game.participants[0].stats,{totalHeal:5000,totalHealsOnTeammates:1200,totalDamageShieldedOnTeammates:800,timeCCingOthers:12.5});
  const player = transformMatchDetail(game).participants[0];
  assert.deepEqual([player.totalHeal,player.totalHealsOnTeammates,player.totalDamageShieldedOnTeammates,player.timeCCingOthers],[5000,1200,800,12.5]);
  delete game.participants[0].stats.totalHealsOnTeammates;
  delete game.participants[0].stats.totalDamageShieldedOnTeammates;
  const missing = transformMatchDetail(game).participants[0];
  assert.equal(missing.totalHeal,5000);
  assert.equal(missing.totalHealsOnTeammates,undefined);
  assert.equal(missing.totalDamageShieldedOnTeammates,undefined);
});

test('queue pagination goes directly to SGP and never reads or writes a list cache', async () => {
  let calls = 0;
  const cache = new Map([['matchList/list_v4_player_10_19_q440_call', { matches: [{ gameId: 999 }] }]]);
  const { fetchMatchList } = matchModule({ getMatchListByPUUID: () => { throw Error('LCU must not filter'); } }, async (...args) => {
    assert.deepEqual(args, ['player', 10, 10, undefined, 440]); calls++;
    return [{ ...rawGame(21), queueId: 440 }];
  }, cache);
  for (let i=0;i<2;i++) assert.equal((await fetchMatchList({ puuid:'player',begIndex:10,endIndex:19,queue:440 })).matches[0].queueId,440);
  assert.equal(calls,2);
  assert.equal([...cache.keys()].filter(k=>k.startsWith('matchList/')).length,1);
  const failing = matchModule({ getMatchListByPUUID: () => { throw Error('must not fall back'); } }, async () => {throw Error('unavailable');});
  await assert.rejects(failing.fetchMatchList({puuid:'player',queue:420}), /按模式分页需要/);
});

test('SGP sends a queue tag before pagination and rejects ignored filters', async () => {
  let params;let queue=440;
  const { getSgpMatchPage } = load('src/main/lcu/sgp.ts', {
    './client':{lcuClient:{get:async endpoint=>endpoint==='/entitlements/v1/token'?{accessToken:'test'}:{region:'TENCENT'}}},
    axios:{default:{get:async (_url, options)=>{params=options.params;return {data:{games:[{json:{...rawGame(1),queueId:queue}}]}};},isAxiosError:()=>false}},
  });
  await getSgpMatchPage('player',10,10,'HN1',440);
  assert.deepEqual(params,{startIndex:10,count:10,tag:'q_440'});
  queue=420;
  await assert.rejects(getSgpMatchPage('player',10,10,'HN1',440), /请求失败/);
});

test('live player names resolve Riot ID, use summoner ID fallback and survive failures', async () => {
  const calls=[];
  const { resolvePlayerIdentity } = load('src/main/ipc/live-game.ts', {
    electron:{ipcMain:{}},'p-limit':{default:()=>fn=>fn()},'../utils/logger':{logger:quietLog},
    '../lcu/api':{lcuAPI:{
      getSummonerByPUUID:async p=>{calls.push(p);if(p==='valid')return {gameName:'当前昵称',tagLine:'CN1',displayName:'旧昵称'};throw Error('unavailable');},
      getSummonerById:async id=>{if(id===7)return {gameName:'补查昵称',tagLine:'CN2'};throw Error('unavailable');},
    }},
  });
  assert.deepEqual(await resolvePlayerIdentity({puuid:'valid',summonerId:1,summonerName:'旧名'}),{summonerName:'当前昵称',tagLine:'CN1'});
  assert.equal((await resolvePlayerIdentity({puuid:'missing',summonerId:7})).summonerName,'补查昵称');
  assert.deepEqual(await resolvePlayerIdentity({puuid:'',summonerId:0,gameName:'session昵称',gameTag:'CN3'}),{summonerName:'session昵称',tagLine:'CN3'});
  assert.equal(calls.includes(''),false);
});

test('icons persist across manager restarts, deduplicate downloads and separate patches', async () => {
  const fs=require('node:fs/promises');const path=require('node:path');
  const base=resolve(root,'../../specs');await fs.mkdir(base,{recursive:true});
  const directory=await fs.mkdtemp(join(base,'test-assets-'));
  try {
    const { AssetCacheManager }=load('src/main/assets/index.ts',{
      electron:{app:{getPath:()=>directory}},path:{default:path},'fs/promises':{default:fs},
    });
    const manager=new AssetCacheManager();manager.fetchLatestVersion=async()=>'16.21.1';let downloads=0;
    manager.downloadFile=async()=>{downloads++;return Buffer.from([0x89,0x50,0x4e,0x47]);};
    const url='https://raw.communitydragon.org/16.21/icon.png';
    const images=await Promise.all([manager.getAssetFileUrl(url,'icons',1),manager.getAssetFileUrl(url,'icons',1)]);
    assert.equal(downloads,1);assert.equal(images[0],images[1]);assert.ok(images[0].startsWith('data:image/png;base64,'));
    const restarted=new AssetCacheManager();restarted.fetchLatestVersion=async()=>'16.21.1';restarted.downloadFile=async()=>{throw Error('offline');};
    assert.equal(await restarted.getAssetFileUrl(url,'icons',1),images[0]);
    await manager.getAssetFileUrl(url.replace('16.21','16.22'),'icons',1);assert.equal(downloads,2);
    assert.equal((await manager.getCacheStats()).entryCount,2);
  } finally {
    assert.ok(directory.startsWith(base+path.sep+'test-assets-'));await fs.rm(directory,{recursive:true,force:true});
  }
});

test('renderer icon requests share a download and pin current-patch URLs', async () => {
  let downloads=0;let received;
  global.window={electronAPI:{getGameVersion:async()=>'16.21.1',getCachedAsset:async url=>{downloads++;received=url;return 'data:image/png;base64,test';}}};
  const { cachedImageSource }=load('src/renderer/src/directives/cached-src.ts');
  const url='https://raw.communitydragon.org/latest/icon.png';
  await Promise.all([cachedImageSource(url),cachedImageSource(url)]);
  assert.equal(downloads,1);assert.equal(received,'https://raw.communitydragon.org/16.21/icon.png');
  await cachedImageSource('https://ddragon.leagueoflegends.com/cdn/16.5.1/img/item/3020.png');
  assert.ok(received.includes('/16.21.1/'));assert.equal(await cachedImageSource('data:image/png;base64,local'),'data:image/png;base64,local');
  const itemIcon = 'https://pub-2322c7068eed43b08bc0dddf6528d1e2.r2.dev/v1/items/icons/rite_of_ruin/64.png';
  const { isMayhemItemIconUrl } = scopedRequire('@lol-assistant/shared');
  assert.equal(isMayhemItemIconUrl(itemIcon), true);
  assert.equal(isMayhemItemIconUrl(itemIcon.replace('/v1/items/', '/other/')), false);
  assert.equal(isMayhemItemIconUrl(itemIcon + '?redirect=elsewhere'), false);
  assert.equal(isMayhemItemIconUrl(itemIcon.replace('.r2.dev/', '.r2.dev.evil.example/')), false);
  await cachedImageSource(itemIcon);
  assert.equal(received, itemIcon);
});

const mayhemPage = `<!doctype html><html><head>
  <link rel="canonical" href="https://arammayhem.com/zh-cn/build/yasuo/">
  <meta property="og:title" content="疾风剑豪 海克斯大乱斗出装与强化符文推荐（26.21）">
</head><body>
  <section id="best-augments"><h2>疾风剑豪 最佳强化符文</h2><span>数据日期: 2026-10-30</span>
    <p data-recommendation-coverage="partial" data-recommendation-top="mapped">部分推荐缺失。</p>
    <div><h3>棱彩强化符文</h3>
      <a href="/zh-cn/augments/mystic-punch/"><img src="/augments/Mystic_Punch_mayhem_augment.webp" alt="秘术冲拳"><span data-recommendation-rank="rarity">S- · #7</span><span data-recommendation-rank="overall">总榜 S- · #17</span><span>登场率: <span>16.05%</span></span></a>
      <a href="https://untrusted.example/augments/wrong/"><img alt="错误外链"></a>
    </div>
    <div><h3>黄金强化符文</h3><a href="/zh-cn/augments/soul-siphon/"><img alt="灵魂虹吸"><span>登场率: 0.00%</span></a></div>
    <div><h3>白银强化符文</h3><a href="/zh-cn/augments/deft/"><img alt="灵巧" src="https://untrusted.example/icon.png"></a></div>
  </section>
  <section id="global-augments"><h3>全局强化</h3><a href="/zh-cn/augments/mystic-punch/">秘术冲拳 登场率: 31.52%</a></section>
</body></html>`;

function mayhemModule(directory) {
  return load('src/main/scraper/aram-mayhem.ts', {
    electron:{app:{getPath:()=>directory}},path:{default:require('node:path')},
    'fs/promises':{default:require('node:fs/promises')},
  });
}

test('Mayhem parsing isolates hero recommendations and preserves missing and zero statistics', () => {
  const { parseMayhemChampion } = mayhemModule('unused');
  const data = parseMayhemChampion(mayhemPage,157,'https://arammayhem.com/zh-cn/build/yasuo/');
  assert.equal(data.source,'ARAMMayhem');assert.equal(data.patch,'26.21');assert.equal(data.statsDate,'2026-10-30');assert.equal(data.partial,true);
  assert.equal(data.augments.length,3);
  assert.deepEqual(data.augments.map(a=>a.rarity),['prismatic','gold','silver']);
  assert.equal(data.augments[0].pickRate,16.05); // Global 31.52% must never replace the hero rate.
  assert.equal(data.augments[0].sourceTier,'S-');assert.equal(data.augments[0].sourceRank,7);assert.equal(data.augments[0].overallRank,17);
  assert.equal(data.augments[1].pickRate,0);assert.equal(data.augments[2].pickRate,undefined);
  assert.equal(data.augments[2].iconUrl,undefined);assert.equal('winRate' in data.augments[0],false);
  const quotedIcon = parseMayhemChampion(mayhemPage.replace('Mystic_Punch_mayhem_augment.webp', "Upgrade_Death's_Dance_mayhem_augment.webp"),157,'https://arammayhem.com/zh-cn/build/yasuo/');
  assert.ok(quotedIcon.augments[0].iconUrl.includes("Death's_Dance"));
});

test('Mayhem rejects mismatched and changed pages instead of showing unrelated data', () => {
  const { parseMayhemChampion, mayhemSourceUrl } = mayhemModule('unused');
  assert.throws(()=>parseMayhemChampion(mayhemPage,99,'https://arammayhem.com/zh-cn/build/lux/'),/未返回/);
  assert.throws(()=>parseMayhemChampion('<html>temporary challenge</html>',157,'https://arammayhem.com/zh-cn/build/yasuo/'),/未返回/);
  const fallback = parseMayhemChampion(mayhemPage.replace('top="mapped"','top="global"'),157,'https://arammayhem.com/zh-cn/build/yasuo/');
  assert.equal(fallback.augments.length,0);assert.equal(fallback.partial,true);
  for (const url of ['javascript:alert(1)','https://arammayhem.com.untrusted.example/','https://arammayhem.com/redirect?url=bad','https://user:pass@arammayhem.com/']) assert.throws(()=>mayhemSourceUrl(url));
  assert.equal(mayhemSourceUrl('/zh-cn/build/'),'https://arammayhem.com/zh-cn/build/');
});

test('Mayhem equipment keeps item combinations and hero rates separate from history and rejects foreign items', () => {
  const { parseMayhemChampion, mayhemSourceUrl } = mayhemModule('unused');
  const iconBase = 'https://pub-2322c7068eed43b08bc0dddf6528d1e2.r2.dev/v1/items/icons/';
  const item = (slug, name) =>
    '<a href="/zh-cn/items/' + slug + '/" title="' + name + '"><img src="' + iconBase + slug + '/64.png"><span>' + name + '</span></a>';
  const option = (items, stats = '') => '<div><div>' + items + '</div><div>' + stats + '</div></div>';
  const group = (title, rows) => '<section><div>' + title + '</div><div>' + rows + '</div></section>';
  const equipment = '<section id="mayhem-build"><h2>海克斯大乱斗出装与强化</h2></section>' +
    group('出门装', option(item('health_potion', '生命药水') + item('health_potion', '生命药水'), '登场率 0.00% 胜率 50.25%')) +
    group('鞋子', option(item('berserkers_greaves', '狂战士胫甲'))) +
    group('核心出装', option(item('rite_of_ruin', '毁坏仪式') + item('deaths_dance', '死亡之舞'), '登场率 6.99% 胜率 61.72%') +
      option(item('rite_of_ruin', '毁坏仪式') + '<a href="https://untrusted.example/zh-cn/items/wrong/" title="错误装备">错误装备</a>')) +
    group('其他成装', option(item('infinity_edge', '无尽之刃'), '登场率 120% 胜率 0.00%')) +
    '<section id="stats-history">出门装 ' + item('old_item', '过期装备') + ' 登场率 99.99%</section>' +
    group('鞋子', option(item('old_boots', '过期鞋子'), '登场率 99.99%'));
  const html = mayhemPage.replace('</body>', equipment + '</body>');
  const data = parseMayhemChampion(html, 157, 'https://arammayhem.com/zh-cn/build/yasuo/');
  assert.deepEqual(data.equipmentGroups.map((group) => group.category), ['starting', 'boots', 'core', 'situational']);
  const [starting, boots, core, situational] = data.equipmentGroups;
  assert.deepEqual(starting.options[0].items.map((item) => item.slug), ['health_potion', 'health_potion']);
  assert.equal(starting.options[0].pickRate, 0);
  assert.equal(boots.options[0].winRate, undefined);
  assert.equal(core.options.length, 1);
  assert.equal(core.options[0].pickRate, 6.99);
  assert.equal(core.options[0].winRate, 61.72);
  assert.equal(core.options[0].items[0].iconUrl, iconBase + 'rite_of_ruin/64.png');
  assert.equal(situational.options[0].pickRate, undefined);
  assert.equal(situational.options[0].winRate, 0);
  assert.ok(mayhemSourceUrl('/zh-cn/items/rite_of_ruin/').endsWith('/items/rite_of_ruin/'));
  const withoutAugments = parseMayhemChampion(html.replace('top="mapped"', 'top="global"'), 157, data.sourceUrl);
  assert.equal(withoutAugments.augments.length, 0);
  assert.equal(withoutAugments.equipmentGroups.length, 4);
});

test('Mayhem requests share downloads, persist caches and mark old data when refresh fails', async () => {
  const fs=require('node:fs/promises');const path=require('node:path');const base=resolve(root,'../../specs');await fs.mkdir(base,{recursive:true});
  const directory=await fs.mkdtemp(join(base,'test-mayhem-'));
  try {
    const { AramMayhemProvider }=mayhemModule(directory);const provider=new AramMayhemProvider();let calls=0;
    provider.http={get:async url=>{calls++;if(url.endsWith('champions.json'))return {data:{rows:[{championId:'Yasuo',slug:'yasuo'}]}};return {data:mayhemPage};}};
    const [first,second]=await Promise.all([provider.getChampion(157),provider.getChampion(157)]);
    assert.equal(calls,2);assert.equal(first,second);await provider.getChampion(157);assert.equal(calls,2);
    const restarted=new AramMayhemProvider();restarted.http={get:async()=>{throw Error('offline');}};
    assert.equal((await restarted.getChampion(157)).augments[0].pickRate,16.05);
    const stale=await restarted.getChampion(157,true);assert.equal(stale.stale,true);assert.equal(stale.fetchedAt,first.fetchedAt);
    const cacheFile = join(directory, 'aram-mayhem/hero-157.json');
    const oldCache = JSON.parse(await fs.readFile(cacheFile, 'utf8'));
    delete oldCache.data.equipmentGroups;
    await fs.writeFile(cacheFile, JSON.stringify(oldCache));
    const legacy = await restarted.getChampion(157);
    assert.equal(legacy.stale, true);
    assert.deepEqual(legacy.equipmentGroups, []);
    let refreshes = 0;
    const upgraded = new AramMayhemProvider();
    upgraded.http = { get: async () => { refreshes++; return { data: mayhemPage }; } };
    assert.deepEqual((await upgraded.getChampion(157)).equipmentGroups, []);
    assert.equal(refreshes, 1);
    await assert.rejects(restarted.getChampion(99),/暂时无法获取/);await assert.rejects(restarted.getChampion(-1),/有效英雄/);
  } finally {assert.ok(directory.startsWith(base+path.sep+'test-mayhem-'));await fs.rm(directory,{recursive:true,force:true});}
});

test('Mayhem catalog slugs are used instead of guessing champion page paths', async () => {
  const fs=require('node:fs/promises');const path=require('node:path');const base=resolve(root,'../../specs');const directory=await fs.mkdtemp(join(base,'test-mayhem-'));
  try {
    const { AramMayhemProvider }=mayhemModule(directory);const provider=new AramMayhemProvider();
    provider.http={get:async url=>{if(url.endsWith('champions.json'))return {data:{rows:[{championId:'MonkeyKing',slug:'wukong'}]}};assert.ok(url.endsWith('/build/wukong/'));return {data:mayhemPage.replaceAll('/yasuo/','/wukong/')};}};
    assert.ok((await provider.getChampion(62)).sourceUrl.endsWith('/wukong/'));
  } finally {assert.ok(directory.startsWith(base+path.sep+'test-mayhem-'));await fs.rm(directory,{recursive:true,force:true});}
});
