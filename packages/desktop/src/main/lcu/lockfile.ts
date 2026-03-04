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

/** 备选的 lockfile 静态路径列表（含 LeagueClient 子目录） */
const LOCKFILE_FALLBACK_PATHS: string[] = (() => {
  const paths: string[] = [];
  const drives = ['C:', 'D:', 'E:', 'F:'];
  for (const d of drives) {
    paths.push(
      path.resolve(`${d}/腾讯游戏/英雄联盟/lockfile`),
      path.resolve(`${d}/WeGame/games/英雄联盟/lockfile`),
      path.resolve(`${d}/英雄联盟/lockfile`),
      path.resolve(`${d}/LOL/lockfile`),
      path.resolve(`${d}/Program Files (x86)/英雄联盟/lockfile`),
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
 * 当 lockfile 为空时（国服常见），自动从进程命令行参数获取凭证
 * （需要应用以管理员身份运行才能读取其他进程的命令行参数）
 */
export async function readLockfile(manualPath?: string): Promise<LockfileData | null> {
  let lockfilePath: string | null = null;

  // 先通过进程检测获取信息（可能包含命令行凭证）
  const processInfo = await detectLOLProcess();

  if (processInfo) {
    logger.info(`进程检测结果: pid=${processInfo.pid}, appPort=${processInfo.appPort ?? 'N/A'}, authToken=${processInfo.authToken ? '***' + processInfo.authToken.slice(-4) : 'N/A'}, dir=${processInfo.installDirectory}`);
  }

  // 优先使用进程命令行参数中的凭证（最可靠，一定是当前运行进程的真实凭证）
  // 需要应用以管理员身份运行，Get-CimInstance 才能获取到 --app-port / --remoting-auth-token
  if (processInfo?.appPort && processInfo?.authToken) {
    logger.info(`从进程命令行获取 LCU 凭证: port=${processInfo.appPort}, pid=${processInfo.pid}`);
    return {
      name: 'LeagueClient',
      pid: processInfo.pid || 0,
      port: processInfo.appPort,
      password: processInfo.authToken,
      protocol: 'https',
    };
  }

  // 命令行参数获取不到时（非管理员运行等情况），回退到 lockfile
  // 1. 手动路径
  if (manualPath) {
    lockfilePath = await findLockfileByManualPath(manualPath);
  }

  // 2. 进程检测路径
  if (!lockfilePath && processInfo) {
    const dir = processInfo.installDirectory;
    const candidates = [
      path.join(dir, 'lockfile'),
      path.join(dir, 'LeagueClient', 'lockfile'),
    ];
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        lockfilePath = candidate;
        logger.info(`通过进程检测找到 lockfile: ${candidate}`);
        break;
      } catch {
        // continue
      }
    }
  }

  // 3. 静态路径列表
  if (!lockfilePath) {
    lockfilePath = await findLockfileByStaticPaths();
  }

  // 尝试读取并解析 lockfile
  if (lockfilePath) {
    try {
      const content = await fs.readFile(lockfilePath, 'utf-8');
      const data = parseLockfile(content);
      if (data) {
        logger.info(`Lockfile 解析成功: port=${data.port}, pid=${data.pid}, password=${data.password ? '***' + data.password.slice(-4) : 'EMPTY'}`);
        return data;
      }
      // lockfile 存在但内容为空（国服常见情况）
      logger.warn(`Lockfile 存在但内容为空: ${lockfilePath}`);
    } catch (err) {
      logger.error('读取 lockfile 失败:', err);
    }
  } else {
    logger.warn('未找到 lockfile');
  }

  logger.warn('无法获取 LCU 凭证（lockfile 为空且无法从进程命令行获取，请确保以管理员身份运行）');
  return null;
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
