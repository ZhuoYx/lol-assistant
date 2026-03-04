/**
 * 符文页 IPC 处理器
 * 支持获取符文页列表、创建/应用符文页、删除符文页
 */
import { ipcMain } from 'electron';
import { lcuAPI } from '../lcu/api';
import { logger } from '../utils/logger';

/** LCU 符文页数据结构 */
interface LCURunePage {
  id: number;
  name: string;
  isActive: boolean;
  isEditable: boolean;
  isDeletable: boolean;
  primaryStyleId: number;
  subStyleId: number;
  selectedPerkIds: number[];
  current: boolean;
}

export function registerPerksIpcHandlers(): void {
  // 获取符文页列表
  ipcMain.handle('perks:getPages', async () => {
    try {
      return await lcuAPI.getPerksPages();
    } catch (err) {
      logger.error('IPC perks:getPages 失败:', err);
      throw err;
    }
  });

  // 应用符文页（删除旧的可编辑页 + 创建新页）
  ipcMain.handle(
    'perks:apply',
    async (
      _event,
      pageData: {
        name: string;
        primaryStyleId: number;
        subStyleId: number;
        selectedPerkIds: number[];
      },
    ) => {
      try {
        // 获取当前所有符文页
        const pages = (await lcuAPI.getPerksPages()) as LCURunePage[];

        // 找到一个可删除的自定义页来替换
        const deletablePage = pages.find((p) => p.isDeletable && p.isEditable);
        if (deletablePage) {
          try {
            await lcuAPI.deletePerksPage(deletablePage.id);
          } catch {
            logger.warn(`删除旧符文页 ${deletablePage.id} 失败，尝试直接创建`);
          }
        }

        // 创建新符文页
        const result = await lcuAPI.createPerksPage({
          name: pageData.name,
          primaryStyleId: pageData.primaryStyleId,
          subStyleId: pageData.subStyleId,
          selectedPerkIds: pageData.selectedPerkIds,
        });

        logger.info(`符文页已应用: ${pageData.name}`);
        return result;
      } catch (err) {
        logger.error('IPC perks:apply 失败:', err);
        throw err;
      }
    },
  );

  // 删除指定符文页
  ipcMain.handle('perks:delete', async (_event, pageId: number) => {
    try {
      await lcuAPI.deletePerksPage(pageId);
      logger.info(`符文页已删除: ${pageId}`);
    } catch (err) {
      logger.error(`IPC perks:delete 失败 (pageId=${pageId}):`, err);
      throw err;
    }
  });
}
