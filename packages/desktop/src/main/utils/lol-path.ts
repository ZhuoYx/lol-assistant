import fs from 'node:fs/promises';
import path from 'node:path';
import { execPowerShell } from './powershell';
import { logger } from './logger';

const CLIENT_FILES = ['LeagueClient.exe', 'LeagueClientUx.exe'];

function cleanCandidate(value: string): string | null {
  let candidate = value.trim().replace(/^\uFEFF/, '');
  const quoted = candidate.match(/^"([^"]+)"/);
  if (quoted) candidate = quoted[1];
  else candidate = candidate.match(/^(.+?\.exe)(?:\s|,|$)/i)?.[1] ?? candidate;
  candidate = candidate.replace(/%([^%]+)%/g, (original, name: string) => {
    const key = Object.keys(process.env).find((key) => key.toLowerCase() === name.toLowerCase());
    return (key && process.env[key]) || original;
  });
  return path.win32.isAbsolute(candidate) ? path.win32.normalize(candidate) : null;
}

/** Accept a game root, client directory, or a registered launcher/executable path. */
export async function resolveLOLClientPath(value: unknown): Promise<string | null> {
  if (typeof value !== 'string' || !value.trim()) return null;
  const candidate = cleanCandidate(value);
  if (!candidate) return null;
  const base = /\.exe$/i.test(candidate) ? path.dirname(candidate) : candidate;
  const roots = [...new Set([base, path.dirname(base), path.dirname(path.dirname(base))])];
  for (const root of roots) {
    for (const directory of [root, path.join(root, 'LeagueClient')]) {
      for (const file of CLIENT_FILES) {
        try {
          if ((await fs.stat(path.join(directory, file))).isFile()) return directory;
        } catch {
          // Missing or inaccessible candidates do not prevent trying other sources.
        }
      }
    }
  }
  return null;
}

// This query never requests process command lines, credentials, or UAC elevation.
const DISCOVERY_SCRIPT = `
$processPaths = @()
try {
  $processPaths = @(Get-CimInstance Win32_Process -Filter "Name='LeagueClientUx.exe' OR Name='LeagueClient.exe' OR Name='League of Legends.exe'" -ErrorAction Stop | ForEach-Object { $_.ExecutablePath } | Where-Object { $_ })
} catch {}
$registryPaths = @()
foreach ($key in @('HKLM:\\SOFTWARE\\WOW6432Node\\Tencent\\LOL', 'HKLM:\\SOFTWARE\\Tencent\\LOL', 'HKCU:\\SOFTWARE\\Tencent\\LOL')) {
  try {
    $entry = Get-ItemProperty -LiteralPath $key -ErrorAction Stop
    foreach ($property in @('InstallPath', 'InstallLocation', 'Path', 'GamePath')) {
      if ($entry.$property -is [string]) { $registryPaths += $entry.$property }
    }
  } catch {}
}
foreach ($key in @('HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall', 'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall', 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall')) {
  Get-ChildItem -LiteralPath $key -ErrorAction SilentlyContinue | ForEach-Object {
    $entry = Get-ItemProperty -LiteralPath $_.PSPath -ErrorAction SilentlyContinue
    if ($entry.DisplayName -match '英雄联盟|League of Legends') {
      foreach ($property in @('InstallLocation', 'InstallPath', 'DisplayIcon', 'UninstallString')) {
        if ($entry.$property -is [string]) { $registryPaths += $entry.$property }
      }
    }
  }
}
$driveRoots = @([System.IO.DriveInfo]::GetDrives() | Where-Object { $_.DriveType -eq 'Fixed' -and $_.IsReady } | ForEach-Object { $_.RootDirectory.FullName })
[PSCustomObject]@{processPaths=$processPaths; registryPaths=$registryPaths; driveRoots=$driveRoots} | ConvertTo-Json -Compress
`;

function strings(value: unknown): string[] {
  return (Array.isArray(value) ? value : [value]).filter(
    (item): item is string => typeof item === 'string' && !!item.trim(),
  );
}

export async function detectLOLInstallPath(savedPath?: string): Promise<string | null> {
  const visited = new Set<string>();
  const resolveCandidates = async (candidates: string[]) => {
    for (const candidate of candidates) {
      const key = candidate.toLowerCase();
      if (visited.has(key)) continue;
      visited.add(key);
      const directory = await resolveLOLClientPath(candidate);
      if (directory) return directory;
    }
    return null;
  };
  // Reopening onboarding can immediately reuse a previously validated selection.
  const saved = await resolveCandidates(savedPath ? [savedPath] : []);
  if (saved) return saved;

  let discovery: { processPaths?: unknown; registryPaths?: unknown; driveRoots?: unknown } = {};
  try {
    const snapshot = JSON.parse(await execPowerShell(DISCOVERY_SCRIPT));
    if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) discovery = snapshot;
    const found = await resolveCandidates([
      ...strings(discovery.processPaths),
      ...strings(discovery.registryPaths),
    ]);
    if (found) return found;
  } catch {
    logger.debug('系统安装信息查询不可用，继续检查 Riot 安装记录和常见目录');
  }

  try {
    const metadataFile = path.join(
      process.env.ProgramData || 'C:\\ProgramData',
      'Riot Games',
      'RiotClientInstalls.json',
    );
    const installs = JSON.parse((await fs.readFile(metadataFile, 'utf8')).replace(/^\uFEFF/, ''));
    const associated = installs?.associated_client;
    const found = await resolveCandidates(
      associated && typeof associated === 'object' ? Object.keys(associated) : [],
    );
    if (found) return found;
  } catch {
    // Riot installation metadata may be absent or stale.
  }

  const drives = strings(discovery.driveRoots).filter((drive) => /^[A-Z]:[\\/]?$/i.test(drive));
  const roots = drives.length ? drives : ['C:\\', 'D:\\', 'E:\\', 'F:\\'];
  const common = [
    'Riot Games/League of Legends',
    'Riot Games/League of Legends/live',
    '腾讯游戏/英雄联盟',
    'WeGame/games/英雄联盟',
    'Program Files/腾讯游戏/英雄联盟',
    'Program Files (x86)/腾讯游戏/英雄联盟',
    'Program Files (x86)/英雄联盟',
    'Games/英雄联盟',
    'Games/League of Legends',
    '英雄联盟',
    'League of Legends',
    'LOL',
  ];
  return resolveCandidates(
    roots.flatMap((drive) => common.map((directory) => path.join(drive, directory))),
  );
}
