/** 错误码枚举 */
export enum ErrorCode {
  // 连接错误
  LCU_NOT_FOUND = 'LCU_NOT_FOUND',
  LCU_CONNECTION_FAILED = 'LCU_CONNECTION_FAILED',
  LCU_TIMEOUT = 'LCU_TIMEOUT',

  // API 错误
  API_ERROR = 'API_ERROR',
  API_NOT_FOUND = 'API_NOT_FOUND',
  API_RATE_LIMITED = 'API_RATE_LIMITED',

  // 爬取错误
  SCRAPER_FETCH_FAILED = 'SCRAPER_FETCH_FAILED',
  SCRAPER_PARSE_FAILED = 'SCRAPER_PARSE_FAILED',
  SCRAPER_ALL_SOURCES_FAILED = 'SCRAPER_ALL_SOURCES_FAILED',

  // 对局分析错误
  LIVE_GAME_NOT_IN_GAME = 'LIVE_GAME_NOT_IN_GAME',
  LIVE_GAME_PARTIAL_DATA = 'LIVE_GAME_PARTIAL_DATA',

  // 应用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/** 应用错误 */
export interface AppError {
  code: ErrorCode;
  message: string;
  detail?: string;
  timestamp: number;
}

/** 创建应用错误的辅助函数 */
export function createAppError(
  code: ErrorCode,
  message: string,
  detail?: string,
): AppError {
  return {
    code,
    message,
    detail,
    timestamp: Date.now(),
  };
}
