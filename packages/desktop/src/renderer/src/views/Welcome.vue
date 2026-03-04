<template>
  <div class="welcome-page">
    <div class="welcome-container">
      <!-- Step indicator -->
      <div class="steps">
        <div
          v-for="(_, i) in steps"
          :key="i"
          class="step-dot"
          :class="{ active: currentStep === i, completed: currentStep > i }"
        />
      </div>

      <!-- Step content -->
      <transition name="scale-fade" mode="out-in">
        <!-- Step 0: Welcome -->
        <div v-if="currentStep === 0" key="welcome" class="step-content">
          <div class="welcome-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 class="welcome-title">欢迎使用 LOL 助手</h1>
          <p class="welcome-desc">
            一款为英雄联盟玩家打造的桌面助手工具，<br />
            提供战绩查询、对局分析、选人建议等功能。
          </p>
          <button class="primary-btn" @click="nextStep">开始设置</button>
        </div>

        <!-- Step 1: Features -->
        <div v-else-if="currentStep === 1" key="features" class="step-content">
          <h2 class="step-title">核心功能</h2>
          <div class="feature-grid">
            <div class="feature-item">
              <div class="feature-icon accent">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
              </div>
              <div class="feature-text">
                <strong>战绩查询</strong>
                <span>查看历史对局和详细数据</span>
              </div>
            </div>
            <div class="feature-item">
              <div class="feature-icon success">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              </div>
              <div class="feature-text">
                <strong>对局分析</strong>
                <span>实时查看 10 人对局数据</span>
              </div>
            </div>
            <div class="feature-item">
              <div class="feature-icon warning">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div class="feature-text">
                <strong>选人助手</strong>
                <span>智能推荐与克制分析</span>
              </div>
            </div>
          </div>
          <div class="step-actions">
            <button class="secondary-btn" @click="prevStep">上一步</button>
            <button class="primary-btn" @click="nextStep">继续</button>
          </div>
        </div>

        <!-- Step 2: Preferences -->
        <div v-else-if="currentStep === 2" key="prefs" class="step-content">
          <h2 class="step-title">偏好设置</h2>
          <div class="pref-list">
            <div class="pref-item">
              <div class="pref-info">
                <strong>窗口置顶</strong>
                <span>游戏时保持窗口在最上层</span>
              </div>
              <n-switch v-model:value="prefAlwaysOnTop" />
            </div>
            <div class="pref-item">
              <div class="pref-info">
                <strong>深色模式</strong>
                <span>使用深色主题</span>
              </div>
              <n-switch v-model:value="prefDarkMode" />
            </div>
          </div>
          <div class="pref-tip">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span>建议将英雄联盟设置为"无边框窗口"模式以获得最佳体验</span>
          </div>
          <div class="step-actions">
            <button class="secondary-btn" @click="prevStep">上一步</button>
            <button class="primary-btn" @click="finishSetup">完成设置</button>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { NSwitch } from 'naive-ui';
import { useAppStore } from '@/stores';

const router = useRouter();
const appStore = useAppStore();

const currentStep = ref(0);
const steps = [0, 1, 2];

const prefAlwaysOnTop = ref(appStore.settings.alwaysOnTop);
const prefDarkMode = ref(appStore.settings.theme === 'dark');

function nextStep() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++;
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
}

async function finishSetup() {
  appStore.updateSettings({
    alwaysOnTop: prefAlwaysOnTop.value,
    theme: prefDarkMode.value ? 'dark' : 'light',
  });

  if (prefAlwaysOnTop.value) {
    window.electronAPI.setAlwaysOnTop(true);
  }

  try {
    await window.electronAPI.setFirstLaunchDone();
  } catch {
    // ignore
  }

  appStore.setFirstLaunch(false);
  router.push('/');
}
</script>

<style scoped>
.welcome-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-primary);
  padding: var(--space-6);
}

.welcome-container {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Steps indicator */
.steps {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-8);
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-bg-tertiary);
  transition: all var(--transition-normal);
}

.step-dot.active {
  width: 24px;
  background: var(--color-accent);
}

.step-dot.completed {
  background: var(--color-accent);
}

/* Step content */
.step-content {
  text-align: center;
  width: 100%;
}

.welcome-icon {
  color: var(--color-accent);
  margin-bottom: var(--space-6);
}

.welcome-title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  letter-spacing: -0.8px;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
}

.welcome-desc {
  font-size: var(--text-md);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  margin-bottom: var(--space-8);
}

.step-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  letter-spacing: -0.3px;
  color: var(--color-text-primary);
  margin-bottom: var(--space-6);
}

/* Feature grid */
.feature-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-8);
  text-align: left;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
}

.feature-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.feature-icon.accent {
  background: rgba(0, 113, 227, 0.1);
  color: var(--color-accent);
}

.feature-icon.success {
  background: rgba(48, 209, 88, 0.1);
  color: var(--color-success);
}

.feature-icon.warning {
  background: rgba(255, 159, 10, 0.1);
  color: var(--color-warning);
}

.feature-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.feature-text strong {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.feature-text span {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* Preferences */
.pref-list {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  overflow: hidden;
  margin-bottom: var(--space-4);
  text-align: left;
}

.pref-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
}

.pref-item + .pref-item {
  border-top: 1px solid var(--color-divider);
}

.pref-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pref-info strong {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
}

.pref-info span {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.pref-tip {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  padding: var(--space-3);
  background: rgba(255, 159, 10, 0.06);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-8);
  text-align: left;
}

.pref-tip svg {
  color: var(--color-warning);
  flex-shrink: 0;
}

/* Buttons */
.step-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
}

.primary-btn {
  padding: 10px 28px;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: #ffffff;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-full);
  transition: all var(--transition-fast);
  letter-spacing: -0.1px;
}

.primary-btn:hover {
  background: var(--color-accent-hover);
  transform: scale(1.02);
}

.primary-btn:active {
  background: var(--color-accent-active);
  transform: scale(0.98);
}

.secondary-btn {
  padding: 10px 24px;
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  transition: all var(--transition-fast);
}

.secondary-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}
</style>
