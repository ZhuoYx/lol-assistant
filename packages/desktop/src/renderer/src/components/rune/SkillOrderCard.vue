<template>
  <div class="skill-order-card glass-panel">
    <div class="skill-header">
      <h3 class="section-title">技能加点</h3>
      <span class="skill-hint">推荐顺序</span>
    </div>

    <div v-if="skillPriority.length === 0 && skillOrder.length === 0" class="skill-empty">
      <span class="empty-text">暂无技能数据</span>
    </div>

    <div v-else class="skill-content">
      <!-- Priority order: big visual display -->
      <div v-if="skillPriority.length > 0" class="skill-priority">
        <template v-for="(skill, idx) in skillPriority.slice(0, 3)" :key="idx">
          <div class="skill-badge" :class="skillColorClass(skill)">
            <span class="skill-letter">{{ skill }}</span>
            <span class="skill-rank">{{ idx === 0 ? '主' : idx === 1 ? '副' : '三' }}</span>
          </div>
          <svg
            v-if="idx < Math.min(skillPriority.length - 1, 2)"
            class="priority-arrow"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </template>
      </div>

      <!-- Full 1-18 level skill order table -->
      <div v-if="skillOrder.length > 0" class="skill-table-wrap">
        <div class="skill-table">
          <!-- Level header row -->
          <div class="table-row level-row">
            <div class="table-cell label-cell">Lv</div>
            <div v-for="lv in 18" :key="lv" class="table-cell level-cell">
              {{ lv }}
            </div>
          </div>
          <!-- Skill rows Q, W, E, R -->
          <div
            v-for="skillKey in ['Q', 'W', 'E', 'R']"
            :key="skillKey"
            class="table-row"
            :class="skillColorClass(skillKey)"
          >
            <div class="table-cell label-cell skill-label" :class="skillColorClass(skillKey)">
              {{ skillKey }}
            </div>
            <div
              v-for="lv in 18"
              :key="lv"
              class="table-cell"
              :class="{
                'active-cell': getSkillAtLevel(lv) === skillKey,
                [skillColorClass(skillKey)]: getSkillAtLevel(lv) === skillKey,
              }"
            >
              <span v-if="getSkillAtLevel(lv) === skillKey" class="cell-dot" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    skillOrder: string[];
    skillPriority: string[];
  }>(),
  {
    skillOrder: () => [],
    skillPriority: () => [],
  },
);

function skillColorClass(skill: string): string {
  switch (skill.toUpperCase()) {
    case 'Q':
      return 'skill-q';
    case 'W':
      return 'skill-w';
    case 'E':
      return 'skill-e';
    case 'R':
      return 'skill-r';
    default:
      return '';
  }
}

function getSkillAtLevel(level: number): string {
  if (level < 1 || level > props.skillOrder.length) return '';
  return (props.skillOrder[level - 1] ?? '').toUpperCase();
}
</script>

<style scoped>
.skill-order-card {
  overflow: hidden;
}

.skill-header {
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

.skill-hint {
  font-size: 10px;
  color: var(--color-text-placeholder);
  letter-spacing: 0.3px;
}

.skill-empty {
  padding: var(--space-8) var(--space-5);
  text-align: center;
}

.empty-text {
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
}

.skill-content {
  padding: var(--space-4) var(--space-5) var(--space-5);
}

/* Priority display */
.skill-priority {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.skill-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 56px;
  height: 60px;
  flex: 0 0 56px;
  padding: var(--space-2);
  border-radius: var(--radius-lg);
}

.skill-letter {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  font-family: var(--font-mono);
  line-height: 1;
}

.skill-rank {
  font-size: 9px;
  font-weight: var(--font-medium);
  opacity: 0.7;
}

.priority-arrow {
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

/* Skill colors for badges */
.skill-badge.skill-q {
  background-color: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}
.skill-badge.skill-w {
  background-color: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}
.skill-badge.skill-e {
  background-color: rgba(168, 85, 247, 0.1);
  color: #a855f7;
}
.skill-badge.skill-r {
  background-color: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

/* ─── Full skill order table ─── */
.skill-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.skill-table {
  display: grid;
  grid-template-columns: 32px repeat(18, minmax(26px, 1fr));
  gap: 1px;
  min-width: 0;
  background-color: var(--color-border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.table-row {
  display: contents;
}

.table-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  font-size: 10px;
  font-family: var(--font-mono);
  background-color: var(--color-bg-card);
  color: var(--color-text-tertiary);
  min-width: 0;
}

.label-cell {
  font-weight: var(--font-bold);
  font-size: 11px;
  background-color: var(--color-bg-secondary);
}

.level-cell {
  background-color: var(--color-bg-secondary);
  font-weight: var(--font-medium);
}

.skill-label {
  font-weight: var(--font-bold);
}

.skill-label.skill-q {
  color: #3b82f6;
}
.skill-label.skill-w {
  color: #22c55e;
}
.skill-label.skill-e {
  color: #a855f7;
}
.skill-label.skill-r {
  color: #f59e0b;
}

/* Active cell (skill point allocated at this level) */
.active-cell {
  position: relative;
}

.active-cell.skill-q {
  background-color: rgba(59, 130, 246, 0.12);
}
.active-cell.skill-w {
  background-color: rgba(34, 197, 94, 0.12);
}
.active-cell.skill-e {
  background-color: rgba(168, 85, 247, 0.12);
}
.active-cell.skill-r {
  background-color: rgba(245, 158, 11, 0.12);
}

.cell-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.active-cell.skill-q .cell-dot {
  background-color: #3b82f6;
}
.active-cell.skill-w .cell-dot {
  background-color: #22c55e;
}
.active-cell.skill-e .cell-dot {
  background-color: #a855f7;
}
.active-cell.skill-r .cell-dot {
  background-color: #f59e0b;
}
</style>
