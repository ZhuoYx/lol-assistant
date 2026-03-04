<template>
  <div class="tier-icon" :class="[tierClass, size]">
    <span class="tier-text">{{ tierLabel }}</span>
    <span v-if="showDivision && division" class="tier-division">{{ division }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  tier: string;
  division?: string;
  showDivision?: boolean;
  size?: 'sm' | 'md' | 'lg';
}>(), {
  showDivision: true,
  size: 'md',
});

const tierClass = computed(() => `tier-${props.tier.toLowerCase()}`);

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
    UNRANKED: '未定级',
  };
  return map[props.tier.toUpperCase()] ?? props.tier;
});
</script>

<style scoped>
.tier-icon {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-weight: var(--font-semibold);
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.sm {
  font-size: var(--text-xs);
  padding: 1px var(--space-1);
}

.md {
  font-size: var(--text-sm);
  padding: 2px var(--space-2);
}

.lg {
  font-size: var(--text-base);
  padding: var(--space-1) var(--space-2);
}

.tier-division {
  font-weight: var(--font-medium);
  opacity: 0.8;
}

.tier-iron { color: var(--color-tier-iron); background: rgba(107, 107, 107, 0.1); }
.tier-bronze { color: var(--color-tier-bronze); background: rgba(139, 105, 20, 0.1); }
.tier-silver { color: var(--color-tier-silver); background: rgba(123, 138, 142, 0.1); }
.tier-gold { color: var(--color-tier-gold); background: rgba(200, 155, 60, 0.1); }
.tier-platinum { color: var(--color-tier-platinum); background: rgba(34, 163, 139, 0.1); }
.tier-emerald { color: var(--color-tier-emerald); background: rgba(27, 168, 143, 0.1); }
.tier-diamond { color: var(--color-tier-diamond); background: rgba(87, 108, 206, 0.1); }
.tier-master { color: var(--color-tier-master); background: rgba(155, 89, 182, 0.1); }
.tier-grandmaster { color: var(--color-tier-grandmaster); background: rgba(231, 76, 60, 0.1); }
.tier-challenger { color: var(--color-tier-challenger); background: rgba(241, 196, 15, 0.1); }
.tier-unranked { color: var(--color-text-tertiary); background: var(--color-bg-hover); }
</style>
