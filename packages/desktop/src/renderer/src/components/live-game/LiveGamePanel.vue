<template>
  <section class="live-game-panel card" aria-label="本局概览">
    <div class="game-emblem" aria-hidden="true">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m14 3 7 7-11 11-7-7L14 3Z" />
        <path d="m14 3-2 7 9 0M3 14l7-2v9" />
      </svg>
    </div>
    <div class="game-info">
      <div class="game-heading">
        <h2>{{ gameModeName }}</h2>
        <span class="session-badge">本局概览</span>
      </div>
      <p>
        <template v-if="analysis.gameId">
          <span>对局 #{{ analysis.gameId }}</span><span class="meta-dot">·</span>
        </template>
        <span>玩家数据来自客户端</span>
      </p>
    </div>
    <button class="refresh-btn" :disabled="refreshing" @click="$emit('refresh')">
      <svg
        :class="{ spinning: refreshing }"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
      {{ refreshing ? '正在更新' : '刷新数据' }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getQueueNameById, type LiveGameAnalysis } from '@lol-assistant/shared';

const props = defineProps<{ analysis: LiveGameAnalysis; refreshing?: boolean }>();
defineEmits<{ refresh: [] }>();
const gameModeName = computed(() => {
  if (props.analysis.queueId) return getQueueNameById(props.analysis.queueId);
  const modes: Record<string, string> = {
    CLASSIC: '经典模式',
    ARAM: '极地大乱斗',
    URF: '无限火力',
    PRACTICETOOL: '训练模式',
  };
  return modes[props.analysis.gameMode] ?? props.analysis.gameMode;
});
</script>

<style scoped>
.live-game-panel {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
}
.game-emblem {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  color: var(--color-accent);
  background-color: var(--color-accent-soft);
  border: 1px solid color-mix(in srgb, var(--color-accent) 16%, transparent);
  border-radius: 14px;
}
.game-info {
  flex: 1;
  min-width: 0;
}
.game-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
h2 {
  font-size: 16px;
  font-weight: 650;
}
.session-badge {
  color: var(--color-text-tertiary);
  font-size: 11px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  padding: 1px 6px;
}
p {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 5px;
  color: var(--color-text-tertiary);
  font-size: 12px;
}
.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  flex-shrink: 0;
  padding: 9px 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  color: var(--color-text-secondary);
  background-color: var(--color-bg-hover);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}
.refresh-btn:hover:not(:disabled) {
  background-color: var(--color-accent-soft);
  color: var(--color-accent);
}
.refresh-btn:disabled {
  opacity: 0.65;
}
.spinning {
  animation: refresh-spin 1s linear infinite;
}
@keyframes refresh-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 620px) {
  .live-game-panel {
    gap: 10px;
    padding: 14px;
    flex-wrap: wrap;
  }
  .game-emblem {
    display: none;
  }
  .meta-dot {
    display: none;
  }
  p {
    gap: 3px 8px;
  }
}
</style>
