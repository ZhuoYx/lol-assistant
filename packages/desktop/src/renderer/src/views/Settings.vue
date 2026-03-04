<template>
  <div class="page settings-page">
    <header class="page-header">
      <h1 class="page-title">设置</h1>
      <p class="page-subtitle">自定义你的助手</p>
    </header>

    <div class="settings-sections">
      <!-- Appearance -->
      <section class="settings-section">
        <h2 class="section-title">外观</h2>
        <div class="settings-card">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">主题</span>
              <span class="setting-desc">选择应用外观主题</span>
            </div>
            <div class="setting-control">
              <n-select
                v-model:value="themeValue"
                :options="themeOptions"
                size="small"
                style="width: 120px"
                @update:value="onThemeChange"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- Window -->
      <section class="settings-section">
        <h2 class="section-title">窗口</h2>
        <div class="settings-card">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">窗口置顶</span>
              <span class="setting-desc">保持窗口在最上层显示</span>
            </div>
            <div class="setting-control">
              <n-switch v-model:value="alwaysOnTop" @update:value="onAlwaysOnTopChange" />
            </div>
          </div>
          <div class="setting-divider" />
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">迷你模式</span>
              <span class="setting-desc">切换为悬浮小窗模式</span>
            </div>
            <div class="setting-control">
              <n-switch v-model:value="miniMode" @update:value="onMiniModeChange" />
            </div>
          </div>
        </div>
      </section>

      <!-- Cache -->
      <section class="settings-section">
        <h2 class="section-title">缓存</h2>
        <div class="settings-card">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">清除缓存</span>
              <span class="setting-desc">清除所有本地缓存数据</span>
            </div>
            <div class="setting-control">
              <n-button size="small" @click="handleClearCache">清除</n-button>
            </div>
          </div>
        </div>
      </section>

      <!-- Data -->
      <section class="settings-section">
        <h2 class="section-title">第三方数据</h2>
        <div class="settings-card">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">手动更新数据</span>
              <span class="setting-desc">从 OP.GG / Lolalytics 更新英雄数据</span>
            </div>
            <div class="setting-control">
              <n-button size="small" :loading="scraperUpdating" @click="handleUpdateScraper">
                更新
              </n-button>
            </div>
          </div>
        </div>
      </section>

      <!-- About -->
      <section class="settings-section">
        <h2 class="section-title">关于</h2>
        <div class="settings-card">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">导出日志</span>
              <span class="setting-desc">导出应用日志用于问题排查</span>
            </div>
            <div class="setting-control">
              <n-button size="small" @click="handleExportLog">导出</n-button>
            </div>
          </div>
          <div class="setting-divider" />
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">重新引导</span>
              <span class="setting-desc">重新显示首次启动引导</span>
            </div>
            <div class="setting-control">
              <n-button size="small" @click="handleResetGuide">重新引导</n-button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { NSelect, NSwitch, NButton } from 'naive-ui';
import { useAppStore } from '@/stores';
import { useCache } from '@/composables/useCache';
import { useScraperData } from '@/composables/useScraperData';

const appStore = useAppStore();
const router = useRouter();
const { clearCache: doClearCache } = useCache();
const { updating: scraperUpdating, updateData } = useScraperData();

const themeValue = ref(appStore.settings.theme);
const alwaysOnTop = ref(appStore.settings.alwaysOnTop);
const miniMode = ref(appStore.settings.miniMode);

const themeOptions = [
  { label: '浅色', value: 'light' as const },
  { label: '深色', value: 'dark' as const },
  { label: '跟随系统', value: 'system' as const },
];

function onThemeChange(value: 'light' | 'dark' | 'system') {
  appStore.updateSettings({ theme: value });
}

function onAlwaysOnTopChange(value: boolean) {
  appStore.updateSettings({ alwaysOnTop: value });
  window.electronAPI.setAlwaysOnTop(value);
}

function onMiniModeChange(value: boolean) {
  appStore.updateSettings({ miniMode: value });
  window.electronAPI.setMiniMode(value);
}

async function handleClearCache() {
  await doClearCache();
}

async function handleUpdateScraper() {
  await updateData();
}

async function handleExportLog() {
  await window.electronAPI.exportLog();
}

function handleResetGuide() {
  router.push('/welcome');
}
</script>

<style scoped>
.settings-page {
  max-width: 640px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--space-6);
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  letter-spacing: -0.5px;
  color: var(--color-text-primary);
}

.page-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}

.settings-sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.section-title {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--space-2);
  padding-left: var(--space-1);
}

.settings-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  overflow: hidden;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  min-height: 52px;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-label {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
}

.setting-desc {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.setting-control {
  flex-shrink: 0;
}

.setting-divider {
  height: 1px;
  background: var(--color-divider);
  margin: 0 var(--space-4);
}
</style>
