import { ipcMain, shell } from 'electron';
import { AramMayhemProvider, mayhemSourceUrl } from '../scraper/aram-mayhem';

const provider = new AramMayhemProvider();

export function registerAramMayhemIpcHandlers(): void {
  ipcMain.handle(
    'aram:getChampionRecommendations',
    (_event, championId: number, refresh?: boolean) =>
      provider.getChampion(championId, refresh === true),
  );
  ipcMain.handle('aram:openSource', (_event, url: string) =>
    shell.openExternal(mayhemSourceUrl(url)),
  );
}
