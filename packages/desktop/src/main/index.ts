/**
 * Electron 主进程入口
 * 配置 BrowserWindow、应用生命周期、系统托盘、LCU 连接等
 */
import { app, BrowserWindow, Tray, Menu, nativeImage, Notification } from 'electron';
import { join } from 'path';
import { logger, cleanupOldLogs } from './utils/logger';
import { pollForLOLClient } from './utils/process';
import { lcuClient } from './lcu/client';
import { lcuWebSocket } from './lcu/websocket';
import { registerAllIpcHandlers } from './ipc/index';
import { assetCacheManager } from './assets/index';
import type { LCUEvent, GamePhase } from '@lol-assistant/shared';

/** 主窗口 */
let mainWindow: BrowserWindow | null = null;
/** 系统托盘 */
let tray: Tray | null = null;
/** LOL 客户端进程轮询取消函数 */
let cancelPoll: (() => void) | null = null;
/** 迷你窗口模式 */
let isMiniMode = false;
/** 是否正在退出应用 */
let isQuitting = false;
/** 上一次游戏阶段 */
let lastGamePhase: GamePhase = 'None';

/** 窗口尺寸配置 */
const WINDOW_CONFIG = {
  normal: { width: 1280, height: 800, minWidth: 1024, minHeight: 768 },
  mini: { width: 400, height: 300, minWidth: 300, minHeight: 200 },
} as const;

/**
 * 创建主窗口
 */
