<template>
  <div v-if="hasData" class="spell-cooldowns glass-panel">
    <div class="cd-header">
      <span class="cd-title">技能冷却时间</span>
    </div>
    <div class="cd-content">
      <!-- 我方英雄 -->
      <div v-if="myChampSpells" class="cd-champ-row">
        <div class="cd-champ-label">
          <ChampionIcon :champion-id="myChampId" size="xs" />
          <span class="cd-champ-name my">我方</span>
        </div>
        <div class="cd-spells">
          <div v-for="(spell, idx) in myChampSpells" :key="idx" class="cd-spell">
            <span class="cd-spell-key">{{ SPELL_KEYS[idx] }}</span>
            <span class="cd-spell-cd">{{ spell.cooldownBurn }}s</span>
          </div>
        </div>
      </div>

      <!-- 对位敌方英雄（可能多个，如下路+辅助） -->
      <div v-for="(enemy, eIdx) in enemyEntries" :key="eIdx" class="cd-champ-row enemy">
        <div class="cd-champ-label">
          <ChampionIcon :champion-id="enemy.champId" size="xs" />
          <span class="cd-champ-name enemy">{{ enemy.label }}</span>
        </div>
        <div class="cd-spells">
          <div v-for="(spell, idx) in enemy.spells" :key="idx" class="cd-spell">
            <span class="cd-spell-key">{{ SPELL_KEYS[idx] }}</span>
            <span class="cd-spell-cd">{{ spell.cooldownBurn }}s</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { CHAMPION_ID_MAP } from '@lol-assistant/shared';
import { ChampionIcon } from '@/components/common';

interface SpellData {
  id: string;
  name: string;
  cooldownBurn: string;
  cooldown: number[];
}

interface EnemyEntry {
  champId: number;
  label: string;
  spells: SpellData[];
}

const SPELL_KEYS = ['Q', 'W', 'E', 'R'];

const props = withDefaults(
  defineProps<{
    myChampId: number;
    enemyChampIds?: number[];
    enemyLabels?: string[];
  }>(),
  {
    enemyChampIds: () => [],
    enemyLabels: () => [],
  },
);

const myChampSpells = ref<SpellData[] | null>(null);
const enemyEntries = ref<EnemyEntry[]>([]);

const hasData = computed(() => myChampSpells.value !== null || enemyEntries.value.length > 0);

async function fetchChampionSpells(championId: number): Promise<SpellData[] | null> {
  if (!championId) return null;
  try {
    const championKey = CHAMPION_ID_MAP[championId];
    if (!championKey) return null;

    const version = await window.electronAPI.getGameVersion();
    if (!version) return null;

    const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/zh_CN/champion/${championKey}.json`;
    const data = (await window.electronAPI.getMetadata(url, `champion_${championKey}`)) as Record<
      string,
      unknown
    > | null;
    if (!data || typeof data !== 'object') return null;

    const champData = (data.data as Record<string, Record<string, unknown>>)?.[championKey];
    if (!champData) return null;

    const spells = champData.spells as SpellData[] | undefined;
    if (!Array.isArray(spells) || spells.length < 4) return null;

    return spells.slice(0, 4).map((s) => ({
      id: s.id,
      name: s.name,
      cooldownBurn: s.cooldownBurn,
      cooldown: s.cooldown,
    }));
  } catch {
    return null;
  }
}

async function loadData() {
  // 获取我方英雄技能
  const myResult = await fetchChampionSpells(props.myChampId);
  myChampSpells.value = myResult;

  // 获取所有对位敌方英雄技能
  const entries: EnemyEntry[] = [];
  const ids = props.enemyChampIds;
  const labels = props.enemyLabels;

  const results = await Promise.allSettled(ids.map((id) => fetchChampionSpells(id)));

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled' && result.value) {
      entries.push({
        champId: ids[i],
        label: labels[i] ?? '对位',
        spells: result.value,
      });
    }
  }

  enemyEntries.value = entries;
}

onMounted(loadData);

watch(() => [props.myChampId, ...props.enemyChampIds], loadData);
</script>

<style scoped>
.spell-cooldowns {
  padding: var(--space-3) var(--space-4);
}

.cd-header {
  margin-bottom: var(--space-3);
}

.cd-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.cd-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.cd-champ-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.cd-champ-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 70px;
  flex-shrink: 0;
}

.cd-champ-name {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  white-space: nowrap;
}

.cd-champ-name.my {
  color: var(--color-win-text);
}

.cd-champ-name.enemy {
  color: var(--color-lose-text);
}

.cd-spells {
  display: flex;
  gap: var(--space-3);
  flex: 1;
}

.cd-spell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 48px;
  padding: var(--space-1) var(--space-2);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.cd-spell-key {
  font-size: 10px;
  font-weight: var(--font-bold);
  color: var(--color-text-tertiary);
  letter-spacing: 0.5px;
}

.cd-spell-cd {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}

.cd-content {
  overflow-x: auto;
}
.cd-champ-row {
  min-width: 370px;
}
</style>
