# 1.0.2（2026-09-07）

- 修复 UsedDetails（用能明细）包含不受宿主支持的 pattern（正则约束）导致智能体工具注册失败。超长整数继续通过字符串传入并保持精度。
- 修复返回对象含 undefined（未定义值）被宿主无损 JSON 校验拒绝；成功和失败响应仅包含适用字段。
- 请求超时和调用方取消延续到响应体读取结束，响应大小改为流式检测。
- 同步正式环境已有的新宿主设置命名空间和客户端依赖适配。
- 增加真实宿主编译器及本地 HTTP（网络请求）回归测试，共 10 项。

# 变更记录（Changelog）

## 1.0.1 —— 2026-08-31

### cURL 导入与长整数修复

- cURL 导入支持 Postman（接口调试工具）常见的无协议地址、非断行空格、反斜杠续行和
  `curl.exe` 写法；无协议地址会补为 HTTPS，并在界面明确提示。
- cURL Body（请求体）解析会在进入 `JSON.parse` 前保护超过 JavaScript 安全整数范围的
  十进制整数，避免 19 位位置标识在导入阶段被静默舍入。
- 草稿测试与 Agent 工具调用会把超长整数先作为精确字符串接收，再在真实请求体中按未加引号的
  JSON 数字原样发送；若调用方已经传入失真的不安全 `number`，则明确报错而不是继续请求。
- 补充回归测试，覆盖本次 UsedDetails（用能明细）cURL、普通 URL/数字兼容、精确请求体序列化
  和失真数字拒绝四条路径。

## 1.0.0 —— 2026-08-15

### 首次发布

- 设置页新增「API 调用」管理页：API 工具增删改查、参数定义（位置 / 类型 / 值来源 /
  必填 / 中文说明）、草稿测试、启用开关。
- 支持「手动配置」与「粘贴 cURL」两种接入方式：cURL 自动解析方法、接口地址、
  Bearer 认证与 Body JSON，并把 Body 字段转成参数后填充到可编辑表单。
- 参数支持嵌套结构：数组（元素为对象）与对象参数可展开配置子字段，手动配置与 cURL
  导入都会递归生成子字段；Agent 工具 schema 与示例 JSON 同步递归展开。
- 每个「已启用」的第三方 API 配置注册成一个独立 Agent 工具，支持数据查询与控制指令下发。
- 密钥只保存引用名（环境变量名样式），经 DSH `credentials` 服务按次解析，不进普通配置、
  Agent 上下文或调用轨迹；界面提供「密钥值」输入框，可直接填写并写入 DSH 凭据存储；
  凭据引用格式错误时给出友好提示。

### 本版修复

- 「草稿测试」接口 `/test` 改用 `result` 字段包裹 HTTP 层结果，避免与 API 层 `ok` 字段
  冲突。否则 HTTP 请求失败（如第三方返回 4xx/5xx）会被 client 端 `api()` 误判为「接口
  调用失败」，从而抛异常、无法把真实状态码与响应体展示给用户。
- 修复编辑已保存工具时 `fixed` / `credential` / `default` 来源参数的默认值丢失：
  `toView` 不再清空非 agent 来源参数的值，保证「列表 → 编辑 → 保存」往返不丢数据。
- 补全删除功能：列表卡片与编辑器均提供「删除」按钮（二次确认后调用 `/delete`），
  增删改查闭环。
- 优化参数编辑布局：参数字段由单行改为两行栅格、控件加大，便于在设置面板中阅读。
- 参数增加「默认值」：Agent 未提供该字段时回退到默认值；测试输入缺失的参数同样用默认值；
  原「值」字段合并为「默认值」（fixed=固定值、credential=凭据引用名、default=默认值）。
- cURL 导入时，body 里的示例值直接作为各参数的默认值（数组元素字段取第一个元素的值），
  导入后即可直接测试。
- 响应大小上限改为可配置（默认 10 MB、上限 50 MB），每个工具可单独设置「最大响应」，
  便于测试大数据量接口。

### 安装实测（2026-08-15，Windows + DSH web profile）

- 需使用 DSH 声明的包管理器 **pnpm@11.7.0（store v11）与 Node 22+**。PATH 中较旧的
  pnpm（store v10）会报 `ERR_PNPM_UNEXPECTED_STORE Unexpected store location`。
  可用 Node 22 直接运行 corepack 的 pnpm 11 完成安装：

  ```bash
  node "<Node22路径>" "<corepack>/pnpm/11.7.0/dist/pnpm.mjs" add "<tgz绝对路径>"
  ```

- 安装需写入 DSH profile 目录（`$DSH_HOME/profiles/web`）与 pnpm store
  （`AppData\Local\pnpm\store`），均在工作区之外；若运行环境启用了文件沙箱，需先授予
  相应写权限，否则报 `EPERM: operation not permitted`。
- 若某个已安装插件的 `file:` 依赖路径与锁文件记录不一致（例如 tgz 被移动到子目录），
  `pnpm add` 重新解析依赖树时会报 `ENOENT`；需先把该 tgz 复制回锁文件记录的路径，再执行
  安装。
- `dsh plugin add` 等价于「`pnpm add <tgz>` + 把包名写入 `dsh.profile.bundles`」。若手动
  用 pnpm 安装，需自行完成第二步：把包名追加到 web profile `package.json` 的
  `dsh.profile.bundles` 列表。
