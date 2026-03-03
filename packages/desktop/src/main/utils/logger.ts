/**
 * 日志模块
 * 基于 electron-log 封装，日志按日切割，保留 7 天
 */
import log from 'electron-log';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

/** 日志保留天数 */
const LOG_RETENTION_DAYS = 7;

/**
 * 初始化日志配置
 */
function initLogger(): typeof log {
  // 配置日志文件路径和格式
  log.transports.file.level = 'info';
  log.transports.console.level = 'debug';

  // 日志格式
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
  log.transports.console.format = '[{h}:{i}:{s}.{ms}] [{level}] {text}';

  // 日志文件大小限制（单个文件 5MB）
  log.transports.file.maxSize = 5 * 1024 * 1024;

  // 日志文件名按日期命名
  log.transports.file.fileName = `${getDateString()}.log`;

  return log;
}

/**
 * 获取日期字符串 (YYYY-MM-DD)
 */
function getDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 清理过期日志文件
 */
export function cleanupOldLogs(): void {
  try {
    const logDir = getLogDirectory();
    if (!fs.existsSync(logDir)) return;

    const files = fs.readdirSync(logDir);
    const now = Date.now();
    const maxAge = LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (!file.endsWith('.log')) continue;

      const filePath = path.join(logDir, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          log.info(`已清理过期日志: ${file}`);
        }
      } catch {
        // 忽略单个文件清理失败
      }
    }
  } catch (err) {
    log.warn('清理过期日志失败:', err);
  }
}

/**
 * 获取日志目录路径
 */
export function getLogDirectory(): string {
  return path.dirname(log.transports.file.getFile().path);
}

/**
 * 导出日志文件路径（供设置页使用）
 */
export function exportLogPath(): string {
  try {
    const logDir = getLogDirectory();
    // 返回最新的日志文件路径
    const currentLog = path.join(logDir, `${getDateString()}.log`);
    if (fs.existsSync(currentLog)) {
      return currentLog;
    }
    // 如果当天日志不存在，返回日志目录
    return logDir;
  } catch {
    return app.getPath('logs');
  }
}

/** 日志实例 */
export const logger = initLogger();