function createWindow(): void {
  const { width, height, minWidth, minHeight } = WINDOW_CONFIG.normal;

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth,
    minHeight,
    show: false,
    autoHideMenuBar: true,
    title: '英雄联盟助手',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
    logger.info('主窗口显示');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 最小化到托盘而非关闭
  mainWindow.on('close', (event) => {
    if (tray && !isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      logger.info('窗口最小化到托盘');
    }
  });

  // electron-vite HMR
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

/**
 * 创建系统托盘
 */
function createTray(): void {
  // 使用默认图标（后续替换为自定义图标）
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('英雄联盟助手');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: '迷你模式',
      type: 'checkbox',
      checked: isMiniMode,
      click: (menuItem) => {
        toggleMiniMode(menuItem.checked);
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

/**
 * 切换迷你窗口模式
 */
function toggleMiniMode(enable: boolean): void {
  if (!mainWindow) return;

  isMiniMode = enable;

  if (enable) {
    const { width, height, minWidth, minHeight } = WINDOW_CONFIG.mini;
    mainWindow.setMinimumSize(minWidth, minHeight);
    mainWindow.setSize(width, height);
    mainWindow.setAlwaysOnTop(true, 'floating');
  } else {
    const { width, height, minWidth, minHeight } = WINDOW_CONFIG.normal;
    mainWindow.setMinimumSize(minWidth, minHeight);
    mainWindow.setSize(width, height);
    mainWindow.setAlwaysOnTop(false);
  }

  logger.info(`迷你模式: ${enable ? '开启' : '关闭'}`);
}

/**
 * 发送系统原生通知
 */
function showSystemNotification(title: string, body: string): void {
  if (!Notification.isSupported()) return;
  const notification = new Notification({ title, body, silent: false });
  notification.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
  notification.show();
}

/**
 * 激活窗口（显示 + 聚焦）
 */
function activateWindow(): void {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

/**
 * 处理游戏阶段变化
 * 驱动系统通知、窗口激活和事件转发
 */
function handleGamePhaseChange(phase: GamePhase): void {
  if (phase === lastGamePhase) return;

  const previousPhase = lastGamePhase;
  lastGamePhase = phase;

  logger.info(`游戏阶段变化: ${previousPhase} -> ${phase}`);

  // 转发到渲染进程
  mainWindow?.webContents.send('game:phase-change', phase);

  // 进入选人阶段：自动激活窗口 + 系统通知
  if (phase === 'ChampSelect') {
    activateWindow();
    showSystemNotification('英雄联盟助手', '进入英雄选择阶段，已为你激活窗口');
  }

  // 对局开始：通知
  if (phase === 'InProgress' || phase === 'GameStart') {
    if (previousPhase === 'ChampSelect') {
      showSystemNotification('英雄联盟助手', '对局开始，已自动切换到对局分析');
    }
  }

  // 对局结束：通知 + 通知渲染进程刷新战绩
  if (phase === 'EndOfGame' || phase === 'WaitingForStats') {
    showSystemNotification('英雄联盟助手', '对局已结束，战绩已自动刷新');
    mainWindow?.webContents.send('game:match-ended');
  }
}

/**
 * 初始化 Gameflow WebSocket 监听
 * 主进程主动订阅 gameflow 事件以驱动通知系统
 */
function initGameflowMonitor(): void {
  const gameflowUri = '/lol-gameflow/v1/session';

  lcuWebSocket.subscribe(gameflowUri, (event: LCUEvent) => {
    const data = event.data as { phase?: string } | null;
    if (data?.phase) {
      handleGamePhaseChange(data.phase as GamePhase);
    }
  });

  logger.info('Gameflow 监听器已注册');
}

/**
 * 初始化 LCU 连接监听
 */
function initLCUConnection(): void {
  // 监听连接状态变化，转发到渲染进程
  lcuClient.on('status-change', (status: string) => {
    mainWindow?.webContents.send('lcu:connection-change', status);
  });

  lcuClient.on('connected', () => {
    logger.info('LCU 客户端已连接，初始化 WebSocket...');
    const credentials = lcuClient.getCredentials();
    if (credentials) {
      lcuWebSocket.connect(credentials).then(() => {
        // WebSocket 连接成功后注册 Gameflow 监听
        initGameflowMonitor();
      }).catch((err) => {
        logger.error('WebSocket 连接失败:', err);
      });
    }
  });

  lcuClient.on('disconnected', () => {
    lcuWebSocket.disconnect();
    lastGamePhase = 'None';
    // 重新开始轮询
    startProcessPolling();
  });

  // 转发 WebSocket 事件到渲染进程
  lcuWebSocket.on('event', (event: unknown) => {
    mainWindow?.webContents.send('lcu:event', event);
  });
}

/**
 * 启动 LOL 客户端进程轮询
 */
function startProcessPolling(): void {
  if (cancelPoll) {
    cancelPoll();
  }

  logger.info('开始轮询检测 LOL 客户端进程...');
  cancelPoll = pollForLOLClient(async () => {
    logger.info('检测到 LOL 客户端进程，尝试连接...');
    try {
      await lcuClient.connect();
    } catch (err) {
      logger.warn('连接 LCU 失败，将继续轮询:', err);
      // 连接失败，启动重连
      lcuClient.startReconnect();
    }
  });
}

/**
 * 注册所有 IPC 处理器
 */
function registerIpcHandlers(): void {
  registerAllIpcHandlers();
}

/**
 * 应用初始化
 */
async function initApp(): Promise<void> {
  logger.info('应用启动...');

  // 清理过期日志
  cleanupOldLogs();

  // 初始化静态资源缓存
  try {
    await assetCacheManager.init();
    logger.info('静态资源缓存初始化完成');
  } catch (err) {
    logger.error('静态资源缓存初始化失败:', err);
  }

  // 注册 IPC 处理器
  registerIpcHandlers();

  // 创建窗口
  createWindow();

  // 创建系统托盘
  createTray();

  // 初始化 LCU 连接
  initLCUConnection();

  // 启动进程轮询
  startProcessPolling();
}

// ---- 应用生命周期 ----

app.whenReady().then(() => {
  initApp().catch((err) => {
    logger.error('应用初始化失败:', err);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;

  // 清理资源
  if (cancelPoll) {
    cancelPoll();
    cancelPoll = null;
  }
  lcuWebSocket.destroy();
  lcuClient.destroy();

  if (tray) {
    tray.destroy();
    tray = null;
  }

  logger.info('应用退出');
});

// 导出主窗口引用供其他模块使用
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export { toggleMiniMode };
