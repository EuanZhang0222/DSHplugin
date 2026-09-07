# 安装、升级与验收（供人和智能体直接执行）

本仓库提供 **DeepSeek Harness（DSH）网页插件**。截至 2026-09-07，本次发布的运行代码已与本机正式部署逐项核对。包统一放在 [releases（发布目录）](releases/)，摘要见 [发布清单](releases/manifest.json)。子目录旧包仅为历史产物，请勿作为当前安装入口。

## 1. 环境与版本

当前核对环境：DSH `0.1.3-alpha.1`（测试版本）、Node.js（运行时）`24.19.0`、Windows。宿主声明的运行时要求为 `^22.19.0 || >=24.0.0`。其他宿主版本、macOS 和 Linux 未在本轮重新安装验收；不能仅凭插件旧的 peerDependencies（宿主依赖范围）认定兼容。

准备已安装且可正常启动的 DSH、pnpm（包管理工具）、可访问依赖源的网络。先执行 `node --version`、`pnpm --version`、`dsh --version`、`dsh plugin --help`。若找不到 dsh，请使用**目标机器实际 DSH 安装目录**中的 `apps/cli/lib/bin.js`，不要照搬开发者的绝对路径。宿主项目入口：[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)。

| 插件 | 版本 | 包文件 |
|---|---|---|
| 我的插件（聚合面板） | 1.0.0 | dsh-my-plugins-1.0.0.tgz |
| 技能管理器 | 1.0.0 | dsh-skill-manager-1.0.0.tgz |
| 皮肤管理器 | 1.2.0 | dsh-skin-manager-1.2.0.tgz |
| API 调用（接口工具） | 1.0.2 | deepseek-ai-dsh-api-tools-1.0.2.tgz |
| 数据库统一语义层 | 2.1.0 | deepseek-ai-dsh-database-connections-2.1.0.tgz |

API 插件需要 settings（设置）、webServer（网页服务）、tools（智能体工具）、credentials（凭据服务）；数据库需要前三项，llm（模型服务）仅大模型关系识别需要。请保留宿主正常的基础配置。

## 2. 下载与校验

在准备存放仓库的目录执行；已有克隆且存在本地修改时先保留修改，不要强制覆盖：

```powershell
git clone https://github.com/EuanZhang0222/DSHplugin.git
Set-Location DSHplugin
$releaseRoot = (Resolve-Path './releases').Path
$release = Get-Content './releases/manifest.json' -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($entry in $release.plugins) {
    $packagePath = Join-Path $releaseRoot $entry.file
    if ((Get-FileHash -LiteralPath $packagePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) {
        throw "安装包校验失败：$($entry.file)"
    }
}
```

也可从 GitHub 下载整个仓库 ZIP（压缩包），解压后进入仓库根目录执行校验。Linux/macOS 可根据清单用 `sha256sum` 或 `shasum -a 256` 校验。

## 3. 升级前备份与旧安装处理

确认宿主的 DSH_HOME（数据目录；默认用户目录下 `.dsh`）和 profile（运行配置；本文为 `web`）。结束执行中的智能体、查询和关系识别任务，停止目标宿主。备份该数据目录（包括设置、技能、运行配置和现有插件），将备份留在目标机器安全位置。

旧安装可能同时存在 `profiles/node_modules` 共享目录、`profiles/web/node_modules` 配置专属目录，以及 `cordis.patch.yml` 手工条目。安装命令不会替你清除历史手工条目；同一插件既在 `dsh.profile.bundles`（插件层清单）又被手工 insert（插入）可能重复加载。

迁移手工安装时，在备份后只删除配置补丁中本次迁移插件的对应条目（标识通常为 `dsh-my-plugins`、`dsh-skill-manager`、`dsh-skin-manager`、`api-tools`、`database-connections`），保留所有其他配置。安装包方式会自动登记插件层。不要删除整个配置文件，也不要复制本仓库以外的生产设置或数据库密码。单纯已有包管理安装则直接使用下面的 add（安装/更新）命令。

## 4. 安装当前五个包

Windows PowerShell，在仓库根目录、完成上面校验后执行；如目标不是 web，修改运行配置变量：

```powershell
$targetProfile = 'web'
foreach ($entry in $release.plugins) {
    $packagePath = Join-Path $releaseRoot $entry.file
    dsh plugin --profile $targetProfile add $packagePath
    if ($LASTEXITCODE -ne 0) { throw "安装失败，停止后续步骤：$($entry.file)" }
}
```

