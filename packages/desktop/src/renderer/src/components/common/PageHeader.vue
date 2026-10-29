<template>
  <header class="page-heading">
    <div class="page-heading-copy">
      <h1>{{ title }}</h1>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="page-heading-actions"><slot name="actions" /></div>
  </header>
</template>

<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>();
</script>

<style scoped>
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
  padding-block: 4px;
}
.page-heading-copy {
  min-width: 0;
}
h1 {
  color: var(--color-text-primary);
  font-size: var(--text-2xl);
  font-weight: 700;
  letter-spacing: -0.5px;
  line-height: 1.3;
  text-wrap: balance;
}
p {
  margin-top: 5px;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  line-height: 1.65;
}
.page-heading-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px 16px;
  min-width: 0;
}
@container workspace (max-width: 680px) {
  .page-heading {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }
  .page-heading-actions {
    justify-content: flex-start;
  }
}
</style>
