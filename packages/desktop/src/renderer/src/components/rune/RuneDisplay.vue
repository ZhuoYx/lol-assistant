<template>
  <div class="rune-display">
    <!-- Header: tabs for multiple rune builds -->
    <div class="rune-header">
      <h3 class="section-title">符文推荐</h3>
      <div v-if="runeBuilds.length > 1" class="rune-tabs">
        <button
          v-for="(rune, idx) in runeBuilds"
          :key="idx"
          class="rune-tab"
          :class="{ active: selectedIndex === idx }"
          @click="$emit('select', idx)"
        >
          {{ rune.name || `配置 ${idx + 1}` }}
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="runeBuilds.length === 0" class="rune-empty">
      <span class="empty-text">暂无符文数据</span>
    </div>

    <!-- Rune content -->
    <div v-else-if="currentRune" class="rune-content">
      <!-- Stats bar -->
      <div class="rune-stats">
        <div class="stat-item">
          <span class="stat-label">胜率</span>
          <span class="stat-value win-rate">{{ formatPercent(currentRune.winRate) }}</span>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <span class="stat-label">使用率</span>
          <span class="stat-value">{{ formatPercent(currentRune.pickRate) }}</span>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <span class="stat-label">样本</span>
          <span class="stat-value">{{ formatSample(currentRune.sampleSize) }}</span>
        </div>
      </div>

      <!-- Rune trees -->
      <div class="rune-trees">
        <!-- Primary tree -->
        <div class="rune-tree primary">
          <div class="tree-header">
            <img
              v-if="primaryInfo.iconUrl"
              class="tree-icon"
              :src="primaryInfo.iconUrl"
              :alt="primaryInfo.name"
            />
            <div v-else class="tree-dot" :style="{ background: primaryInfo.color }" />
            <span class="tree-name">{{ primaryInfo.name }}</span>
            <span class="tree-type">主系</span>
          </div>
          <div class="perk-grid">
            <div
              v-for="(perkId, idx) in currentRune.primaryPerks"
              :key="perkId"
              class="perk-slot"
              :class="{ keystone: idx === 0 }"
            >
              <div class="perk-icon" :style="{ borderColor: primaryInfo.color }">
                <img
                  v-if="getPerkIconUrl(perkId)"
                  class="perk-img"
                  :src="getPerkIconUrl(perkId)"
                  :alt="String(perkId)"
                  @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
                />
                <span v-else class="perk-id">{{ perkId }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Secondary tree -->
        <div class="rune-tree secondary">
          <div class="tree-header">
            <img
              v-if="secondaryInfo.iconUrl"
              class="tree-icon"
              :src="secondaryInfo.iconUrl"
              :alt="secondaryInfo.name"
            />
            <div v-else class="tree-dot" :style="{ background: secondaryInfo.color }" />
            <span class="tree-name">{{ secondaryInfo.name }}</span>
            <span class="tree-type">副系</span>
          </div>
          <div class="perk-grid">
            <div
              v-for="perkId in currentRune.secondaryPerks"
              :key="perkId"
              class="perk-slot"
            >
              <div class="perk-icon" :style="{ borderColor: secondaryInfo.color }">
                <img
                  v-if="getPerkIconUrl(perkId)"
                  class="perk-img"
                  :src="getPerkIconUrl(perkId)"
                  :alt="String(perkId)"
                  @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
                />
                <span v-else class="perk-id">{{ perkId }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stat shards -->
      <div v-if="currentRune.statShards?.length" class="stat-shards">
        <span class="shards-label">属性碎片</span>
        <div class="shards-row">
          <div
            v-for="(shardId, idx) in currentRune.statShards"
            :key="idx"
            class="shard-slot"
          >
            <div class="shard-icon">
              <img
                v-if="getPerkIconUrl(shardId)"
                class="shard-img"
                :src="getPerkIconUrl(shardId)"
                :alt="String(shardId)"
                @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
              />
              <span v-else class="shard-id">{{ shardId }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Apply button -->
      <button
        class="apply-btn"
        :class="{
          applying: applying,
          success: applySuccess,
          error: !!applyError,
        }"
        :disabled="applying"
        @click="$emit('apply', currentRune)"
      >
        <svg v-if="applySuccess" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <svg v-else-if="applying" class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.22-8.56" />
        </svg>
        <span>{{ applyLabel }}</span>
      </button>

      <p v-if="applyError" class="apply-error">{{ applyError }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RuneBuild } from '@lol-assistant/shared';
import { getPerkIconUrl, getRuneTreeIconUrl } from '@lol-assistant/shared';

const RUNE_TREE_MAP: Record<number, { name: string; color: string }> = {
  8000: { name: '精密', color: '#c8aa6e' },
  8100: { name: '主宰', color: '#d44242' },
  8200: { name: '巫术', color: '#9faafc' },
  8300: { name: '启迪', color: '#49aab9' },
  8400: { name: '坚决', color: '#a1d586' },
};

const props = withDefaults(defineProps<{
  runeBuilds: RuneBuild[];
  selectedIndex?: number;
  applying?: boolean;
  applySuccess?: boolean;
  applyError?: string | null;
}>(), {
  selectedIndex: 0,
  applying: false,
  applySuccess: false,
  applyError: null,
});

defineEmits<{
  (e: 'select', index: number): void;
  (e: 'apply', rune: RuneBuild): void;
}>();

const currentRune = computed(() => {
  const idx = Math.min(props.selectedIndex, props.runeBuilds.length - 1);
  return props.runeBuilds[idx] ?? null;
});

const primaryInfo = computed(() => {
  if (!currentRune.value) return { name: '—', color: '#888', iconUrl: '' };
  const tree = RUNE_TREE_MAP[currentRune.value.primaryTree] ?? { name: `#${currentRune.value.primaryTree}`, color: '#888' };
  return { ...tree, iconUrl: getRuneTreeIconUrl(currentRune.value.primaryTree) };
});

const secondaryInfo = computed(() => {
  if (!currentRune.value) return { name: '—', color: '#888', iconUrl: '' };
  const tree = RUNE_TREE_MAP[currentRune.value.secondaryTree] ?? { name: `#${currentRune.value.secondaryTree}`, color: '#888' };
  return { ...tree, iconUrl: getRuneTreeIconUrl(currentRune.value.secondaryTree) };
});

const applyLabel = computed(() => {
  if (props.applySuccess) return '已应用';
  if (props.applying) return '应用中...';
  return '一键应用';
});

function formatPercent(v: number): string {
  if (!v) return '—';
  // 值大于1视为已经是百分比（如 52.3），否则视为小数（如 0.523）
  const pct = v > 1 ? v : v * 100;
  return `${pct.toFixed(1)}%`;
}

function formatSample(v: number): string {
  if (!v) return '—';
  if (v >= 10000) return `${(v / 10000).toFixed(1)}万`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}
</script>

<style scoped>
.rune-display {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
  overflow: hidden;
}

.rune-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border-light);
}

