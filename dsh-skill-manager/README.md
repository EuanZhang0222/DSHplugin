# dsh-skill-manager

为 DeepSeek Harness 增加「技能管理」能力：在设置页左侧新增「技能」页，让你自定义
**Agent 可加载的技能（skill）**，配置后立即生效，并持久化到 `~/.dsh/skills/`。

## 功能

- 技能的增删改查（CRUD），自定义名称、描述、调用时机（whenToUse）；
- 启用 / 禁用（禁用即下线，且不会被其它技能通过 `@技能名` 引用）；
- 技能正文为 Markdown，直接注入模型 system prompt，可指引模型调用**任意可见插件工具**；
- 技能内嵌 **Python 脚本**（可多个、可配解释器命令），模型按需用 `pwsh` 执行；
- 技能间 **互相调用**：正文中用 `@技能名` 引用其它技能，加载时自动递归展开（循环防护、深度上限 6）；
- **能力引用**：下拉选择接口工具（api 插件里已配置的接口）/ 数据库连接（database 插件里已保存的连接）/ SQL 命令，
  渲染时展开成调用指引注入正文；
- **正文内联引用**：正文里写 `@api:工具名` 引用接口、`@db:连接名` 引用数据库连接，等价于上面的下拉选择；
- **SQL 直接写在正文**：正文里写 ```sql 代码块，配合 `@db:连接名` 标注，即可让模型用 `query_database` 工具执行查询；
- **批量导出与导入**：勾选部分或全部技能，导出为 `.dshconfig.json` 配置文件，并在另一套已安装本插件的
  DSH 环境中导入；名称冲突可选择「跳过已有项 / 覆盖已有项 / 创建导入副本」；
- 配置变更（保存 / 删除 / 启用切换）后自动热更新技能集，无需重启。

## 架构

- **host 半部**（`lib/index.js`）：扫描 `~/.dsh/skills/` 技能目录，把已启用技能经
  `ctx.skills.register` 注册成运行时 skill，并提供 `/api/dsh-skill-manager` HTTP API
  （list / save / remove / catalog / export / import）。技能同时落盘为标准 frontmatter Markdown 文件，
  即使本插件卸载，其它 skill provider（如 skill-filesystem）仍可发现。
- **client 半部**（`lib/client.js`）：注册 `settings.section`（id `dsh-skill-manager`），
  渲染技能管理 UI，经同源 `fetch` 调用 host API。
- 包同时声明 `dsh.bundle`（cordis.patch.yml insert）与 `dsh.client`（浏览器 roster 扫描）。

## 安装

> 推荐直接使用随附的一键安装脚本（复制到共享 node_modules 并登记 cordis.patch.yml，
> DSH 运行时会热加载，刷新浏览器即可生效，通常无需重启进程）。

### Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

### macOS / Linux

```bash
chmod +x install.sh && ./install.sh
```

### 手动安装

1. 将本插件目录复制到 `$DSH_HOME/profiles/node_modules/dsh-skill-manager`；
2. 在 `$DSH_HOME/profiles/<profile>/cordis.patch.yml` 中登记：

```yaml
- insert:
    - id: dsh-skill-manager
      name: dsh-skill-manager
      inject: [skills, webServer]
```

3. 重启 `dsh web`（或依赖 DSH 的热加载），刷新浏览器后打开「设置 → 技能」。

## 卸载

删除 `$DSH_HOME/profiles/node_modules/dsh-skill-manager`，并从
`$DSH_HOME/profiles/<profile>/cordis.patch.yml` 移除其 insert 条目。

> 已配置的技能文件保存在 `~/.dsh/skills/`，卸载插件不会自动删除它们；如需彻底清除，
> 请一并删除该目录下由本插件创建的技能文件。

## 使用示例

- 新建技能 `code-review`，正文写「先按 @code-style 检查风格，再执行 @run-tests」——
  加载时会自动带上另外两个技能的完整指令。
- 给技能添加一个 Python 脚本（如数据清洗），模型执行该技能时可用 `pwsh` 运行它。
- 给技能添加「能力引用」：下拉选一个接口工具（如 `api_tool_xxx`），模型调用该技能时
  就会按接口说明发起真实请求。
- 给技能添加「能力引用」：下拉选一个数据库连接（如 `uat`），再写表名；或在正文直接写
  `@db:uat` + ```sql 查询语句，模型会用 `query_database` 工具执行只读查询。

### 批量迁移技能

1. 在技能列表勾选需要迁移的部分或全部技能。
2. 点击「导出选中」，浏览器下载 `dsh-skill-manager-*.dshconfig.json`。
3. 在目标 DSH 环境安装相同插件，选择导入冲突策略后点击「导入配置」。
4. 导入完成后核对技能正文、启用状态及能力引用，并确认目标环境存在同名 API 工具、数据库连接和被引用技能。

冲突策略说明：

- 「跳过已有项」：同名技能保留目标环境版本；
- 「覆盖已有项」：同名技能替换为导入版本；
- 「创建导入副本」：自动生成 `原名称-copy` 等合法新名称；若同一配置包里的技能互相通过
  `@技能名` 引用，插件会同步改写为副本名称。

> 迁移文件不包含 API 密钥或数据库密码，但会包含完整技能正文、Python 脚本、SQL 和能力引用。
> 如果用户曾把敏感值直接写进正文或脚本，它也会随文件导出，迁移前应自行检查。

### 正文引用语法一览

| 写法 | 含义 |
| --- | --- |
| `@技能名` | 引用其它技能，递归展开其指令 |
| `@api:工具名` | 引用 api 插件里配置的接口（展开为接口说明） |
| `@db:连接名` | 引用 database 插件里保存的连接（展开为只读查询指引） |
| ```sql 代码块 | 直接写在正文里的只读 SQL，配合 `@db:连接名` 指定连接执行 |

> 数据库查询最终由 database 插件注册的 `query_database` 工具执行，该工具同时支持
> 连接名称和连接 id 匹配，且仅放行 SELECT / SHOW / DESCRIBE / EXPLAIN / WITH 只读语句。
