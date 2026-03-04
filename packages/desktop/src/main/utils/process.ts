/**
 * 进程检测工具
 * 检测 LOL 客户端进程，支持多种策略获取安装路径
 * 兼容 Windows 10 / 11
 */
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

/**
 * 执行 PowerShell 命令，确保输出使用 UTF-8 编码
 * Windows 默认 PowerShell 输出编码为 GBK (CP936)，中文路径会乱码
 */
async function execPowerShell(command: string, timeout = 5000): Promise<string> {
  const utf8Prefix = '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $OutputEncoding = [System.Text.Encoding]::UTF8;';
  const { stdout } = await execAsync(
    `chcp 65001 >nul & powershell -NoProfile -NoLogo -Command "${utf8Prefix} ${command}"`,
    { encoding: 'utf-8', timeout, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },
  );
  return stdout.trim();
}

/** LOL 客户端进程名列表 */
const LOL_PROCESS_NAMES = ['LeagueClientUx.exe', 'LeagueClient.exe'];

/** UAC 提权是否已尝试过（避免轮询时反复弹 UAC） */
let elevationAttempted = false;

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
  /** LCU API 端口（从 --app-port 命令行参数提取） */
  appPort?: number;
  /** LCU 认证 token（从 --remoting-auth-token 命令行参数提取） */
  authToken?: string;
}

/**
 * 从注册表检测国服 LOL 安装路径
 * 这是最可靠的检测方式（不受进程权限限制）
 */
async function detectViaRegistry(): Promise<string | null> {
  const regKeys = [
    `HKLM:\\SOFTWARE\\WOW6432Node\\Tencent\\LOL`,
    `HKLM:\\SOFTWARE\\Tencent\\LOL`,
  ];

  for (const key of regKeys) {
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

  return null;
}

/**
 * 通过 PowerShell Get-CimInstance 检测 LOL 客户端进程并获取路径
 */
async function detectViaGetCimInstance(): Promise<ProcessInfo | null> {
  const filter = LOL_PROCESS_NAMES.map((n) => `Name='${n}'`).join(' OR ');

  try {
    // 使用 ForEach-Object 自定义输出，避免 Format-List 长行折行问题
    const stdout = await execPowerShell(
      `Get-CimInstance Win32_Process -Filter \\\"${filter}\\\" | ForEach-Object { Write-Output \\\"ProcessId=$($_.ProcessId)\\\"; Write-Output \\\"CommandLine=$($_.CommandLine)\\\"; Write-Output \\\"ExecutablePath=$($_.ExecutablePath)\\\"; Write-Output \\\"---\\\" }`,
      10000,
    );

    if (!stdout) {
      return null;
    }

    const result = parseProcessOutput(stdout);

    // 检查是否因权限不足导致 CommandLine 为空
    if (result && !result.appPort && stdout.match(/CommandLine[=:]\s*$/m)) {
      logger.warn('[PowerShell] CommandLine 为空（需要管理员权限才能读取其他进程的命令行参数）');
    }

    return result;
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
      const { stdout } = await execAsync(
        `chcp 65001 >nul && wmic process where "name='${processName}'" get ProcessId,CommandLine,ExecutablePath /format:list`,
        { encoding: 'utf-8', timeout: 10000 },
      );

      if (stdout && stdout.includes(processName)) {
        const result = parseProcessOutput(stdout);
        if (result) return result;
      }

      // WMIC 找到进程但 CommandLine 为空（权限不足）
      if (stdout && stdout.match(/CommandLine=\s*$/m)) {
        logger.warn('[WMIC] CommandLine 为空（需要管理员权限）');
      }
    } catch {
      // WMIC 不可用或该进程不存在，继续
    }
  }
  return null;
}

/**
 * 检测当前进程是否拥有管理员权限
 */
