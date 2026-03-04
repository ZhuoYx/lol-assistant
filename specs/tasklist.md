# 英雄联盟助手工具 - 实施计划

## 概述

本文档基于需求文档和技术设计文档生成，涵盖首期开发的所有任务。技术栈：Vue3 + TypeScript + Electron + Naive UI + pnpm workspace (Monorepo)。

**构建工具说明:** 使用 electron-vite 统一管理主进程、preload、渲染进程的构建配置。

---

## 任务依赖关系

```
Task 1 (项目初始化)
  ├─> Task 1.5 (静态资源) ───────────────────────────────────────────────┐
  └─> Task 2 (shared 包) ─> Task 3 (Electron 主进程)                     │
                                  ├─> Task 3.5 (第三方数据爬取) ───────┐  │
                                  └─> Task 4 (IPC + 缓存 + Preload) <─┘  │
                                        └─> Task 5 (渲染进程基础架构) <───┘
                                              ├─> Task 6 (页面与组件)
                                              │     ├─> Task 7a (对局实时分析)
                                              │     ├─> Task 7b (选人助手)
                                              │     ├─> Task 7c (符文与装备推荐)
                                              │     └─> Task 8 (窗口管理 + 通知 + 引导)
                                              └─> Task 9 (局域网代理, 可选)
                                                    └─> Task 10 (打包 + 自动更新 + 优化)

注：
- Task 3.5 与 Task 4 可并行开发，Task 4 不依赖 Task 3.5
- Task 7a/7b/7c 可并行开发
- Task 7a/7b/7c 和 Task 8 均依赖 Task 6
```

---

- [x] 1. 项目初始化与 Monorepo 架构搭建 ✅
  - 创建项目根目录，初始化 pnpm workspace 配置
  - 创建根目录 package.json、pnpm-workspace.yaml、tsconfig.json、.gitignore
  - 创建 packages/shared 共享包：初始化 package.json，配置 TypeScript，创建 src 目录结构（types/utils/constants/api）
  - 创建 packages/desktop Electron 桌面端包：初始化 package.json，配置 Electron、electron-vite、Vue3、Naive UI、Cheerio、electron-log、electron-updater、p-limit 依赖
  - 配置 electron-vite（electron.vite.config.ts）统一管理主进程、preload、渲染进程构建
  - 配置 electron-builder 用于打包
  - 配置 ESLint 和 Prettier
  - 参考：设计文档 - Monorepo 架构设计 / 项目目录结构

- [x] 1.5. 静态资源集成（Data Dragon） ✅
  - 集成 Riot Data Dragon 获取英雄图标、装备图标、段位图标、召唤师头像等资源
  - 集成 CommunityDragon 获取英雄/装备/符文元数据（JSON 格式，完全开放）
  - 实现静态资源本地缓存策略（首次下载后缓存到本地）
  - 定义资源 URL 生成工具函数
  - **依赖:** 无，可与 Task 1 并行开发，需在 Task 5 前完成
  - 参考：REQ-003、REQ-005

- [x] 2. shared 包完整实现 ✅
  - 类型定义：创建 summoner.ts、match.ts、rank.ts、champion.ts、live-game.ts（含 LiveGamePlayer.dataStatus 字段）、scraper.ts、common.ts、error.ts（含 SCRAPER_*、LIVE_GAME_* 错误码），定义所有数据模型接口和错误类型枚举
  - 工具函数：创建 format.ts（日期、数字格式化）、calculate.ts（KDA、胜率、击杀参与率计算）、cache.ts（缓存条目创建、过期检测、清理）
  - 常量数据：创建 champions.ts（英雄 ID 映射）、items.ts（装备 ID 映射）、queues.ts（游戏模式/队列类型）、cache.ts（缓存 TTL 和大小上限配置）、champion-counters.ts（内置静态英雄克制关系表，作为兜底数据）
  - API 接口定义：创建 IAPIProvider 接口（含 getLiveGameAnalysis、getSummonerByPUUID、getMatchListByPUUID）、IChampionDataScraper 接口、LCU API 端点常量
  - 统一导出所有模块
  - 运行 TypeScript 编译检查，确保无类型错误
  - **依赖:** Task 1
  - 参考：设计文档 - shared 包结构 / 数据模型 / 缓存策略 / 第三方数据爬取模块

- [x] 3. Electron 主进程基础实现 ✅
  - 创建主进程入口 src/main/index.ts，配置 BrowserWindow（含 Always-on-Top 支持、迷你模式窗口尺寸）、应用生命周期事件、系统托盘
  - 实现进程检测工具 src/main/utils/process.ts（LOL 客户端进程检测，读取 --install-directory 参数）
  - 实现日志模块 src/main/utils/logger.ts（electron-log 封装，日志按日切割，保留 7 天）
  - 实现 lockfile 解析模块 src/main/lcu/lockfile.ts（动态路径检测 + 备选静态路径列表）
  - 实现 LCU 客户端连接模块 src/main/lcu/client.ts（连接、断开、重连、HTTPS 请求封装、自签名证书处理）
  - 实现 LCU WebSocket 模块 src/main/lcu/websocket.ts（事件订阅，用于选人助手、对局分析等实时功能）
  - 实现客户端启动前的轮询检测机制（每 3 秒检测进程）
  - 实现 LCU API 封装模块 src/main/lcu/api.ts（含查询其他玩家战绩、英雄熟练度等接口）
  - **依赖:** Task 2
  - 参考：设计文档 - Electron 主进程设计 / LCU 连接模块 / WebSocket 设计

