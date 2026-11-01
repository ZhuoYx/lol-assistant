<template>
  <div class="page settings-page">
    <PageHeader title="设置" subtitle="自定义你的助手" />

    <div class="settings-sections">
      <!-- Appearance -->
      <section class="settings-section">
        <h2 class="section-title">外观</h2>
        <div class="settings-card glass-panel">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">主题</span>
              <span class="setting-desc">浅色、深色，或自动匹配系统外观</span>
            </div>
            <div class="setting-control">
              <n-select
                v-model:value="themeValue"
                :options="themeOptions"
                size="small"
                style="width: 132px"
              />
            </div>
          </div>
          <div class="setting-divider" />
          <div class="setting-row">
            <div class="setting-info">
              <label class="setting-label" for="glass-transparency">卡片透明度</label>
              <span class="setting-desc">数值越高，卡片后的角色背景越明显</span>
            </div>
            <div class="setting-control glass-adjustment">
              <input
                id="glass-transparency"
                v-model.number="appStore.glassTransparency"
                class="glass-range"
                type="range"
                min="20"
                max="75"
                step="1"
              />
              <output for="glass-transparency">{{ appStore.glassTransparency }}%</output>
            </div>
          </div>
          <div class="setting-divider" />
          <div class="setting-row">
            <div class="setting-info">
              <label class="setting-label" for="glass-blur">磨砂强度</label>
              <span class="setting-desc">数值越高，透过卡片的背景越柔和</span>
            </div>
            <div class="setting-control glass-adjustment">
              <input
                id="glass-blur"
                v-model.number="appStore.glassBlur"
                class="glass-range"
                type="range"
                min="12"
                max="48"
                step="1"
              />
              <output for="glass-blur">{{ appStore.glassBlur }}px</output>
            </div>
          </div>
        </div>
        <div class="wallpaper-grid" role="group" aria-label="背景插画">
          <button
            v-for="wall in wallpapers"
            :key="wall.id"
            class="wallpaper-choice glass-surface"
            :class="{ selected: appStore.wallpaper === wall.id }"
            :aria-pressed="appStore.wallpaper === wall.id"
            @click="appStore.wallpaper = wall.id"
          >
            <div
              class="wallpaper-preview"
              :style="wall.image ? { backgroundImage: `url(${wall.image})` } : {}"
            >
              <span v-if="appStore.wallpaper === wall.id" class="wallpaper-check">✓</span>
            </div>
            <span class="wallpaper-name">{{ wall.label }}</span>
            <span class="wallpaper-description">{{ wall.description }}</span>
          </button>
        </div>
      </section>

      <!-- Window -->
      <!-- <section class="settings-section">
        <h2 class="section-title">窗口</h2>
        <div class="settings-card glass-panel">
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
        </div>
      </section> -->

      <!-- Auto Accept -->
      <section class="settings-section">
        <h2 class="section-title">对局</h2>
        <div class="settings-card glass-panel">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">自动接受对局</span>
              <span class="setting-desc">匹配成功后自动点击接受</span>
            </div>
            <div class="setting-control">
              <n-switch v-model:value="autoAcceptEnabled" @update:value="onAutoAcceptChange" />
            </div>
          </div>
          <template v-if="autoAcceptEnabled">
            <div class="setting-divider" />
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">延迟时间</span>
                <span class="setting-desc">接受前等待秒数（0 表示立即接受）</span>
              </div>
              <div class="setting-control delay-control">
                <n-button size="tiny" :disabled="autoAcceptDelay <= 0" @click="adjustDelay(-1)"
                  >−</n-button
                >
                <span class="delay-value">{{ autoAcceptDelay }}s</span>
                <n-button size="tiny" :disabled="autoAcceptDelay >= 10" @click="adjustDelay(1)"
                  >+</n-button
                >
              </div>
            </div>
          </template>
        </div>
      </section>

      <!-- Status Message -->
      <section v-if="appStore.isConnected" class="settings-section">
        <h2 class="section-title">个性签名</h2>
        <div class="settings-card glass-panel">
          <div class="setting-row">
            <div class="setting-info" style="flex: 1">
              <div class="status-input-wrapper">
                <input
                  v-model="statusMessage"
                  type="text"
                  class="status-input"
                  placeholder="输入个性签名..."
                  maxlength="50"
                  @keydown.enter="handleSaveStatus"
                />
              </div>
            </div>
          </div>
          <div class="setting-divider" />
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-desc">点击保存将签名应用到客户端</span>
            </div>
            <div class="setting-control">
              <n-button
                size="small"
                type="primary"
                :loading="statusSaving"
                :disabled="!statusMessage && !statusLoaded"
                @click="handleSaveStatus"
              >
                保存签名
              </n-button>
            </div>
          </div>
        </div>
      </section>

      <!-- Backdrop Skin -->
      <section v-if="appStore.isConnected" class="settings-section">
        <h2 class="section-title">藏品背景</h2>
        <div class="settings-card glass-panel">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">背景英雄</span>
              <span class="setting-desc">选择用于个人资料背景的英雄</span>
            </div>
            <div class="setting-control">
              <n-select
                v-model:value="backdropChampionId"
                filterable
                :options="championOptions"
                placeholder="选择英雄"
                size="small"
                style="width: 140px"
                @update:value="onBackdropChampionChange"
              />
            </div>
          </div>
          <template v-if="backdropChampionId">
            <div class="setting-divider" />
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">背景皮肤</span>
                <span class="setting-desc">选择该英雄的皮肤作为背景</span>
              </div>
              <div class="setting-control">
                <n-select
                  v-model:value="backdropSkinId"
                  :options="skinOptions"
                  placeholder="选择皮肤"
                  size="small"
                  style="width: 160px"
                  :loading="skinsLoading"
                />
              </div>
            </div>
            <div class="setting-divider" />
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-desc">点击应用将背景设置到客户端</span>
              </div>
              <div class="setting-control">
                <n-button
                  size="small"
                  type="primary"
                  :loading="backdropSaving"
                  :disabled="!backdropSkinId"
                  @click="handleSaveBackdrop"
                >
                  应用背景
                </n-button>
              </div>
            </div>
          </template>
        </div>
      </section>

      <!-- Auto Update -->
      <section class="settings-section">
        <h2 class="section-title">更新</h2>
        <div class="settings-card glass-panel">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">当前版本</span>
              <span class="setting-desc">{{ appVersion ? 'v' + appVersion : '读取中…' }}</span>
            </div>
            <div class="setting-control">
              <n-button
                size="small"
                :loading="updateChecking || updateStatus === 'checking'"
                :disabled="
                  !updateSupported ||
                  ['checking', 'downloading', 'downloaded'].includes(updateStatus)
                "
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
              <span class="setting-desc">通过 GitHub 检查并下载新版本，正常退出助手时安装</span>
            </div>
            <div class="setting-control">
              <n-switch
                v-model:value="autoUpdate"
                :disabled="!updateSupported || autoUpdateSaving"
                :loading="autoUpdateSaving"
                @update:value="onAutoUpdateChange"
              />
            </div>
          </div>
          <template v-if="updateStatus === 'available' && updateNewVersion">
            <div class="setting-tip update-available-tip">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
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
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>更新已下载，重启应用即可安装</span>
              <n-button size="tiny" type="primary" @click="handleInstallUpdate">立即重启</n-button>
            </div>
          </template>
          <template v-if="updateStatus === 'not-available'">
            <div class="setting-tip update-latest-tip">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>当前已是最新版本</span>
            </div>
          </template>
          <div v-if="!updateSupported && appVersion" class="setting-tip" role="status">
            自动更新仅支持已安装的 Windows 版本，开发模式下不会下载或安装更新。
          </div>
          <div v-if="updateStatus === 'error'" class="setting-tip update-error-tip" role="alert">
            <span>{{ updateError || '无法读取更新状态，请稍后重试。' }}</span>
            <n-button v-if="updateNewVersion" size="tiny" @click="handleDownloadUpdate"
              >重试下载</n-button
            >
          </div>
        </div>
      </section>

      <!-- Cache -->
      <section class="settings-section">
        <h2 class="section-title">缓存</h2>
        <div class="settings-card glass-panel">
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
        <div class="settings-card glass-panel">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">攻略数据来源</span
              ><span class="setting-desc">用于符文出装、选人建议和英雄强度；选择会自动保存</span>
            </div>
            <DataSourceSelect />
          </div>
          <div class="setting-divider" />
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">数据版本</span>
              <span class="setting-desc">
                <template v-if="scraperVersion">
                  {{ scraperVersion.source === 'qq101' ? '101.qq.com' : 'OP.GG' }} ·
                  {{ scraperVersion.patch }} · {{ formatRelativeTime(scraperVersion.lastUpdated) }}
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

      <!-- 局域网代理暂不开放，保留代码便于后续恢复。
      <section class="settings-section">
        <h2 class="section-title">局域网代理</h2>
        <div class="settings-card glass-panel">
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
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
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
                <n-button size="small" :disabled="!proxyAddress" @click="handleCopyAddress">
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

      -->

      <!-- About -->
      <section class="settings-section">
        <h2 class="section-title">关于</h2>
        <div class="settings-card glass-panel">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">导出日志</span>
              <span class="setting-desc"
                >导出近 7 天运行日志与基础环境信息，连接凭证会自动隐藏</span
              >
            </div>
            <div class="setting-control">
              <n-button
                size="small"
                :loading="exportingLogs"
                :disabled="exportingLogs"
                @click="handleExportLog"
                >导出</n-button
              >
            </div>
          </div>
          <div v-if="exportedLogPath" class="export-log-result" role="status">
            <span>已保存：{{ exportedLogPath }}</span>
            <n-button size="tiny" @click="revealExportedLog">打开所在文件夹</n-button>
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
import PageHeader from '@/components/common/PageHeader.vue';
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { NSelect, NSwitch, NButton, NProgress, useMessage } from 'naive-ui';
import { useAppStore, useSummonerStore } from '@/stores';
import { useCache } from '@/composables/useCache';
import { useScraperData } from '@/composables/useScraperData';
import {
  formatRelativeTime,
  formatFileSize,
  CHAMPION_ID_MAP,
  CHAMPION_CN_NAME_MAP,
  getCDragonChampionDetailUrl,
} from '@lol-assistant/shared';
import type {
  ScraperDataVersion,
  CDragonSkinData,
  UpdateState,
  UpdateStatus,
} from '@lol-assistant/shared';
import QRCode from 'qrcode';
import { wallpapers } from '@/styles/wallpapers';
import DataSourceSelect from '@/components/common/DataSourceSelect.vue';

