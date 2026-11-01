// Run the real updater state machine with a fake transport; never download/install a real update.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createRequire } = require('node:module');
const root = resolve(__dirname, '..');
const localRequire = createRequire(resolve(root, 'package.json'));
const ts = localRequire('typescript');
const code = ts.transpileModule(readFileSync(resolve(root, 'src/main/updater/index.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const info = { version: '1.0.1', releaseDate: '2026-11-01T00:00:00Z' };

function fixture({
  enabled = false,
  packaged = true,
  settings = new Map([['autoUpdate', enabled]]),
} = {}) {
  const transport = new EventEmitter();
  const changes = [];
  let checks = 0,
    downloads = 0,
    installs = 0;
  transport.checkForUpdates = async () => {
    checks++;
    transport.emit('checking-for-update');
    transport.emit('update-not-available', { version: '1.0.0' });
    return { isUpdateAvailable: false, updateInfo: { version: '1.0.0' } };
  };
  transport.downloadUpdate = async () => {
    downloads++;
    transport.emit('update-downloaded', info);
    return ['fixture.exe'];
  };
  transport.quitAndInstall = () => {
    installs++;
  };
  const mod = { exports: {} };
  const mocks = {
    electron: { app: { isPackaged: packaged, getVersion: () => '1.0.0' } },
    'electron-updater': { autoUpdater: transport },
    '../utils/logger': { logger: { info() {}, warn() {}, error() {}, debug() {} } },
    '../cache/store': {
      cacheStore: {
        getSetting: (key, fallback) => settings.get(key) ?? fallback,
        setSetting: (key, value) => settings.set(key, value),
      },
    },
  };
  new Function('require', 'module', 'exports', code)(
    (name) => mocks[name] ?? localRequire(name),
    mod,
    mod.exports,
  );
  const updater = new mod.exports.AppUpdater();
  updater.init((state) => changes.push(state));
  return {
    updater,
    transport,
    changes,
    settings,
    counts: () => ({ checks, downloads, installs }),
    available: () => {
      transport.checkForUpdates = async () => {
        checks++;
        transport.emit('update-available', info);
        return { isUpdateAvailable: true, updateInfo: info };
      };
    },
  };
}

test('an equal/older server version never becomes an available update', async () => {
  const f = fixture();
  const state = await f.updater.checkForUpdates();
  assert.equal(state.currentVersion, '1.0.0');
  assert.equal(state.status, 'not-available');
  assert.equal(state.updateInfo, null);
  assert.equal(f.counts().downloads, 0);
});

test('disabled automatic updates skip background checks but allow manual check, download and install', async () => {
  const f = fixture();
  f.available();
  await f.updater.checkForUpdates(true);
  assert.equal(f.counts().checks, 0);
  assert.equal((await f.updater.checkForUpdates()).status, 'available');
  assert.equal(f.counts().downloads, 0);
  assert.equal((await f.updater.downloadUpdate()).status, 'downloaded');
  assert.equal(f.transport.autoInstallOnAppQuit, false);
  await f.updater.checkForUpdates();
  assert.equal(f.counts().checks, 1);
  f.updater.installUpdate();
  assert.equal(f.counts().installs, 1);
  f.updater.setAutoUpdate(true);
  assert.equal(
    f.counts().downloads,
    2,
    'a cached manual download is revalidated for the quit hook',
  );
  assert.equal(f.transport.autoInstallOnAppQuit, true);
});

test('automatic updates download once, retain progress and never force an immediate install', async () => {
  const f = fixture({ enabled: true });
  f.available();
  let finish;
  let count = 0;
  f.transport.downloadUpdate = () => {
    count++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  };
  const state = await f.updater.checkForUpdates(true);
  assert.equal(state.status, 'downloading');
  f.transport.emit('download-progress', { percent: 42.4 });
  const duplicate = f.updater.downloadUpdate();
  assert.equal(f.updater.getStatus().downloadPercent, 42);
  assert.equal((await f.updater.checkForUpdates()).status, 'downloading');
  assert.equal(count, 1);
  f.transport.emit('update-downloaded', info);
  finish(['fixture.exe']);
  await duplicate;
  assert.equal(f.updater.getStatus().status, 'downloaded');
  assert.equal(f.updater.getStatus().downloadPercent, 100);
  assert.equal(f.counts().installs, 0);
});

test('concurrent checks share one request and disabling during a check prevents automatic download', async () => {
  const f = fixture({ enabled: true });
  let finish,
    count = 0;
  f.transport.checkForUpdates = () => {
    count++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  };
  const first = f.updater.checkForUpdates();
  const second = f.updater.checkForUpdates();
  f.updater.setAutoUpdate(false);
  f.transport.emit('update-available', info);
  finish({ isUpdateAvailable: true, updateInfo: info });
  assert.equal((await first).status, 'available');
  await second;
  assert.equal(count, 1);
  assert.equal(f.counts().downloads, 0);
  assert.equal(f.transport.autoInstallOnAppQuit, false);
});

test('network and missing-release failures remain errors; a failed download can be retried', async () => {
  const f = fixture();
  f.transport.checkForUpdates = async () => {
    throw new Error('404 latest.yml');
  };
  assert.equal((await f.updater.checkForUpdates()).status, 'error');
  assert.match(f.updater.getStatus().error, /发布/);
  f.available();
  await f.updater.checkForUpdates();
  f.transport.downloadUpdate = async () => {
    throw new Error('ECONNRESET');
  };
  assert.equal((await f.updater.downloadUpdate()).status, 'error');
  assert.equal(f.updater.getStatus().updateInfo.version, '1.0.1');
  f.transport.downloadUpdate = async () => {
    f.transport.emit('update-downloaded', info);
    return ['fixture.exe'];
  };
  assert.equal((await f.updater.downloadUpdate()).status, 'downloaded');
  assert.equal(f.updater.getStatus().error, null);
});

test('development mode never checks, downloads or installs an update', async () => {
  const f = fixture({ enabled: true, packaged: false });
  f.updater.start();
  assert.equal((await f.updater.checkForUpdates()).status, 'unsupported');
  await f.updater.downloadUpdate();
  f.updater.installUpdate();
  f.updater.dispose();
  assert.deepEqual(f.counts(), { checks: 0, downloads: 0, installs: 0 });
});

test('the automatic update preference survives a new main-process instance', () => {
  const settings = new Map();
  const first = fixture({ settings });
  first.updater.setAutoUpdate(false);
  const restarted = fixture({ settings });
  assert.equal(restarted.updater.getStatus().autoUpdate, false);
  assert.equal(restarted.transport.autoInstallOnAppQuit, false);
  restarted.updater.setAutoUpdate(true);
  assert.equal(settings.get('autoUpdate'), true);
});
