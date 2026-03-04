<template>
  <div class="rank-card card" :class="[tierThemeClass]">
    <!-- Top accent stripe -->
    <div class="rank-accent-stripe" />

    <div class="rank-header">
      <h3 class="rank-title">{{ title }}</h3>
      <div v-if="loading" class="rank-loading-dot" />
    </div>

    <div v-if="queue && hasTier" class="rank-body">
      <div class="rank-icon-area">
        <div class="rank-icon-glow" />
        <img
          v-if="tierIconSrc"
          class="rank-tier-img"
          :src="tierIconSrc"
          :alt="tierLabel"
          @error="iconError = true"
        />
        <div v-else class="rank-tier-placeholder">
          <span>{{ tierLabel.charAt(0) }}</span>
        </div>
      </div>

      <div class="rank-detail">
        <div class="rank-tier-row">
          <span class="rank-tier-name">{{ tierLabel }}</span>
          <span v-if="queue.division && queue.division !== 'NA'" class="rank-division">{{ queue.division }}</span>
        </div>

        <div class="rank-lp-row">
          <span class="rank-lp">{{ queue.leaguePoints }}</span>
          <span class="lp-label">LP</span>
        </div>

        <!-- LP Progress Bar -->
        <div class="lp-progress-bar">
          <div class="lp-progress-fill" :style="{ width: lpProgress + '%' }" />
        </div>

        <div class="rank-record-row">
          <span class="wins">{{ queue.wins }}胜</span>
          <span class="losses">{{ queue.losses }}负</span>
          <span class="winrate-divider">&middot;</span>
          <span class="winrate" :class="winRateColorClass">{{ winRateText }}</span>
        </div>
      </div>

      <!-- Mini Series -->
      <div v-if="queue.miniSeries" class="mini-series">
        <span class="series-label">晋级赛</span>
        <div class="series-dots">
          <span
            v-for="(ch, idx) in queue.miniSeries.progress.split('')"
            :key="idx"
            class="series-dot"
            :class="{ win: ch === 'W', loss: ch === 'L', pending: ch === 'N' }"
          />
        </div>
      </div>
    </div>

    <div v-else class="rank-empty">
      <div class="empty-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.25">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </div>
      <span class="empty-text">未定级</span>
    </div>

    <!-- Decorative glow overlay -->
    <div class="rank-glow-overlay" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { QueueInfo } from '@lol-assistant/shared';
import { calculateWinRate, formatPercent, getTierIconUrl } from '@lol-assistant/shared';

const props = withDefaults(defineProps<{
  title: string;
  queue: QueueInfo | null | undefined;
  loading?: boolean;
}>(), {
  loading: false,
});

const iconError = ref(false);

// 当段位变化时重置 iconError
watch(() => props.queue?.tier, () => {
  iconError.value = false;
});

const hasTier = computed(() => {
  if (!props.queue) return false;
  return props.queue.tier && props.queue.tier !== '' && props.queue.tier !== 'NONE';
});

const tierLabel = computed(() => {
  const map: Record<string, string> = {
    IRON: '坚韧黑铁',
    BRONZE: '英勇黄铜',
    SILVER: '不屈白银',
    GOLD: '荣耀黄金',
    PLATINUM: '华贵铂金',
    EMERALD: '流光翡翠',
    DIAMOND: '璀璨钻石',
    MASTER: '超凡大师',
    GRANDMASTER: '傲世宗师',
    CHALLENGER: '最强王者',
  };
  if (!props.queue) return '未定级';
  return map[props.queue.tier.toUpperCase()] ?? props.queue.tier;
});

const tierThemeClass = computed(() => {
  if (!props.queue || !hasTier.value) return 'tier-unranked';
  return `tier-${props.queue.tier.toLowerCase()}`;
});

const tierIconSrc = computed(() => {
  if (!props.queue || !hasTier.value || iconError.value) return '';
  return getTierIconUrl(props.queue.tier);
});