没有全局 dsh 命令但有源码安装时，把循环中的 dsh 命令替换为下面的调用（变量须设为目标机器实际路径）：

```powershell
# $nodeExe：目标宿主使用的 node.exe；$dshCli：目标宿主 apps/cli/lib/bin.js
& $nodeExe $dshCli plugin --profile $targetProfile add $packagePath
```

Linux/macOS，在仓库根目录执行（先完成摘要校验）：

```bash
set -e
release_root="$PWD/releases"
for package in \
  dsh-my-plugins-1.0.0.tgz \
  dsh-skill-manager-1.0.0.tgz \
  dsh-skin-manager-1.2.0.tgz \
  deepseek-ai-dsh-api-tools-1.0.2.tgz \
  deepseek-ai-dsh-database-connections-2.1.0.tgz
do
  dsh plugin --profile web add "$release_root/$package"
done
```

可按需只安装某个业务插件；「我的插件」只提供聚合面板。命令经本机 DSH CLI（命令行入口）源码核对：它在目标配置内调用 pnpm 并登记 `dsh.bundle`（插件层）。安装可能需要联网解析数据库驱动和宿主依赖，不是完全离线部署。

安装后使用目标机器原来的启动方式重新启动同一 DSH_HOME / profile，刷新网页。若需手动启动，可参考 `dsh web --help` 确认目标宿主参数，不要同时启动第二个占用原端口的进程。

## 5. 安装后的实际验收

1. 用 `dsh plugin --profile web list --depth 0` 核对依赖版本，再检查目标配置 `node_modules` 中实际解析到的包版本，确认没有旧共享副本遮蔽新包；启动日志无模块导出、重复标识或服务缺失错误。
2. 网页出现「我的插件」，打开后可调节面板尺寸，关闭重开保留尺寸；技能、皮肤、API、数据库页面正常。未装聚合面板时业务插件显示在系统设置。
3. 皮肤可切换默认、悟空、能碳章鱼、格创东智；技能可保存并重开。数据库显示连接管理、数据集、关系拓扑三页。
4. 在目标环境自行配置数据库只读账号并测试连接；创建数据集、读取字段和查询。关系自动识别只生成候选，必须人工确认后供智能体使用。
5. API 凭据通过目标宿主凭据服务设置，导入仅迁移引用名。启用一个有权限的只读测试接口，先页面测试，再发起一次真实智能体对话确认工具被注册并成功返回；19位整数应作为字符串传给工具，避免 Number（普通数值）舍入。
6. 数据集查询跟随 nextCursor（下一页游标）直到 complete（读取完成），不要将第一页当作全部数据；处理 rowFragment（行分片）、failed（失败）和 budget_exceeded（预算不足）。手写 SQL（数据库查询语句）诊断入口仍有200行/15秒限制。

## 6. 故障处理与回滚

- `dsh` 找不到：使用同一宿主的 Node.js 和 CLI 文件；不要安装一个不相关版本来覆盖现有宿主。
- 安装成功但页面未更新：核对运行配置、包解析位置、旧手工插入项；重启宿主并刷新浏览器，不能只替换 client（浏览器端）而留下旧 host（宿主端）。
- 页面测试成功但对话不可用：核对启用状态、tools 服务和注册错误。API 1.0.2 已处理新版宿主工具参数约束、无损 JSON 返回和响应体超时问题。
- 升级失败：停止目标宿主，恢复本次升级前的代码、依赖清单和配置补丁；业务设置若升级后有新增数据，单独保留，不能用旧备份直接覆盖。重新启动并重复验收。

## 7. 源码与验证说明

预构建的 lib（运行代码）已随包提供，普通安装不需要 npm install 或重新构建。数据库界面源码在 `database/src/client`。开发时设置 DSH_HARNESS_ROOT（已构建宿主源码根目录，需有 tsdown 构建依赖）后，在 database 目录运行 `npm run bundle:ui`；不得使用脚本中的开发者默认路径作为其他机器的路径。

数据库与皮肤在各目录运行 `npm test`；API 回归额外需要解析宿主 `@deepseek-ai/dsh-tools`，可设置 DSH_TOOLS_MODULE 为目标宿主工具模块的 `file:///.../lib/index.js` 文件地址后运行 `npm test`。测试中的 fixture（测试样例）账号不是真实凭据。完整发布核验范围见 [同步说明](SYNC-2026-09-07.md)。
