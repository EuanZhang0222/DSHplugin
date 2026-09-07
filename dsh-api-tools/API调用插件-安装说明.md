# API 调用插件 —— 安装与使用说明

本插件为 DeepSeek Harness（DSH）增加「API 调用」能力：在 **设置页左侧** 新增一个
「API 调用」页，用于把第三方 HTTP API 配置成 **Agent 可调用的工具**。Agent 在合适的时候
会按配置自动调用该第三方接口，实现**数据查询**或**控制指令下发**（例如查天气、查工单、
创建工单、下发设备控制指令等）。

---

## 一、交付物

| 文件 | 说明 |
|---|---|
| `deepseek-ai-dsh-api-tools-1.0.1.tgz` | 插件压缩包（标准 npm tarball），可在任意 DSH 电脑上安装 |
| 本说明文档 | 安装与使用指引 |

---

## 二、前置条件

- 已安装并可运行 DeepSeek Harness（Web 版，即 `dsh web` / `--profile web` 启动的界面）。
- 本机 `pnpm` 可用（DSH 的插件安装底层走 pnpm）。**注意版本**：DSH 声明的包管理器是
  `pnpm@11.7.0`（store v11，需 Node 22+）；若 PATH 中的 pnpm 是较旧版本（store v10），
  安装会报 `ERR_PNPM_UNEXPECTED_STORE`，需改用 Node 22 + pnpm 11（见「常见问题」）。
- 目标电脑能访问要接入的第三方 API 服务器（仅在实际调用时才会请求）。

> 说明：插件的 HTTP 接口与 Agent 工具注册依赖 web 应用层（`webServer` / `tools` /
> `credentials` 服务），因此请安装到 **web profile**（即你平时用浏览器打开的 DSH），
> 而不是仅安装到 headless/base profile。

---

## 三、安装步骤（热插拔）

### 方式 A：命令行安装（推荐）

1. 把 `deepseek-ai-dsh-api-tools-1.0.1.tgz` 复制到目标电脑（任意目录）。

2. 打开终端，切换到 DSH 安装目录（即含有 `apps/cli/lib/bin.js` 的目录），执行：

   ```bash
   dsh plugin --profile web add ./deepseek-ai-dsh-api-tools-1.0.1.tgz
   ```

   或使用绝对路径：

   ```bash
   dsh plugin --profile web add "C:/path/to/deepseek-ai-dsh-api-tools-1.0.1.tgz"
   ```

   > 若 `dsh` 命令不在 PATH 中，可用等价的 node 调用：
   > ```bash
   > node <DSH安装目录>/apps/cli/lib/bin.js plugin --profile web add ./deepseek-ai-dsh-api-tools-1.0.1.tgz
   > ```

3. 安装完成后，插件会自动写入 web profile 的 bundle 清单。**重启 DSH**（关闭并重新
   启动 `dsh web`，或重启你的 DSH 启动脚本）使插件生效。

4. 重启后，打开 DSH 网页 → 左下角「设置」，左侧导航栏会多出「API 调用」一项。

### 方式 B：图形界面（若你的 DSH 提供插件管理页）

部分 DSH 版本在「设置 → 插件」中提供插件安装入口，可上传 `.tgz` 安装。安装后同样需要
重启 DSH 生效。

---

## 四、验证安装是否成功

重启 DSH 后，打开 **设置** 面板，确认左侧导航包含：

```
通用设置 · 模型 · 插件 · Agent 预设 · API 调用
```

看到「API 调用」即表示安装成功。

命令行可进一步验证挂载（可选）：

```bash
dsh web --dump-config | grep -A2 api-tools
```

应能看到 `api-tools` 行。

---

## 五、使用方法

### 5.1 新建一个 API 工具

1. 打开 DSH → 左下角 **设置** → 左侧点选 **「API 调用」** → 点「新建 API 工具」。

