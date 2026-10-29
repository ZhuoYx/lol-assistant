// Real Vue Router navigation with a controllable browser snapshot boundary.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const scopedRequire = createRequire(join(__dirname, '../package.json'));
const { createRouter, createMemoryHistory, isNavigationFailure } = scopedRequire('vue-router');
const ts = scopedRequire('typescript');
const source = ts.transpileModule(readFileSync(join(__dirname, '../src/renderer/src/router/transitions.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', source)(scopedRequire, mod, mod.exports);
const { installRouteTransitions } = mod.exports;
const turn = () => new Promise(resolve => setImmediate(resolve));

async function setup({ supported = true, reduced = false, manualCapture = false, failStart = false } = {}) {
  const snapshots = [];
  global.window = { matchMedia: () => ({ matches: reduced }) };
  global.document = supported ? { startViewTransition(update) {
    if (failStart) throw new Error('capture unavailable');
    let complete;
    const updateCallbackDone = new Promise(resolve => { complete = resolve; });
    let finish;
    const animationDone = new Promise(resolve => { finish = resolve; });
    let captured = false;
    const snapshot = {
      skipped: false,
      updateCallbackDone,
      ready: updateCallbackDone.then(() => {
        if (snapshot.skipped) throw new Error('skipped');
      }),
      finished: Promise.all([updateCallbackDone, animationDone]),
      capture() {
        if (captured) return;
        captured = true;
        Promise.resolve(update()).then(complete);
      },
      skipTransition() { snapshot.skipped = true; finish(); queueMicrotask(snapshot.capture); },
      finish,
    };
    snapshots.push(snapshot);
    if (!manualCapture) queueMicrotask(snapshot.capture);
    return snapshot;
  } } : {};
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/', '/a', '/b', '/broken'].map(path => ({ path, component: {} })),
  });
  installRouteTransitions(router);
  await router.push('/');
  assert.equal(snapshots.length, 0, 'initial navigation must not animate');
  return { router, snapshots };
}

test('snapshot update waits for router commit and query-only changes do not animate', async () => {
  const { router, snapshots } = await setup();
  await router.push('/a');
  await snapshots[0].updateCallbackDone;
  assert.equal(router.currentRoute.value.path, '/a');
  snapshots[0].finish();
  await snapshots[0].finished;
  await router.push('/a?player=2');
  assert.equal(snapshots.length, 1);
});

test('rapid navigation skips a pending capture and reaches the latest module', { timeout: 2000 }, async () => {
  const { router, snapshots } = await setup({ manualCapture: true });
  const first = router.push('/a');
  await turn();
  assert.equal(snapshots.length, 1);
  const second = router.push('/b');
  await turn();
  assert.equal(snapshots.length, 2);
  assert.equal(snapshots[0].skipped, true);
  snapshots[1].capture();
  assert.ok(isNavigationFailure(await first));
  await second;
  await snapshots[1].updateCallbackDone;
  assert.equal(router.currentRoute.value.path, '/b');
  snapshots[1].finish();
});

test('navigation errors release a pending snapshot and allow later navigation', async () => {
  const { router, snapshots } = await setup();
  const remove = router.beforeResolve(to => { if (to.path === '/broken') throw new Error('broken route'); });
  await assert.rejects(router.push('/broken'), /broken route/);
  await snapshots[0].updateCallbackDone;
  assert.equal(snapshots[0].skipped, true);
  remove();
  await router.push('/b');
  await snapshots[1].updateCallbackDone;
  assert.equal(router.currentRoute.value.path, '/b');
  snapshots[1].finish();
});

test('reduced motion and unsupported browsers navigate without snapshot captures', async () => {
  for (const options of [{ reduced: true }, { supported: false }]) {
    const { router, snapshots } = await setup(options);
    await router.push('/a');
    assert.equal(router.currentRoute.value.path, '/a');
    assert.equal(snapshots.length, 0);
  }
});

test('capture startup failure does not block navigation', async () => {
  const { router } = await setup({ failStart: true });
  await router.push('/a');
  assert.equal(router.currentRoute.value.path, '/a');
});