- [x] 3.5. 第三方数据爬取模块实现 ✅
  - 实现爬取器统一接口 src/main/scraper/index.ts（IChampionDataScraper）
  - 实现爬取数据分片存储 src/main/scraper/storage.ts（独立 JSON 文件按 {championId}_{role} 分片，避免 electron-store 大文件性能瓶颈）
  - 实现 OP.GG 爬取器 src/main/scraper/opgg.ts：
    - 分析 OP.GG 内部 API 端点（优先方案）或 HTML 页面 + Cheerio 解析（备选方案）
    - 实现英雄 Tier 列表、构建数据（符文/出装/技能加点）、克制关系的数据提取
    - 处理 User-Agent、Referer 等请求头模拟
  - 实现 Lolalytics 爬取器 src/main/scraper/lolalytics.ts（备选数据源）
  - 实现数据更新调度器 src/main/scraper/scheduler.ts（版本更新触发、最短 6 小时刷新间隔、3 天数据过期）
  - 实现多数据源降级策略：缓存 -> OP.GG -> Lolalytics -> 本地静态数据
  - **依赖:** Task 3（可与 Task 4 并行开发）
  - 参考：设计文档 - 第三方数据爬取模块设计 / 5.1 爬取数据存储方案

- [x] 4. IPC 通信、缓存与 Preload 实现 ✅
  - 创建 IPC 处理器注册模块及各处理器（connection、summoner、match、rank、cache、live-game、scraper、window、updater、log、app）
  - 实现 WebSocket 事件转发 IPC 通道（lcu:subscribe、lcu:unsubscribe、lcu:event）
  - 实现缓存存储模块 src/main/cache/store.ts（electron-store，含缓存总大小 50MB 上限控制、LRU 淘汰，仅用于 LCU 数据缓存）
  - 创建 Preload 脚本 src/preload/index.ts（contextBridge 暴露全部 IPC API，**所有事件监听器须返回 unsubscribe 函数防止内存泄漏**）
  - 运行 Electron 应用验证窗口和 IPC 通信正常
  - **依赖:** Task 3（不依赖 Task 3.5，可并行）
  - 参考：设计文档 - IPC 通信设计 / Preload 脚本设计 / 本地缓存设计

- [x] 5. 渲染进程基础架构 ✅
  - 创建 Vue3 应用入口 src/renderer/src/main.ts，引入 Naive UI
  - 创建根组件 App.vue 和基础布局（侧边栏、主内容区、状态栏），设置窗口最小尺寸 1024x768
  - 实现迷你窗口模式的独立布局（悬浮小窗，仅显示关键信息）
  - 配置路由 src/renderer/src/router/index.ts（含 LiveGame、DraftAssistant、Welcome 引导页路由）
  - 配置 Pinia 状态管理，实现各 Store（app、summoner、match、rank、champion、live-game）
  - 创建 LCUAPIProvider 实现及 API 统一导出
  - 实现组合式函数（useLCU、useCache、useMatchHistory、useLiveGame、useScraperData），**组件 onUnmounted 时调用 Preload 返回的 unsubscribe 清理事件监听**
  - 配置全局样式和 Naive UI 主题（明暗主题）
  - 实现键盘快捷键（F5 刷新、Ctrl+W 关闭、Escape 返回）
  - **依赖:** Task 4, Task 1.5
  - 参考：设计文档 - 渲染进程设计 / 状态管理设计 / API 层设计

- [ ] 6. 页面与组件实现
  - 通用组件：ConnectionStatus（连接状态）、LoadingSpinner、ErrorDisplay（错误+重试，支持爬取降级提示）、TierIcon（段位图标）、ChampionIcon（英雄图标）、EmptyState（空状态提示）、PlayerCard（玩家信息卡片，含段位/胜率/英雄熟练度/dataStatus 失败占位符）
  - 首页（Home.vue）：整合召唤师信息卡片（SummonerCard）、段位信息卡片（RankCard）
  - 战绩页（MatchHistory.vue）：战绩列表（MatchList + MatchListItem，含无限滚动/下拉刷新）、筛选组件（MatchFilter）、详情组件（MatchDetail + ParticipantRow）、空战绩提示、数据不完整容错、支持从对局分析页跳转查看他人战绩（通过 PUUID）
  - 排位页（Rank.vue）：排位信息卡片（RankedCard）、胜点变化图表（LPChart）
  - 英雄统计页（ChampionStats.vue）：英雄列表（ChampionStatsList + ChampionStatsItem，含排序/搜索）、英雄详情（ChampionDetail）
  - 设置页（Settings.vue）：主题切换、缓存管理（显示缓存大小、清理按钮）、窗口置顶开关（含 LOL 无边框窗口模式提示）、迷你模式开关、自动更新开关、导出日志按钮、第三方数据管理（数据版本、手动刷新按钮）、重新引导按钮
  - **依赖:** Task 5
  - 参考：REQ-002~005、REQ-009

