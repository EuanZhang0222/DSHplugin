# @deepseek-ai/dsh-api-tools

为 DeepSeek Harness 增加「API 调用」能力：在设置页左侧新增「API 调用」页，把第三方
HTTP API 配置成 **Agent 可调用的工具**——Agent 在合适的时候按配置发起请求，实现数据查询
或控制指令下发。

## 功能

- 第三方 API 工具的增删改查（CRUD），自定义名称、系统工具标识、调用时机（purpose）；
- 两种接入方式：手动配置，或「粘贴 cURL」一键解析方法 / 地址 / Bearer 认证 / Body 参数；
- 支持 GET / POST / PUT / PATCH / DELETE，路径变量 `{name}`、Query / Header / Body 参数；
- 参数定义：位置、类型、值来源（Agent 输入 / 固定值 / 凭据引用 / 默认值）、必填、中文说明；
- 数组（元素为对象）/ 对象参数支持递归子字段，手动配置与 cURL 导入均能表达嵌套结构；
- 认证：无需认证 / API Key / Bearer Token / Basic Auth；
- 密钥只保存 **引用**（环境变量名样式），实际值经 DSH `credentials` 服务按次解析，
  不进普通配置、Agent 上下文或调用轨迹；
- 草稿测试：不保存即可真实调用，返回状态码、耗时、响应体（响应体 256 KB 上限、60 秒超时）；
- 每个「已启用」配置注册成一个有明确参数的独立 Agent 工具；配置变更（保存 / 删除 /
  启用切换）后自动热更新工具集，无需重启。
- 支持勾选部分或全部 API 工具，导出为 `.dshconfig.json` 配置包，并在另一套已安装本插件的
  DSH 环境中批量导入；冲突时可选择「跳过已有项 / 覆盖已有项 / 创建导入副本」。
- 配置包只包含凭据引用名，不包含真实 API Key（接口密钥）、Token（令牌）或 Basic Auth
  （基础认证）密码；导入后按页面提示在目标环境补齐所需凭据。

## 批量迁移

1. 在列表中勾选要迁移的 API 工具，也可使用「选择全部当前结果」。
2. 点击「导出选中」，浏览器会下载 `dsh-api-tools-*.dshconfig.json`。
3. 在目标 DSH 环境打开同一页面，先选择「导入冲突」策略，再点击「导入配置」。
4. 导入完成后核对汇总结果，并在目标环境配置提示列出的凭据引用。

配置包使用统一的 `dsh-plugin-config`（DSH 插件配置）格式，当前 `formatVersion`（格式版本）
为 `1`。插件会校验文件类型、插件标识、格式版本、条目数量和单文件大小，不会静默覆盖已有项。

## 架构

- **host 半部**（`lib/index.js`）：settings 持久化（namespace `api-tools`）+
  `/api/api-tools` HTTP API（列表 / 保存 / 删除 / 测试 / 凭据 / 导入 / 导出）+
  动态注册 Agent 工具。
- **client 半部**（`lib/client.js`）：注册 `settings.section`（id `api-tools`），
  渲染 API 工具管理 UI，经 `fetch` 调用 host API。
- 包同时声明 `dsh.bundle`（供 `dsh plugin add` 安装）与 `dsh.client`（供浏览器 roster 扫描）。

## 安装

> 安装走 DSH 的 pnpm。DSH 声明的包管理器是 `pnpm@11.7.0`（store v11，需 Node 22+）；
> 若 PATH 中的 pnpm 较旧（store v10），会报 `ERR_PNPM_UNEXPECTED_STORE`，请改用
> Node 22 + pnpm 11（详见 CHANGELOG「安装实测」）。

```bash
dsh plugin --profile web add ./deepseek-ai-dsh-api-tools-1.0.0.tgz
# 然后重启 dsh web
```

详见随包分发的《API 调用插件-安装说明》。

## 卸载

```bash
dsh plugin --profile web remove @deepseek-ai/dsh-api-tools
```
