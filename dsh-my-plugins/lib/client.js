window.__ModuleLoader__.load({
  id: "dsh-my-plugins",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let react = require("react");
    const {
      createElement: h,
      useState,
      useEffect,
      useRef,
      useSyncExternalStore,
      Fragment
    } = react;

    const inject = ["slots"];

    // 「我的插件」面板消费的子 slot：其余插件把它们的设置页注册到这里。
    // 未安装本插件时，其余插件会回退到 settings.section（见各自 client.js）。
    const SECTION = "my-plugins.section";
    const SIZE_STORAGE_KEY = "dsh-my-plugins.panel-size.v1";
    const MIN_PANEL_WIDTH = 360;
    const MIN_PANEL_HEIGHT = 240;
    const VIEWPORT_GAP = 24;

    function defaultPanelSize() {
      return {
        w: Math.round(window.innerWidth * 0.88),
        h: Math.round(window.innerHeight * 0.8),
      };
    }

    function clampPanelSize(value) {
      const fallback = defaultPanelSize();
      const maxW = Math.max(280, window.innerWidth - VIEWPORT_GAP);
      const maxH = Math.max(200, window.innerHeight - VIEWPORT_GAP);
      const minW = Math.min(MIN_PANEL_WIDTH, maxW);
      const minH = Math.min(MIN_PANEL_HEIGHT, maxH);
      const rawW = Number(value?.w);
      const rawH = Number(value?.h);
      return {
        w: Math.max(minW, Math.min(maxW, Number.isFinite(rawW) && rawW > 0 ? rawW : fallback.w)),
        h: Math.max(minH, Math.min(maxH, Number.isFinite(rawH) && rawH > 0 ? rawH : fallback.h)),
      };
    }

    function readStoredSize() {
      try {
        const raw = globalThis.localStorage?.getItem(SIZE_STORAGE_KEY);
        return raw ? clampPanelSize(JSON.parse(raw)) : { w: 0, h: 0 };
      } catch {
        return { w: 0, h: 0 };
      }
    }

    function storeSize(value) {
      try {
        globalThis.localStorage?.setItem(SIZE_STORAGE_KEY, JSON.stringify({ w: Math.round(value.w), h: Math.round(value.h) }));
      } catch {
        // 浏览器禁用本地存储时仍允许正常使用，只是不记忆尺寸。
      }
    }

    // -------------------------------------------------------------------------
    // 样式（内联；颜色走 DSW 主题令牌，与设置面板一致）
    // -------------------------------------------------------------------------

    const S = {
      // 侧栏底部按钮：尽量对齐设置按钮的紧凑节奏（wide 34px 行 / rail 36px 圆）。
      layer: { position: "relative", display: "flex", flexDirection: "column", width: "100%" },
      trigger: {
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "calc(100% + 8px)",
        height: 34,
        margin: "4px -4px",
        padding: "6px 2px 6px 10px",
        boxSizing: "border-box",
        border: "none",
        borderRadius: 12,
        background: "transparent",
        cursor: "pointer",
        overflow: "hidden",
        color: "var(--dsw-alias-label-primary)",
        fontFamily: "inherit",
        fontSize: 14,
        lineHeight: "22px",
      },
      triggerHover: { background: "var(--dsw-alias-interactive-bg-hover)" },
      triggerRail: {
        width: 36,
        height: 36,
        margin: "8px 0 10px",
        justifyContent: "center",
        gap: 0,
        padding: 0,
        borderRadius: "50%",
      },
      triggerLabel: { overflow: "hidden", whiteSpace: "nowrap" },

      // 全视口遮罩层。
      overlay: {
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
      mask: {
        position: "absolute",
        inset: 0,
        background: "var(--dsw-alias-bg-mask-1)",
        backdropFilter: "var(--dsw-mask-blur)",
      },

      // 面板：默认约 80% 视口，右下角可拖拽调整。
      panel: {
        position: "relative",
        zIndex: 1,
        display: "flex",
        maxWidth: "calc(100vw - 24px)",
        maxHeight: "calc(100vh - 24px)",
        minWidth: "min(360px, calc(100vw - 24px))",
        minHeight: "min(240px, calc(100vh - 24px))",
        borderRadius: 24,
        overflow: "hidden",
        background: "var(--dsw-alias-bg-layer-2)",
        boxShadow: "var(--dsw-shadow-lv3)",
        "--dsh-scrollbar-thumb": "var(--dsw-alias-scrollbar-bg-l2)",
        "--dsh-scrollbar-thumb-hover": "var(--dsw-alias-scrollbar-hover-l2)",
      },

      // 左侧导航。
      nav: {
        flex: "none",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        width: 188,
        padding: "22px 12px 0",
        boxSizing: "border-box",
      },
      navCompact: { width: "100%", padding: "12px 12px 6px", gap: 8 },
      navTitle: {
        padding: "0 12px",
        fontSize: 16,
        lineHeight: "24px",
        fontWeight: 500,
        color: "var(--dsw-alias-label-primary)",
      },
      navList: { display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" },
      navListCompact: { flexDirection: "row", overflowX: "auto", overflowY: "hidden", paddingBottom: 2 },
      navCell: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 40,
        padding: "9px 16px 9px 12px",
        boxSizing: "border-box",
        border: "none",
        borderRadius: 12,
        background: "transparent",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 14,
        lineHeight: "22px",
        fontWeight: 400,
        color: "var(--dsw-alias-label-primary)",
        textAlign: "left",
      },
      navCellHover: { background: "var(--dsw-specific-sidebar-nav-item-hover)" },
      navCellActive: { background: "var(--dsw-specific-sidebar-nav-item-active)" },
      navCellCompact: { flex: "0 0 auto", minWidth: 104, justifyContent: "center", padding: "8px 12px" },
      navLabel: { flex: 1, minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" },

      // 右侧内容列。
      content: { flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" },
      header: {
        flex: "none",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 8,
        height: 54,
        padding: "20px 14px 8px 10px",
        boxSizing: "border-box",
      },
      close: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        padding: 0,
        border: "none",
        borderRadius: 28,
        background: "transparent",
        cursor: "pointer",
        color: "var(--dsw-alias-label-primary)",
      },
      options: { flex: 1, minWidth: 0, minHeight: 0, width: "100%", padding: "0 24px 24px", overflow: "auto", boxSizing: "border-box" },
      empty: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "var(--dsw-alias-label-secondary, #57606a)",
        fontSize: 13,
      },

      // 右下角拖拽手柄。
      resizeHandle: {
        position: "absolute",
        right: 0,
        bottom: 0,
        width: 20,
        height: 20,
        cursor: "se-resize",
        zIndex: 2,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-end",
        padding: "0 3px 3px 0",
        boxSizing: "border-box",
        color: "var(--dsw-alias-label-tertiary, #8b949e)",
        touchAction: "none",
      },
    };

    // -------------------------------------------------------------------------
    // 图标（内联 SVG，不依赖图标库）
    // -------------------------------------------------------------------------

    function PlugIcon({ size }) {
      return h("svg", {
        width: size, height: size, viewBox: "0 0 16 16",
        fill: "none", stroke: "currentColor", strokeWidth: 1.5,
        "aria-hidden": "true",
      },
        h("rect", { x: 2, y: 2, width: 5.5, height: 5.5, rx: 1.5 }),
        h("rect", { x: 8.5, y: 2, width: 5.5, height: 5.5, rx: 1.5 }),
        h("rect", { x: 2, y: 8.5, width: 5.5, height: 5.5, rx: 1.5 }),
        h("rect", { x: 8.5, y: 8.5, width: 5.5, height: 5.5, rx: 1.5 }),
      );
    }

    function CloseIcon({ size }) {
      return h("svg", {
        width: size, height: size, viewBox: "0 0 16 16",
        fill: "none", stroke: "currentColor", strokeWidth: 1.5,
        "aria-hidden": "true",
      },
        h("path", { d: "M4 4 L12 12 M12 4 L4 12", strokeLinecap: "round" }),
      );
    }

    // -------------------------------------------------------------------------
    // 导航投影：把 my-plugins.section 的 ledger 投影成有序导航行（uSES 源）。
    // -------------------------------------------------------------------------

    function makeSectionsStore(slots) {
      let version = -1;
      let rows = [];
      const getSnapshot = () => {
        const v = slots.getVersion(SECTION);
        if (v !== version) {
          version = v;
          rows = slots.entries(SECTION)
            .map((e) => {
              const label = e.options.label;
              const resolved = typeof label === "function" ? label() : label;
              return {
                id: e.options.id ?? "",
                order: e.options.order ?? 0,
                label: resolved ?? e.options.id ?? "",
              };
            })
            .sort((a, b) => a.order - b.order);
        }
        return rows;
      };
      const subscribe = (cb) => slots.subscribe(SECTION, cb);
      return { getSnapshot, subscribe };
    }

    // -------------------------------------------------------------------------
    // 面板组件
    // -------------------------------------------------------------------------

    function MyPluginsPanel(props) {
      const { wide, renderSlot, sectionsStore } = props;
      const [open, setOpen] = useState(false);
      const [activeId, setActiveId] = useState(undefined);
      const [hover, setHover] = useState(false);
      const [navHover, setNavHover] = useState({});
      const [box, setBox] = useState(readStoredSize);
      const dragRef = useRef(null);
      const boxRef = useRef(box);
      const triggerRef = useRef(null);
      const closeRef = useRef(null);

      const sections = useSyncExternalStore(
        sectionsStore.subscribe,
        sectionsStore.getSnapshot,
        sectionsStore.getSnapshot,
      );

      // 首次打开读取上次尺寸；视口改变时把尺寸限制在当前屏幕内。
      useEffect(() => {
        if (!open) return;
        const fit = () => {
          setBox((current) => {
            const next = clampPanelSize(current.w > 0 && current.h > 0 ? current : defaultPanelSize());
            boxRef.current = next;
            return next;
          });
        };
        fit();
        window.addEventListener("resize", fit);
        const focusTimer = setTimeout(() => closeRef.current?.focus(), 0);
        return () => {
          clearTimeout(focusTimer);
          window.removeEventListener("resize", fit);
        };
      }, [open]);

      // 拖拽调整大小。
      useEffect(() => {
        if (!open) return;
        const onMove = (e) => {
          const d = dragRef.current;
          if (!d) return;
          const next = clampPanelSize({ w: d.w0 + e.clientX - d.x0, h: d.h0 + e.clientY - d.y0 });
          boxRef.current = next;
          setBox(next);
        };
        const onUp = () => {
          if (dragRef.current) storeSize(boxRef.current);
          dragRef.current = null;
        };
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
        return () => {
          document.removeEventListener("pointermove", onMove);
          document.removeEventListener("pointerup", onUp);
        };
      }, [open]);

      const beginResize = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragRef.current = {
          x0: e.clientX,
          y0: e.clientY,
          w0: boxRef.current.w || Math.round(window.innerWidth * 0.88),
          h0: boxRef.current.h || Math.round(window.innerHeight * 0.8),
        };
      };

      const resizeByKeyboard = (e) => {
        const delta = e.shiftKey ? 50 : 20;
        let dw = 0;
        let dh = 0;
        if (e.key === "ArrowRight") dw = delta;
        else if (e.key === "ArrowLeft") dw = -delta;
        else if (e.key === "ArrowDown") dh = delta;
        else if (e.key === "ArrowUp") dh = -delta;
        else return;
        e.preventDefault();
        const next = clampPanelSize({ w: boxRef.current.w + dw, h: boxRef.current.h + dh });
        boxRef.current = next;
        setBox(next);
        storeSize(next);
      };

      // Escape 关闭。
      useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === "Escape") close(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
      }, [open]);

      const close = () => {
        storeSize(boxRef.current);
        setOpen(false);
        setActiveId(undefined);
        setTimeout(() => triggerRef.current?.focus(), 0);
      };

      // 选中的 section：activeId 失效时回退到第一个。
      const active = (sections.find((s) => s.id === activeId) || sections[0])?.id;

      const fittedBox = clampPanelSize(box.w > 0 && box.h > 0 ? box : defaultPanelSize());
      const w = fittedBox.w;
      const hgt = fittedBox.h;
      const compact = w < 720;

      return h("div", { style: S.layer },
        h("button", {
          type: "button",
          ref: triggerRef,
          style: {
            ...S.trigger,
            ...(wide ? {} : S.triggerRail),
            ...(hover ? S.triggerHover : {}),
          },
          "aria-haspopup": "dialog",
          "aria-expanded": open,
          "aria-label": "我的插件",
          onClick: () => setOpen((v) => !v),
          onMouseEnter: () => setHover(true),
          onMouseLeave: () => setHover(false),
        },
          h(PlugIcon, { size: wide ? 16 : 18 }),
          wide ? h("span", { style: S.triggerLabel }, "我的插件") : null,
        ),
        open ? h("div", { style: S.overlay, role: "presentation" },
          h("div", { style: S.mask, "aria-hidden": "true", onClick: close }),
          h("div", {
            role: "dialog",
            "aria-modal": "true",
            "aria-label": "我的插件",
            style: { ...S.panel, width: w, height: hgt, flexDirection: compact ? "column" : "row" },
          },
            h("nav", { style: { ...S.nav, ...(compact ? S.navCompact : {}) }, "aria-label": "插件分类" },
              h("div", { style: S.navTitle }, "我的插件"),
              h("div", { style: { ...S.navList, ...(compact ? S.navListCompact : {}) } },
                sections.length === 0
                  ? h("div", { style: { padding: "0 12px", fontSize: 13, color: "var(--dsw-alias-label-secondary, #57606a)" } }, "暂无插件")
                  : sections.map((row) => h("button", {
                    key: row.id,
                    type: "button",
                    style: {
                      ...S.navCell,
                      ...(compact ? S.navCellCompact : {}),
                      ...(row.id === active ? S.navCellActive : {}),
                      ...(row.id !== active && navHover[row.id] ? S.navCellHover : {}),
                    },
                    "aria-current": row.id === active ? "true" : undefined,
                    onClick: () => setActiveId(row.id),
                    onMouseEnter: () => setNavHover((m) => ({ ...m, [row.id]: true })),
                    onMouseLeave: () => setNavHover((m) => ({ ...m, [row.id]: false })),
                  }, h("span", { style: S.navLabel }, row.label))),
              ),
            ),
            h("div", { style: S.content },
              h("div", { style: S.header },
                h("div", { style: { flex: 1 } }),
                h("button", { type: "button", ref: closeRef, style: S.close, "aria-label": "关闭", onClick: close },
                  h(CloseIcon, { size: 14 }),
                ),
              ),
              h("div", { style: { ...S.options, padding: compact ? "0 12px 12px" : S.options.padding } },
                active !== undefined
                  ? renderSlot(SECTION, { close }, { only: active })
                  : h("div", { style: S.empty }, "安装插件后，它们的设置页会出现在这里。"),
              ),
            ),
            h("div", {
              style: S.resizeHandle,
              title: "拖拽调整大小",
              role: "separator",
              tabIndex: 0,
              "aria-label": "调整弹窗大小；方向键微调，按住 Shift 加速",
              "aria-orientation": "horizontal",
              onPointerDown: beginResize,
              onKeyDown: resizeByKeyboard,
            },
              h("svg", { width: 12, height: 12, viewBox: "0 0 12 12", fill: "none", stroke: "currentColor", strokeWidth: 1.5, "aria-hidden": "true" },
                h("path", { d: "M10 2 L2 10 M10 6 L6 10 M10 10 L10 10", strokeLinecap: "round" }),
              ),
            ),
          ),
        ) : null,
      );
    }

    // -------------------------------------------------------------------------
    // 注册
    // -------------------------------------------------------------------------

    function apply(ctx) {
      const sectionsStore = makeSectionsStore(ctx.slots);

      ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
        name: "sidebar.footer.action",
        id: "my-plugins",
        order: -100,
        children: { [SECTION]: { kind: "list", scope: "root" } },
      }, (props) => h(MyPluginsPanel, { ...props, sectionsStore })));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