.section-title {
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  letter-spacing: -0.2px;
}

.rune-tabs {
  display: flex;
  gap: var(--space-1);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  padding: 2px;
}

.rune-tab {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.rune-tab:hover {
  color: var(--color-text-primary);
}

.rune-tab.active {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-xs);
}

.rune-empty {
  padding: var(--space-10) var(--space-5);
  text-align: center;
}

.empty-text {
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
}

/* Stats bar */
.rune-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-5);
  background: var(--color-bg-secondary);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-label {
  font-size: 10px;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}

.stat-value.win-rate {
  color: var(--color-win);
}

.stat-divider {
  width: 1px;
  height: 24px;
  background: var(--color-border);
}

/* Rune trees */
.rune-content {
  padding: var(--space-4) var(--space-5) var(--space-5);
}

.rune-trees {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  margin-top: var(--space-3);
}

.rune-tree {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.tree-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.tree-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.tree-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  object-fit: contain;
}

.tree-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.tree-type {
  font-size: 10px;
  color: var(--color-text-tertiary);
  margin-left: auto;
}

.perk-grid {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.perk-slot {
  position: relative;
}

.perk-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  border: 1.5px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color var(--transition-fast);
}

.keystone .perk-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  border-width: 2px;
}

.perk-id {
  font-size: 9px;
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
}

.perk-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}

.keystone .perk-id {
  font-size: 10px;
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
}

/* Stat shards */
.stat-shards {
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border-light);
}

.shards-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  display: block;
  margin-bottom: var(--space-2);
}

.shards-row {
  display: flex;
  gap: var(--space-2);
}

.shard-slot {
  position: relative;
}

.shard-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.shard-id {
  font-size: 8px;
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
}

.shard-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}

/* Apply button */
.apply-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding: var(--space-2) var(--space-4);
  height: 40px;
  border-radius: var(--radius-lg);
  border: none;
  background: var(--color-accent);
  color: #ffffff;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: all var(--transition-normal);
}

.apply-btn:hover:not(:disabled) {
  background: var(--color-accent-hover);
  transform: translateY(-0.5px);
  box-shadow: 0 2px 8px rgba(0, 113, 227, 0.25);
}

.apply-btn:active:not(:disabled) {
  background: var(--color-accent-active);
  transform: none;
  box-shadow: none;
}

.apply-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.apply-btn.success {
  background: var(--color-success);
}

.apply-btn.error {
  background: var(--color-error);
}

.apply-error {
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-error);
  text-align: center;
}

/* Spinner animation */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spin {
  animation: spin 0.8s linear infinite;
}
</style>
