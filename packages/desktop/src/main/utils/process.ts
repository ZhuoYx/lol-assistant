/**
 * 进程检测工具
 * 检测 LOL 客户端进程，支持多种策略获取安装路径
 * 兼容 Windows 10 / 11，支持国服 / 国际服
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * 执行 PowerShell 命令，确保输出使用 UTF-8 编码
 * Windows 默认 PowerShell 输出编码为 GBK (CP936)，中文路径会乱码
 */
async function execPowerShell(command: string, timeout = 5000): Promise<string> {
  const utf8Prefix = '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;';
  const { stdout } = await execAsync(
    `powershell -NoProfile -NoLogo -Command "${utf8Prefix} ${command}"`,
    { encoding: 'utf-8', timeout },
  );
  return stdout.trim();
}

/** LOL 客户端进程名列表 */
const LOL_PROCESS_NAMES = ['LeagueClientUx.exe', 'LeagueClient.exe'];

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
 * 从注册表检测国服 LOL 安装路径
 * 这是最可靠的检测方式（不受进程权限限制）
 */
async function detectViaRegistry(): Promise<string | null> {
  const regKeys = [
    // 国服腾讯 LOL 注册表
    `HKLM:\\SOFTWARE\\WOW6432Node\\Tencent\\LOL`,
    `HKLM:\\SOFTWARE\\Tencent\\LOL`,
    // Riot 国际服注册表
    `HKLM:\\SOFTWARE\\WOW6432Node\\Riot Games\\League of Legends`,
    `HKLM:\\SOFTWARE\\Riot Games\\League of Legends`,
    `HKCU:\\SOFTWARE\\Riot Games\\League of Legends`,
  ];

  // 国服注册表：读取 InstallPath
  for (const key of regKeys.slice(0, 2)) {
    try {
      const installPath = await execPowerShell(
        `(Get-ItemProperty '${key}' -ErrorAction Stop).InstallPath`,
      );
      if (installPath) {
        logger.info(`[Registry] 从 ${key} 检测到安装路径: ${installPath}`);
        return installPath;
      }
    } catch {
      // key 不存在或无法访问
    }
  }

  // 国际服注册表：读取 Path 或 Install Directory
  for (const key of regKeys.slice(2)) {
    try {
      const installPath = await execPowerShell(
        `$r = Get-ItemProperty '${key}' -ErrorAction Stop; if($r.Path){$r.Path}elseif($r.'Install Directory'){$r.'Install Directory'}`,
      );
      if (installPath) {
        logger.info(`[Registry] 从 ${key} 检测到安装路径: ${installPath}`);
        return installPath;
      }
    } catch {
      // key 不存在或无法访问
    }
  }

  return null;
}

/**
 * 通过 PowerShell Get-CimInstance 检测 LOL 客户端进程并获取路径
 */
async function detectViaGetCimInstance(): Promise<ProcessInfo | null> {
  const filter = LOL_PROCESS_NAMES.map((n) => `Name='${n}'`).join(' OR ');

  try {
    const stdout = await execPowerShell(
      `Get-CimInstance Win32_Process -Filter \\\"${filter}\\\" | Select-Object ProcessId,CommandLine,ExecutablePath | Format-List`,
      10000,
    );

    if (!stdout) {
      return null;
    }

    return parseProcessOutput(stdout);
  } catch {
    return null;
  }
}

/**
 * 通过 WMIC 检测 LOL 客户端进程（旧版 Windows 兼容）
 */
async function detectViaWmic(): Promise<ProcessInfo | null> {
  for (const processName of LOL_PROCESS_NAMES) {
    try {
      // WMIC 默认使用系统编码，通过 chcp 65001 切换到 UTF-8 后再执行
      const { stdout } = await execAsync(
        `chcp 65001 >nul && wmic process where "name='${processName}'" get ProcessId,CommandLine,ExecutablePath /format:list`,
        { encoding: 'utf-8', timeout: 10000 },
      );

      if (stdout && stdout.includes(processName)) {
        const result = parseProcessOutput(stdout);
        if (result) return result;
      }
    } catch {
      // WMIC 不可用或该进程不存在，继续
    }
  }
  return null;
}

/**
 * 从进程命令行输出中解析安装目录和 PID
 */
