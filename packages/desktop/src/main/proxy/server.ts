/**
 * 局域网代理服务器
 * 使用原生 Node.js http 模块，将 LCU API 代理到局域网
 * 允许同一局域网下的其他设备（如手机）通过 HTTP 访问英雄联盟助手数据
 */
import { createServer, IncomingMessage, ServerResponse, Server } from 'http';
import { networkInterfaces } from 'os';
import { logger } from '../utils/logger';
import { lcuClient } from '../lcu/client';

/** 代理服务器配置 */
const PROXY_CONFIG = {
  /** 默认端口 */
  port: 9527,
  /** 绑定地址（0.0.0.0 = 所有网卡） */
  host: '0.0.0.0',
} as const;

/** 代理服务器状态 */
export interface ProxyStatus {
  running: boolean;
  port: number;
  localIP: string | null;
  address: string | null;
}

/**
 * 局域网代理服务器
 */
class LANProxyServer {
  private server: Server | null = null;
  private _running = false;
  private _port = PROXY_CONFIG.port;

  /** 是否正在运行 */
  get running(): boolean {
    return this._running;
  }

  /**
   * 启动代理服务器
   */
  start(): Promise<ProxyStatus> {
    return new Promise((resolve, reject) => {
      if (this._running) {
        resolve(this.getStatus());
        return;
      }

      this.server = createServer((req, res) => {
        this.handleRequest(req, res).catch((err) => {
          logger.error('代理请求处理失败:', err);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
          }
        });
      });

      this.server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          logger.error(`端口 ${this._port} 已被占用`);
          reject(new Error(`端口 ${this._port} 已被占用，请关闭占用该端口的程序后重试`));
        } else {
          logger.error('代理服务器错误:', err);
          reject(err);
        }
      });

      this.server.listen(this._port, PROXY_CONFIG.host, () => {
        this._running = true;
        const status = this.getStatus();
        logger.info(`局域网代理服务器已启动: ${status.address}`);
        resolve(status);
      });
    });
  }

  /**
   * 停止代理服务器
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server || !this._running) {
        this._running = false;
        resolve();
        return;
      }

      this.server.close(() => {
        this._running = false;
        this.server = null;
        logger.info('局域网代理服务器已停止');
        resolve();
      });

      // 强制关闭超时
      setTimeout(() => {
        if (this.server) {
          this.server.closeAllConnections?.();
          this._running = false;
          this.server = null;
          resolve();
        }
      }, 3000);
    });
  }

  /**
   * 获取代理服务器状态
   */
  getStatus(): ProxyStatus {
    const localIP = this.getLocalIPAddress();
    return {
      running: this._running,
      port: this._port,
      localIP,
      address: this._running && localIP ? `http://${localIP}:${this._port}` : null,
    };
  }

  /**
   * 处理 HTTP 请求
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');

    // 预检请求
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url || '/';

    // 代理 LCU API 请求
    if (url.startsWith('/api/')) {
      await this.handleAPIProxy(req, res, url);
      return;
    }

    // 服务器状态接口
    if (url === '/status') {
      this.handleStatus(res);
      return;
    }

    // 默认：返回简单的信息页
    this.handleIndex(res);
  }

  /**
   * 代理 LCU API 请求
   */
  private async handleAPIProxy(
    req: IncomingMessage,
    res: ServerResponse,
    url: string,
  ): Promise<void> {
    if (!lcuClient.isConnected()) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'LCU 客户端未连接',
        code: 'LCU_NOT_CONNECTED',
      }));
      return;
    }

    // 从 /api/xxx 提取 LCU API 路径
    const endpoint = url.replace(/^\/api/, '');

    try {
      // 读取请求体
      const body = await this.readBody(req);
      const method = req.method || 'GET';

      const result = await lcuClient.request(endpoint, {
        method,
        data: body ? JSON.parse(body) : undefined,
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const statusCode = message.includes('404') ? 404 : 502;
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: message,
        code: 'LCU_API_ERROR',
      }));
    }
  }

  /**
   * 服务器状态接口
   */
  private handleStatus(res: ServerResponse): void {
    const connected = lcuClient.isConnected();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      proxy: 'running',
      lcuConnected: connected,
      timestamp: Date.now(),
    }));
  }

  /**
   * 默认首页
   */
  private handleIndex(res: ServerResponse): void {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>英雄联盟助手 - 局域网代理</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', 'PingFang SC', sans-serif;
      background: #1c1c1e; color: #f5f5f7;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; padding: 20px;
    }
    .container {
      text-align: center; max-width: 480px;
    }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    p { color: #8e8e93; font-size: 15px; line-height: 1.5; margin-bottom: 24px; }
    .status {
      display: inline-block; padding: 8px 20px;
      background: rgba(48, 209, 88, 0.12); color: #30d158;
      border-radius: 20px; font-size: 14px; font-weight: 500;
    }
    .api-hint {
      margin-top: 32px; padding: 16px; background: rgba(255,255,255,0.06);
      border-radius: 12px; font-size: 13px; color: #a1a1a6; text-align: left;
    }
    code { color: #0a84ff; font-family: 'SF Mono', monospace; }
  </style>
</head>
<body>
  <div class="container">
    <h1>英雄联盟助手</h1>
    <p>局域网代理服务已启动，可通过 API 访问游戏数据。</p>
    <div class="status">服务运行中</div>
    <div class="api-hint">
      <p><strong>API 使用方式</strong></p>
      <p style="margin-top:8px">服务状态: <code>GET /status</code></p>
      <p>LCU API: <code>GET /api/lol-summoner/v1/current-summoner</code></p>
    </div>
  </div>
</body>
</html>`;

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    });
    res.end(html);
  }

  /**
   * 读取请求体
   */
  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks).toString()));
      req.on('error', reject);
    });
  }

  /**
   * 获取本机局域网 IP 地址
   */
  getLocalIPAddress(): string | null {
    const interfaces = networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name];
      if (!iface) continue;
      for (const info of iface) {
        // 跳过内部网卡和 IPv6
        if (info.internal || info.family !== 'IPv4') continue;
        // 优先返回 192.168.x.x 或 10.x.x.x 私有地址
        if (info.address.startsWith('192.168.') || info.address.startsWith('10.') || info.address.startsWith('172.')) {
          return info.address;
        }
      }
    }
    return null;
  }

  /**
   * 销毁服务器，释放资源
   */
  async destroy(): Promise<void> {
    await this.stop();
  }
}

/** 全局代理服务器单例 */
export const lanProxyServer = new LANProxyServer();
