import type { IAPIProvider } from '@lol-assistant/shared';
import { LCUAPIProvider } from './lcu';

let _apiProvider: IAPIProvider | null = null;

/**
 * 获取 API 提供者实例（单例）
 */
export function getAPIProvider(): IAPIProvider {
  if (!_apiProvider) {
    _apiProvider = new LCUAPIProvider();
  }
  return _apiProvider;
}

/**
 * 创建 API 提供者
 */
export function createAPIProvider(type: 'lcu' = 'lcu'): IAPIProvider {
  switch (type) {
    case 'lcu':
      return new LCUAPIProvider();
    default:
      return new LCUAPIProvider();
  }
}

export { LCUAPIProvider };
export type { IAPIProvider };
