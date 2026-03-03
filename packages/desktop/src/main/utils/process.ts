/**
 * 进程检测工具
 * 检测 LOL 客户端进程，读取 --install-directory 参数
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';

const execAsync = promisify(exec);

/** LOL 客户端进程名 */
const LOL_PROCESS_NAME = 'LeagueClientUx.exe';

/** 轮询检测配置 */
export const POLL_CONFIG = {
  /** 每 3 秒检测一次进程 */
  interval: 3000,
  /** 持续检测直到连接 */
  maxRetries: Infinity,
} as const;

/** 进程信息 */
export interface ProcessInfo {
  pid: number;
  installDirectory: string;
}

/**
 * 检测 LOL 客户端进程是否正在运行
 * 通过 WMIC 获取进程命令行参数，提取 --install-directory
 */
export async function detectLOLProcess(): Promise<ProcessInfo | null> {
  try {
    const { stdout } = await execAsync(
      `wmic process where "name='${LOL_PROCESS_NAME}'" get ProcessId,CommandLine /format:list`,
      { encoding: 'utf-8' },
    );

    if (!stdout || !stdout.includes(LOL_PROCESS_NAME)) {
      return null;
    }

    // 提取 --install-directory 参数
    const installDirMatch = stdout.match(/--install-directory=([^\s"]+|"[^"]+?")/i);
    if (!installDirMatch) {
      // 尝试另一种格式: --install-directory "path"
      const altMatch = stdout.match(/--install-directory[=\s]+["']?([^"'\r\n]+)["']?/i);
      if (!altMatch) {
        logger.warn('检测到 LOL 客户端进程但无法提取安装路径');
        return null;
      }
      const installDirectory = altMatch[1].trim().replace(/["']/g, '');
      const pid = extractPid(stdout);
      return { pid, installDirectory };
    }

    const installDirectory = installDirMatch[1].trim().replace(/["']/g, '');
    const pid = extractPid(stdout);

    logger.info(`检测到 LOL 客户端进程: PID=${pid}, 安装路径=${installDirectory}`);
    return { pid, installDirectory };
  } catch {
    return null;
  }
}

/**
 * 从 WMIC 输出中提取进程 ID
 */
function extractPid(wmicOutput: string): number {
  const pidMatch = wmicOutput.match(/ProcessId=(\d+)/i);
  return pidMatch ? parseInt(pidMatch[1], 10) : 0;
}

/**
 * 检测 LOL 客户端进程是否存在（快速检测，不获取详细信息）
 */
export async function isLOLClientRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `tasklist /FI "IMAGENAME eq ${LOL_PROCESS_NAME}" /NH`,
      { encoding: 'utf-8' },
    );
    return stdout.includes(LOL_PROCESS_NAME);
  } catch {
    return false;
  }
}

/**
 * 启动轮询检测 LOL 客户端进程
 * 返回一个 Promise，当检测到进程时 resolve
 * 返回取消轮询的函数
 */
export function pollForLOLClient(
  onDetected: (info: ProcessInfo) => void,
  interval: number = POLL_CONFIG.interval,
): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;
  let cancelled = false;

  const poll = async (): Promise<void> => {
    if (cancelled) return;

    const processInfo = await detectLOLProcess();
    if (processInfo && !cancelled) {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      onDetected(processInfo);
    }
  };

  // 立即执行一次
  poll();

  // 设置定时轮询
  timer = setInterval(poll, interval);

  // 返回取消函数
  return () => {
    cancelled = true;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
