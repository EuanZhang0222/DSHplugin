# 「我的插件」基础插件

在 DeepSeek Harness Web 界面**侧栏底部「设置」按钮上方**新增一个「我的插件」按钮，
点击打开一个**默认约 80% 视口大小、可拖拽右下角调节尺寸**的面板，把其余插件的设置页
聚合到这个面板里。

面板会把上次有效宽高保存在浏览器 `localStorage`（本地存储）中：关闭后再次打开仍使用
上次尺寸；屏幕或浏览器窗口变化时会自动约束在当前可视区内。较窄时导航会从左侧竖排切换
为顶部横排，插件内容区自动铺满剩余空间。

## 作用

- 提供一个 `my-plugins.section` 子 slot（与设置面板的 `settings.section` 同构）。
- 右下角调节柄支持鼠标/触摸拖拽，也支持键盘方向键微调；按住 Shift（加速键）时每次调整
  50 像素，普通方向键每次调整 10 像素。
- 其余插件（技能 / 皮肤 / 数据库连接 / API 调用）检测该 slot 是否已声明：
  - **安装了「我的插件」** → 它们的设置页显示在「我的插件」大面板里；
  - **未安装「我的插件」** → 它们回退到「设置」面板（行为与现在完全一致）。

「我的插件」是**基础插件**：自身不提供业务能力，只提供聚合容器，业务能力仍由其余插件
贡献，交互方式保持不变。

## 安装

### 方式 A：一键脚本（Windows）

右键 `install.ps1` → 使用 PowerShell 运行，或：

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

### 方式 B：一键脚本（macOS / Linux）

```bash
bash ./install.sh
```

### 方式 C：打包成 tgz 后命令行安装

```bash
npm pack
dsh plugin --profile web add ./dsh-my-plugins-1.0.0.tgz
# 然后重启 dsh web
```

## 生效

- 若 `dsh web` 正在运行，DSH 会热加载 `cordis.patch.yml`，**刷新浏览器（Ctrl+Shift+R）** 后
  侧栏底部即出现「我的插件」按钮。
- 若未自动生效：重启 `dsh web`。

## 卸载

删除 `$DSH_HOME/profiles/node_modules/dsh-my-plugins`，并从
`$DSH_HOME/profiles/<profile>/cordis.patch.yml` 移除 `dsh-my-plugins` 的 insert 条目。
卸载后，其余插件会自动回退到「设置」面板显示。
