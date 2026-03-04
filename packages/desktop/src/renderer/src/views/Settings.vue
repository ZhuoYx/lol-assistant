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
          <div v-if="alwaysOnTop && !alwaysOnTopTipDismissed" class="setting-tip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>建议将英雄联盟客户端设为「无边框窗口」模式以获得最佳体验</span>
            <button class="tip-dismiss" @click="alwaysOnTopTipDismissed = true">&times;</button>
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

      <!-- Auto Update -->
      <section class="settings-section">
        <h2 class="section-title">更新</h2>
        <div class="settings-card">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">当前版本</span>
              <span class="setting-desc">v{{ appVersion }}</span>
            </div>
            <div class="setting-control">
              <n-button
                size="small"
                :loading="updateChecking"
                @click="handleCheckUpdate"
              >
                检查更新
              </n-button>
            </div>
          </div>
          <div class="setting-divider" />
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">自动更新</span>
              <span class="setting-desc">有新版本时自动下载安装</span>
            </div>
            <div class="setting-control">
              <n-switch v-model:value="autoUpdate" @update:value="onAutoUpdateChange" />
            </div>
          </div>
          <template v-if="updateStatus === 'available' && updateNewVersion">
            <div class="setting-tip update-available-tip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>发现新版本 v{{ updateNewVersion }}</span>
              <n-button size="tiny" type="primary" @click="handleDownloadUpdate">下载</n-button>
            </div>
          </template>
          <template v-if="updateStatus === 'downloading'">
            <div class="setting-row update-progress-row">
              <div class="setting-info" style="flex: 1">
                <span class="setting-label">正在下载更新</span>
                <n-progress :percentage="updatePercent" :show-indicator="false" :height="6" />
              </div>
              <span class="update-percent">{{ updatePercent }}%</span>
            </div>
          </template>
          <template v-if="updateStatus === 'downloaded'">
            <div class="setting-tip update-ready-tip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>更新已下载，重启应用即可安装</span>
              <n-button size="tiny" type="primary" @click="handleInstallUpdate">立即重启</n-button>
            </div>
          </template>
          <template v-if="updateStatus === 'not-available' && updateCheckDone">
            <div class="setting-tip update-latest-tip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>当前已是最新版本</span>
            </div>
          </template>
        </div>
      </section>

      <!-- Cache -->
      <section class="settings-section">
        <h2 class="section-title">缓存</h2>
        <div class="settings-card">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">缓存占用</span>
              <span class="setting-desc">当前缓存大小：{{ cacheSizeText }}</span>
            </div>
            <div class="setting-control">
              <n-button size="small" :loading="clearingCache" @click="handleClearCache">
                清除
              </n-button>
            </div>
          </div>
        </div>
      </section>

      <!-- Third Party Data -->
      <section class="settings-section">
        <h2 class="section-title">第三方数据</h2>
        <div class="settings-card">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">数据版本</span>
              <span class="setting-desc">
                <template v-if="scraperVersion">
                  {{ scraperVersion.source.toUpperCase() }} · {{ scraperVersion.patch }} · {{ formatRelativeTime(scraperVersion.lastUpdated) }}
                </template>
                <template v-else>尚未获取数据</template>
              </span>
            </div>
            <div class="setting-control">
              <n-button size="small" :loading="scraperUpdating" @click="handleUpdateScraper">
                更新
              </n-button>
            </div>
          </div>
        </div>
      </section>

      <!-- LAN Proxy -->
      <section class="settings-section">
        <h2 class="section-title">局域网代理</h2>
        <div class="settings-card">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">启用代理服务</span>
              <span class="setting-desc">允许局域网内其他设备访问助手数据</span>
            </div>
            <div class="setting-control">
              <n-switch
                v-model:value="lanProxyEnabled"
                :loading="proxyToggling"
                @update:value="onLanProxyChange"
              />
            </div>
          </div>
          <template v-if="lanProxyEnabled">
            <div class="setting-tip proxy-security-tip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>代理服务仅在局域网内可用，请确保你处于受信任的网络环境</span>
            </div>
            <div class="setting-divider" />
            <div class="setting-row proxy-info-row">
              <div class="setting-info">
                <span class="setting-label">访问地址</span>
                <span class="setting-desc proxy-address">{{ proxyAddress || '获取中...' }}</span>
              </div>
              <div class="setting-control">
                <n-button
                  size="small"
                  :disabled="!proxyAddress"
                  @click="handleCopyAddress"
                >
                  复制
                </n-button>
              </div>
            </div>
            <div v-if="proxyQrDataUrl" class="proxy-qr-section">
              <div class="proxy-qr-wrapper">
                <img :src="proxyQrDataUrl" alt="QR Code" class="proxy-qr-img" />
              </div>
              <span class="proxy-qr-hint">使用手机扫码访问</span>
            </div>
          </template>
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
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { NSelect, NSwitch, NButton, NProgress } from 'naive-ui';
import { useAppStore } from '@/stores';
import { useCache } from '@/composables/useCache';
import { useScraperData } from '@/composables/useScraperData';
import { formatRelativeTime, formatFileSize } from '@lol-assistant/shared';
import type { ScraperDataVersion } from '@lol-assistant/shared';
import QRCode from 'qrcode';