2. **快速接入**（支持「手动配置」与「粘贴 cURL」两种方式）：
   - **粘贴 cURL**：把命令行里的 `curl ...` 命令粘进输入框，点「解析并填充」，插件会
     自动识别请求方法、接口地址、Bearer 认证与 Body JSON，并把 Body 字段转成参数
     （类型自动推断、来源为「Agent 输入」、说明为「请补充中文说明」），body 里的示例值
     会作为各参数的默认值（数组元素字段取第一个元素的值），导入后即可直接测试。
   - **手动配置**：直接填写下面的字段：
   - **工具名称**：给人看的名字，例如「查询当前天气」；
   - **系统工具标识**：Agent 实际看到的工具名，小写 snake_case（例如 `query_current_weather`）；
   - **何时调用**：用一句中文告诉 Agent「用户提出什么需求时应调用该工具」；
   - **请求方法**：GET（查询）/ POST（提交）/ PUT / PATCH / DELETE；
   - **接口地址**：`https://…`，路径中的变量用 `{name}` 占位（例如 `https://oa.example.com/api/tickets/{ticketId}`）；
   - **认证方式**：无需认证 / API Key / Bearer Token / Basic Auth；
   - **凭据引用**：只填一个**引用名**（环境变量名样式，例如 `CMS_API_TOKEN`），
     **不填密钥本身**；
   - **密钥值**：可选，直接粘贴真实 token，测试/保存时写入 DSH 凭据存储
     （详见「六、凭据（密钥）如何配置」）。

3. **参数定义**（可选）：
   - 参数名称、位置（Path / Query / Header / Body）、类型、值来源、是否必填、中文说明；
   - **数组 / 对象子字段**：当参数类型为「数组」或「对象」时，参数块下方会出现「添加子字段」，
     可展开配置数组元素对象（或对象）内部的子字段；子字段同样可继续嵌套。
     cURL 导入会自动识别数组元素对象的字段并递归生成子字段。
   - 值来源：
     - **Agent 输入**：由 Agent 根据对话自动填充；
     - **固定值**：写死一个值；
     - **凭据引用**：值来自某个凭据（引用名填在「默认值」列）；
     - **默认值**：Agent 未提供时使用。
   - **默认值**：每个参数都有一个「默认值」字段。当 Agent 未提供该字段、或测试输入的
     JSON 里没有该参数时，用默认值填充；固定值/凭据引用/默认值三种来源都写在这个字段里。

4. **草稿测试**：填好后点「使用当前草稿测试」，在「输入参数（JSON）」里给 Agent 来源的
   参数填示例值，即可**真实调用**第三方 API，看到状态码、耗时与响应体。测试通过后才能启用。

5. **保存**：点「保存草稿」或「保存并启用」。启用后，该配置立即注册成一个 Agent 工具。

6. **删除**：在列表卡片点「删除」，或在编辑已有工具时点编辑器底部「删除」，二次确认后
   移除该工具，Agent 工具集同步热更新。

### 5.2 批量导出与导入

1. 勾选要迁移的 API 工具，也可以点击「选择全部当前结果」。
2. 点击「导出选中」，得到 `.dshconfig.json` 配置文件。
3. 在另一套已安装相同插件的 DSH 环境打开「API 调用」，选择导入冲突策略：
   - 跳过已有项：保留目标环境原配置；
   - 覆盖已有项：用导入项替换目标环境同 ID（唯一标识）或同工具标识的配置；
   - 创建导入副本：保留两份，插件自动生成新的 ID（唯一标识）和工具标识。
4. 点击「导入配置」选择文件，完成后按提示补齐目标环境所需凭据。

> 安全边界：导出文件只带凭据引用名，不带真实 API Key（接口密钥）、Token（令牌）或
> Basic Auth（基础认证）密码。不要把真实密钥手工写进配置文件。

### 5.3 Agent 如何调用

启用后，在**任意会话**中，Agent 会把它当作一个普通工具：当你的请求命中「何时调用」里
描述的意图时，Agent 会按参数定义组装请求、带上认证、调用第三方 API，并把结果用于后续
回答或动作（数据查询 / 控制指令下发）。

配置变更（保存 / 删除 / 启用切换）会**实时热更新**工具集，无需重启 DSH。

---

## 六、凭据（密钥）如何配置

