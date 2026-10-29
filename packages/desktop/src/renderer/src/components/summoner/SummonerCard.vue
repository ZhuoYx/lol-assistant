<template>
  <div class="summoner-card card">
    <div v-if="summoner" class="summoner-info">
      <div class="avatar-wrapper">
        <img
          v-if="avatarUrl"
          class="avatar-img"
          :src="avatarUrl"
          :alt="summoner.displayName"
          @error="avatarError = true"
        />
        <div v-else class="avatar-fallback">
          {{ summonerName.charAt(0) }}
        </div>
        <span class="level-badge">{{ summoner.summonerLevel }}</span>
      </div>
      <div class="info-body">
        <h2 class="summoner-name">
          {{ summonerName }}
          <span v-if="summoner.tagLine" class="summoner-tag">#{{ summoner.tagLine }}</span>
        </h2>
        <div class="xp-section">
          <div class="xp-bar">
            <div class="xp-fill" :style="{ width: xpPercent + '%' }" />
          </div>
          <span class="xp-text">{{ summoner.xpSinceLastLevel }} / {{ totalXp }} XP</span>
        </div>
      </div>
    </div>
    <div v-else-if="!isConnected" class="state-empty">
      <div class="state-icon">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
          <line x1="12" y1="2" x2="12" y2="12" />
        </svg>
      </div>
      <p class="state-title">未连接客户端</p>
      <p class="state-desc">请启动英雄联盟客户端</p>
    </div>
    <div v-else class="state-loading">
      <LoadingSpinner size="md" text="获取召唤师信息..." centered />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Summoner } from '@lol-assistant/shared';
import { getProfileIconUrl } from '@lol-assistant/shared';
import { LoadingSpinner } from '@/components/common';

const props = defineProps<{
  summoner: Summoner | null;
  isConnected: boolean;
}>();

const avatarError = ref(false);

const summonerName = computed(() => {
  if (!props.summoner) return '';
  return (
    props.summoner.gameName || props.summoner.displayName || props.summoner.internalName || '召唤师'
  );
});

const avatarUrl = computed(() => {
  if (!props.summoner || avatarError.value) return '';
  return getProfileIconUrl(props.summoner.profileIconId, '14.24.1');
});

const xpPercent = computed(() => {
  if (!props.summoner) return 0;
  const total = props.summoner.xpSinceLastLevel + props.summoner.xpUntilNextLevel;
  return total > 0 ? Math.round((props.summoner.xpSinceLastLevel / total) * 100) : 0;
});

const totalXp = computed(() => {
  if (!props.summoner) return 0;
  return props.summoner.xpSinceLastLevel + props.summoner.xpUntilNextLevel;
});
</script>

<style scoped>
.summoner-card {
  grid-column: 1 / -1;
}

.summoner-info {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}

.avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.avatar-img {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-xl);
  object-fit: cover;
  border: 2px solid var(--color-border-light);
}

.avatar-fallback {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, var(--color-accent), #5856d6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: #ffffff;
}

.level-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  font-size: 10px;
  font-weight: var(--font-bold);
  background-color: var(--color-bg-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  color: var(--color-text-primary);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  border: 2px solid var(--color-bg-card);
  box-shadow: var(--shadow-sm);
}

.info-body {
  flex: 1;
  min-width: 0;
}

.summoner-name {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  letter-spacing: -0.3px;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.summoner-tag {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-tertiary);
  margin-left: 2px;
}

.xp-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.xp-bar {
  height: 4px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.xp-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), #5856d6);
  border-radius: var(--radius-full);
  transition: width var(--transition-slow);
}

.xp-text {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.state-empty,
.state-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-6) 0;
}

.state-icon {
  color: var(--color-text-placeholder);
  margin-bottom: var(--space-3);
}

.state-title {
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}

.state-desc {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}
</style>