function parseProcessOutput(output: string): ProcessInfo | null {
  // 提取 --install-directory 参数
  let installDirectory: string | null = null;

  // 格式1: --install-directory=C:\path\to\lol
  const match1 = output.match(/--install-directory=["']?([^"'\r\n]+?)["']?(?:\s|$)/i);
  if (match1) {
    installDirectory = match1[1].trim();
  }

  // 格式2: --install-directory "C:\path\to\lol"
  if (!installDirectory) {
    const match2 = output.match(/--install-directory\s+["']([^"']+)["']/i);
    if (match2) {
      installDirectory = match2[1].trim();
    }
  }

  // 格式3: 从 ExecutablePath 提取
  if (!installDirectory) {
    const exePathMatch = output.match(/ExecutablePath[=:]\s*(.+)/i);
    if (exePathMatch) {
      const exePath = exePathMatch[1].trim();
      if (exePath) {
        installDirectory = path.dirname(exePath);
      }
    }
  }

  // 格式4: 从可执行文件路径推断（如 "D:\LOL\LeagueClient\LeagueClientUx.exe"）
  if (!installDirectory) {
    for (const processName of LOL_PROCESS_NAMES) {
      const exePattern = new RegExp(`["']?([A-Za-z]:[^"']*?)\\\\${processName.replace('.', '\\.')}`, 'i');
      const match3 = output.match(exePattern);
      if (match3) {
        installDirectory = match3[1].trim();
        break;
      }
    }
  }

  if (!installDirectory) {
    return null;
  }

  // 提取 PID
  const pidMatch = output.match(/ProcessId[=:]\s*(\d+)/i);
  const pid = pidMatch ? parseInt(pidMatch[1], 10) : 0;

  return { pid, installDirectory };
}

/**
 * 在已知安装根目录中查找 LeagueClient 子目录
 * 国服结构：根目录/LeagueClient/LeagueClientUx.exe
 * 国际服结构：根目录/LeagueClient.exe
 */
async function resolveLeagueClientDir(basePath: string): Promise<string | null> {
  // 先检查 basePath 自身是否含有 LeagueClient 可执行文件（国际服或子目录本身）
  for (const exe of ['LeagueClientUx.exe', 'LeagueClient.exe']) {
    try {
      await fs.access(path.join(basePath, exe));
      return basePath;
    } catch {
      // continue
    }
  }

  // 国服结构：basePath/LeagueClient/ 子目录
  const leagueClientSubDir = path.join(basePath, 'LeagueClient');
  for (const exe of ['LeagueClientUx.exe', 'LeagueClient.exe', 'lockfile']) {
    try {
      await fs.access(path.join(leagueClientSubDir, exe));
      return leagueClientSubDir;
    } catch {
      // continue
    }
  }

  // 检查 TCLS/Client.exe（国服启动器）作为根目录有效性标记
  try {
    await fs.access(path.join(basePath, 'TCLS', 'Client.exe'));
    // 如果存在 TCLS 但 LeagueClient 子目录不存在，仍然返回根目录
    try {
      await fs.access(leagueClientSubDir);
      return leagueClientSubDir;
    } catch {
      return basePath;
    }
  } catch {
    // continue
  }

  return null;
}

/**
 * 检测 LOL 客户端进程是否正在运行
 * 多策略检测：注册表 > PowerShell 进程 > WMIC 进程
 */
export async function detectLOLProcess(): Promise<ProcessInfo | null> {
  // 策略1：注册表检测（最可靠，不受进程权限限制）
  const regPath = await detectViaRegistry();
  if (regPath) {
    const resolved = await resolveLeagueClientDir(regPath);
    if (resolved) {
      logger.info(`[Registry] 确认 LOL 客户端目录: ${resolved}`);
      return { pid: 0, installDirectory: resolved };
    }
    // 即使没找到子目录，注册表路径本身也可以返回
    logger.info(`[Registry] 返回注册表安装路径: ${regPath}`);
    return { pid: 0, installDirectory: regPath };
  }

  // 策略2：PowerShell Get-CimInstance
  let result = await detectViaGetCimInstance();
  if (result) {
    const resolved = await resolveLeagueClientDir(result.installDirectory);
    if (resolved) result.installDirectory = resolved;
    logger.info(`[PowerShell] 检测到 LOL 客户端: PID=${result.pid}, 路径=${result.installDirectory}`);
    return result;
  }

  // 策略3：WMIC
  result = await detectViaWmic();
  if (result) {
    const resolved = await resolveLeagueClientDir(result.installDirectory);
    if (resolved) result.installDirectory = resolved;
    logger.info(`[WMIC] 检测到 LOL 客户端: PID=${result.pid}, 路径=${result.installDirectory}`);
    return result;
  }

  // 策略4：检测进程是否在运行（即使拿不到路径也标记进程存活）
  for (const processName of LOL_PROCESS_NAMES) {
    try {
      const { stdout } = await execAsync(
        `tasklist /FI "IMAGENAME eq ${processName}" /NH`,
        { encoding: 'utf-8', timeout: 5000 },
      );
      if (stdout.includes(processName)) {
        logger.info(`[Tasklist] 检测到 ${processName} 进程但无法获取路径`);
        // 进程在运行但拿不到路径，返回空路径（调用方会继续尝试常见路径扫描）
      }
    } catch {
      // continue
    }
  }

  return null;
}

/**
 * 检测 LOL 客户端进程是否存在（快速检测，不获取详细信息）
 */
export async function isLOLClientRunning(): Promise<boolean> {
  for (const processName of LOL_PROCESS_NAMES) {
    try {
      const { stdout } = await execAsync(
        `tasklist /FI "IMAGENAME eq ${processName}" /NH`,
        { encoding: 'utf-8', timeout: 5000 },
      );
      if (stdout.includes(processName)) return true;
    } catch {
      // continue
    }
  }
  return false;
}

/**
 * 启动轮询检测 LOL 客户端进程
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
