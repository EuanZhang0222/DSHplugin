# DSH 插件生态（DSH-plugin）

> **当前安装入口（2026-09-07）**：[安装、升级与验收](INSTALL.md) · [给智能体的执行要求](AGENTS.md) · [当前发布包](releases/) · [发布清单与校验值](releases/manifest.json) · [本次同步说明](SYNC-2026-09-07.md)。
> 已核对正式部署：我的插件 1.0.0、技能 1.0.0、皮肤 1.2.0、API（接口）1.0.2、数据库 2.1.0。请使用 releases（发布目录）中的当前包。

本仓库包含一组 DeepSeek Harness（DSH）Web 界面的扩展插件，统一以「npm 包 + `cordis.patch.yml`」的方式安装到 `web` profile，在侧栏底部提供设置与扩展能力。

## 一、插件清单

| 目录 | 包名 | 类型 | 作用 |
|---|---|---|---|
| `dsh-my-plugins` | `dsh-my-plugins` | **基础插件** | 提供可调节、记忆尺寸且随屏幕自适应的「我的插件」聚合面板 |
| `dsh-skill-manager` | `dsh-skill-manager` | 业务插件 | 自定义技能（正文 + Python 脚本 + 能力引用） |
| `dsh-skin-manager` | `dsh-skin-manager` | 业务插件 | 皮肤/主题切换（颜色令牌 + 自定义 CSS + 背景） |
| `dsh-api-tools` | `@deepseek-ai/dsh-api-tools` | 业务插件 | 把第三方 HTTP API 配置成 Agent 工具，支持选择性导入导出 |
| `database` | `@deepseek-ai/dsh-database-connections` | 业务插件 | MySQL / ClickHouse 连接、数据集、统一语义、多个关系拓扑、受控 Agent 查询及选择性导入导出 |

> 每个子目录都自带 `package.json`、`cordis.patch.yml` 和安装说明；`*.tgz` 是打包产物，可用 `dsh plugin --profile web add <tgz>` 安装。部分插件另带 `install.ps1` / `install.sh` 安装脚本。

## 二、核心设计：两个「页面容器」slot

DSH Web 界面通过 **slot（插槽）** 让插件注册自己的设置页。本仓库围绕两个 slot 组织：

| slot | 声明方 | 出现的面板 | 说明 |
|---|---|---|---|
| `settings.section` | DSH 内置（ui-settings-general） | **「设置」面板** | 系统自带的设置页容器，弹窗固定约 800px |
| `my-plugins.section` | **`dsh-my-plugins` 插件** | **「我的插件」面板** | 本仓库自定义的大面板，默认约 80% 视口、右下角可拖拽调节 |

两者的**注册协议完全一致**（`list` 型，注册项带 `id` / `order` / `label` + 一个 React 组件），因此业务插件的设置页代码**零改动**即可在两种面板间迁移。

「我的插件」面板会记忆浏览器中的上次宽高，并在视口变化时重新约束；宽度小于 720 像素时，
左侧导航自动变为顶部导航，业务内容继续使用剩余宽高，避免弹窗缩小时出现页面级横向滚动。

## 三、跨环境迁移 API 与数据库配置

API 调用和数据库连接插件都使用统一的 `dsh-plugin-config`（DSH 插件配置）JSON 文件：

- 可只勾选需要迁移的部分条目，也可全选；
- 目标环境必须安装相同插件，导入时会校验插件标识和格式版本；
- 冲突可选择跳过、覆盖或创建副本，所有条目先整体校验再写入；
- API 配置只迁移凭据引用名，真实接口密钥不会进入文件；
- 数据库配置不迁移用户名和密码，导入后须在目标环境补填并重新测试连接；数据集和拓扑等语义资产由数据库插件自身设置持久化。

## 四、【我的插件】与其他插件的关联关系（重点）

`dsh-my-plugins` 是一个**基础插件**：它自己不提供业务能力，只提供一个更大的聚合容器（`my-plugins.section`），业务能力仍由其余插件贡献。

每个业务插件（技能 / 皮肤 / 数据库连接 / API 调用）在注册时都会**动态选择目标 slot**：

```
目标 = spec('my-plugins.section') 存在 ? 'my-plugins.section' : 'settings.section'
```

- ✅ **安装了「我的插件」** → 业务插件把设置页注册到 `my-plugins.section`，显示在「我的插件」大面板里；
- ❌ **未安装「我的插件」** → `my-plugins.section` 未声明，业务插件回退到 `settings.section`，显示在系统「设置」面板里（行为与没有本机制时完全一致）。

实现上，业务插件用 `ctx.slots.spec('my-plugins.section')` 立即判断一次，并 `ctx.slots.subscribe('my-plugins.section', ...)` 监听该 slot 的声明/坍塌，因此：

- 加载顺序无关（「我的插件」先装后装都能正确落位）；
- 可热迁移（安装/卸载「我的插件」后刷新页面，业务插件自动在大面板与设置面板之间切换）。

