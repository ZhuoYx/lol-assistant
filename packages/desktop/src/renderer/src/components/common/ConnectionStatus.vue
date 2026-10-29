<template>
  <div class="connection-status" :class="status">
    <span class="status-dot" />
    <span class="status-label">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ConnectionStatus as ConnectionStatusType } from '@lol-assistant/shared';

const props = defineProps<{
  status: ConnectionStatusType;
}>();

const label = computed(() => {
  switch (props.status) {
    case 'connected': return '已连接';
    case 'connecting': return '连接中...';
    default: return '未连接';
  }
});
</script>

<style scoped>
.connection-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.connected {
  background-color: rgba(48, 209, 88, 0.1);
  color: var(--color-success);
}

.connected .status-dot {
  background-color: var(--color-success);
  box-shadow: 0 0 6px rgba(48, 209, 88, 0.4);
}

.connecting {
  background-color: rgba(255, 159, 10, 0.1);
  color: var(--color-warning);
}

.connecting .status-dot {
  background-color: var(--color-warning);
  animation: pulse 1.5s ease infinite;
}

.disconnected {
  background-color: var(--color-bg-hover);
  color: var(--color-text-tertiary);
}

.disconnected .status-dot {
  background-color: var(--color-text-placeholder);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
