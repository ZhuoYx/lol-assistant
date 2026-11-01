import { open, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DAY = 24 * 60 * 60 * 1000;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const HIDDEN = '[已隐藏]';

/** Preserve diagnostic messages while removing connection credentials from exported copies. */
export function redactLogText(value: string): string {
  return (
    value
      // Command lines can be quoted or use --key=value.
      .replace(
        /(--(?:remoting-auth-token|auth-token|access-token|password)(?:=|\s+))(?:("[^"]*")|('[^']*')|([^\s,"'}]+))/gi,
        `$1${HIDDEN}`,
      )
      .replace(/((?:https?|wss?):\/\/)[^\s/@]+@/gi, `$1${HIDDEN}@`)
      .replace(/\b(Basic|Bearer)\s+[A-Za-z0-9._~+/=-]+/gi, `$1 ${HIDDEN}`)
      .replace(
        /(["']?(?:authorization|cookie|set-cookie)["']?\s*:\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\r\n]*)/gi,
        `$1${HIDDEN}`,
      )
      // JSON, Node's object inspection, query parameters and plain key=value logs.
      .replace(
        /((?:["']?)(?:authorization|cookie|set-cookie|password|auth[-_]?token|access[-_]?token|refresh[-_]?token|id[-_]?token|remoting-auth-token|api[-_]?key|token|puuid)(?:["']?)\s*[:=]\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;&}\]\r\n]+)/gi,
        `$1${HIDDEN}`,
      )
      .replace(/(\bLeagueClient(?:Ux)?:\d+:\d+:)[^:\r\n]+(:https?\b)/gi, `$1${HIDDEN}$2`)
      .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, HIDDEN)
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[标识已隐藏]')
      .replace(/([A-Z]:[\\/]+Users[\\/]+)[^\\/\r\n"']+/gi, '$1[用户]')
  );
}

export interface LogReportContext {
  appVersion: string;
  system: string;
  arch: string;
  electronVersion: string;
  nodeVersion: string;
  connectionStatus: string;
}

/** Read only recent regular log files, including rotation files, with bounded memory. */
export async function buildLogReport(
  directory: string,
  context: LogReportContext,
  now = new Date(),
) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return { text: '', fileCount: 0, skippedCount: 0, truncated: false, names: [] as string[] };
    throw error;
  }
  const candidates = entries.filter((entry) => entry.isFile() && /\.log$/i.test(entry.name));
  const files: { name: string; mtime: number; size: number }[] = [];
  let skippedCount = 0;
  for (const entry of candidates) {
    try {
      const handle = await open(join(directory, entry.name), 'r');
      try {
        const info = await handle.stat();
        if (info.isFile() && info.mtimeMs >= now.getTime() - 7 * DAY)
          files.push({ name: entry.name, mtime: info.mtimeMs, size: info.size });
      } finally {
        await handle.close();
      }
    } catch {
      skippedCount++;
    }
  }
  files.sort((a, b) => b.mtime - a.mtime || a.name.localeCompare(b.name));
  const sections: { name: string; text: string }[] = [];
  let budget = MAX_TOTAL_BYTES;
  let truncated = false;
  for (const file of files) {
    if (budget <= 0) {
      skippedCount++;
      truncated = true;
      continue;
    }
    try {
      const handle = await open(join(directory, file.name), 'r');
      try {
        const info = await handle.stat();
        const bytes = Math.min(info.size, MAX_FILE_BYTES, budget);
        if (bytes === 0) continue;
        const start = Math.max(0, info.size - bytes);
        const buffer = Buffer.alloc(bytes);
        let offset = 0;
        while (offset < bytes) {
          const read = await handle.read(buffer, offset, bytes - offset, start + offset);
          if (!read.bytesRead) break;
          offset += read.bytesRead;
        }
        budget -= offset;
        let content = buffer.subarray(0, offset).toString('utf8');
        if (start > 0) {
          truncated = true;
          const firstLine = content.indexOf('\n');
          content = firstLine >= 0 ? content.slice(firstLine + 1) : content.replace(/^\uFFFD+/, '');
        }
        if (!content.trim()) continue;
        sections.push({
          name: file.name,
          text: `===== ${file.name} =====\n${start > 0 ? '[文件较大，仅保留末尾日志]\n' : ''}${redactLogText(content)}`,
        });
      } finally {
        await handle.close();
      }
    } catch {
      skippedCount++;
    }
  }
  const header = [
    '英雄联盟助手 · 诊断日志',
    `导出时间：${now.toISOString()}`,
    `应用版本：${context.appVersion}`,
    `系统：${context.system} / ${context.arch}`,
    `Electron：${context.electronVersion} / Node.js：${context.nodeVersion}`,
    `客户端连接：${context.connectionStatus}`,
    `范围：近 7 天，共 ${sections.length} 个日志文件`,
    '连接令牌、认证头和 Windows 用户目录已做隐藏处理；原始日志保持不变。',
    ...(truncated ? ['日志较大，部分内容已截取；优先保留最近的记录。'] : []),
    ...(skippedCount ? [`有 ${skippedCount} 个文件因读取失败或大小限制未导出。`] : []),
  ].join('\n');
  return {
    text: `${redactLogText(header)}\n\n${sections
      .reverse()
      .map((section) => section.text)
      .join('\n\n')}`,
    fileCount: sections.length,
    skippedCount,
    truncated,
    names: sections.map((section) => section.name),
  };
}