- [ ] 7a. 对局实时分析
  - 通过 LCU WebSocket 监听 gameflow-phase（/lol-gameflow/v1/session），自动检测进入 InProgress 阶段
  - 实现 10 人数据并发获取逻辑（使用 p-limit 控制并发数 ≤5，Promise.allSettled 容错）
  - 实现 LiveGame.vue 页面和组件（LiveGamePanel、PlayerCard 列表）
  - 用颜色标记对手实力水平（高于/低于/接近自己段位）
  - 点击玩家可跳转查看该玩家详细战绩（REQ-003.2）
  - 部分玩家数据获取失败时显示"数据获取失败"占位符
  - 实现从选人阶段到对局加载阶段的自动视图过渡
  - **依赖:** Task 6
  - 参考：REQ-008、设计文档 3.2

- [ ] 7b. 选人助手
  - 实现英雄选择状态监听（通过 LCU WebSocket 订阅 /lol-champ-select/v1/session）
  - 使用第三方爬取数据（OP.GG/Lolalytics）+ 玩家英雄池 + 本地静态数据进行推荐
  - 实现选人助手页面和组件（DraftAssistant、TeamComposition、CounterSuggestion）
  - 标注数据来源（"OP.GG"/"Lolalytics"/"本地数据"）和数据版本
  - 爬取数据不可用时自动降级到本地静态克制关系表
  - **依赖:** Task 6
  - 参考：REQ-006

- [ ] 7c. 符文与装备推荐
  - 展示第三方热门配置（OP.GG/Lolalytics 爬取的符文+出装，含胜率和使用率）
  - 展示玩家个人常用配置（LCU API）
  - 无数据时展示内置默认推荐配置（兜底）
  - 实现符文页创建 IPC 处理器（调用 LCU API POST /lol-perks/v1/pages）
  - 实现符文配置组件（RuneDisplay + 一键应用按钮）和装备推荐组件（ItemBuild）
  - 配置来源标注（"OP.GG 热门"/"个人常用"/"默认推荐"）
  - **依赖:** Task 6
  - 参考：REQ-007

- [ ] 8. 窗口管理、通知与首次引导
  - 实现窗口置顶功能（BrowserWindow.setAlwaysOnTop），首次开启时提示 LOL 无边框窗口模式
  - 实现迷你窗口模式切换（调整窗口尺寸和布局）
  - 实现最小化到系统托盘（Tray + 右键菜单）
  - 实现游戏状态变化通知：
    - 进入选人阶段时自动激活窗口 + 系统通知
    - 对局结束时发送通知 + 自动刷新战绩
    - 选人阶段结束后自动过渡到对局分析视图
  - 通过 LCU WebSocket 监听 gameflow-phase 变化驱动通知
  - 实现首次启动引导流程（Welcome.vue）：
    - 欢迎页面 + 核心功能介绍
    - LOL 客户端安装路径确认（自动检测 + 手动指定）
    - 偏好设置（窗口置顶、无边框窗口提示）
    - 引导完成标记（electron-store 持久化）
    - 设置页"重新引导"入口
  - **依赖:** Task 6
  - 参考：REQ-010、REQ-012

- [ ] 9. 局域网代理功能（可选）
  - 实现 HTTP 代理服务器（原生 Node.js http 模块，不引入 express）
  - 实现代理服务器管理（启动/停止 IPC、本机 IP 获取、二维码生成）
  - 在设置页添加局域网代理开关（含安全提示、访问地址和二维码显示）
  - **依赖:** Task 6
  - 参考：设计文档 - 局域网代理设计 / REQ-016

- [ ] 10. 打包、自动更新与应用优化
  - 配置 electron-builder Windows 打包选项和应用图标
  - 配置 package.json 构建命令，测试打包流程
  - 实现自动更新模块 src/main/updater/index.ts（electron-updater 封装，provider 配置为 GitHub Releases）
  - 配置 GitHub Releases 作为更新分发渠道
  - 更新检查失败时静默跳过，不影响正常使用
  - 性能优化：组件渲染优化、大数据列表虚拟滚动
  - 内存优化：检查内存泄漏（重点检查事件监听器清理）、优化缓存策略
  - 启动速度优化：优化应用启动时间（目标 < 3 秒）
  - 最终功能完整性验证
  - **依赖:** Task 7a, Task 7b, Task 7c, Task 8, Task 9
  - 参考：非功能性需求 - 性能要求 / REQ-011

---

*文档版本: v1.3*
*更新时间: 2026-03-03*
