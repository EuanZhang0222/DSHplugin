window.__ModuleLoader__.load({
  id: "dsh-skill-manager",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    let react = require("react");
    const {
      createElement: h,
      useState,
      useEffect,
      useRef,
      Fragment
    } = react;

    const inject = ["slots"];
    const EXPORT_FORMAT = "dsh-plugin-config";
    const EXPORT_FORMAT_VERSION = 1;
    const PLUGIN_ID = "dsh-skill-manager";
    const PLUGIN_VERSION = "1.0.0";

    // ---------- host API ----------

    async function api(path, body) {
      const init = {
        method: body === undefined ? "GET" : "POST",
        headers: { "Content-Type": "application/json" }
      };
      if (body !== undefined) init.body = JSON.stringify(body);
      let res;
      try {
        res = await fetch(`/api/dsh-skill-manager${path}`, init);
      } catch {
        throw new Error("无法连接到 DSH 后端服务");
      }
      let json;
      try {
        json = await res.json();
      } catch {
        throw new Error(`后端返回了非 JSON 响应（HTTP ${String(res.status)}）`);
      }
      if (json && typeof json === "object" && json.ok === false) {
        const message = json.error ?? "请求失败";
        if (/未知接口.*POST.*(?:export|import)/i.test(message)) {
          throw new Error("DSH 宿主端仍在运行旧版技能插件，请重启 DSH 后再导入配置");
        }
        throw new Error(message);
      }
      return json;
    }

    /** 直接从浏览器已取得的技能列表生成迁移文件，避免旧宿主端缺少 /export 接口。 */
    function createExportDocument(skills) {
      return {
        format: EXPORT_FORMAT,
        formatVersion: EXPORT_FORMAT_VERSION,
        plugin: PLUGIN_ID,
        pluginVersion: PLUGIN_VERSION,
        exportedAt: new Date().toISOString(),
        secretPolicy: "no-managed-credentials",
        contentPolicy: "full-skill-content",
        items: skills.map((skill) => ({
          name: skill.name,
          description: skill.description,
          whenToUse: skill.whenToUse,
          interpreter: skill.interpreter,
          modelInvocable: skill.modelInvocable,
          userInvocable: skill.userInvocable,
          enabled: skill.enabled,
          content: skill.content,
          scripts: Array.isArray(skill.scripts) ? skill.scripts.map((script) => ({ name: script.name, code: script.code })) : [],
          refs: Array.isArray(skill.refs) ? skill.refs.map((ref) => ({ ...ref })) : []
        }))
      };
    }

    function downloadDocument(documentValue, prefix) {
      const date = new Date();
      const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}-${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}`;
      const blob = new Blob([JSON.stringify(documentValue, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${prefix}-${stamp}.dshconfig.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    async function readConfigFile(file) {
      if (!file) throw new Error("请选择要导入的配置文件");
      if (file.size > 10 * 1024 * 1024) throw new Error("配置文件不能超过 10 MB");
      try {
        return JSON.parse(await file.text());
      } catch {
        throw new Error("配置文件不是合法的 JSON（结构化数据）文件");
      }
    }

    // ---------- 样式 ----------

    const styles = {
      root: { display: "flex", flexDirection: "column", gap: 14, padding: "10px 4px 20px", width: "100%", minWidth: 0, boxSizing: "border-box", fontFamily: "inherit", color: "var(--dsw-alias-label-primary)" },
      head: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
      title: { fontSize: 16, fontWeight: 600, margin: 0 },
      muted: { color: "var(--dsw-alias-label-secondary)", fontSize: 12, lineHeight: 1.6 },
      list: { display: "flex", flexDirection: "column", gap: 8 },
      row: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 8, flexWrap: "wrap" },
      rowMain: { flex: 1, minWidth: 0 },
      skillName: { fontWeight: 600 },
      skillNameOff: { fontWeight: 600, textDecoration: "line-through", opacity: 0.55 },
      desc: { color: "var(--dsw-alias-label-secondary)", fontSize: 12, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
      btn: { border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-2)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: "inherit" },
      btnDanger: { border: "1px solid var(--dsw-alias-state-error-primary)", color: "var(--dsw-alias-state-error-primary)", background: "transparent", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12 },
      btnPrimary: { color: "var(--dsw-alias-label-primary-inverted)", background: "var(--dsw-alias-button-primary-fill)", border: "1px solid var(--dsw-alias-button-primary-fill)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12 },
      switch: { position: "relative", width: 36, height: 20, borderRadius: 999, border: "none", cursor: "pointer", background: "var(--dsw-alias-bg-layer-1)", padding: 0, flexShrink: 0 },
      switchOn: { background: "var(--dsw-alias-button-primary-fill)" },
      switchKnob: { position: "absolute", top: 2, left: 2, width: 16, height: 16, borderRadius: "50%", background: "#ffffff", transition: "left 0.15s" },
      switchKnobOn: { position: "absolute", top: 2, left: 18, width: 16, height: 16, borderRadius: "50%", background: "#ffffff", transition: "left 0.15s" },
      form: { display: "flex", flexDirection: "column", gap: 10, padding: 14, border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 8 },
      field: { display: "flex", flexDirection: "column", gap: 4 },
      label: { fontSize: 12, color: "var(--dsw-alias-label-secondary)" },
      input: { background: "var(--dsw-alias-bg-layer-1)", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 6, padding: "7px 9px", fontSize: 13, color: "inherit", width: "100%", boxSizing: "border-box" },
      textarea: { background: "var(--dsw-alias-bg-layer-1)", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 6, padding: "7px 9px", fontSize: 13, color: "inherit", width: "100%", boxSizing: "border-box", resize: "vertical" },
      textareaSm: { background: "var(--dsw-alias-bg-layer-1)", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 6, padding: "7px 9px", fontSize: 12, color: "inherit", width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "ui-monospace, monospace" },
      hint: { fontSize: 11, color: "var(--dsw-alias-label-secondary)" },
      checks: { display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" },
      check: { display: "flex", alignItems: "center", gap: 6, fontSize: 13 },
      actions: { display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" },
      error: { color: "var(--dsw-alias-state-error-primary)", fontSize: 12 },
      note: { color: "var(--dsw-alias-label-secondary)", fontSize: 12 },
      empty: { border: "1px dashed var(--dsw-alias-border-l2)", borderRadius: 8, padding: "36px 16px", textAlign: "center", color: "var(--dsw-alias-label-secondary)" },
      box: { display: "flex", flexDirection: "column", gap: 6, padding: 8, border: "1px dashed var(--dsw-alias-border-l2)", borderRadius: 6 },
      boxHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
      refRow: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" },
      refTag: { fontSize: 11, color: "var(--dsw-alias-label-secondary)" },
      transfer: { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 8, background: "var(--dsw-alias-bg-layer-1)", flexWrap: "wrap" },
      transferGrow: { flex: 1, minWidth: 160 },
      compactSelect: { background: "var(--dsw-alias-bg-layer-2)", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 6, padding: "5px 8px", color: "inherit", fontSize: 12 },
      ok: { color: "var(--dsw-alias-state-success-primary, #2e8b57)", fontSize: 12, lineHeight: 1.6 },
    };

    function Toggle({ on, onToggle, title }) {
      return h("button", {
        type: "button",
        title,
        style: { ...styles.switch, ...(on ? styles.switchOn : {}) },
        onClick: onToggle
      }, h("span", { style: on ? styles.switchKnobOn : styles.switchKnob }));
    }

    // ---------- 主组件 ----------

    function SkillManagerSection() {
      const [skills, setSkills] = useState([]);
      const [tools, setTools] = useState([]);
      const [connections, setConnections] = useState([]);
      const [apis, setApis] = useState([]);
      const [editing, setEditing] = useState(null);
      const [error, setError] = useState("");
      const [notice, setNotice] = useState("");
      const [busy, setBusy] = useState(false);
      const [confirmDel, setConfirmDel] = useState(null);
      const [selectedNames, setSelectedNames] = useState([]);
      const [conflictPolicy, setConflictPolicy] = useState("skip");
      const importInputRef = useRef(null);

      const refresh = async () => {
        try {
          const next = (await api("/list")).skills ?? [];
          setSkills(next);
          const availableNames = new Set(next.map((skill) => skill.name));
          setSelectedNames((current) => current.filter((name) => availableNames.has(name)));
        } catch (e) {
          setError(e && e.message ? e.message : String(e));
        }
      };

      useEffect(() => {
        refresh();
        api("/catalog").then((c) => {
          setTools((c && c.tools) || []);
          setConnections((c && c.connections) || []);
          setApis((c && c.apis) || []);
        }).catch(() => {});
      }, []);

      const doSave = async (rec, oldName) => {
        setBusy(true);
        setError("");
        setNotice("");
        try {
          const res = await api("/save", { record: rec, oldName });
          setEditing(null);
          await refresh();
          if (res.error) setError(res.error);
        } catch (e) {
          setError(e && e.message ? e.message : String(e));
        } finally {
          setBusy(false);
        }
      };

      const doRemove = async (name) => {
        if (confirmDel !== name) { setConfirmDel(name); return; }
        setConfirmDel(null);
        setBusy(true);
        setError("");
        setNotice("");
        try {
          await api("/remove", { name });
          await refresh();
        } catch (e) {
          setError(e && e.message ? e.message : String(e));
        } finally {
          setBusy(false);
        }
      };

      const doToggle = async (rec) => {
        const next = { ...rec, enabled: !rec.enabled };
        if (next.enabled && !next.modelInvocable && !next.userInvocable) {
          next.modelInvocable = true;
          next.userInvocable = true;
        }
        setBusy(true);
        setError("");
        setNotice("");
        try {
          const res = await api("/save", { record: next, oldName: rec.name });
          await refresh();
          if (res.error) setError(res.error);
        } catch (e) {
          setError(e && e.message ? e.message : String(e));
        } finally {
          setBusy(false);
        }
      };

      const startNew = () => setEditing({
        name: "", description: "", whenToUse: "", interpreter: "python",
        modelInvocable: true, userInvocable: true, enabled: true,
        content: "", scripts: [], refs: []
      });

      const toggleSelected = (name) => {
        setSelectedNames((current) => current.includes(name)
          ? current.filter((item) => item !== name)
          : current.concat(name));
      };

      const allSelected = skills.length > 0 && skills.every((skill) => selectedNames.includes(skill.name));
      const toggleAll = () => setSelectedNames(allSelected ? [] : skills.map((skill) => skill.name));

      const doExport = () => {
        if (selectedNames.length === 0) return;
        setError("");
        setNotice("");
        try {
          const selectedSet = new Set(selectedNames);
          const selectedSkills = skills.filter((skill) => selectedSet.has(skill.name));
          if (selectedSkills.length === 0) throw new Error("没有找到可导出的技能");
          downloadDocument(createExportDocument(selectedSkills), "dsh-skill-manager");
          setNotice(`已导出 ${selectedSkills.length} 个技能。文件包含完整技能正文、脚本和能力引用，不包含 API 密钥或数据库密码。`);
        } catch (e) {
          setError(e && e.message ? e.message : String(e));
        }
      };

      const doImport = async (event) => {
        const file = event.target.files && event.target.files[0];
        event.target.value = "";
        if (!file) return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
          const documentValue = await readConfigFile(file);
          const data = await api("/import", { document: documentValue, conflictPolicy });
          await refresh();
          setSelectedNames([]);
          const summary = data.summary || {};
          const importedNames = Array.isArray(data.importedNames) ? data.importedNames : [];
          const nameText = importedNames.length > 0 ? ` 本次写入：${importedNames.join("、")}。` : "";
          setNotice(`导入完成：新增 ${summary.imported ?? 0} 个，覆盖 ${summary.replaced ?? 0} 个，副本 ${summary.copied ?? 0} 个，跳过 ${summary.skipped ?? 0} 个。${nameText}请确认目标环境已配置技能引用的同名 API 工具和数据库连接。`);
        } catch (e) {
          setError(e && e.message ? e.message : String(e));
        } finally {
          setBusy(false);
        }
      };

      const row = (rec) => h("div", { key: rec.name, style: styles.row },
        h("input", {
          type: "checkbox",
          checked: selectedNames.includes(rec.name),
          disabled: busy,
          title: `选择技能 ${rec.name}`,
          "aria-label": `选择技能 ${rec.name}`,
          onChange: () => toggleSelected(rec.name)
        }),
        h("div", { style: styles.rowMain },
          h("div", { style: rec.enabled ? styles.skillName : styles.skillNameOff }, rec.name),
          h("div", { style: styles.desc }, rec.description)
        ),
        h(Toggle, { on: rec.enabled, title: rec.enabled ? "禁用" : "启用", onToggle: () => doToggle(rec) }),
        h("button", {
          style: styles.btn,
          onClick: () => { setConfirmDel(null); setEditing({ ...rec, scripts: rec.scripts || [], refs: rec.refs || [] }); }
        }, "编辑"),
        h("button", { style: styles.btnDanger, onClick: () => doRemove(rec.name) }, confirmDel === rec.name ? "确认删除" : "删除")
      );

      const form = () => {
        const rec = editing;
        const isNew = !skills.some((s) => s.name === rec.name);
        const set = (k) => (e) => setEditing({ ...rec, [k]: e.target.value });
        const setBool = (k) => (e) => setEditing({ ...rec, [k]: e.target.checked });

        const addScript = () => setEditing({ ...rec, scripts: (rec.scripts || []).concat([{ name: "", code: "" }]) });
        const removeScript = (i) => {
          const scripts = (rec.scripts || []).slice();
          scripts.splice(i, 1);
          setEditing({ ...rec, scripts });
        };
        const updateScript = (i, field, val) => {
          const scripts = (rec.scripts || []).slice();
          scripts[i] = { ...scripts[i], [field]: val };
          setEditing({ ...rec, scripts });
        };

        const addRef = (type) => {
          let ref;
          if (type === "tool") ref = { type: "tool", name: (apis[0] && apis[0].toolId) || (tools[0] && tools[0].name) || "" };
          else if (type === "database") ref = { type: "database", connection: (connections[0] && connections[0].name) || "", database: "", table: "" };
          else ref = { type: "sql", label: "", sql: "" };
          setEditing({ ...rec, refs: (rec.refs || []).concat([ref]) });
        };
        const removeRef = (i) => {
          const refs = (rec.refs || []).slice();
          refs.splice(i, 1);
          setEditing({ ...rec, refs });
        };
        const updateRef = (i, field, val) => {
          const refs = (rec.refs || []).slice();
          refs[i] = { ...refs[i], [field]: val };
          setEditing({ ...rec, refs });
        };

        const refEditor = (r, i) => {
          if (r.type === "tool") {
            // 优先展示 api 插件的工具（显示名称 + toolId），空则回退到全部 Agent 工具名。
            const apiOptions = apis.filter((a) => a.enabled !== false);
            const options = apiOptions.length > 0
              ? apiOptions.map((a) => ({ value: a.toolId, label: a.name + "（" + a.toolId + "）" }))
              : tools.map((t) => ({ value: t.name, label: t.name }));
            return h("div", { key: i, style: styles.box },
              h("div", { style: styles.refRow },
                h("span", { style: styles.refTag }, "接口工具"),
                h("select", { style: { ...styles.input, flex: 1, minWidth: 200 }, value: r.name, onChange: (e) => updateRef(i, "name", e.target.value) },
                  h("option", { value: "" }, "（选择接口）"),
                  options.map((o) => h("option", { key: o.value, value: o.value }, o.label))
                ),
                h("button", { style: styles.btnDanger, onClick: () => removeRef(i) }, "删除")
              )
            );
          }
          if (r.type === "database") {
            const connId = "skm-conn-" + i;
            return h("div", { key: i, style: styles.box },
              h("div", { style: styles.refRow },
                h("span", { style: styles.refTag }, "数据库连接"),
                h("select", { style: { ...styles.input, flex: 1, minWidth: 160 }, value: r.connection, onChange: (e) => updateRef(i, "connection", e.target.value) },
                  h("option", { value: "" }, "（选择连接）"),
                  connections.map((c) => h("option", { key: c.id || c.name, value: c.name }, c.name + (c.database ? "（默认库 " + c.database + "）" : "")))
                ),
                h("button", { style: styles.btnDanger, onClick: () => removeRef(i) }, "删除")
              ),
              h("div", { style: styles.refRow },
                h("input", { style: { ...styles.input, flex: 1, minWidth: 100 }, value: r.database, placeholder: "库名（可选，覆盖默认库）", onChange: (e) => updateRef(i, "database", e.target.value) }),
                h("input", { style: { ...styles.input, flex: 1, minWidth: 100 }, value: r.table, placeholder: "表名（可选）", onChange: (e) => updateRef(i, "table", e.target.value) })
              )
            );
          }
          return h("div", { key: i, style: styles.box },
            h("div", { style: styles.refRow },
              h("span", { style: styles.refTag }, "SQL 命令"),
              h("input", { style: { ...styles.input, flex: 1, minWidth: 120 }, value: r.label, placeholder: "标签（如 查库存）", onChange: (e) => updateRef(i, "label", e.target.value) }),
              h("button", { style: styles.btnDanger, onClick: () => removeRef(i) }, "删除")
            ),
            h("textarea", { style: { ...styles.textareaSm, minHeight: 70 }, value: r.sql, placeholder: "SELECT ...", onChange: (e) => updateRef(i, "sql", e.target.value) })
          );
        };

        return h("div", { style: styles.form },
          h("div", { style: styles.field },
            h("label", { style: styles.label }, "名称（kebab-case）"),
            h("input", { style: styles.input, value: rec.name, disabled: !isNew, onChange: set("name"), placeholder: "my-review" })
          ),
          h("div", { style: styles.field },
            h("label", { style: styles.label }, "描述 *"),
            h("input", { style: styles.input, value: rec.description, onChange: set("description"), placeholder: "一句话说明这个技能做什么" })
          ),
          h("div", { style: styles.field },
            h("label", { style: styles.label }, "何时调用（whenToUse，可选）"),
            h("input", { style: styles.input, value: rec.whenToUse, onChange: set("whenToUse"), placeholder: "当用户要求代码审查时" })
          ),
          h("div", { style: styles.field },
            h("label", { style: styles.label }, "解释器命令"),
            h("input", { style: styles.input, value: rec.interpreter || "python", onChange: set("interpreter"), placeholder: "python" }),
            h("div", { style: styles.hint }, "执行 Python 脚本用的命令，如 python / python3 / py / 绝对路径。")
          ),
          h("div", { style: styles.checks },
            h("label", { style: styles.check },
              h("input", { type: "checkbox", checked: rec.modelInvocable, onChange: setBool("modelInvocable") }),
              "模型可自动调用"
            ),
            h("label", { style: styles.check },
              h("input", { type: "checkbox", checked: rec.userInvocable, onChange: setBool("userInvocable") }),
              "用户可 /name 调用"
            )
          ),
          h("div", { style: styles.field },
            h("label", { style: styles.label }, "技能正文（markdown）"),
            h("textarea", { style: { ...styles.textarea, minHeight: 140 }, value: rec.content, onChange: set("content"), placeholder: "在这里写技能指令……\n\n可写 @技能名 引用其他技能；@api:工具名 引用接口；@db:连接名 引用数据库；SQL 直接写在正文（配合 @db:连接名 执行）。" }),
            h("div", { style: styles.hint }, "正文注入模型 system prompt。@技能名=引用其他技能；@api:工具名=引用接口；@db:连接名=引用数据库连接；正文里可直接写 ```sql 代码块查询。" )
          ),
          h("div", { style: styles.field },
            h("div", { style: styles.boxHead },
              h("label", { style: styles.label }, "Python 脚本（可选，可多个）"),
              h("button", { style: styles.btn, onClick: addScript }, "+ 添加脚本")
            ),
            (rec.scripts || []).map((s, i) =>
              h("div", { key: i, style: styles.box },
                h("input", { style: styles.input, value: s.name, placeholder: "脚本名称（如 数据清洗）", onChange: (e) => updateScript(i, "name", e.target.value) }),
                h("textarea", { style: { ...styles.textareaSm, minHeight: 70 }, value: s.code, placeholder: "Python 代码", onChange: (e) => updateScript(i, "code", e.target.value) }),
                h("button", { style: styles.btnDanger, onClick: () => removeScript(i) }, "删除脚本")
              )
            )
          ),
          h("div", { style: styles.field },
            h("div", { style: styles.boxHead },
              h("label", { style: styles.label }, "能力引用（可选，可多个）"),
              h("div", { style: { display: "flex", gap: 6 } },
                h("button", { style: styles.btn, onClick: () => addRef("tool") }, "+接口"),
                h("button", { style: styles.btn, onClick: () => addRef("database") }, "+数据库表"),
                h("button", { style: styles.btn, onClick: () => addRef("sql") }, "+SQL")
              )
            ),
            (rec.refs || []).map(refEditor),
            h("div", { style: styles.hint }, "引用其他插件能力：接口工具（下拉选 api）/ 数据库连接（下拉选连接）/ SQL。等价于在正文里写 @api:工具名 / @db:连接名 / SQL 代码块。")
          ),
          h("div", { style: styles.actions },
            h("button", { style: styles.btn, onClick: () => setEditing(null) }, "取消"),
            h("button", { style: styles.btnPrimary, disabled: busy, onClick: () => doSave(rec, isNew ? undefined : rec.name) }, busy ? "保存中…" : "保存")
          )
        );
      };

      return h("div", { style: styles.root },
        h("div", { style: styles.head },
          h("div", null,
            h("h3", { style: styles.title }, "技能（Skill）配置"),
            h("p", { style: styles.muted }, "自定义技能：正文 + Python 脚本 + @技能名 互调 + 引用接口/数据库/SQL，配置后立即生效。")
          ),
          editing === null ? h("button", { style: styles.btnPrimary, onClick: startNew }, "+ 新建技能") : null
        ),
        editing === null ? h("div", { style: styles.transfer },
          h("label", { style: styles.check },
            h("input", { type: "checkbox", checked: allSelected, disabled: skills.length === 0 || busy, onChange: toggleAll }),
            "全选"
          ),
          h("span", { style: { ...styles.muted, ...styles.transferGrow } }, selectedNames.length > 0 ? `已选 ${selectedNames.length} 项` : "选择要迁移的技能"),
          h("label", { style: styles.check },
            "导入冲突",
            h("select", { style: styles.compactSelect, value: conflictPolicy, disabled: busy, onChange: (event) => setConflictPolicy(event.target.value) },
              h("option", { value: "skip" }, "跳过已有项"),
              h("option", { value: "replace" }, "覆盖已有项"),
              h("option", { value: "copy" }, "创建导入副本")
            )
          ),
          h("input", {
            ref: importInputRef,
            type: "file",
            accept: ".json,.dshconfig.json,application/json",
            style: { display: "none" },
            onChange: doImport
          }),
          h("button", { style: styles.btn, disabled: busy, onClick: () => importInputRef.current?.click() }, busy ? "处理中…" : "导入配置"),
          h("button", { style: styles.btnPrimary, disabled: selectedNames.length === 0 || busy, onClick: doExport }, `导出选中${selectedNames.length > 0 ? `（${selectedNames.length}）` : ""}`)
        ) : null,
        error ? h("div", { style: styles.error }, error) : null,
        notice ? h("div", { style: styles.ok }, notice) : null,
        editing !== null ? form() : null,
        skills.length === 0 && editing === null
          ? h("div", { style: styles.empty }, "还没有自定义技能，点击「新建技能」开始。")
          : editing === null ? h("div", { style: styles.list }, skills.map(row)) : null,
        h("div", { style: styles.note }, "技能持久化到 ~/.dsh/skills/，配置后立即生效。迁移文件包含完整技能正文、脚本和能力引用；导入后需确认目标环境存在同名 API 工具与数据库连接。")
      );
    }

    // ---------- 注册 ----------

    function apply(ctx) {
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
        active = ctx.slots.register({
          name: target,
          id: "dsh-skill-manager",
          order: 25,
          label: "技能"
        }, SkillManagerSection);
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
      }, "dsh-skill-manager: section target");
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