function isAdmin(): boolean {
  try {
    execSync('net session 2>&1', { stdio: 'ignore', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * 通过一次性 UAC 提权获取 LCU 命令行参数
 * 会弹一次 UAC 弹窗，将结果写入临时文件后读取
 * 仅在非管理员模式下使用
 */
async function detectViaElevatedPowerShell(): Promise<ProcessInfo | null> {
  const tmpFile = path.join(os.tmpdir(), `lcu-credentials-${Date.now()}.txt`);
  const filter = LOL_PROCESS_NAMES.map((n) => `Name='${n}'`).join(' OR ');

  // 构建提权 PowerShell 脚本：获取进程信息并写入临时文件
  const script = `
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $procs = Get-CimInstance Win32_Process -Filter "${filter}"
    $lines = @()
    foreach($p in $procs) { $lines += "ProcessId=$($p.ProcessId)"; $lines += "CommandLine=$($p.CommandLine)"; $lines += "ExecutablePath=$($p.ExecutablePath)"; $lines += "---" }
    [System.IO.File]::WriteAllText('${tmpFile.replace(/\\/g, '\\\\')}', ($lines -join [char]10), [System.Text.Encoding]::UTF8)
  `.replace(/\n/g, ' ').trim();

  try {
    // 用 Start-Process -Verb RunAs 弹一次 UAC
    await execAsync(
      `powershell -NoProfile -Command "Start-Process powershell -ArgumentList '-NoProfile','-NoLogo','-Command','${script.replace(/'/g, "''")}' -Verb RunAs -Wait -WindowStyle Hidden"`,
      { encoding: 'utf-8', timeout: 30000 },
    );

    // 等待临时文件写入
    await new Promise(resolve => setTimeout(resolve, 500));

    // 读取结果
    const content = await fs.readFile(tmpFile, 'utf-8');
    // 清理临时文件
    await fs.unlink(tmpFile).catch(() => {});

    if (!content.trim()) {
      logger.warn('[ElevatedPS] 提权获取命令行为空');
      return null;
    }

    logger.info('[ElevatedPS] 提权获取到进程信息');
    return parseProcessOutput(content);
  } catch (err) {
    // 用户拒绝 UAC 或超时
    logger.warn('[ElevatedPS] 提权获取失败（用户可能拒绝了 UAC）:', err);
    // 清理临时文件
    await fs.unlink(tmpFile).catch(() => {});
    return null;
  }
}

/**
 * 将 PowerShell Format-List 输出中的续行（换行+空白缩进）合并为单行
 * Format-List 在字段值过长时会自动折行，下一行以大量空格缩进
 * 例如:
 *   CommandLine : "xxx --token=d
 *                  E2AeLCqmhJEKF34Ml9Cbg" --app-port=60643
 * 合并后变成一整行
 */
function joinFormatListContinuations(output: string): string {
  // 匹配：换行后紧跟大量空格（至少17个，Format-List 续行缩进通常很深）
  // 但不能是新字段（新字段格式为 "FieldName    : value"）
  return output.replace(/\r?\n {17,}(?!\S+\s*:)/g, '');
}

/**
 * 将 Format-List 或自定义输出按进程块拆分
 * 支持空行分隔（Format-List）和 --- 分隔（自定义输出）
 */
function splitProcessBlocks(output: string): string[] {
  // 优先按 --- 分隔符拆分
  if (output.includes('---')) {
    return output.split(/^---$/m).filter((block) => block.trim().length > 0);
  }
  // 兜底：按连续空行拆分（兼容 Format-List / WMIC 输出）
  return output.split(/\n\s*\n/).filter((block) => block.trim().length > 0);
}

/**
 * 从单个进程块中解析信息
 */
function parseProcessBlock(block: string): ProcessInfo | null {
  // 提取 PID
  const pidMatch = block.match(/ProcessId[=:]\s*(\d+)/i);
  const pid = pidMatch ? parseInt(pidMatch[1], 10) : 0;

  // 提取 --install-directory 参数
  let installDirectory: string | null = null;

  // 格式1: --install-directory=C:\path\to\lol
  const match1 = block.match(/--install-directory=["']?([^"'\r\n]+?)["']?(?:\s|$)/i);
  if (match1) {
    installDirectory = match1[1].trim();
  }

  // 格式2: --install-directory "C:\path\to\lol"
  if (!installDirectory) {
    const match2 = block.match(/--install-directory\s+["']([^"']+)["']/i);
    if (match2) {
      installDirectory = match2[1].trim();
    }
  }

  // 格式3: 从 ExecutablePath 提取
  if (!installDirectory) {
    const exePathMatch = block.match(/ExecutablePath[=:]\s*(.+)/i);
    if (exePathMatch) {
      const exePath = exePathMatch[1].trim();
      if (exePath) {
        installDirectory = path.dirname(exePath);
      }
    }
  }

  // 格式4: 从可执行文件路径推断
  if (!installDirectory) {
    for (const processName of LOL_PROCESS_NAMES) {
      const exePattern = new RegExp(`["']?([A-Za-z]:[^"']*?)\\\\${processName.replace('.', '\\.')}`, 'i');
      const match3 = block.match(exePattern);
      if (match3) {
        installDirectory = match3[1].trim();
        break;
      }
    }
  }

  if (!installDirectory) {
    return null;
  }

  const result: ProcessInfo = { pid, installDirectory };

  // 提取 --app-port（LCU API 端口）
  const appPortMatch = block.match(/--app-port=(\d+)/);
  if (appPortMatch) {
    result.appPort = parseInt(appPortMatch[1], 10);
  }

  // 提取 --remoting-auth-token（LCU 认证 token）
  const authTokenMatch = block.match(/--remoting-auth-token=([A-Za-z0-9\-_=+/]+)/);
  if (authTokenMatch) {
    result.authToken = authTokenMatch[1];
  }

  return result;
}

/**
 * 从进程命令行输出中解析安装目录和 PID
 * 支持 Format-List 多行折行输出、多进程块
 * 优先返回包含完整凭证（appPort + authToken）的进程块
 */
function parseProcessOutput(output: string): ProcessInfo | null {
  logger.debug(`[parseProcessOutput] 原始输出:\n${output}`);

  // 先合并 Format-List 的续行折行
  const joined = joinFormatListContinuations(output);
  logger.debug(`[parseProcessOutput] 合并续行后:\n${joined}`);

  // 按进程块拆分
  const blocks = splitProcessBlocks(joined);

  let bestResult: ProcessInfo | null = null;

  for (const block of blocks) {
    const result = parseProcessBlock(block);
    if (!result) continue;

    // 优先选择有完整凭证的块
    if (result.appPort && result.authToken) {
      logger.debug(`[parseProcessOutput] 选择有完整凭证的进程块: PID=${result.pid}, port=${result.appPort}`);
      return result;
    }

    // 否则记住第一个有效结果作为 fallback
    if (!bestResult) {
      bestResult = result;
    }
  }

  return bestResult;
}

/**
 * 在已知安装根目录中查找 LeagueClient 子目录
 * 国服结构：根目录/LeagueClient/LeagueClientUx.exe
 */
async function resolveLeagueClientDir(basePath: string): Promise<string | null> {
  // 先检查 basePath 自身是否含有 LeagueClient 可执行文件
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
 * 多策略检测：PowerShell 进程 > WMIC 进程 > 提权获取 > 注册表
 * 优先使用进程检测（能获取 --app-port / --remoting-auth-token 命令行参数）
 */
export async function detectLOLProcess(): Promise<ProcessInfo | null> {
  const admin = isAdmin();

  // 策略1：PowerShell Get-CimInstance（优先，能获取命令行参数）
  let result = await detectViaGetCimInstance();
  if (result && result.appPort && result.authToken) {
    const resolved = await resolveLeagueClientDir(result.installDirectory);
    if (resolved) result.installDirectory = resolved;
    logger.info(`[PowerShell] 检测到 LOL 客户端: PID=${result.pid}, port=${result.appPort}, 路径=${result.installDirectory}`);
    return result;
  }

  // 策略2：WMIC（能获取命令行参数）
  result = await detectViaWmic();
  if (result && result.appPort && result.authToken) {
    const resolved = await resolveLeagueClientDir(result.installDirectory);
    if (resolved) result.installDirectory = resolved;
    logger.info(`[WMIC] 检测到 LOL 客户端: PID=${result.pid}, port=${result.appPort}, 路径=${result.installDirectory}`);
    return result;
  }

  // 策略3：如果非管理员且策略1/2拿不到凭证，尝试提权获取（仅一次）
  if (!admin && !elevationAttempted) {
    elevationAttempted = true;
    logger.info('非管理员模式，尝试通过 UAC 提权获取 LCU 命令行参数（仅此一次）...');
    const elevated = await detectViaElevatedPowerShell();
    if (elevated && elevated.appPort && elevated.authToken) {
      const resolved = await resolveLeagueClientDir(elevated.installDirectory);
      if (resolved) elevated.installDirectory = resolved;
      logger.info(`[ElevatedPS] 检测到 LOL 客户端: PID=${elevated.pid}, port=${elevated.appPort}, 路径=${elevated.installDirectory}`);
      return elevated;
    }
  }

  // 策略4：注册表检测（只能拿到安装路径，无法获取命令行参数）
  const regPath = await detectViaRegistry();
  if (regPath) {
    const resolved = await resolveLeagueClientDir(regPath);
    if (resolved) {
      logger.info(`[Registry] 确认 LOL 客户端目录: ${resolved}`);
      return { pid: 0, installDirectory: resolved };
    }
    logger.info(`[Registry] 返回注册表安装路径: ${regPath}`);
    return { pid: 0, installDirectory: regPath };
  }

  // 策略5：检测进程是否在运行（即使拿不到路径也标记进程存活）
  for (const processName of LOL_PROCESS_NAMES) {
    try {
      const { stdout } = await execAsync(
        `tasklist /FI "IMAGENAME eq ${processName}" /NH`,
        { encoding: 'utf-8', timeout: 5000 },
      );
      if (stdout.includes(processName)) {
        logger.info(`[Tasklist] 检测到 ${processName} 进程但无法获取路径`);
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

