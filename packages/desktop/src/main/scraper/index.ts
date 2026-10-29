/** Source-specific recommendation providers. Never fabricate stats or silently change source. */
import type { IChampionDataScraper, ChampionDataSource, ChampionTier, ChampionBuilds, ChampionCounters, ChampionRankingList, ScraperDataVersion, AramChampionTier } from '@lol-assistant/shared';
import { OPGGScraper } from './opgg';
import { QQ101Scraper } from './qq101';
import { ScraperStorage } from './storage';
import { ScraperScheduler } from './scheduler';
import { cacheStore } from '../cache/store';

export class ScraperManager implements IChampionDataScraper {
  private providers = { opgg: new OPGGScraper(), qq101: new QQ101Scraper() };
  private storages = { opgg: new ScraperStorage('opgg'), qq101: new ScraperStorage('qq101') };
  private schedulers = {
    opgg: new ScraperScheduler(this.providers.opgg, this.storages.opgg),
    qq101: new ScraperScheduler(this.providers.qq101, this.storages.qq101),
  };
  private source: ChampionDataSource = cacheStore.getSetting<ChampionDataSource>('championDataSource', 'opgg') === 'qq101' ? 'qq101' : 'opgg';

  getSource(): ChampionDataSource { return this.source; }
  setSource(source: ChampionDataSource): void {
    if (source !== 'opgg' && source !== 'qq101') throw new Error('不支持的数据来源');
    this.source = source;
    cacheStore.setSetting('championDataSource', source);
  }
  getStorage(): ScraperStorage { return this.storages[this.source]; }
  getScheduler(): ScraperScheduler { return this.schedulers[this.source]; }
  async getDataVersion(): Promise<ScraperDataVersion | null> { return this.getStorage().getDataVersion(); }
  async getAramTierList(): Promise<AramChampionTier[]> {
    // These adapters currently expose ranked data only; do not substitute ranked tiers for ARAM.
    return [];
  }
  async getChampionTierList(queue: 'ranked_solo' | 'ranked_flex'): Promise<ChampionTier[]> {
    const source = this.source;
    const storage = this.storages[source];
    const cached = await storage.getTierList(queue);
    if (cached) return cached;
    const result = await this.providers[source].getChampionTierList(queue);
    await storage.saveTierList(queue, result);
    return result;
  }
  async getChampionBuilds(championId: number, role?: string): Promise<ChampionBuilds> {
    const source = this.source;
    const storage = this.storages[source];
    const cached = role ? await storage.getChampionBuilds(championId, role) : null;
    if (cached?.dataSource === source && cached.availableRoles?.length) return cached;
    const result = await this.providers[source].getChampionBuilds(championId, role);
    await storage.saveChampionBuilds(result);
    await storage.saveDataVersion({ patch: result.patch, source, lastUpdated: Date.now() });
    return result;
  }
  async getChampionCounters(championId: number, role?: string): Promise<ChampionCounters> {
    const source = this.source;
    const storage = this.storages[source];
    const cached = role ? await storage.getChampionCounters(championId, role) : null;
    if (cached?.dataSource === source) return cached;
    const result = { ...await this.providers[source].getChampionCounters(championId, role), dataSource: source };
    await storage.saveChampionCounters(result);
    return result;
  }
  async getChampionRankings(position?: string, tier?: string): Promise<ChampionRankingList> {
    const source = this.source;
    const result = await this.providers[source].getChampionRankings(position, tier);
    await this.storages[source].saveDataVersion({ patch: result.patch, source, lastUpdated: Date.now() });
    return result;
  }
  async triggerUpdate(patch: string, championIds: number[], force = false): Promise<void> {
    if (!championIds.length) {
      const source = this.source;
      const result = await this.providers[source].getChampionRankings();
      await this.storages[source].clearAll();
      await this.storages[source].saveDataVersion({ patch: result.patch, source, lastUpdated: Date.now() });
      return;
    }
    return this.getScheduler().triggerFullUpdate(patch, championIds, force);
  }
  cancelUpdate(): void { Object.values(this.schedulers).forEach(s => s.cancel()); }
  async clearData(): Promise<void> { await Promise.all(Object.values(this.storages).map(s => s.clearAll())); }
  async clearChampionCache(championId: number): Promise<void> { await this.getStorage().clearChampionData(championId); }
  destroy(): void { Object.values(this.schedulers).forEach(s => s.destroy()); }
}
export { OPGGScraper } from './opgg';
export { ScraperStorage } from './storage';
export { ScraperScheduler } from './scheduler';
export type { SchedulerStatus, UpdateProgress } from './scheduler';