const lpProgress = computed(() => {
  if (!props.queue) return 0;
  // Master+ 不显示进度（LP 无上限），其他段位 0-100
  const tier = props.queue.tier.toUpperCase();
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier)) return 100;
  return Math.min(100, Math.max(0, props.queue.leaguePoints));
});

const winRate = computed(() => {
  if (!props.queue) return 0;
  const total = props.queue.wins + props.queue.losses;
  return calculateWinRate(props.queue.wins, total);
});

const winRateText = computed(() => formatPercent(winRate.value));

const winRateColorClass = computed(() => {
  if (winRate.value >= 0.6) return 'high';
  if (winRate.value <= 0.4) return 'low';
  return '';
});
</script>

<style scoped>
.rank-card {
  position: relative;
  overflow: hidden;
  transition: box-shadow var(--transition-normal), border-color var(--transition-normal);
}

/* ── Top accent stripe ── */
.rank-accent-stripe {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  opacity: 0.9;
}

.tier-iron .rank-accent-stripe { background: linear-gradient(90deg, #6b6b6b, #9a9a9a, #6b6b6b); }
.tier-bronze .rank-accent-stripe { background: linear-gradient(90deg, #8b6914, #c49b3c, #8b6914); }
.tier-silver .rank-accent-stripe { background: linear-gradient(90deg, #7b8a8e, #c0d0d4, #7b8a8e); }
.tier-gold .rank-accent-stripe { background: linear-gradient(90deg, #c89b3c, #ffd700, #c89b3c); }
.tier-platinum .rank-accent-stripe { background: linear-gradient(90deg, #22a38b, #4ce8c5, #22a38b); }
.tier-emerald .rank-accent-stripe { background: linear-gradient(90deg, #1ba88f, #3ef0c0, #1ba88f); }
.tier-diamond .rank-accent-stripe { background: linear-gradient(90deg, #576cce, #9aa8ff, #576cce); }
.tier-master .rank-accent-stripe { background: linear-gradient(90deg, #9b59b6, #d4a0e8, #9b59b6); }
.tier-grandmaster .rank-accent-stripe { background: linear-gradient(90deg, #e74c3c, #ff8a7a, #e74c3c); }
.tier-challenger .rank-accent-stripe { background: linear-gradient(90deg, #f1c40f, #fff4a3, #f1c40f); }
.tier-unranked .rank-accent-stripe { background: var(--color-border-light); }

/* ── Decorative glow overlay ── */
.rank-glow-overlay {
  position: absolute;
  top: 0;
  right: 0;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  transform: translate(30%, -30%);
  transition: opacity var(--transition-normal);
}

.rank-card:hover .rank-glow-overlay {
  opacity: 1;
}

.tier-iron .rank-glow-overlay { background: radial-gradient(circle, rgba(138,138,138,0.06), transparent 70%); }
.tier-bronze .rank-glow-overlay { background: radial-gradient(circle, rgba(181,137,58,0.08), transparent 70%); }
.tier-silver .rank-glow-overlay { background: radial-gradient(circle, rgba(168,184,188,0.08), transparent 70%); }
.tier-gold .rank-glow-overlay { background: radial-gradient(circle, rgba(232,194,82,0.10), transparent 70%); }
.tier-platinum .rank-glow-overlay { background: radial-gradient(circle, rgba(54,209,176,0.08), transparent 70%); }
.tier-emerald .rank-glow-overlay { background: radial-gradient(circle, rgba(46,216,176,0.08), transparent 70%); }
.tier-diamond .rank-glow-overlay { background: radial-gradient(circle, rgba(123,143,240,0.10), transparent 70%); }
.tier-master .rank-glow-overlay { background: radial-gradient(circle, rgba(194,124,222,0.10), transparent 70%); }
.tier-grandmaster .rank-glow-overlay { background: radial-gradient(circle, rgba(255,107,90,0.10), transparent 70%); }
.tier-challenger .rank-glow-overlay { background: radial-gradient(circle, rgba(255,224,102,0.12), transparent 70%); }

/* ── Static subtle background glow ── */
.rank-card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  opacity: 0.04;
  pointer-events: none;
  transform: translate(30%, -30%);
}

.tier-iron::after { background: radial-gradient(circle, #8a8a8a, transparent 70%); }
.tier-bronze::after { background: radial-gradient(circle, #b5893a, transparent 70%); }
.tier-silver::after { background: radial-gradient(circle, #a8b8bc, transparent 70%); }
.tier-gold::after { background: radial-gradient(circle, #e8c252, transparent 70%); opacity: 0.06; }
.tier-platinum::after { background: radial-gradient(circle, #36d1b0, transparent 70%); opacity: 0.05; }
.tier-emerald::after { background: radial-gradient(circle, #2ed8b0, transparent 70%); opacity: 0.05; }
.tier-diamond::after { background: radial-gradient(circle, #7b8ff0, transparent 70%); opacity: 0.06; }
.tier-master::after { background: radial-gradient(circle, #c27cde, transparent 70%); opacity: 0.06; }
.tier-grandmaster::after { background: radial-gradient(circle, #ff6b5a, transparent 70%); opacity: 0.06; }
.tier-challenger::after { background: radial-gradient(circle, #ffe066, transparent 70%); opacity: 0.08; }

/* ── Header ── */
.rank-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
  position: relative;
  z-index: 1;
}

.rank-title {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.rank-loading-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  animation: pulse 1.5s ease infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* ── Body ── */
.rank-body {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  position: relative;
  z-index: 1;
}

/* ── Tier Icon ── */
.rank-icon-area {
  flex-shrink: 0;
  position: relative;
}

.rank-icon-glow {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  opacity: 0;
  transition: opacity var(--transition-normal);
  pointer-events: none;
}

.rank-card:hover .rank-icon-glow {
  opacity: 1;
}

.tier-iron .rank-icon-glow { background: radial-gradient(circle, rgba(138,138,138,0.15), transparent 70%); }
.tier-bronze .rank-icon-glow { background: radial-gradient(circle, rgba(181,137,58,0.15), transparent 70%); }
.tier-silver .rank-icon-glow { background: radial-gradient(circle, rgba(168,184,188,0.15), transparent 70%); }
.tier-gold .rank-icon-glow { background: radial-gradient(circle, rgba(255,215,0,0.2), transparent 70%); }
.tier-platinum .rank-icon-glow { background: radial-gradient(circle, rgba(54,209,176,0.18), transparent 70%); }
.tier-emerald .rank-icon-glow { background: radial-gradient(circle, rgba(46,216,176,0.18), transparent 70%); }
.tier-diamond .rank-icon-glow { background: radial-gradient(circle, rgba(123,143,240,0.2), transparent 70%); }
.tier-master .rank-icon-glow { background: radial-gradient(circle, rgba(194,124,222,0.2), transparent 70%); }
.tier-grandmaster .rank-icon-glow { background: radial-gradient(circle, rgba(255,107,90,0.2), transparent 70%); }
.tier-challenger .rank-icon-glow { background: radial-gradient(circle, rgba(255,224,102,0.25), transparent 70%); }

.rank-tier-img {
  width: 64px;
  height: 64px;
  object-fit: contain;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.2));
  transition: transform var(--transition-normal);
  position: relative;
  z-index: 1;
}

.rank-card:hover .rank-tier-img {
  transform: scale(1.05);
}

.rank-tier-placeholder {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-text-placeholder);
}

/* ── Detail ── */
.rank-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.rank-tier-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
}

.rank-tier-name {
  font-size: var(--text-md);
  font-weight: var(--font-bold);
  letter-spacing: 0.3px;
}

/* ── Tier-specific text colors ── */
.tier-iron .rank-tier-name { color: #8a8a8a; }
.tier-bronze .rank-tier-name { color: #c49b3c; }
.tier-silver .rank-tier-name { color: #a0b0b4; }
.tier-gold .rank-tier-name { color: #daa520; }
.tier-platinum .rank-tier-name { color: #2ec4a0; }
.tier-emerald .rank-tier-name { color: #22c99c; }
.tier-diamond .rank-tier-name { color: #6b80e0; }
.tier-master .rank-tier-name { color: #b370d0; }
.tier-grandmaster .rank-tier-name { color: #f06050; }
.tier-challenger .rank-tier-name { color: #e8b418; }

.rank-division {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
}

.rank-lp-row {
  display: flex;
  align-items: baseline;
  gap: 3px;
}

.rank-lp {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  line-height: 1;
}

.lp-label {
  font-size: 10px;
  font-weight: var(--font-medium);
  color: var(--color-text-placeholder);
  text-transform: uppercase;
}

/* ── LP Progress Bar ── */
.lp-progress-bar {
  height: 3px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin: 2px 0;
}

.lp-progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--transition-slow);
}

.tier-iron .lp-progress-fill { background: linear-gradient(90deg, #6b6b6b, #9a9a9a); }
.tier-bronze .lp-progress-fill { background: linear-gradient(90deg, #8b6914, #c49b3c); }
.tier-silver .lp-progress-fill { background: linear-gradient(90deg, #7b8a8e, #c0d0d4); }
.tier-gold .lp-progress-fill { background: linear-gradient(90deg, #c89b3c, #ffd700); }
.tier-platinum .lp-progress-fill { background: linear-gradient(90deg, #22a38b, #4ce8c5); }
.tier-emerald .lp-progress-fill { background: linear-gradient(90deg, #1ba88f, #3ef0c0); }
.tier-diamond .lp-progress-fill { background: linear-gradient(90deg, #576cce, #9aa8ff); }
.tier-master .lp-progress-fill { background: linear-gradient(90deg, #9b59b6, #d4a0e8); }
.tier-grandmaster .lp-progress-fill { background: linear-gradient(90deg, #e74c3c, #ff8a7a); }
.tier-challenger .lp-progress-fill { background: linear-gradient(90deg, #f1c40f, #fff4a3); }

/* ── Record Row ── */
.rank-record-row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
}

.wins { color: var(--color-win); font-weight: var(--font-medium); }
.losses { color: var(--color-lose); font-weight: var(--font-medium); }
.winrate-divider { color: var(--color-text-placeholder); }
.winrate { color: var(--color-text-tertiary); }
.winrate.high { color: var(--color-win); font-weight: var(--font-semibold); }
.winrate.low { color: var(--color-lose); font-weight: var(--font-semibold); }

/* ── Mini Series ── */
.mini-series {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding-left: var(--space-4);
  border-left: 1px solid var(--color-divider);
  margin-left: auto;
  position: relative;
  z-index: 1;
}

.series-label {
  font-size: 10px;
  color: var(--color-text-placeholder);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.series-dots {
  display: flex;
  gap: var(--space-1);
}

.series-dot {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  transition: transform var(--transition-fast);
}

.series-dot:hover {
  transform: scale(1.15);
}

.series-dot.win { background: var(--color-win); box-shadow: 0 0 6px rgba(52,199,89,0.3); }
.series-dot.loss { background: var(--color-lose); box-shadow: 0 0 6px rgba(255,59,48,0.3); }
.series-dot.pending { background: var(--color-bg-tertiary); border: 1.5px solid var(--color-border); }

/* ── Empty State ── */
.rank-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-6) 0;
  gap: var(--space-2);
  position: relative;
  z-index: 1;
}

.empty-icon {
  color: var(--color-text-placeholder);
}

.empty-text {
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
}
</style>
