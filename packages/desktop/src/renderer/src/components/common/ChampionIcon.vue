<template>
  <div class="champion-icon" :class="size" :title="name || undefined">
    <img
      v-if="iconUrl && !imgError"
      class="icon-img"
      v-cached-src="iconUrl"
      :alt="name || ''"
      loading="lazy"
      @error="imgError = true"
    />
    <div v-else class="icon-placeholder">
      <span class="icon-letter">{{ initial }}</span>
    </div>
    <span v-if="showName && name" class="champion-name">{{ name }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const CDRAGON_BASE = 'https://raw.communitydragon.org';

const props = withDefaults(
  defineProps<{
    championId: number;
    name?: string;
    showName?: boolean;
    size?: 'xs' | 'sm' | 'md' | 'lg';
  }>(),
  {
    showName: false,
    size: 'md',
  },
);

const imgError = ref(false);

// 当 championId 改变时重置错误状态
watch(
  () => props.championId,
  () => {
    imgError.value = false;
  },
);

const iconUrl = computed(() => {
  if (!props.championId || props.championId <= 0) return '';
  return `${CDRAGON_BASE}/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${props.championId}.png`;
});

const initial = computed(() => {
  if (props.name) return props.name.charAt(0);
  return '#';
});
</script>

<style scoped>
.champion-icon {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.icon-img {
  object-fit: cover;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.icon-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--color-bg-tertiary), var(--color-bg-secondary));
  color: var(--color-text-secondary);
  font-weight: var(--font-bold);
  flex-shrink: 0;
}

.xs .icon-img,
.xs .icon-placeholder {
  width: 24px;
  height: 24px;
  font-size: 10px;
  border-radius: var(--radius-sm);
}
.sm .icon-img,
.sm .icon-placeholder {
  width: 32px;
  height: 32px;
  font-size: var(--text-xs);
}
.md .icon-img,
.md .icon-placeholder {
  width: 40px;
  height: 40px;
  font-size: var(--text-sm);
}
.lg .icon-img,
.lg .icon-placeholder {
  width: 52px;
  height: 52px;
  font-size: var(--text-lg);
}

.icon-letter {
  text-transform: uppercase;
}

.champion-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
