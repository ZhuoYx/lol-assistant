// Prevent an incorrectly tagged/configured build from becoming an update release.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '../../..');
const readJson = (file) => JSON.parse(readFileSync(resolve(root, file), 'utf8'));
const version = readJson('packages/desktop/package.json').version;
assert.match(version, /^\d+\.\d+\.\d+$/, '正式版必须使用 x.y.z 版本号');
for (const file of ['package.json', 'packages/shared/package.json'])
  assert.equal(readJson(file).version, version, `${file} 的版本号必须与桌面端一致`);
if (process.env.GITHUB_REF_TYPE === 'tag')
  assert.equal(process.env.GITHUB_REF_NAME, `v${version}`, 'Git 标签必须与安装包版本一致');
const config = readJson('packages/desktop/electron-builder.json');
assert.equal(config.publish.provider, 'github');
assert.ok(config.publish.owner && config.publish.owner !== 'your-github-username');
if (process.env.GITHUB_REPOSITORY)
  assert.equal(
    `${config.publish.owner}/${config.publish.repo}`.toLowerCase(),
    process.env.GITHUB_REPOSITORY.toLowerCase(),
    '更新源必须与发布工作流所在仓库一致',
  );
assert.equal(config.publish.releaseType, 'draft', '发布前先生成可检查的草稿');
console.log(`发布配置通过：v${version} → ${config.publish.owner}/${config.publish.repo}`);
