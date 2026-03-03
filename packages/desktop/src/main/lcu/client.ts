/**
 * LCU 客户端连接模块
 * 连接、断开、重连、HTTPS 请求封装、自签名证书处理
 */
import https from 'https';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { readLockfile, extractCredentials, type LCUCredentials } from './lockfile';
import type { ConnectionStatus } from '@lol-assistant/shared';

/** LCU 请求选项 */
interface LCURequestOptions {
  method?: string;
  data?: unknown;
  timeout?: number;
}

/** 重连配置 */
const RECONNECT_CONFIG = {
  /** 重连间隔（毫秒） */
  interval: 5000,
  /** 最大重连次数（0 表示无限） */
  maxRetries: 0,
} as const;

/** 请求超时（毫秒） */
const REQUEST_TIMEOUT = 10000;

/**
 * LCU 客户端连接管理器
 */
export class LCUClient extends EventEmitter {
  private credentials: LCUCredentials | null = null;
  private _status: ConnectionStatus = 'disconnected';
  private reconnectTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectCount = 0;
  private manualDisconnect = false;

  /** HTTPS Agent - 忽略自签名证书 */
  private httpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });

  /** 获取连接状态 */
  get status(): ConnectionStatus {
    return this._status;
  }

  /** 设置连接状态并发出事件 */
  private setStatus(status: ConnectionStatus): void {
    if (this._status === status) return;
    this._status = status;
    this.emit('status-change', status);
    logger.info(`LCU 连接状态变更: ${status}`);
  }

  /** 是否已连接 */
  isConnected(): boolean {
    return this._status === 'connected';
  }

  /** 获取当前凭证 */
  getCredentials(): LCUCredentials | null {
    return this.credentials;
  }

  /**
   * 连接到 LCU 客户端
   * @param manualPath 手动指定的安装路径
   */
  async connect(manualPath?: string): Promise<void> {
    if (this._status === 'connected') {
      logger.info('已经连接到 LCU 客户端');
      return;
    }

    this.manualDisconnect = false;
    this.setStatus('connecting');

    try {
      const lockfileData = await readLockfile(manualPath);
      if (!lockfileData) {
        this.setStatus('disconnected');
        throw new Error('无法找到 lockfile，请确认 LOL 客户端已启动');
      }

      this.credentials = extractCredentials(lockfileData);

      // 验证连接（尝试获取当前召唤师信息）
      await this.request('/lol-summoner/v1/summoners/me');

      this.setStatus('connected');
      this.reconnectCount = 0;
      this.emit('connected');
      logger.info(`成功连接到 LCU 客户端: port=${this.credentials.port}`);
    } catch (err) {
      this.credentials = null;
      this.setStatus('disconnected');
      this.emit('connection-error', err);
      throw err;
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.manualDisconnect = true;
    this.stopReconnect();
    this.credentials = null;
    this.setStatus('disconnected');
    this.emit('disconnected');
    logger.info('已断开 LCU 客户端连接');
  }

  /**
   * 启动自动重连
   */
  startReconnect(): void {
    if (this.reconnectTimer || this.manualDisconnect) return;

    logger.info('启动自动重连...');
    this.reconnectTimer = setInterval(async () => {
      if (this._status === 'connected' || this.manualDisconnect) {
        this.stopReconnect();
        return;
      }

      this.reconnectCount++;
      if (RECONNECT_CONFIG.maxRetries > 0 && this.reconnectCount > RECONNECT_CONFIG.maxRetries) {
        logger.warn(`重连次数超过上限 (${RECONNECT_CONFIG.maxRetries})，停止重连`);
        this.stopReconnect();
        return;
      }

      logger.info(`尝试重连... (第 ${this.reconnectCount} 次)`);
      try {
        await this.connect();
      } catch {
        // 连接失败，继续重连
      }
    }, RECONNECT_CONFIG.interval);
  }

  /**
   * 停止自动重连
   */
  stopReconnect(): void {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
      this.reconnectCount = 0;
    }
  }

  /**
   * 发送 LCU API 请求
   */
  async request<T = unknown>(
    endpoint: string,
    options: LCURequestOptions = {},
  ): Promise<T> {
    if (!this.credentials) {
      throw new Error('未连接到 LCU 客户端');
    }

    const { method = 'GET', data, timeout = REQUEST_TIMEOUT } = options;
    const { port, password } = this.credentials;

    const url = `https://127.0.0.1:${port}${endpoint}`;
    const auth = Buffer.from(`riot:${password}`).toString('base64');

    return new Promise<T>((resolve, reject) => {
      const urlObj = new URL(url);

      const reqOptions: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        agent: this.httpsAgent,
        timeout,
      };

      const req = https.request(reqOptions, (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(body ? JSON.parse(body) : ({} as T));
            } catch {
              resolve(body as unknown as T);
            }
          } else if (res.statusCode === 404) {
            reject(new Error(`LCU API 未找到: ${endpoint} (404)`));
          } else {
            reject(new Error(`LCU API 请求失败: ${endpoint} (${res.statusCode}) ${body}`));
          }
        });
      });

      req.on('error', (err) => {
        // 连接错误可能意味着客户端已关闭
        if (this._status === 'connected') {
          logger.warn(`LCU 连接异常: ${err.message}`);
          this.credentials = null;
          this.setStatus('disconnected');
          this.emit('disconnected');
          this.startReconnect();
        }
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`LCU API 请求超时: ${endpoint} (${timeout}ms)`));
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * 便捷 GET 请求
   */
  async get<T = unknown>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * 便捷 POST 请求
   */
  async post<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', data });
  }

  /**
   * 便捷 PUT 请求
   */
  async put<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', data });
  }

  /**
   * 便捷 DELETE 请求
   */
  async delete<T = unknown>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * 销毁客户端，释放资源
   */
  destroy(): void {
    this.disconnect();
    this.httpsAgent.destroy();
    this.removeAllListeners();
  }
}

/** 全局 LCU 客户端单例 */
export const lcuClient = new LCUClient();
