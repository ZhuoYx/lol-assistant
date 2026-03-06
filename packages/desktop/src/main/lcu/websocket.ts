/**
 * LCU WebSocket 模块
 * 事件订阅，用于选人助手、对局分析等实时功能
 */
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import type { LCUCredentials } from './lockfile';
import type { LCUEvent } from '@lol-assistant/shared';

/** WAMP 1.0 协议消息类型 */
const WAMP_SUBSCRIBE = 5;
const WAMP_UNSUBSCRIBE = 6;
const WAMP_EVENT = 8;

/** LCU 全局 JSON API 事件名 */
const GLOBAL_EVENT_NAME = 'OnJsonApiEvent';

/** WebSocket 重连配置 */
const WS_RECONNECT_CONFIG = {
  interval: 3000,
  maxRetries: 10,
} as const;

/**
 * LCU WebSocket 管理器
 * 用于订阅 LCU 客户端事件（选人阶段变化、游戏状态变化等）
 *
 * 采用全局 OnJsonApiEvent 订阅方式：
 * - 连接后发送 [5, "OnJsonApiEvent"] 订阅所有 JSON API 事件
 * - 收到 [8, "OnJsonApiEvent", { uri, eventType, data }] 后按 uri 分发到各 handler
 */
export class LCUWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, Set<(event: LCUEvent) => void>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectCount = 0;
  private credentials: LCUCredentials | null = null;
  private _connected = false;
  private _globalSubscribed = false;

  /** 是否已连接 */
  get connected(): boolean {
    return this._connected;
  }

  /**
   * 连接到 LCU WebSocket
   */
  async connect(credentials: LCUCredentials): Promise<void> {
    this.credentials = credentials;
    this.reconnectCount = 0;

    return this.doConnect();
  }

  /**
   * 执行 WebSocket 连接
   */
  private doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.credentials) {
        reject(new Error('缺少 LCU 凭证'));
        return;
      }

      const { port, password } = this.credentials;
      const auth = Buffer.from(`riot:${password}`).toString('base64');

      try {
        this.ws = new WebSocket(`wss://127.0.0.1:${port}`, {
          headers: {
            Authorization: `Basic ${auth}`,
          },
          rejectUnauthorized: false,
        });

        this.ws.on('open', () => {
          this._connected = true;
          this.reconnectCount = 0;
          logger.info('LCU WebSocket 连接成功');

          // 重新订阅之前的事件
          this.resubscribeAll();
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data);
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          this._connected = false;
          logger.info(`LCU WebSocket 断开: code=${code}, reason=${reason.toString()}`);
          this.emit('disconnected');
          this.tryReconnect();
        });

        this.ws.on('error', (err: Error) => {
          logger.error('LCU WebSocket 错误:', err.message);
          if (!this._connected) {
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 断开 WebSocket 连接
   */
  disconnect(): void {
    this.stopReconnect();
    this.credentials = null;

    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }

    this._connected = false;
    this._globalSubscribed = false;
    logger.info('LCU WebSocket 已断开');
  }

  /**
   * 订阅 LCU 事件
   * @param uri 事件 URI（如 /lol-gameflow/v1/session）
   * @param handler 事件处理函数
   */
  subscribe(uri: string, handler: (event: LCUEvent) => void): void {
    if (!this.subscriptions.has(uri)) {
      this.subscriptions.set(uri, new Set());
    }

    this.subscriptions.get(uri)!.add(handler);
    logger.debug(`注册 LCU 事件处理器: ${uri}`);

    // 确保全局订阅已发送
    this.ensureGlobalSubscription();
  }

  /**
   * 取消订阅 LCU 事件
   */
  unsubscribe(uri: string, handler?: (event: LCUEvent) => void): void {
    const handlers = this.subscriptions.get(uri);
    if (!handlers) return;

    if (handler) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscriptions.delete(uri);
      }
    } else {
      this.subscriptions.delete(uri);
    }

    logger.debug(`取消 LCU 事件处理器: ${uri}`);
  }

  /**
   * 处理 WebSocket 消息
   * LCU 推送格式: [8, "OnJsonApiEvent", { uri, eventType, data }]
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());

      // WAMP 协议事件消息格式: [messageType, eventName, eventData]
      if (!Array.isArray(message) || message[0] !== WAMP_EVENT) return;

      const eventData = message[2] as {
        uri: string;
        eventType: 'Create' | 'Update' | 'Delete';
        data: unknown;
      };

      if (!eventData || !eventData.uri) return;

      logger.debug(`LCU 事件: ${eventData.eventType} ${eventData.uri}`);

      const lcuEvent: LCUEvent = {
        uri: eventData.uri,
        eventType: eventData.eventType,
        data: eventData.data,
      };

      // 按 URI 分发到对应的 handler
      const handlers = this.subscriptions.get(eventData.uri);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(lcuEvent);
          } catch (err) {
            logger.error(`LCU 事件处理器错误 (${eventData.uri}):`, err);
          }
        }
      }

      // 发出通用事件（转发到渲染进程）
      this.emit('event', lcuEvent);
    } catch {
      // 忽略非 JSON 消息
    }
  }

  /**
   * 确保已发送全局 OnJsonApiEvent 订阅
   * LCU WAMP 1.0 协议：订阅 OnJsonApiEvent 接收所有 JSON API 事件，
   * 然后在客户端按 uri 字段路由到对应 handler
   */
  private ensureGlobalSubscription(): void {
    if (this._globalSubscribed) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify([WAMP_SUBSCRIBE, GLOBAL_EVENT_NAME]));
    this._globalSubscribed = true;
    logger.info(`WAMP 全局订阅已发送: ${GLOBAL_EVENT_NAME}`);
  }

  /**
   * 重连后重新发送全局订阅
   */
  private resubscribeAll(): void {
    this._globalSubscribed = false;
    if (this.subscriptions.size > 0) {
      this.ensureGlobalSubscription();
      logger.info(`重连后重新订阅，当前监听 ${this.subscriptions.size} 个 URI`);
    }
  }

  /**
   * 尝试重连
   */
  private tryReconnect(): void {
    if (!this.credentials || this.reconnectTimer) return;

    if (
      WS_RECONNECT_CONFIG.maxRetries > 0 &&
      this.reconnectCount >= WS_RECONNECT_CONFIG.maxRetries
    ) {
      logger.warn('WebSocket 重连次数超过上限，停止重连');
      return;
    }

    this.reconnectCount++;
    logger.info(`WebSocket 将在 ${WS_RECONNECT_CONFIG.interval}ms 后重连 (第 ${this.reconnectCount} 次)`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.doConnect();
      } catch {
        this.tryReconnect();
      }
    }, WS_RECONNECT_CONFIG.interval);
  }

  /**
   * 停止重连
   */
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectCount = 0;
  }

  /**
   * 销毁 WebSocket 管理器
   */
  destroy(): void {
    this.disconnect();
    this.subscriptions.clear();
    this.removeAllListeners();
  }
}

/** 全局 WebSocket 单例 */
export const lcuWebSocket = new LCUWebSocket();
