# DSH 插件生态（DSH-plugin）

本仓库包含一组 DeepSeek Harness（DSH）Web 界面的扩展插件，统一以「npm 包 + `cordis.patch.yml`」的方式安装到 `web` profile，在侧栏底部提供设置与扩展能力。

## 一、插件清单

| 目录 | 包名 | 类型 | 作用 |
|---|---|---|---|
| `dsh-my-plugins` | `dsh-my-plugins` | **基础插件** | 提供可调节、记忆尺寸且随屏幕自适应的「我的插件」聚合面板 |
| `dsh-skill-manager` | `dsh-skill-manager` | 业务插件 | 自定义技能（正文 + Python 脚本 + 能力引用） |
| `dsh-skin-manager` | `dsh-skin-manager` | 业务插件 | 皮肤/主题切换（颜色令牌 + 自定义 CSS + 背景） |
| `dsh-api-tools` | `@deepseek-ai/dsh-api-tools` | 业务插件 | 把第三方 HTTP API 配置成 Agent 工具，支持选择性导入导出 |
| `database` | `@deepseek-ai/dsh-database-connections` | 业务插件 | MySQL / ClickHouse 连接管理、只读查询及选择性导入导出 |

> 每个子目录都自带 `package.json`、`cordis.patch.yml`、安装脚本（`install.ps1` / `install.sh`）与安装说明；`*.tgz` 是打包产物，可用 `dsh plugin --profile web add <tgz>` 安装。

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
- 数据库配置不迁移密码，导入后须在目标环境补填并重新测试连接。

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

各插件独立安装，推荐顺序（非强制）：

```bash
# 基础插件（可选，装了才有「我的插件」大面板）
dsh plugin --profile web add ./dsh-my-plugins/dsh-my-plugins-1.0.0.tgz

# 业务插件
dsh plugin --profile web add ./dsh-skill-manager/dsh-skill-manager-1.0.0.tgz
dsh plugin --profile web add ./dsh-skin-manager/dsh-skin-manager-1.0.0.tgz
dsh plugin --profile web add ./dsh-api-tools/deepseek-ai-dsh-api-tools-1.0.0.tgz
dsh plugin --profile web add ./database/deepseek-ai-dsh-database-connections-1.0.0.tgz
```

也可进入各目录运行 `install.ps1`（Windows）/ `install.sh`（macOS/Linux）走 `cordis.patch.yml insert` 方式。安装后重启 `dsh web` 生效。
