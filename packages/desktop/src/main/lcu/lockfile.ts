/**
 * Lockfile 解析模块
 * 动态路径检测 + 备选静态路径列表
 */
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';
import { detectLOLProcess } from '../utils/process';

/** Lockfile 数据 */
export interface LockfileData {
  /** 进程名（通常是 "LeagueClient"） */
  name: string;
  /** 客户端进程 ID */
  pid: number;
  /** LCU API 端口 */
  port: number;
  /** 认证密码 */
  password: string;
  /** 协议（通常是 "https"） */
  protocol: string;
}

/** LCU 连接凭证 */
export interface LCUCredentials {
  port: number;
  password: string;
  protocol: 'https';
}

/** 备选的 lockfile 静态路径列表（国际服 + 国服，含 LeagueClient 子目录） */
const LOCKFILE_FALLBACK_PATHS: string[] = (() => {
  const paths: string[] = [];
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    paths.push(path.resolve(localAppData, 'Riot Games/League of Legends/lockfile'));
  }
  const drives = ['C:', 'D:', 'E:', 'F:'];
  for (const d of drives) {
    paths.push(
      // 国际服
      path.resolve(`${d}/Riot Games/League of Legends/lockfile`),
      // 国服 — 根目录/lockfile
      path.resolve(`${d}/腾讯游戏/英雄联盟/lockfile`),
      path.resolve(`${d}/WeGame/games/英雄联盟/lockfile`),
      path.resolve(`${d}/英雄联盟/lockfile`),
      path.resolve(`${d}/LOL/lockfile`),
      path.resolve(`${d}/Program Files (x86)/英雄联盟/lockfile`),
      // 国服 — 根目录/LeagueClient/lockfile（典型国服子目录结构）
      path.resolve(`${d}/腾讯游戏/英雄联盟/LeagueClient/lockfile`),
      path.resolve(`${d}/WeGame/games/英雄联盟/LeagueClient/lockfile`),
      path.resolve(`${d}/英雄联盟/LeagueClient/lockfile`),
      path.resolve(`${d}/LOL/LeagueClient/lockfile`),
      path.resolve(`${d}/Program Files (x86)/英雄联盟/LeagueClient/lockfile`),
    );
  }
  return paths;
})();

/**
 * 解析 lockfile 内容
 * lockfile 格式: name:pid:port:password:protocol
 */
function parseLockfile(content: string): LockfileData | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(':');
  if (parts.length < 5) {
    logger.warn(`Lockfile 格式无效: ${trimmed}`);
    return null;
  }

  const [name, pidStr, portStr, password, protocol] = parts;

  const pid = parseInt(pidStr, 10);
  const port = parseInt(portStr, 10);

  if (isNaN(pid) || isNaN(port)) {
    logger.warn(`Lockfile 端口或 PID 无效: pid=${pidStr}, port=${portStr}`);
    return null;
  }

  return { name, pid, port, password, protocol };
}

/**
 * 通过进程命令行参数动态获取 lockfile 路径（首选方案）
 */
async function findLockfileByProcess(): Promise<string | null> {
  const processInfo = await detectLOLProcess();
  if (!processInfo) return null;

  const lockfilePath = path.join(processInfo.installDirectory, 'lockfile');
  try {
    await fs.access(lockfilePath);
    logger.info(`通过进程检测找到 lockfile: ${lockfilePath}`);
    return lockfilePath;
  } catch {
    logger.warn(`进程检测到安装路径但 lockfile 不存在: ${lockfilePath}`);
    return null;
  }
}

/**
 * 通过静态路径列表查找 lockfile（备选方案）
 */
async function findLockfileByStaticPaths(): Promise<string | null> {
  for (const fallbackPath of LOCKFILE_FALLBACK_PATHS) {
    try {
      await fs.access(fallbackPath);
      logger.info(`通过静态路径找到 lockfile: ${fallbackPath}`);
      return fallbackPath;
    } catch {
      // 该路径不存在，继续下一个
    }
  }
  return null;
}

/**
 * 通过手动指定路径查找 lockfile
 * 支持传入安装根目录（自动检查 LeagueClient 子目录）
 */
async function findLockfileByManualPath(manualPath: string): Promise<string | null> {
  // 支持传入安装目录或 lockfile 完整路径
  const candidates: string[] = [];

  if (manualPath.endsWith('lockfile')) {
    candidates.push(manualPath);
  } else {
    candidates.push(
      path.join(manualPath, 'lockfile'),
      path.join(manualPath, 'LeagueClient', 'lockfile'),
    );
  }

  for (const lockfilePath of candidates) {
    try {
      await fs.access(lockfilePath);
      logger.info(`通过手动路径找到 lockfile: ${lockfilePath}`);
      return lockfilePath;
    } catch {
      // continue
    }
  }

  logger.warn(`手动路径 lockfile 不存在: ${manualPath}`);
  return null;
}

/**
 * 查找并读取 lockfile
 * 优先级: 手动路径 > 进程检测 > 静态路径
 */
export async function readLockfile(manualPath?: string): Promise<LockfileData | null> {
  let lockfilePath: string | null = null;

  // 1. 手动路径
  if (manualPath) {
    lockfilePath = await findLockfileByManualPath(manualPath);
  }

  // 2. 进程检测
  if (!lockfilePath) {
    lockfilePath = await findLockfileByProcess();
  }

  // 3. 静态路径列表
  if (!lockfilePath) {
    lockfilePath = await findLockfileByStaticPaths();
  }

  if (!lockfilePath) {
    logger.warn('未找到 lockfile');
    return null;
  }

  try {
    const content = await fs.readFile(lockfilePath, 'utf-8');
    const data = parseLockfile(content);
    if (data) {
      logger.info(`Lockfile 解析成功: port=${data.port}, pid=${data.pid}`);
    }
    return data;
  } catch (err) {
    logger.error('读取 lockfile 失败:', err);
    return null;
  }
}

/**
 * 从 lockfile 数据提取 LCU 连接凭证
 */
export function extractCredentials(lockfileData: LockfileData): LCUCredentials {
  return {
    port: lockfileData.port,
    password: lockfileData.password,
    protocol: 'https',
  };
}
