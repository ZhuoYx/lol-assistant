// Real path/parser/onboarding logic with temporary installations and a mocked Windows query.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const req = createRequire(path.join(root, 'package.json'));
const ts = req('typescript');
const log = { logger: { debug() {}, info() {}, warn() {}, error() {} } };
function evaluate(code, mocks = {}, window = {}) {
  const compiled = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', 'window', compiled)(
    (name) => mocks[name] ?? req(name),
    mod,
    mod.exports,
    window,
  );
  return mod.exports;
}
function load(file, mocks = {}) {
  return evaluate(readFileSync(path.join(root, file), 'utf8'), mocks);
}

async function installation(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'lol-path-test-'));
  const game = path.join(directory, 'Program Files (x86)', '英雄联盟(26)');
  const client = path.join(game, 'LeagueClient');
  await fs.mkdir(client, { recursive: true });
  await fs.writeFile(path.join(client, 'LeagueClientUx.exe'), 'fixture');
  const state = {
    query: { processPaths: [], registryPaths: [], driveRoots: ['Z:\\'] },
    metadata: null,
    queries: 0,
  };
  const scopedFs = {
    ...fs,
    stat: async (file) => {
      if (!path.resolve(file).startsWith(path.resolve(directory) + path.sep))
        throw Object.assign(new Error('missing'), { code: 'ENOENT' });
      return fs.stat(file);
    },
    readFile: async (file) => {
      if (path.basename(file) === 'RiotClientInstalls.json' && state.metadata !== null)
        return JSON.stringify(state.metadata);
      throw Object.assign(new Error('missing'), { code: 'ENOENT' });
    },
  };
  const detector = load('src/main/utils/lol-path.ts', {
    'node:fs/promises': scopedFs,
    './powershell': {
      execPowerShell: async (script) => {
        state.queries++;
        assert.ok(
          !/CommandLine|RunAs|Start-Process/.test(script),
          'installation lookup must not request credentials or elevation',
        );
        if (state.query instanceof Error) throw state.query;
        return JSON.stringify(state.query);
      },
    },
    './logger': log,
  });
  try {
    await run({ directory, game, client, state, detector });
  } finally {
    assert.ok(
      path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep + 'lol-path-test-'),
    );
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('root, client, quoted uninstall path and executable selection normalize to the same Chinese/space path', async () => {
  await installation(async ({ game, client, directory, detector }) => {
    for (const candidate of [
      game,
      client,
      path.join(client, 'LeagueClientUx.exe'),
      `"${path.join(game, '英雄联盟卸载.exe')}" /S`,
      path.join(game, 'Riot Client', '..', 'LeagueClient'),
    ])
      assert.equal(await detector.resolveLOLClientPath(candidate), client);
    const invalid = path.join(directory, 'invalid');
    await fs.mkdir(path.join(invalid, 'LeagueClient.exe'), { recursive: true });
    await fs.writeFile(path.join(invalid, 'lockfile'), '');
    assert.equal(await detector.resolveLOLClientPath(invalid), null);
    assert.equal(await detector.resolveLOLClientPath('relative/path'), null);
    assert.equal(await detector.resolveLOLClientPath(null), null);
  });
});

test('a running process path needs no LCU credentials and a valid saved path needs no Windows query', async () => {
  await installation(async ({ game, client, detector, state }) => {
    assert.equal(await detector.detectLOLInstallPath(game), client);
    assert.equal(state.queries, 0);
    state.query.processPaths = [path.join(client, 'LeagueClientUx.exe')];
    assert.equal(await detector.detectLOLInstallPath(), client);
  });
});

test('stale install records are skipped and an uninstall executable locates a custom WeGame installation', async () => {
  await installation(async ({ game, client, detector, state }) => {
    state.query.registryPaths = ['C:\\missing-game', `"${path.join(game, '英雄联盟卸载.exe')}" /S`];
    assert.equal(await detector.detectLOLInstallPath('C:\\stale-saved-path'), client);
  });
});

test('Riot associated-client metadata works when CIM/registry queries are unavailable', async () => {
  await installation(async ({ game, client, detector, state }) => {
    state.query = new Error('CIM unavailable');
    state.metadata = {
      associated_client: {
        [path.join(game, 'riot client', '..', 'LeagueClient')]: 'RiotClientServices.exe',
      },
    };
    assert.equal(await detector.detectLOLInstallPath(), client);
  });
});

test('empty, malformed and missing install records return no match without inventing a valid directory', async () => {
  await installation(async ({ detector, state }) => {
    state.query = null;
    assert.equal(await detector.detectLOLInstallPath(), null);
    state.query = new Error('query failed');
    state.metadata = { associated_client: null };
    assert.equal(await detector.detectLOLInstallPath(), null);
  });
});

