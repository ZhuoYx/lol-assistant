# GitHub 发布与自动更新

当前版本为 **1.0.1**，更新源为公开仓库 [ZhuoYx/lol-assistant 的 Releases](https://github.com/ZhuoYx/lol-assistant/releases)。版本显示取自主进程 `app.getVersion()`，与安装包内的版本一致。

## 安装后的行为

- 自动更新默认开启。启动 5 秒后检查，之后每 4 小时检查一次；仅接收更高版本的正式版，不降级或接收预发布版。
- 有新版本时后台下载，由 electron-updater 校验更新清单中的校验和；进度和结果在设置中显示，切换页面不丢失。
- 下载完成后可以点击「立即重启」，或在正常退出助手时安装。不会在游戏过程中主动关闭助手。
- 关闭自动更新后，不再定时检查或自动开始下载，也不会在退出时自动安装；仍可手动检查、下载和安装。正在下载的任务可继续完成。
- 开关保存于主进程的本地设置，重启后继续生效。开发模式禁用自动更新，避免安装器覆盖开发环境。
- 网络失败、没有 Release、缺少更新文件均明确提示，不会显示成「已是最新版本」。详细错误会记录到可导出的日志中。

## 发布新版本

1. 将根目录、`packages/desktop` 和 `packages/shared` 的 `package.json` 中的版本一起改为新的 `x.y.z`，例如 `1.0.1`。无需修改锁文件中的依赖版本。
2. 完成代码提交并推送，然后创建和推送同版本标签：

   ```powershell
   git tag v1.0.1
   git push origin v1.0.1
   ```

3. GitHub Actions 的「Windows 发布」工作流验证标签、构建、执行检查，然后使用当前仓库的临时 `GITHUB_TOKEN` 创建 Release 草稿并上传：
   - `lol-assistant-1.0.1-x64-setup.exe`
   - 同名 `.exe.blockmap`
   - `latest.yml`
4. 下载草稿中的安装程序验证，填写更新说明，再点击 **Publish release**。草稿不触发客户端更新，发布后客户端才会发现新版本。使用正式版 Release，保留全部三个更新文件。

仓库需要保持公开，普通用户无需 GitHub 登录或令牌。发布凭证仅由工作流注入，不写入源码、安装包或客户端配置。仓库的 Actions 必须允许工作流写入 Releases；本工作流已声明 `contents: write`。若要移动更新仓库，应先在旧更新源发布包含新地址的过渡版本。

## 本地打包与验证

```powershell
pnpm build:desktop:win
```

本地打包使用 `--publish never`，不会上传。安装包和更新文件在 `packages/desktop/release`。`win-unpacked/resources/app-update.yml` 中应包含正确的 GitHub owner/repo，`latest.yml` 中版本应与安装包一致。

1.0.0 是接通此更新源的首个版本。旧的 0.1.0 包内配置过占位仓库地址，需要先手动安装一次 1.0.0；之后可通过本功能升级至 1.0.1 及更高版本。

流程使用 [electron-builder / electron-updater 官方自动更新方案](https://www.electron.build/docs/features/auto-update/)。
