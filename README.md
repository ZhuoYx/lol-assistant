# 英雄联盟助手工具 (LOL Assistant)

一款英雄联盟桌面端助手工具，通过连接本地客户端（LCU API）提供战绩查询、排位信息查看、对局实时分析、选人助手等功能。

## 功能特性

- **客户端自动连接** - 自动检测英雄联盟客户端进程，读取 lockfile 建立 LCU API 连接
- **召唤师信息展示** - 查看召唤师头像、名称、等级、段位、胜点信息
- **战绩查询** - 查看个人及对局中其他玩家的历史战绩，支持筛选和分页加载
- **排位信息** - 单排/灵活组排段位、胜率、胜点变化趋势
- **英雄数据统计** - 各英雄使用次数、胜率、KDA、常用装备和符文配置
- **选人助手** - 英雄选择阶段自动激活，基于第三方数据 + 个人英雄池推荐英雄和克制建议
- **符文与装备推荐** - 热门符文/出装配置展示，支持一键应用符文到客户端
- **对局实时分析** - 自动获取对局中 10 名玩家的段位、胜率、英雄熟练度等数据
- **窗口管理** - 窗口置顶、迷你模式、最小化到系统托盘
- **静态资源集成** - Data Dragon / CommunityDragon 英雄图标、装备图标、段位图标本地缓存
- **自动更新** - 基于 GitHub Releases 的应用自动更新

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 桌面框架 | Electron 33 | 主进程 + 渲染进程架构 |
| 前端框架 | Vue 3.5 + TypeScript 5.6 | 组件化开发 |
| 状态管理 | Pinia | 轻量级状态管理 |
| 构建工具 | electron-vite + Vite 5 | 统一管理主进程/preload/渲染进程构建 |
| UI 组件库 | Naive UI | TypeScript 友好、主题定制灵活 |
| 本地存储 | electron-store | 配置和缓存持久化 |
| HTTP 客户端 | Axios | API 请求封装 |
| 数据爬取 | Cheerio | 第三方数据源 HTML 解析 |
| 日志 | electron-log | 应用日志记录 |
| 自动更新 | electron-updater | 应用自动更新 |

## 项目结构

```
lol-assistant/
├── packages/
│   ├── shared/                # 共享代码包（类型、工具函数、常量）
│   │   └── src/
│   │       ├── types/         # 类型定义（召唤师、战绩、排位、英雄等）
│   │       ├── utils/         # 工具函数（格式化、计算、缓存、资源URL）
│   │       ├── constants/     # 常量数据（英雄/装备映射、缓存配置）
│   │       └── api/           # API 接口定义
│   └── desktop/               # Electron 桌面端
│       └── src/
│           ├── main/          # 主进程（LCU连接、爬取、缓存、IPC）
│           ├── preload/       # Preload 脚本（IPC 桥接）
│           └── renderer/      # 渲染进程（Vue3 前端）
├── specs/                     # 需求文档、设计文档、任务列表
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

## 环境要求

- **Node.js** >= 18.0.0
- **pnpm** >= 9.0.0

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# 构建 shared 包
pnpm build:shared

# 启动 Electron 开发模式（含热更新）
pnpm dev:desktop
```

### 构建

```bash
# 构建 shared 包
pnpm build:shared

# 构建 desktop 包
pnpm build:desktop

# 打包 Windows 安装程序
pnpm --filter @lol-assistant/desktop build:win
```

### 代码检查

```bash
# ESLint 检查
pnpm lint

# ESLint 自动修复
pnpm lint:fix

# Prettier 格式化
pnpm format
```

## 数据来源

| 数据类型 | 来源 | 说明 |
|----------|------|------|
| 玩家数据 | LCU API | 本地客户端接口，无频率限制 |
| 英雄/装备图标 | Riot Data Dragon | 官方静态资源 CDN |
| 英雄/装备/符文元数据 | CommunityDragon | 社区维护的 JSON API |
| 热门配置/克制数据 | OP.GG / Lolalytics | 第三方数据爬取 |

## 使用说明

1. 启动英雄联盟客户端并登录
2. 启动本工具，将自动检测并连接客户端
3. 连接成功后即可使用战绩查询、排位信息等功能
4. 进入英雄选择阶段时自动激活选人助手
5. 进入对局加载时自动展示对局分析

> **提示**: 建议将英雄联盟设置为「无边框窗口」模式，以获得窗口置顶和迷你模式的最佳体验。

## License

Private - All Rights Reserved
