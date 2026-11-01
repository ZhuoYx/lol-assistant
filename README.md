# 英雄联盟助手（LOL Assistant）

连接本地英雄联盟客户端的 Windows 桌面助手，提供战绩查询、对局分析、选人建议、符文出装、英雄排名和海克斯大乱斗强化推荐。

**当前版本：1.0.0 · 平台：Windows x64**

[下载已发布版本](https://github.com/ZhuoYx/lol-assistant/releases) · [自动更新与发布说明](docs/releasing.md)

## 功能

| 模块       | 当前支持                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------- |
| 首页       | 召唤师头像、Riot ID、等级、单双排与灵活组排段位，以及最近 8 场战绩                             |
| 战绩       | 查询自己或其他召唤师的战绩，按模式筛选、服务端分页，查看双方出装、战斗数据、统计图表与六维对比 |
| 对局分析   | 展示双方阵容、玩家名称、段位和近期表现；单双排与灵活排位显示对位技能 CD 信息                   |
| 选人助手   | 展示选人阶段的双方阵容、禁用英雄、克制建议；支持大乱斗备选英雄展示与交换                       |
| 符文出装   | 按英雄和分路查看符文、装备、技能加点及统计数据，支持收藏英雄和一键应用符文                     |
| 英雄排名   | 按位置、段位查看所选攻略来源的英雄强度、胜率与热度                                             |
| 海克斯推荐 | 按英雄展示棱彩、黄金、白银强化推荐、来源评级和登场率，并提供来源链接                           |
| 设置       | 外观、自动接受对局及延迟、个性签名、藏品背景、攻略来源、缓存管理、自动更新和日志导出           |

### 外观与客户端联动

- 浅色、深色、跟随系统三种主题，统一的玻璃磨砂卡片，可调节卡片透明度和磨砂强度。
- 内置金克丝与拉克丝的动漫插画、亚索与永恩的水墨插画、提莫与露露的奇幻插画，以及纯净渐层背景。
- 自动检测并连接客户端；首次引导可选择英雄联盟安装路径，侧边栏支持搜索召唤师。
- 海克斯大乱斗选定英雄后，自动进入海克斯推荐页；重随或交换英雄后同步当前英雄。
- 英雄、装备、技能等图标支持本地缓存。关闭窗口会收起到系统托盘，可通过托盘菜单显示窗口或退出。

### 战绩与统计

战绩页每页向服务器请求 10 场记录，切换模式时从对应模式的第一页开始查询。首页的最近 8 场战绩独立请求，不受战绩页筛选条件影响。

战绩服务通过 SGP 获取分页与模式筛选数据，并在适用情况下兼容 LCU 接口。列表不预取每场详情，对局详情按需加载并可复用缓存。

- **战斗数据**：双方参战玩家、KDA、装备与表现标签，例如输出最高、承伤最高、治疗队友最多。
- **统计图表**：选择接口提供的指标，按双方队伍展示各玩家的横向柱状对比，包括伤害、承伤、治疗、队友护盾、经济、补刀和视野等。
- **六维对比**：比较输出、承伤、经济、参团、视野与控制；默认展示两队平均面板，可勾选各队玩家叠加查看，使用统一比例与实线。

更早战绩、玩家名称和具体统计字段的可用性取决于客户端、大区接口及对局类型。缺失数据不补成有效统计值，无法继续分页时会显示对应状态或错误。

## 使用

1. 从 [GitHub Releases](https://github.com/ZhuoYx/lol-assistant/releases) 下载已发布的 Windows x64 安装程序并安装。
2. 启动英雄联盟客户端并登录，再启动助手，按首次引导完成安装路径设置。
3. 连接成功后查看首页、战绩，或搜索其他召唤师。客户端进入相应阶段后，助手会同步选人和对局状态。
4. 在攻略模块或「设置 → 第三方数据」切换攻略来源；默认使用 **OP.GG · 韩服**，也可选择 **101.qq.com · 国服**。
5. 遇到问题时，在「设置 → 关于 → 导出日志」选择保存位置，导出诊断 TXT。

当前 Windows 安装包配置为请求管理员权限。源码开发时，如无法读取国服客户端的进程凭据，可在管理员终端中启动开发环境。

日志导出包含近 7 天日志、应用版本和基础系统信息，会隐藏连接令牌、认证头等凭证；保存后可打开所在文件夹。

## 数据来源

| 数据                         | 来源与用途                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| 召唤师、排位、选人和当前对局 | 本地英雄联盟客户端 LCU API                                                                      |
| 历史战绩分页与模式筛选       | 当前客户端登录态对应的 SGP 战绩服务，兼容 LCU 战绩接口                                          |
| 符文出装、克制建议、英雄排名 | [OP.GG](https://www.op.gg/) 或 [101.qq.com](https://101.qq.com/)，由用户切换，分别维护缓存      |
| 海克斯大乱斗强化推荐         | [ARAMMayhem](https://arammayhem.com/zh-cn/)，按英雄读取推荐，保留来源评级、登场率和原始页面链接 |
| 图标与游戏元数据             | Riot Data Dragon、CommunityDragon，以及推荐来源提供的强化图标                                   |
| 安装包与应用更新             | 当前仓库的 GitHub Releases                                                                      |

海克斯推荐使用独立的数据来源。来源未提供的数据会显示缺失状态；网络失败时若有可用推荐缓存，会标注缓存状态。

## 源码开发

### 环境

- Windows x64。
- Node.js 22、pnpm 9，与当前发布工作流一致。
- 已安装并可登录的英雄联盟客户端，用于验证 LCU 连接和真实对局数据。

### 安装与启动

在仓库根目录执行：

```powershell
pnpm install --frozen-lockfile
pnpm build:shared
pnpm dev:desktop
```

开发模式由 electron-vite 提供热更新。修改共享包后需要重新构建 `shared`，也可在另一个终端运行共享包监听：

```powershell
pnpm --filter @lol-assistant/shared dev
```

### 构建与打包

```powershell
# 构建共享包及桌面端代码
pnpm build:shared
pnpm build:desktop

# 生成 Windows 安装包，包含共享包构建
pnpm build:desktop:win

# 生成未封装为安装程序的 Windows 应用目录
pnpm build:desktop:unpack
```

桌面端代码输出到 `packages/desktop/out/`，Windows 打包结果输出到 `packages/desktop/release/`。安装程序命名为 `lol-assistant-<版本>-x64-setup.exe`。

本地安装包构建使用 `--publish never`，不会上传到 GitHub。安装时切换到其他磁盘或父目录，会保留 `lol-assistant` 子目录，例如选择 `D:\` 后显示 `D:\lol-assistant`；更新安装会沿用已有安装位置。

### 检查

先运行 `pnpm build:shared`，再执行所需检查：

```powershell
# 主进程与渲染进程类型检查
pnpm --filter @lol-assistant/desktop typecheck:node
pnpm --filter @lol-assistant/desktop typecheck:web

# 数据处理、分页、缓存、日志等检查
node packages/desktop/scripts/check-data.cjs

# 更新状态、下载、安装和开关持久化检查
node packages/desktop/scripts/check-updater.cjs

# 安装路径识别、进程解析与引导选择检查
node packages/desktop/scripts/check-path.cjs

# 发布版本、标签和仓库配置检查
node packages/desktop/scripts/check-release.cjs

# 代码风格
pnpm lint
pnpm format
```

检查脚本使用模拟边界或测试数据；更新检查脚本不会下载或安装真实更新。

## 自动更新与发布

设置中的「当前版本」读取实际应用版本。自动更新默认开启，安装版启动 5 秒后检查，此后每 4 小时检查一次，仅接收更高版本的正式版。

发现更新后后台下载，下载完成后可点击「立即重启」，也可正常退出助手后安装。关闭自动更新会停止定时检查、自动开始下载和退出时安装，仍可手动更新。开关在重启后继续生效，开发模式禁用下载安装。

推送与包版本一致的 `v<版本>` 标签后，GitHub Actions 会验证、构建，并将安装包、`.blockmap` 和 `latest.yml` 上传至 **Release 草稿**。检查草稿并发布后，客户端才能发现该更新。

旧版 `0.1.0` 配置过占位更新地址，需要先手动安装一次 `1.0.0`，之后才能通过该更新源升级。

完整步骤见 [发布文档](docs/releasing.md)。

## 技术与结构

主要技术：Electron、Vue 3、TypeScript、Pinia、Naive UI、electron-vite / Vite、Axios、node-html-parser、electron-store、electron-log、electron-updater 与 electron-builder。

```text
lol-assistant/
├── .github/workflows/release.yml    # Windows 构建与 Release 草稿工作流
├── docs/releasing.md               # 自动更新及发布说明
├── packages/
│   ├── desktop/
│   │   ├── electron-builder.json    # Windows 安装包和 GitHub 更新源配置
│   │   ├── resources/               # 应用图标等打包资源
│   │   ├── scripts/                 # 数据、更新检查与本地界面预览脚本
│   │   └── src/
│   │       ├── main/               # LCU / SGP、攻略、缓存、更新、日志与 IPC
│   │       ├── preload/            # 主进程与渲染进程之间的接口桥接
│   │       └── renderer/src/       # Vue 页面、组件、状态与样式
│   └── shared/src/
│       ├── api/                    # 共享接口
│       ├── constants/              # 英雄、装备、模式等常量
│       ├── types/                  # 数据和 IPC 结果类型
│       └── utils/                  # 格式化、战绩指标与对比计算
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

`specs/` 用于本地需求记录和界面验证，已排除 Git 提交；构建产物、安装包、运行日志和运行时缓存也不提交。局域网代理代码保留，设置入口暂未开放。

## 许可

All Rights Reserved。当前仓库未附带开源许可证。