const appStore = useAppStore();
const router = useRouter();
const { clearCache: doClearCache } = useCache();
const { updating: scraperUpdating, updateData } = useScraperData();

const themeValue = ref(appStore.settings.theme);
const alwaysOnTop = ref(appStore.settings.alwaysOnTop);
const miniMode = ref(appStore.settings.miniMode);
const autoUpdate = ref(appStore.settings.autoUpdate);
const alwaysOnTopTipDismissed = ref(false);
const clearingCache = ref(false);

const cacheSize = ref(0);
const cacheSizeText = ref('计算中...');
const scraperVersion = ref<ScraperDataVersion | null>(null);

// LAN Proxy
const lanProxyEnabled = ref(false);
const proxyToggling = ref(false);
const proxyAddress = ref<string | null>(null);
const proxyQrDataUrl = ref<string | null>(null);

// Auto Update
const appVersion = ref('0.1.0');
const updateChecking = ref(false);
const updateStatus = ref('idle'); // idle | checking | available | downloading | downloaded | not-available | error
const updateNewVersion = ref<string | null>(null);
const updatePercent = ref(0);
const updateCheckDone = ref(false);
let unsubUpdateStatus: (() => void) | null = null;
let unsubUpdateProgress: (() => void) | null = null;
let unsubUpdateAvailable: (() => void) | null = null;

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

function onAutoUpdateChange(value: boolean) {
  appStore.updateSettings({ autoUpdate: value });
}

async function handleCheckUpdate() {
  updateChecking.value = true;
  updateCheckDone.value = false;
  try {
    const info = await window.electronAPI.checkForUpdates();
    if (info) {
      updateStatus.value = 'available';
      updateNewVersion.value = info.version;
    } else {
      updateStatus.value = 'not-available';
    }
    updateCheckDone.value = true;
  } catch {
    updateStatus.value = 'error';
  } finally {
    updateChecking.value = false;
  }
}

function handleDownloadUpdate() {
  window.electronAPI.downloadUpdate();
  updateStatus.value = 'downloading';
  updatePercent.value = 0;
}

function handleInstallUpdate() {
  window.electronAPI.installUpdate();
}

function initUpdateListeners() {
  unsubUpdateStatus = window.electronAPI.onUpdateStatusChange((status) => {
    updateStatus.value = status;
    if (status === 'not-available') {
      updateCheckDone.value = true;
    }
  });

  unsubUpdateProgress = window.electronAPI.onUpdateProgress((percent) => {
    updatePercent.value = percent;
  });

  unsubUpdateAvailable = window.electronAPI.onUpdateAvailable((info) => {
    updateNewVersion.value = info.version;
    updateStatus.value = 'available';
  });
}

async function loadUpdateStatus() {
  try {
    const status = await window.electronAPI.getUpdateStatus();
    updateStatus.value = status.status;
    if (status.updateInfo) {
      updateNewVersion.value = status.updateInfo.version;
    }
    updatePercent.value = status.downloadPercent;
  } catch {
    // ignore
  }
}

async function handleClearCache() {
  clearingCache.value = true;
  try {
    await doClearCache();
    cacheSize.value = 0;
    cacheSizeText.value = '0 B';
  } finally {
    clearingCache.value = false;
  }
}

async function handleUpdateScraper() {
  await updateData();
  await loadScraperVersion();
}