test('process parser preserves quoted install arguments, full executable paths and separate process credentials', () => {
  const parser = load('src/main/utils/process.ts', {
    './logger': log,
    './powershell': { execPowerShell() {} },
    './lol-path': { resolveLOLClientPath() {} },
  });
  const directory = 'D:\\Program Files (x86)\\英雄联盟(26)\\LeagueClient';
  for (const option of [
    `--install-directory="${directory}"`,
    `"--install-directory=${directory}"`,
    `--install-directory "${directory}"`,
  ]) {
    const found = parser.parseProcessOutput(
      `ProcessId=12\r\nCommandLine=LeagueClientUx.exe ${option} --app-port=1234 --remoting-auth-token="fixture-token"\r\nExecutablePath=\r\n---\r\n`,
    );
    assert.equal(found.installDirectory, directory);
    assert.equal(found.appPort, 1234);
    assert.equal(found.authToken, 'fixture-token');
  }
  const found = parser.parseProcessOutput(
    `ProcessId : 9\nCommandLine : --install-directory="D:\\wrong"\nExecutablePath : ${directory}\\LeagueClientUx.exe\n---\nProcessId=12\nCommandLine=--app-port=1234 --remoting-auth-token=fixture-token\nExecutablePath=${directory}\\LeagueClientUx.exe`,
  );
  assert.equal(found.installDirectory, directory);
  assert.equal(found.pid, 12);
  assert.equal(found.authToken, 'fixture-token');
});

test('PowerShell receives a hidden, noninteractive UTF-16 encoded script without a command shell', async () => {
  const script = `Write-Output 'D:\\Program Files (x86)\\英雄联盟(26)'`;
  const shell = load('src/main/utils/powershell.ts', {
    'node:child_process': {
      execFile: (file, args, options, callback) => {
        assert.equal(file, 'powershell.exe');
        assert.ok(args.includes('-NonInteractive'));
        assert.equal(options.windowsHide, true);
        const decoded = Buffer.from(args[args.indexOf('-EncodedCommand') + 1], 'base64').toString(
          'utf16le',
        );
        assert.ok(decoded.includes(script));
        assert.ok(!args.includes('-Command'));
        assert.equal(options.shell, undefined);
        callback(null, { stdout: ' 中文路径 \n' });
      },
    },
  });
  assert.equal(await shell.execPowerShell(script), '中文路径');
});

test('path IPC validates and saves the resolved client directory and rejects invalid folders', async () => {
  await installation(async ({ game, client, detector }) => {
    const handlers = new Map(),
      saved = new Map([['lolInstallPath', game]]);
    const ipc = load('src/main/ipc/app.ts', {
      electron: {
        ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
        dialog: { showOpenDialog: async () => ({ canceled: true, filePaths: [] }) },
      },
      '../cache/store': {
        cacheStore: {
          getSetting: (key, fallback) => saved.get(key) ?? fallback,
          setSetting: (key, value) => saved.set(key, value),
        },
      },
      '../utils/lol-path': detector,
      '../utils/logger': log,
    });
    ipc.registerAppIpcHandlers();
    assert.equal(await handlers.get('app:detectLolPath')(), client);
    assert.equal(await handlers.get('app:validateLolPath')({}, game), true);
    await handlers.get('app:saveLolPath')({}, game);
    assert.equal(saved.get('lolInstallPath'), client);
    await assert.rejects(handlers.get('app:saveLolPath')({}, 'C:\\missing'));
    assert.equal(saved.get('lolInstallPath'), client);
  });
});

test('a late automatic result cannot overwrite a manually selected onboarding path', async () => {
  const vue = req('vue'),
    compiler = req('vue/compiler-sfc');
  const descriptor = compiler.parse(
    readFileSync(path.join(root, 'src/renderer/src/views/Welcome.vue'), 'utf8'),
  ).descriptor;
  const script = compiler.compileScript(descriptor, { id: 'welcome-path' }).content;
  let finishDetection;
  const api = {
    detectLolPath: () =>
      new Promise((resolve) => {
        finishDetection = resolve;
      }),
    selectLolPath: async () => 'D:\\manual-game',
    validateLolPath: async () => true,
  };
  const component = evaluate(
    script,
    {
      vue: { ...vue, onMounted() {}, onBeforeUnmount() {} },
      'vue-router': { useRouter: () => ({ push() {} }) },
      'naive-ui': { NSwitch: {} },
      '@/stores': { useAppStore: () => ({ settings: { alwaysOnTop: false, theme: 'light' } }) },
    },
    { electronAPI: api },
  ).default;
  const state = component.setup({}, { expose() {} });
  const automatic = state.autoDetect();
  await state.manualSelect();
  finishDetection('D:\\automatic-game');
  await automatic;
  assert.equal(state.lolPath.value, 'D:\\manual-game');
  assert.equal(state.pathStatus.value, 'valid');
});
