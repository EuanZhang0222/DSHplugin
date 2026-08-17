window.__ModuleLoader__.load({
  id: "dsh-skin-manager",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");
    const { useState, useEffect, useRef } = React;

    // -------------------------------------------------------------------------
    // 皮肤管理器：单一运行时状态（皮肤目录 + 当前选中），通过闭包共享给
    // 设置页 UI 与背景浮层两处消费。
    // -------------------------------------------------------------------------
    function createManager(ctx) {
      let skins = [];
      let active = "default";
      let ready = false;
      let cssEl = null;
      let tokenDispose = null;
      const listeners = new Set();

      function getSnapshot() {
        return { skins, active, ready };
      }
      function subscribe(fn) {
        listeners.add(fn);
        return () => { listeners.delete(fn); };
      }
      function emit() {
        for (const fn of [...listeners]) fn();
      }

      // 应用/移除某个皮肤的外观：颜色令牌覆盖 + 自定义样式。
      function applySkin(skin) {
        if (tokenDispose) { try { tokenDispose(); } catch {} tokenDispose = null; }
        if (skin && skin.tokens && Object.keys(skin.tokens).length > 0) {
          const tokens = {};
          for (const key of Object.keys(skin.tokens)) {
            tokens[key] = { light: skin.tokens[key], dark: skin.tokens[key] };
          }
          tokenDispose = ctx.theme.overrideTokens("skin", tokens);
        }
        if (cssEl) { cssEl.remove(); cssEl = null; }
        if (skin && skin.css) {
          cssEl = document.createElement("style");
          cssEl.setAttribute("data-dsh-skin", skin.id);
          cssEl.textContent = skin.css;
          document.head.append(cssEl);
        }
      }

      // 按 active 同步外观，并广播状态。
      function sync() {
        const skin = skins.find((s) => s.id === active);
        applySkin(skin && skin.id !== "default" ? skin : null);
        emit();
      }

      async function load() {
        try {
          const res = await fetch("/api/dsh-skins/state");
          const data = await res.json();
          if (data && data.ok) {
            skins = data.skins || [];
            active = data.active || "default";
            ready = true;
            sync();
          }
        } catch {
          // 主机接口不可用时保持现状（不覆盖用户可见内容）。
        }
      }

      async function select(id) {
        const res = await fetch("/api/dsh-skins/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const data = await res.json();
        if (!data || !data.ok) throw new Error((data && data.error) || "切换失败");
        skins = data.skins || skins;
        active = data.active || active;
        sync();
      }

      async function install(skin) {
        const res = await fetch("/api/dsh-skins/install", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skin }),
        });
        const data = await res.json();
        if (!data || !data.ok) throw new Error((data && data.error) || "安装失败");
        skins = data.skins || skins;
        active = data.active || active;
        sync();
      }

      async function uninstall(id) {
        const res = await fetch("/api/dsh-skins/uninstall", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const data = await res.json();
        if (!data || !data.ok) throw new Error((data && data.error) || "卸载失败");
        skins = data.skins || skins;
        active = data.active || active;
        sync();
      }

      return { getSnapshot, subscribe, load, select, install, uninstall };
    }

    // -------------------------------------------------------------------------
    // 背景浮层：根据当前皮肤的背景配置渲染视频 / 图片 / 渐变 / 纯色。
    // -------------------------------------------------------------------------
    function SkinBackground({ manager }) {
      const [snap, setSnap] = useState(() => manager.getSnapshot());
      useEffect(() => manager.subscribe(() => setSnap(manager.getSnapshot())), [manager]);

      const skin = snap.skins.find((s) => s.id === snap.active);
      if (!skin || skin.id === "default" || !skin.background) return null;
      const bg = skin.background;

      const baseStyle = {
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: "none",
        overflow: "hidden",
        opacity: typeof bg.opacity === "number" ? bg.opacity : 1,
      };

      if (bg.type === "video") {
        return React.createElement(VideoLayer, { src: bg.src, brightness: bg.brightness, baseStyle });
      }
      if (bg.type === "image" || bg.type === "url") {
        return React.createElement("div", {
          "aria-hidden": "true",
          style: Object.assign({}, baseStyle, {
            backgroundImage: 'url("' + bg.value + '")',
            backgroundSize: "cover",
            backgroundPosition: "center",
          }),
        });
      }
      // color / gradient
      return React.createElement("div", {
        "aria-hidden": "true",
        style: Object.assign({}, baseStyle, { background: bg.value }),
      });
    }

    function VideoLayer({ src, brightness, baseStyle }) {
      const ref = useRef(null);
      useEffect(() => {
        const v = ref.current;
        if (v) {
          v.defaultMuted = true;
          v.muted = true;
          v.play().catch(() => {});
        }
      }, []);
      return React.createElement("div", { "aria-hidden": "true", style: baseStyle },
        React.createElement("video", {
          ref,
          src,
          autoPlay: true,
          loop: true,
          muted: true,
          playsInline: true,
          style: {
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            ...(brightness ? { filter: "brightness(" + brightness + ")" } : {}),
          },
        }),
      );
    }

    // -------------------------------------------------------------------------
    // 设置页「皮肤」分区。
    // -------------------------------------------------------------------------
    const S = {
      wrap: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
        minHeight: "100%",
        padding: "10px 4px 20px",
        boxSizing: "border-box",
        color: "var(--dsw-alias-label-primary)",
      },
      title: { fontSize: 18, fontWeight: 600, margin: "0 0 4px" },
      subtitle: { fontSize: 13, opacity: 0.65, margin: "0 0 16px" },
      catalog: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
        alignItems: "stretch",
        gap: 10,
        width: "100%",
        minWidth: 0,
      },
      card: {
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        minWidth: 0, height: "100%", boxSizing: "border-box",
        padding: "14px 16px",
        borderRadius: 10,
        border: "1px solid var(--dsw-alias-border-l2)",
        background: "var(--dsw-alias-bg-layer-1)",
      },
      cardBody: { flex: "1 1 220px", minWidth: 0 },
      cardHead: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
      cardActions: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", marginLeft: "auto" },
      cardName: { fontSize: 15, fontWeight: 600, margin: "0 0 3px" },
      cardDesc: { fontSize: 12.5, opacity: 0.7, margin: 0, lineHeight: 1.5 },
      cardMeta: { fontSize: 12, opacity: 0.5, margin: "3px 0 0" },
      badge: {
        display: "inline-block", padding: "2px 9px", borderRadius: 999,
        fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
        color: "var(--dsw-alias-button-primary-fill)",
        background: "rgba(212, 176, 106, 0.12)",
        border: "1px solid var(--dsw-alias-button-primary-fill)",
      },
      btn: {
        padding: "6px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer",
        border: "1px solid var(--dsw-alias-border-l2)",
        background: "var(--dsw-alias-button-tool-bar-fill)",
        color: "var(--dsw-alias-label-primary)",
        whiteSpace: "nowrap",
      },
      btnPrimary: {
        padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
        border: "1px solid transparent",
        background: "var(--dsw-alias-button-primary-fill)",
        color: "var(--dsw-alias-label-primary-inverted)",
      },
      danger: {
        padding: "6px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer",
        border: "1px solid var(--dsw-alias-state-error-primary)",
        background: "transparent",
        color: "var(--dsw-alias-state-error-primary)",
        whiteSpace: "nowrap",
      },
      importBox: {
        width: "100%", minWidth: 0, boxSizing: "border-box",
        marginTop: 16, padding: "16px", borderRadius: 10,
        border: "1px dashed var(--dsw-alias-border-l2)",
        background: "var(--dsw-alias-bg-layer-1)",
      },
      notice: {
        marginTop: 12, padding: "10px 12px", borderRadius: 8, fontSize: 13,
        background: "var(--dsw-alias-state-success-secondary)",
        color: "var(--dsw-alias-state-success-primary)",
      },
      error: {
        marginTop: 12, padding: "10px 12px", borderRadius: 8, fontSize: 13, whiteSpace: "pre-wrap",
        background: "var(--dsw-alias-state-error-secondary)",
        color: "var(--dsw-alias-state-error-primary)",
      },
    };

    function SkinSection({ manager }) {
      const [snap, setSnap] = useState(() => manager.getSnapshot());
      const [error, setError] = useState(null);
      const [notice, setNotice] = useState(null);
      const [busy, setBusy] = useState(false);
      const [confirmId, setConfirmId] = useState(null);
      const fileRef = useRef(null);

      useEffect(() => manager.subscribe(() => setSnap(manager.getSnapshot())), [manager]);
      useEffect(() => { void manager.load(); }, [manager]);

      const select = async (id) => {
        setBusy(true); setError(null); setNotice(null);
        try { await manager.select(id); }
        catch (e) { setError(e && e.message ? e.message : String(e)); }
        finally { setBusy(false); }
      };

      const uninstall = async (id, name) => {
        if (confirmId !== id) { setConfirmId(id); return; }
        setConfirmId(null);
        setBusy(true); setError(null); setNotice(null);
        try { await manager.uninstall(id); setNotice("已卸载「" + name + "」"); }
        catch (e) { setError(e && e.message ? e.message : String(e)); }
        finally { setBusy(false); }
      };

      const onPickFile = () => { if (fileRef.current) fileRef.current.click(); };

      const onFile = async (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = "";
        if (!file) return;
        setError(null); setNotice(null); setBusy(true);
        try {
          const text = await file.text();
          let skin;
          try {
            skin = JSON.parse(text);
          } catch {
            throw new Error("不是合法的 JSON 文件");
          }
          await manager.install(skin);
          setNotice("已安装皮肤「" + (skin && skin.name ? skin.name : skin.id) + "」");
        } catch (err) {
          setError(err && err.message ? err.message : String(err));
        } finally {
          setBusy(false);
        }
      };

      const skins = snap.skins || [];

      return React.createElement("div", { style: S.wrap },
        React.createElement("h2", { style: S.title }, "皮肤"),
        React.createElement("p", { style: S.subtitle }, "选择外观皮肤；也可以通过 .dshskin 皮肤文件安装新皮肤。"),
        React.createElement("div", { style: S.catalog },
          skins.map((skin) =>
            React.createElement("div", { key: skin.id, style: S.card },
              React.createElement("div", { style: S.cardBody },
                React.createElement("div", { style: S.cardHead },
                  React.createElement("span", { style: S.cardName }, skin.name),
                  skin.builtin ? React.createElement("span", { style: Object.assign({}, S.badge, { background: "rgba(255,255,255,0.08)", borderColor: "var(--dsw-alias-border-l2)", color: "var(--dsw-alias-label-secondary)" }) }, "内置") : null,
                  snap.active === skin.id ? React.createElement("span", { style: S.badge }, "使用中") : null,
                ),
                skin.description ? React.createElement("p", { style: S.cardDesc }, skin.description) : null,
                React.createElement("p", { style: S.cardMeta },
                  (skin.author ? skin.author + " · " : "") + "v" + (skin.version || "?")),
              ),
              snap.active === skin.id && skin.builtin
                ? null
                : React.createElement("div", { style: S.cardActions },
                  snap.active === skin.id
                    ? null
                    : React.createElement("button", { style: S.btn, disabled: busy, onClick: () => select(skin.id) }, "使用"),
                  !skin.builtin
                    ? React.createElement("button", { style: S.danger, disabled: busy, onClick: () => uninstall(skin.id, skin.name) }, confirmId === skin.id ? "确认卸载？" : "卸载")
                    : null,
                ),
            ),
          ),
        ),
        React.createElement("div", { style: S.importBox },
          React.createElement("div", { style: { fontWeight: 600, marginBottom: 6 } }, "新增皮肤"),
          React.createElement("p", { style: { fontSize: 12.5, opacity: 0.7, margin: "0 0 12px", lineHeight: 1.6 } },
            "导入一个 .dshskin 皮肤文件（JSON）。文件需包含 schema、id、name、version、colorScheme，可选 tokens / css / background。详见插件 docs/皮肤文件格式规范.md。"),
          React.createElement("input", {
            ref: fileRef, type: "file", accept: ".dshskin,.json,application/json",
            style: { display: "none" }, onChange: onFile,
          }),
          React.createElement("button", { style: S.btnPrimary, disabled: busy, onClick: onPickFile },
            busy ? "处理中…" : "选择皮肤文件并安装"),
        ),
        error ? React.createElement("div", { style: S.error }, error) : null,
        notice ? React.createElement("div", { style: S.notice }, notice) : null,
      );
    }

    const inject = ["slots", "theme"];

    function apply(ctx) {
      const manager = createManager(ctx);

      // 初次加载恢复已选皮肤。
      ctx.effect(() => { void manager.load(); }, "dsh-skin-manager: initial load");

      // 背景浮层：随皮肤切换自动渲染/消失。
      ctx.slots.inject("shell.overlay", () => ctx.slots.register(
        { name: "shell.overlay", id: "dsh-skin-background", order: -9999 },
        () => React.createElement(SkinBackground, { manager }),
      ));

      // 「皮肤」分区：安装了「我的插件」基础插件（声明 my-plugins.section）就
      // 注册到大面板里，否则回退到设置页（settings.section）。动态迁移，顺序无关。
      const MP = "my-plugins.section";
      const SETTINGS = "settings.section";
      let active = null;
      let activeTarget = null;

      const mount = () => {
        const target = ctx.slots.spec(MP) ? MP : SETTINGS;
        if (target === activeTarget && active !== null) return;
        if (active) { try { active(); } catch (e) {} active = null; }
        activeTarget = target;
        if (!ctx.slots.spec(target)) return;
        active = ctx.slots.register(
          { name: target, id: "dsh-skins", order: 30, label: "皮肤" },
          () => React.createElement(SkinSection, { manager }),
        );
      };

      ctx.effect(() => {
        const offMp = ctx.slots.subscribe(MP, mount);
        const offSettings = ctx.slots.subscribe(SETTINGS, mount);
        mount();
        return () => {
          offMp();
          offSettings();
          if (active) { try { active(); } catch (e) {} active = null; }
        };
      }, "dsh-skin-manager: section target");
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