async function handleExportLog() {
  await window.electronAPI.exportLog();
}

function handleResetGuide() {
  router.push('/welcome');
}

async function onLanProxyChange(value: boolean) {
  proxyToggling.value = true;
  try {
    if (value) {
      const status = await window.electronAPI.startProxy();
      proxyAddress.value = status.address;
      appStore.updateSettings({ lanProxyEnabled: true });
      if (status.address) {
        await generateQRCode(status.address);
      }
    } else {
      await window.electronAPI.stopProxy();
      proxyAddress.value = null;
      proxyQrDataUrl.value = null;
      appStore.updateSettings({ lanProxyEnabled: false });
    }
  } catch {
    lanProxyEnabled.value = !value;
  } finally {
    proxyToggling.value = false;
  }
}

async function generateQRCode(text: string) {
  try {
    proxyQrDataUrl.value = await QRCode.toDataURL(text, {
      width: 160,
      margin: 2,
      color: {
        dark: appStore.isDarkTheme ? '#f5f5f7' : '#1d1d1f',
        light: appStore.isDarkTheme ? '#2c2c2e' : '#ffffff',
      },
    });
  } catch {
    proxyQrDataUrl.value = null;
  }
}

function handleCopyAddress() {
  if (proxyAddress.value) {
    navigator.clipboard.writeText(proxyAddress.value);
  }
}

async function loadProxyStatus() {
  try {
    const status = await window.electronAPI.getProxyStatus();
    lanProxyEnabled.value = status.running;
    proxyAddress.value = status.address;
    if (status.running && status.address) {
      await generateQRCode(status.address);
    }
  } catch {
    lanProxyEnabled.value = false;
  }
}

async function loadCacheStats() {
  try {
    const stats = await window.electronAPI.getCacheStats();
    cacheSize.value = stats.totalSize;
    cacheSizeText.value = formatFileSize(stats.totalSize);
  } catch {
    cacheSizeText.value = '未知';
  }
}

async function loadScraperVersion() {
  try {
    scraperVersion.value = await window.electronAPI.getScraperDataVersion() ?? null;
  } catch {
    scraperVersion.value = null;
  }
}

onMounted(() => {
  loadCacheStats();
  loadScraperVersion();
  loadProxyStatus();
  loadUpdateStatus();
  initUpdateListeners();
});

onUnmounted(() => {
  unsubUpdateStatus?.();
  unsubUpdateProgress?.();
  unsubUpdateAvailable?.();
});
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

.setting-tip {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(255, 159, 10, 0.06);
  font-size: var(--text-xs);
  color: var(--color-warning);
  border-top: 1px solid rgba(255, 159, 10, 0.1);
}

.tip-dismiss {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--color-text-placeholder);
  cursor: pointer;
  font-size: var(--text-lg);
  padding: 0 var(--space-1);
  line-height: 1;
}

.tip-dismiss:hover {
  color: var(--color-text-secondary);
}

.proxy-security-tip {
  background: rgba(10, 132, 255, 0.06);
  color: var(--color-accent);
  border-top: 1px solid rgba(10, 132, 255, 0.1);
}

.proxy-address {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-accent);
  user-select: all;
}

.proxy-qr-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-4);
  gap: var(--space-2);
  border-top: 1px solid var(--color-divider);
}

.proxy-qr-wrapper {
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
}

.proxy-qr-img {
  display: block;
  width: 160px;
  height: 160px;
  border-radius: var(--radius-md);
}

.proxy-qr-hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.update-available-tip {
  background: rgba(10, 132, 255, 0.06);
  color: var(--color-accent);
  border-top: 1px solid rgba(10, 132, 255, 0.1);
}

.update-available-tip .n-button {
  margin-left: auto;
}

.update-progress-row {
  gap: var(--space-3);
}

.update-percent {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  flex-shrink: 0;
  min-width: 36px;
  text-align: right;
}

.update-ready-tip {
  background: rgba(48, 209, 88, 0.06);
  color: var(--color-success);
  border-top: 1px solid rgba(48, 209, 88, 0.1);
}

.update-ready-tip .n-button {
  margin-left: auto;
}

.update-latest-tip {
  background: rgba(48, 209, 88, 0.06);
  color: var(--color-success);
  border-top: 1px solid rgba(48, 209, 88, 0.1);
}
</style>