**统一模板**（各业务插件 `lib/client.js` 的 `apply` 末尾）：

```js
function apply(ctx) {
  const MP = "my-plugins.section";
  const SETTINGS = "settings.section";
  let active = null, activeTarget = null;

  const mount = () => {
    const target = ctx.slots.spec(MP) ? MP : SETTINGS;
    if (target === activeTarget && active !== null) return;
    if (active) { try { active(); } catch (e) {} active = null; }
    activeTarget = target;
    if (!ctx.slots.spec(target)) return;
    active = ctx.slots.register({ name: target, id: "你的插件id", order: 25, label: "你的插件名" }, YourSection);
  };

  ctx.effect(() => {
    const offMp = ctx.slots.subscribe(MP, mount);
    const offSettings = ctx.slots.subscribe(SETTINGS, mount);
    mount();
    return () => { offMp(); offSettings(); if (active) { try { active(); } catch (e) {} active = null; } };
  }, "你的插件: section target");
}
```

## 五、如何开发一个「后续插件」

1. 复制任一业务插件目录（如 `dsh-skill-manager`）作为模板；
2. `lib/index.js` 写 host 半部（业务逻辑 + HTTP API，按需声明 `inject`）；
3. `lib/client.js` 写 client 半部（设置页组件），注册部分用上面「统一模板」——它会自动适配「我的插件」面板与系统设置面板；
4. `package.json` 里声明 `dsh.client`（`platform: web`），`cordis.patch.yml` 写 host 行的 `insert`；
5. 打包：`npm pack`；安装：`dsh plugin --profile web add <tgz>` 或运行 `install.ps1`。

**无需任何额外代码**，新插件的设置页就会：装了「我的插件」时进入大面板、没装时进入设置面板。

### 后续插件页面自适应硬约束

进入聚合面板只是完成了“注册位置”适配，后续插件自身还必须遵守以下布局约束，才能在用户放大、缩小
「我的插件」弹窗时真正充满可用区域：

1. 页面根容器必须使用 `width: 100%（宽度占满）`、`min-width: 0（允许收缩）`、
   `min-height: 100%（最小高度占满）` 和 `box-sizing: border-box（尺寸包含内边距）`；
2. 禁止给页面根容器设置固定 `width（宽度）` 或 `max-width（最大宽度）`，否则大弹窗会出现大片空白；
3. 卡片列表使用 `grid（网格）` 的 `auto-fit（自动列数）`，或使用允许换行的 `flex-wrap（弹性换行）`；
4. 表单、工具栏、按钮组在窄弹窗下必须自动改为单列或换行，不能依赖页面级横向滚动；
5. 内容滚动由聚合面板管理，插件不要写死视口高度；长内容可以纵向增长，但根容器不得产生横向溢出；
6. 每个新插件交付前至少验证大、默认、窄三种弹窗尺寸，并检查关闭重开后的尺寸记忆、横向溢出和浏览器控制台错误。

推荐的页面样式起点：

```js
const pageStyle = {
  width: "100%",
  minWidth: 0,
  minHeight: "100%",
  boxSizing: "border-box",
};

const cardGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
  gap: 10,
  width: "100%",
  minWidth: 0,
};
```

皮肤插件已经按这一规范实现，可作为后续插件的响应式布局参考。

## 六、皮肤/主题规范（务必遵守）

皮肤插件通过覆盖 DSH 主题 token 换肤，覆盖的是 **`--dsw-alias-*` / `--dsw-specific-*`** 这一族 token。

因此，**插件内联样式必须使用 `--dsw-alias-*` token，不要自造 `--color-*` 之类的变量**，否则深色皮肤下会出现「深字压深底看不清 / 白输入框突兀」：

| 用途 | 用这个 token | ❌ 不要用 |
|---|---|---|
| 主文字 | `--dsw-alias-label-primary` | `--color-text` |
| 次要文字 | `--dsw-alias-label-secondary` | `--color-text-muted` |
| 输入框/卡片背景 | `--dsw-alias-bg-layer-1` / `-layer-2` | `--color-bg` / `--color-bg-raised` |
| 边框 | `--dsw-alias-border-l1` / `-l2` | `--color-border` |
| 主按钮填充 | `--dsw-alias-button-primary-fill` | `--color-accent` |
| 主按钮文字 | `--dsw-alias-label-primary-inverted` | `#ffffff` |
| 危险/成功 | `--dsw-alias-state-error-primary` / `-success-primary` | `--color-danger` / `--color-success` |

完整 token 名可在运行中的 DSH 通过 `Theme.listTokens` 查询。

## 七、安装

完整命令、前置条件、旧手工安装迁移、升级备份和验证步骤统一维护在 [INSTALL.md（安装指南）](INSTALL.md)。请下载 releases（发布目录）的五个当前包并按清单校验后安装；各子目录历史包不代表当前正式版本。