API 工具只保存**凭据引用名**，实际密钥由 DSH 的凭据存储提供。有两种填法：

1. **界面直接填写密钥值**（最省事）：在「凭据引用」填一个引用名（如 `CMS_API_TOKEN`），
   在下方「密钥值」框粘贴真实 token（如 `1a4f4d8a-...`）。点「测试」或「保存」时，插件会
   把密钥值写入 DSH 凭据存储；之后调用按引用名解析，密钥不进普通配置。
2. **放环境变量**：把密钥放进同名环境变量（例如 `CMS_API_TOKEN`），DSH 凭据服务直接解析，
   无需额外配置。

- 凭据引用名必须符合环境变量名样式（字母/数字/下划线，字母或下划线开头），**不要**把
  `bearer xxxx` 或 token 值本身填进「凭据引用」，否则会报 `credential ref ... must match`。
- 页面上的凭据状态提示会显示「已配置 / 未配置」，未配置时调用会明确报错。

> 安全约束：密钥不会进入普通配置、Agent 上下文或调用轨迹；接口地址仅允许 http/https；
> 响应体默认 10 MB、上限 50 MB（每个工具可在「最大响应」字段调整），超过 60 秒会中止，避免失控。

---

## 七、配置存储位置

所有 API 工具配置持久化在 DSH 的 settings 文档中（`$DSH_HOME/settings.yaml` 的
`api-tools` 命名空间）。**凭据只存引用名，不存密钥值**。

---

## 八、卸载

```bash
dsh plugin --profile web remove @deepseek-ai/dsh-api-tools
```

然后重启 DSH。卸载会移除设置页的「API 调用」入口、插件的 HTTP 接口，以及所有已注册的
Agent 工具；已保存的配置保留在 settings 文档中，如需彻底清除可手动删除
`$DSH_HOME/settings.yaml` 中的 `api-tools` 段。

---

## 九、常见问题

- **Q：安装后设置页没有「API 调用」？**
  A：需要**重启 DSH**（插件加入 bundle 清单后重启才生效），并确认安装到的是 web
  profile 而不是 base/headless profile。

- **Q：测试提示「凭据 XXX 未配置」？**
  A：表示 DSH 凭据服务解析不到该引用名。可在「密钥值」框直接填写 token（测试/保存时
  自动写入凭据存储），或设置同名环境变量。

- **Q：Agent 没有调用我的 API 工具？**
  A：确认该工具已「启用」；「何时调用」的描述要足够清晰，尽量写出用户意图（例如
  「当用户询问某城市当前天气、温度或风力时调用」）。

- **Q：测试通过但实际调用报错？**
  A：多为第三方接口返回非 2xx，或响应体超限。运行结果里会给出 HTTP 状态码与错误内容，
  据此排查接口参数或鉴权。

- **Q：安装报 `ERR_PNPM_UNEXPECTED_STORE Unexpected store location`（v11 / v10）？**
  A：PATH 里的 pnpm 版本与 DSH 声明的不一致。DSH 用 pnpm@11.7.0（store v11，需 Node 22+），
  旧版 pnpm 用 store v10。可改用 Node 22 直接运行 corepack 的 pnpm 11 安装：
  `node <Node22路径> <corepack>/pnpm/11.7.0/dist/pnpm.mjs add <tgz绝对路径>`，然后把包名
  追加到 web profile `package.json` 的 `dsh.profile.bundles`（即 `dsh plugin add` 的第二步）。

- **Q：安装报 `EPERM: operation not permitted`？**
  A：安装要写入 DSH profile 目录（`$DSH_HOME/profiles/web`）与 pnpm store，若运行环境
  启用了文件沙箱，需先授予相应文件写权限（或改用不受限的终端）再安装。

- **Q：安装报 `ENOENT ... no such file ... 已有插件.tgz`？**
  A：某个已安装插件的 `file:` 依赖路径与锁文件记录不一致（例如 tgz 被移动到子目录），
  pnpm 重新解析依赖树时找不到它。把该 tgz 复制回锁文件记录的路径（或修正 package.json /
  pnpm-lock.yaml 中的路径）后重试。
