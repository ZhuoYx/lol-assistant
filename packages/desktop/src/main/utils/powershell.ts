import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Pass scripts directly to PowerShell without cmd.exe quoting or code-page conversion. */
export async function execPowerShell(command: string, timeout = 10000): Promise<string> {
  const script = `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); $OutputEncoding = [Console]::OutputEncoding; ${command}`;
  const { stdout } = await execFileAsync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NoLogo',
      '-NonInteractive',
      '-EncodedCommand',
      Buffer.from(script, 'utf16le').toString('base64'),
    ],
    { encoding: 'utf8', windowsHide: true, timeout, maxBuffer: 1024 * 1024 },
  );
  return stdout.trim();
}