const appStore = useAppStore();
const summonerStore = useSummonerStore();
const router = useRouter();
const message = useMessage();
const { clearCache: doClearCache } = useCache();
const { updating: scraperUpdating, updateData } = useScraperData();

const themeValue = computed({
  get: () => appStore.settings.theme,
  set: onThemeChange,
});
const alwaysOnTop = ref(appStore.settings.alwaysOnTop);
const autoUpdate = ref(appStore.settings.autoUpdate);
const alwaysOnTopTipDismissed = ref(false);
const clearingCache = ref(false);
const exportingLogs = ref(false);
const exportedLogPath = ref('');

const cacheSize = ref(0);
const cacheSizeText = ref('计算中...');
const scraperVersion = ref<ScraperDataVersion | null>(null);

// Auto Accept
const autoAcceptEnabled = ref(false);
const autoAcceptDelay = ref(0);

// Status Message
const statusMessage = ref('');
const statusSaving = ref(false);
const statusLoaded = ref(false);

// Backdrop Skin
const backdropChampionId = ref<number | null>(null);
const backdropSkinId = ref<number | null>(null);
const skinOptions = ref<Array<{ label: string; value: number }>>([]);
const skinsLoading = ref(false);
const backdropSaving = ref(false);

const championOptions = computed(() => {
  return Object.entries(CHAMPION_ID_MAP)
    .map(([id, name]) => ({
      label: CHAMPION_CN_NAME_MAP[Number(id)] || name,
      value: Number(id),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
});

// LAN Proxy
const lanProxyEnabled = ref(false);
const proxyToggling = ref(false);
const proxyAddress = ref<string | null>(null);
const proxyQrDataUrl = ref<string | null>(null);

// Auto Update
const appVersion = ref('');
const updateSupported = ref(false);
const autoUpdateSaving = ref(false);
const updateChecking = ref(false);
const updateStatus = ref<UpdateStatus>('idle');
const updateError = ref('');
const updateNewVersion = ref<string | null>(null);
const updatePercent = ref(0);
let unsubUpdateStatus: (() => void) | null = null;

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

function applyUpdateState(state: UpdateState) {
  appVersion.value = state.currentVersion;
  updateSupported.value = state.supported;
  autoUpdate.value = state.autoUpdate;
  appStore.updateSettings({ autoUpdate: state.autoUpdate });
  updateStatus.value = state.status;
  updateNewVersion.value = state.updateInfo?.version ?? null;
  updatePercent.value = state.downloadPercent;
  updateError.value = state.error ?? '';
}

async function onAutoUpdateChange(value: boolean) {
  autoUpdateSaving.value = true;
  try {
    applyUpdateState(await window.electronAPI.setAutoUpdate(value));
  } catch {
    autoUpdate.value = appStore.settings.autoUpdate;
    message.error('自动更新设置保存失败，请重试。');
  } finally {
    autoUpdateSaving.value = false;
  }
}

async function handleCheckUpdate() {
  updateChecking.value = true;
  try {
    applyUpdateState(await window.electronAPI.checkForUpdates());
  } catch {
    updateStatus.value = 'error';
    updateError.value = '检查更新失败，请稍后重试。';
  } finally {
    updateChecking.value = false;
  }
}

async function handleDownloadUpdate() {
  try {
    applyUpdateState(await window.electronAPI.downloadUpdate());
  } catch {
    updateStatus.value = 'error';
    updateError.value = '下载更新失败，请稍后重试。';
  }
}

async function handleInstallUpdate() {
  try {
    applyUpdateState(await window.electronAPI.installUpdate());
  } catch {
    message.error('安装更新失败，请重试。');
  }
}

function initUpdateListeners() {
  unsubUpdateStatus = window.electronAPI.onUpdateStateChange(applyUpdateState);
}

async function loadUpdateStatus() {
  try {
    applyUpdateState(await window.electronAPI.getUpdateStatus());
  } catch {
    updateStatus.value = 'error';
    updateError.value = '无法读取当前版本和更新状态，请重新打开设置页。';
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
  if (exportingLogs.value) return;
  exportingLogs.value = true;
  try {
    const result = await window.electronAPI.exportLog();
    if (result.status === 'saved') {
      exportedLogPath.value = result.filePath;
      message.success(`已导出 ${result.fileCount} 个日志文件`);
      if (result.truncated || result.skippedCount)
        message.info('部分日志因大小限制或读取失败未完整导出，文件中已注明。');
    } else if (result.status === 'empty') {
      message.info('暂无可导出的近 7 天日志。');
    } else if (result.status === 'busy') {
      message.info('日志正在导出，请稍候。');
    } else if (result.status === 'error') {
      message.error(result.message);
    }
  } catch {
    message.error('导出日志失败，请稍后重试。');
  } finally {
    exportingLogs.value = false;
  }
}

async function revealExportedLog() {
  try {
    if (!(await window.electronAPI.revealExportedLog()))
      message.warning('导出的文件已移动或无法打开，请重新导出。');
  } catch {
    message.error('无法打开所在文件夹。');
  }
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

// ─── 自动接受 ──────────────────────────────────────────

async function onAutoAcceptChange(value: boolean) {
  autoAcceptEnabled.value = value;
  await window.electronAPI.setAutoAccept(value, autoAcceptDelay.value);
}

async function adjustDelay(delta: number) {
  autoAcceptDelay.value = Math.max(0, Math.min(10, autoAcceptDelay.value + delta));
  if (autoAcceptEnabled.value) {
    await window.electronAPI.setAutoAccept(true, autoAcceptDelay.value);
  }
}

async function loadAutoAccept() {
  try {
    const state = await window.electronAPI.getAutoAccept();
    autoAcceptEnabled.value = state.enabled;
    autoAcceptDelay.value = state.delay;
  } catch {
    // ignore
  }
}

// ─── 个性签名 ──────────────────────────────────────────

async function loadStatusMessage() {
  try {
    statusMessage.value = await window.electronAPI.getStatusMessage();
    statusLoaded.value = true;
  } catch {
    // ignore
  }
}

async function handleSaveStatus() {
  statusSaving.value = true;
  try {
    await window.electronAPI.setStatusMessage(statusMessage.value);
    message.success('个性签名已更新');
  } catch {
    message.error('个性签名设置失败');
  } finally {
    statusSaving.value = false;
  }
}

// ─── 藏品背景 ──────────────────────────────────────────

async function onBackdropChampionChange(championId: number) {
  backdropChampionId.value = championId;
  backdropSkinId.value = null;
  skinOptions.value = [];

  if (!championId) return;

  skinsLoading.value = true;
  try {
    // 通过 CDragon 获取英雄所有皮肤
    const url = getCDragonChampionDetailUrl(championId);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CDragon request failed: ${res.status}`);
    const data = (await res.json()) as { skins?: CDragonSkinData[] };

    const options = (data.skins ?? []).map((skin) => ({
      label: skin.name,
      value: skin.id,
    }));

    skinOptions.value = options;
    if (options.length > 0) {
      backdropSkinId.value = options[0].value;
    }
  } catch {
    // CDragon 获取失败，使用默认皮肤
    const baseSkinId = championId * 1000;
    const champName =
      CHAMPION_CN_NAME_MAP[championId] || CHAMPION_ID_MAP[championId] || `英雄 ${championId}`;
    skinOptions.value = [{ label: `${champName}（默认）`, value: baseSkinId }];
    backdropSkinId.value = baseSkinId;
  } finally {
    skinsLoading.value = false;
  }
}

async function handleSaveBackdrop() {
  if (!backdropChampionId.value || !backdropSkinId.value) return;

  const summoner = summonerStore.currentSummoner;
  if (!summoner) return;

  backdropSaving.value = true;
  try {
    await window.electronAPI.setBackdrop(
      summoner.summonerId,
      backdropChampionId.value,
      backdropSkinId.value,
    );
    message.success('藏品背景已更新');
  } catch {
    message.error('藏品背景设置失败');
  } finally {
    backdropSaving.value = false;
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
    scraperVersion.value = (await window.electronAPI.getScraperDataVersion()) ?? null;
  } catch {
    scraperVersion.value = null;
  }
}

watch(() => appStore.championDataSource, loadScraperVersion);

onMounted(() => {
  loadCacheStats();
  loadScraperVersion();
  // 局域网代理暂不开放。
  // loadProxyStatus();
  initUpdateListeners();
  loadUpdateStatus();
  loadAutoAccept();
  if (appStore.isConnected) {
    loadStatusMessage();
  }
});

onUnmounted(() => {
  unsubUpdateStatus?.();
});
</script>

<style scoped>
.export-log-result {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 0 var(--space-5) var(--space-4);
  color: var(--color-text-secondary);
  font-size: 12px;
}
.export-log-result span {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.glass-adjustment {
  display: flex;
  align-items: center;
  gap: 12px;
}
.glass-range {
  width: 168px;
  max-width: 100%;
  height: 24px;
  accent-color: var(--color-accent);
  cursor: ew-resize;
}
.glass-adjustment output {
  min-width: 44px;
  color: var(--color-text-primary);
  font: 600 12px var(--font-mono);
  text-align: right;
}
.settings-page {
  max-width: 840px;
  margin: 0 auto;
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
  overflow: hidden;
  transition:
    border-color var(--transition-normal),
    box-shadow var(--transition-normal),
    background-color var(--transition-normal);
}

.wallpaper-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}
.wallpaper-choice {
  padding: 8px;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  background-color: var(--color-bg-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  text-align: left;
  color: var(--color-text-primary);
  transition:
    border-color var(--transition-normal),
    transform var(--transition-normal);
}
.wallpaper-choice:hover {
  transform: translateY(-2px);
}
.wallpaper-choice.selected {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent);
}
.wallpaper-preview {
  height: 100px;
  background: var(--app-canvas);
  background-size: cover;
  background-position: right center;
  border-radius: 10px;
  position: relative;
}
.wallpaper-check {
  position: absolute;
  right: 8px;
  top: 8px;
  background-color: var(--color-accent);
  color: var(--color-bg-primary);
  border-radius: 100%;
  width: 24px;
  height: 24px;
  text-align: center;
  line-height: 24px;
}
.wallpaper-name,
.wallpaper-description {
  display: block;
  padding: 0 4px;
}
.wallpaper-name {
  font-size: 13px;
  font-weight: 600;
  margin-top: 10px;
}
.wallpaper-description {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 3px 0 6px;
}

.settings-card:hover {
  border-color: var(--color-border);
  box-shadow: var(--shadow-sm);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  min-height: 52px;
  gap: var(--space-4);
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
  background-color: var(--color-divider);
  margin: 0 var(--space-4);
}

.setting-tip {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background-color: rgba(255, 159, 10, 0.06);
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
  background-color: rgba(10, 132, 255, 0.06);
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
  background-color: var(--color-bg-primary);
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
  background-color: rgba(10, 132, 255, 0.06);
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
  background-color: rgba(48, 209, 88, 0.06);
  color: var(--color-success);
  border-top: 1px solid rgba(48, 209, 88, 0.1);
}

.update-ready-tip .n-button {
  margin-left: auto;
}

.update-latest-tip {
  background-color: rgba(48, 209, 88, 0.06);
  color: var(--color-success);
  border-top: 1px solid rgba(48, 209, 88, 0.1);
}

.update-error-tip {
  color: var(--color-error);
  flex-wrap: wrap;
}
.update-error-tip span {
  flex: 1;
  min-width: 180px;
}

/* Auto Accept Delay */
.delay-control {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.delay-value {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  min-width: 28px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* Status Message */
.status-input-wrapper {
  margin-top: var(--space-2);
}

.status-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-primary);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  font-family: var(--font-family);
  outline: none;
  transition: border-color var(--transition-fast);
}

.status-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.12);
}

.status-input::placeholder {
  color: var(--color-text-placeholder);
}

.settings-page {
  --page-max-width: 840px;
}
.setting-info {
  min-width: 0;
  flex: 1;
  overflow-wrap: anywhere;
}
.setting-control {
  max-width: 100%;
}
@container workspace (max-width: 580px) {
  .setting-row {
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 12px;
  }
  .setting-info {
    flex-basis: 100%;
  }
  .setting-row:has(.n-switch) {
    flex-wrap: nowrap;
  }
  .setting-row:has(.n-switch) .setting-info {
    flex-basis: auto;
  }
  .setting-tip {
    flex-wrap: wrap;
  }
  .wallpaper-grid {
    gap: 10px;
  }
}
@container workspace (max-width: 420px) {
  .wallpaper-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
