<template>
  <div v-if="hasData" class="spell-cooldowns">
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

      <!-- 对位敌方英雄 -->
      <div v-if="enemyChampSpells" class="cd-champ-row enemy">
        <div class="cd-champ-label">
          <ChampionIcon :champion-id="enemyChampId" size="xs" />
          <span class="cd-champ-name enemy">对位</span>
        </div>
        <div class="cd-spells">
          <div v-for="(spell, idx) in enemyChampSpells" :key="idx" class="cd-spell">
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

const SPELL_KEYS = ['Q', 'W', 'E', 'R'];

const props = defineProps<{
  myChampId: number;
  enemyChampId: number;
}>();

const myChampSpells = ref<SpellData[] | null>(null);
const enemyChampSpells = ref<SpellData[] | null>(null);

const hasData = computed(() => myChampSpells.value !== null || enemyChampSpells.value !== null);

async function fetchChampionSpells(championId: number): Promise<SpellData[] | null> {
  if (!championId) return null;
  try {
    const championKey = CHAMPION_ID_MAP[championId];
    if (!championKey) return null;

    const version = await window.electronAPI.getGameVersion();
    if (!version) return null;

    const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/zh_CN/champion/${championKey}.json`;
    const data = await window.electronAPI.getMetadata(url, `champion_${championKey}`) as Record<string, unknown> | null;
    if (!data || typeof data !== 'object') return null;

    const champData = (data.data as Record<string, Record<string, unknown>>)?.[championKey];
    if (!champData) return null;

    const spells = champData.spells as SpellData[] | undefined;
    if (!Array.isArray(spells) || spells.length < 4) return null;

    return spells.slice(0, 4).map(s => ({
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
  const [my, enemy] = await Promise.allSettled([
    fetchChampionSpells(props.myChampId),
    fetchChampionSpells(props.enemyChampId),
  ]);
  myChampSpells.value = my.status === 'fulfilled' ? my.value : null;
  enemyChampSpells.value = enemy.status === 'fulfilled' ? enemy.value : null;
}

onMounted(loadData);

watch(() => [props.myChampId, props.enemyChampId], loadData);
</script>

<style scoped>
.spell-cooldowns {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
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
  color: var(--color-win);
}

.cd-champ-name.enemy {
  color: var(--color-lose);
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
  background: var(--color-bg-secondary);
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
</style>
