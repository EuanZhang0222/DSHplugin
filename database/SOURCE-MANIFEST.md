# 源文件清单

本包采用可直接运行的 ESM（ECMAScript 模块）源文件交付，`lib` 中的 JavaScript（脚本）即安装运行源；不存在只交付二进制而不交付源码的情况。

| 路径 | 职责 |
|---|---|
| `lib/index.js` | Harness 宿主入口、连接 API、语义 API、服务和工具注册 |
| `src/client/index.tsx` | 可维护的 React（界面组件框架）浏览器端源码，包含连接、数据集与关系拓扑完整交互 |
| `src/client/styles.ts` | 原型还原样式、响应式规则与 Harness 皮肤变量映射 |
| `src/client/dataset-source.mjs` | 可独立测试的三级目录选择控制器、请求撤销与竞态保护、同表业务语义合并 |
| `src/client/dataset-validation.mjs` | 数据集必填、名称长度、元数据就绪及来源一致性校验；生成可定位的逐项提示 |
| `src/client/field-comment-copy.mjs` | 数据库原注释向两列业务语义复制的纯函数，包含保留/覆盖、空值/超长跳过和结果统计 |
| `src/client/semantic-preview.tsx` | 双模式语义预览、目录与字段补查、批次规划/执行、请求撤销与错误重试 |
| `tsdown.ui.config.mjs` | 浏览器端打包配置 |
| `scripts/build-ui.mjs` | 浏览器端构建入口；可用 `DSH_HARNESS_ROOT`（Harness 根目录）覆盖默认安装路径 |
| `lib/client.js` | 由上述源码构建的浏览器端运行文件 |
| `lib/semantic/schema.js` | 兼容旧配置的语义层 Schema（结构约束） |
| `lib/semantic/db.js` | MySQL / ClickHouse 元数据、查询和脱敏值统计 |
| `lib/semantic/query.js` | 参数化数据集查询编译器 |
| `lib/semantic/query-snapshots.js` | 固定结果流式落盘、磁盘行索引、签名游标/过期/权限重检、完整性状态与无损行分片 |
| `src/client/dataset-query.tsx` | 数据集分页浏览、单页替换、进度/完成状态和查询释放 |
| `lib/semantic/rules.js` | 确定性关系规则引擎 |
| `lib/semantic/model.js` | 大模型提示词、输出解析与字段白名单校验 |
| `lib/semantic/context.js` | 只发布确认关系的统一语义上下文 |
| `lib/semantic/retrieval.js` | 业务词检索、游标分页、精简语义、公开端点过滤和确认路径补齐 |
| `lib/semantic/budget.js` | 透明估算、宿主会话/模型窗口预算、结果预留和超限封套 |
| `lib/semantic/relation-batches.js` | 虚拟表对/字段分片规划、分页批次、源版本校验及单批提示词 |
| `lib/semantic/runtime.js` | 串行持久化、数据集/概念/拓扑/关系运行时 |
| `lib/semantic/tools.js` | 五个静态 Agent Tool（智能体工具），目录/上下文/补查走预算接口 |
| `lib/types/index.d.ts` | 插件和跨插件服务类型 |
| `tests/*.test.mjs` | 可复算核心规则测试 |
| `tests/semantic-pagination.test.mjs` | 全量、重复行、无主键、超长行、多字段、篡改游标、失效/资源/权限边界测试 |
| `tests/semantic-pagination-runtime.mjs` | MySQL/ClickHouse真实驱动到智能体工具的1507行分页完整性与精度测试 |
| `tests/semantic-pagination-api.mjs` | 隔离3081网页接口全量分页验收和仅本轮测试条目清理 |
| `src/client/dataset-pagination.mjs` | 固定行数页面分片装配、数字页码与跳转校验 |
| `tests/support/pagination-fixture.cjs` | 两种数据库协议的大结果测试服务，仅本机、仅模拟验收数据 |
| `tests/semantic-runtime-integration.mjs` | MySQL 协议级元数据、关系识别、上下文和查询集成测试 |
| `tests/semantic-demand-runtime.mjs` | 隔离安装的真实运行时与工具测试，模型服务为模拟，不产生费用 |
| `tests/semantic-demand-api.mjs` | 仅3081隔离环境的接口验收、临时数据集创建与定点清理 |
| `tests/support/mysql-fixture-server.cjs` | 仅监听本机的 MySQL 协议测试服务，不属于生产运行依赖 |
| `tests/support/clickhouse-fixture-server.cjs` | 仅监听本机的 ClickHouse HTTP 协议测试服务，用于验证库表目录与字段读取，不属于生产运行依赖 |

`tests/browser-qa.cjs` 与验收截图是浏览器 QA（质量验收）证据，不进入安装包，也不是生产依赖。运行脚本时通过 `PLAYWRIGHT_PACKAGE`（Playwright 包路径）、`PLAYWRIGHT_CHROME`（浏览器路径）和 `SEMANTIC_HARNESS_URL`（Harness 地址）指定本机环境。

修改浏览器源码后先执行 `npm run bundle:ui`，再执行 `npm test`、`node --check`、安装包内容核对和真实 Harness 浏览器验收。
