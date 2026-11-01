/** 日志导出结果；取消与没有日志都不算导出成功。 */
export type LogExportResult =
  | {
      status: 'saved';
      filePath: string;
      fileCount: number;
      skippedCount: number;
      truncated: boolean;
    }
  | { status: 'cancelled' | 'empty' | 'busy' }
  | { status: 'error'; message: string };
