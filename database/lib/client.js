window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-database-connections",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/styles.ts
		const PLUGIN_STYLES = String.raw`
[role="dialog"]:has(.dsl-root){width:min(1500px,calc(100vw - 48px));height:min(900px,calc(100vh - 48px));max-width:none}
[role="dialog"]:has(.dsl-root)>*:last-child{min-width:0;flex:1}
.dsl-root{
  --dsl-text:var(--dsw-alias-label-primary,#181818);
  --dsl-muted:var(--dsw-alias-label-secondary,#707070);
  --dsl-bg:var(--dsw-alias-bg-layer-1,#f6f6f6);
  --dsl-surface:var(--dsw-alias-bg-layer-2,#fff);
  --dsl-line:var(--dsw-alias-border-l2,#dedede);
  --dsl-line-soft:var(--dsw-alias-border-l1,#ececec);
  --dsl-primary:var(--dsw-alias-button-primary-fill,#181818);
  /* 背景层令前景色随皮肤翻转，兼容尚未提供 primary-foreground 的旧 Harness。 */
  --dsl-primary-text:var(--dsw-alias-bg-layer-1,#fff);
  --dsl-success:var(--dsw-alias-state-success-primary,#208454);
  --dsl-error:var(--dsw-alias-state-error-primary,#b6463d);
  --dsl-warning:#a26a18;
  /* 由宿主管理高度和滚动；断点跟随插件内容区，而非整个浏览器窗口。 */
  width:100%;min-width:0;min-height:100%;box-sizing:border-box;color:var(--dsl-text);font-family:inherit;
  container:dsl-workspace / inline-size;
}
.dsl-root *{box-sizing:border-box}.dsl-root button,.dsl-root input,.dsl-root select,.dsl-root textarea{font:inherit;color:inherit}.dsl-root code,.dsl-code{font-family:ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace}
.dsl-shell{width:100%;min-width:0;min-height:100%;display:grid;align-content:start;gap:17px;padding:4px 4px 24px}.dsl-tabs{max-width:100%;width:fit-content;display:flex;gap:5px;padding:4px;border-radius:10px;background:var(--dsl-bg)}
.dsl-tabs button{display:inline-flex;align-items:center;gap:7px;min-height:34px;padding:7px 13px;border:0;border-radius:7px;background:transparent;color:var(--dsl-muted);cursor:pointer;font-size:13px;white-space:nowrap}
.dsl-tabs button[aria-selected="true"]{background:var(--dsl-surface);color:var(--dsl-text);box-shadow:0 1px 4px rgba(0,0,0,.11);font-weight:650}
.dsl-page{width:100%;max-width:none;margin:0;display:grid;align-content:start;gap:17px;min-width:0}.dsl-page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;min-width:0}
.dsl-page-header>div:first-child{min-width:0}.dsl-eyebrow{margin-bottom:5px;color:var(--dsl-muted);font-size:10px;font-weight:650;letter-spacing:.04em}.dsl-page-header h1{margin:0;font-size:23px;line-height:1.2;letter-spacing:-.02em}.dsl-page-header p{max-width:800px;margin:7px 0 0;color:var(--dsl-muted);font-size:13px;line-height:1.55}.dsl-actions,.dsl-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dsl-button{min-height:36px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:7px 11px;border:1px solid var(--dsl-line);border-radius:7px;background:var(--dsl-surface);color:var(--dsl-text);cursor:pointer;font-size:13px;font-weight:520;white-space:nowrap}.dsl-button:hover:not(:disabled){background:var(--dsl-bg);border-color:var(--dsl-muted)}.dsl-button:focus-visible,.dsl-input:focus-visible,.dsl-select:focus-visible,.dsl-textarea:focus-visible{outline:2px solid color-mix(in srgb,var(--dsl-primary) 45%,transparent);outline-offset:2px}.dsl-button:disabled{opacity:.45;cursor:not-allowed}.dsl-button-primary{background:var(--dsl-primary);border-color:var(--dsl-primary);color:var(--dsl-primary-text)}.dsl-button-primary:hover:not(:disabled){background:color-mix(in srgb,var(--dsl-primary) 84%,var(--dsl-surface));border-color:var(--dsl-primary)}.dsl-button-danger{border-color:color-mix(in srgb,var(--dsl-error) 36%,var(--dsl-line));background:color-mix(in srgb,var(--dsl-error) 7%,var(--dsl-surface));color:var(--dsl-error)}.dsl-icon-button{width:34px;padding:0}.dsl-icon-button span{display:none}
.dsl-button-primary>span,.dsl-button-primary>svg{color:#fff!important;mix-blend-mode:difference}
.dsl-card,.dsl-section{min-width:0;border:1px solid var(--dsl-line);border-radius:11px;background:var(--dsl-surface)}.dsl-section{padding:16px}.dsl-status{width:fit-content;display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:650;white-space:nowrap}.dsl-status-success{color:var(--dsl-success);background:color-mix(in srgb,var(--dsl-success) 11%,var(--dsl-surface))}.dsl-status-warning{color:var(--dsl-warning);background:color-mix(in srgb,var(--dsl-warning) 12%,var(--dsl-surface))}.dsl-status-neutral{color:var(--dsl-muted);background:var(--dsl-bg)}
.dsl-message{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border:1px solid var(--dsl-line);border-radius:8px;font-size:12px;line-height:1.5}.dsl-message-ok{border-color:color-mix(in srgb,var(--dsl-success) 32%,var(--dsl-line));background:color-mix(in srgb,var(--dsl-success) 7%,var(--dsl-surface));color:var(--dsl-success)}.dsl-message-error{border-color:color-mix(in srgb,var(--dsl-error) 32%,var(--dsl-line));background:color-mix(in srgb,var(--dsl-error) 7%,var(--dsl-surface));color:var(--dsl-error)}
.dsl-connection-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.dsl-connection-card{padding:17px;box-shadow:0 4px 15px rgba(0,0,0,.025)}.dsl-connection-card:first-child{border-left:3px solid var(--dsl-primary)}.dsl-connection-head{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:11px;align-items:start}.dsl-db-icon,.dsl-dataset-icon,.dsl-summary-icon,.dsl-callout-icon,.dsl-topology-icon{display:grid;place-items:center;flex:none;border-radius:9px;background:var(--dsl-bg);color:var(--dsl-muted)}.dsl-db-icon{width:38px;height:38px}.dsl-db-icon.mysql{background:color-mix(in srgb,#5b83b8 15%,var(--dsl-surface));color:#5577a5}.dsl-db-icon.clickhouse{background:color-mix(in srgb,#c99421 16%,var(--dsl-surface));color:#a57412}.dsl-connection-head strong{display:block;font-size:14px}.dsl-connection-head p{margin:4px 0 0;color:var(--dsl-muted);font-size:11px;word-break:break-word}.dsl-connection-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:14px 0;margin:14px 0;border-top:1px solid var(--dsl-line-soft);border-bottom:1px solid var(--dsl-line-soft)}.dsl-connection-meta small,.dsl-source-strip small{display:block;color:var(--dsl-muted);font-size:10px}.dsl-connection-meta strong{display:block;margin-top:4px;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsl-query-head,.dsl-section-title{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.dsl-query-head h2,.dsl-section-title h2{margin:0;font-size:14px}.dsl-query-head p,.dsl-section-title p{margin:4px 0 0;color:var(--dsl-muted);font-size:11px;line-height:1.5}.dsl-query-line{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:stretch;margin-top:12px}.dsl-query-line textarea{min-height:58px;resize:vertical}.dsl-safety{display:flex;align-items:center;gap:6px;margin-top:9px;color:var(--dsl-muted);font-size:10px}.dsl-query-result{margin-top:12px;overflow:auto;border:1px solid var(--dsl-line);border-radius:8px}.dsl-query-result table{width:100%;border-collapse:collapse;font-size:11px}.dsl-query-result th,.dsl-query-result td{padding:8px;border-bottom:1px solid var(--dsl-line-soft);text-align:left;white-space:nowrap}.dsl-query-result th{background:var(--dsl-bg)}
.dsl-input,.dsl-select,.dsl-textarea{width:100%;min-height:36px;padding:8px 10px;border:1px solid var(--dsl-line);border-radius:8px;background:var(--dsl-surface);outline:0}.dsl-textarea{min-height:68px;resize:vertical;line-height:1.5}.dsl-field{display:grid;gap:6px}.dsl-field>span{color:var(--dsl-muted);font-size:11px;font-weight:600}.dsl-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.dsl-span-2{grid-column:1/-1}.dsl-privacy{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start;margin-top:14px;padding:12px;border:1px solid color-mix(in srgb,var(--dsl-success) 22%,var(--dsl-line));border-radius:9px;background:color-mix(in srgb,var(--dsl-success) 6%,var(--dsl-surface));color:var(--dsl-success)}.dsl-privacy strong{display:block;font-size:11px}.dsl-privacy span{display:block;margin-top:3px;color:var(--dsl-muted);font-size:10px;line-height:1.5}
.dsl-summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.dsl-summary-card{display:grid;grid-template-columns:auto minmax(0,1fr);gap:11px;padding:15px}.dsl-summary-icon{width:37px;height:37px}.dsl-summary-card small{color:var(--dsl-muted);font-size:10px}.dsl-summary-card strong{display:block;margin-top:3px;font-size:20px}.dsl-summary-card p{margin:4px 0 0;color:var(--dsl-muted);font-size:10px;line-height:1.35}.dsl-summary-success .dsl-summary-icon{background:color-mix(in srgb,var(--dsl-success) 11%,var(--dsl-surface));color:var(--dsl-success)}.dsl-summary-warning .dsl-summary-icon{background:color-mix(in srgb,var(--dsl-warning) 11%,var(--dsl-surface));color:var(--dsl-warning)}
.dsl-dataset-list{padding:0;overflow:hidden}.dsl-list-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid var(--dsl-line-soft)}.dsl-search{width:min(360px,100%);display:flex;align-items:center;gap:8px;padding:0 10px;border:1px solid var(--dsl-line);border-radius:8px;background:var(--dsl-surface)}.dsl-search input{width:100%;height:34px;border:0;background:transparent;outline:0}.dsl-table-scroll{overflow-x:auto}.dsl-dataset-head,.dsl-dataset-row{min-width:930px;display:grid;grid-template-columns:minmax(270px,1.6fr) minmax(160px,.9fr) minmax(120px,.65fr) 80px 104px 34px;gap:12px;align-items:center}.dsl-dataset-head{padding:9px 14px;background:var(--dsl-bg);border-bottom:1px solid var(--dsl-line-soft);color:var(--dsl-muted);font-size:10px;font-weight:650}.dsl-dataset-row{padding:14px;border-bottom:1px solid var(--dsl-line-soft);cursor:pointer}.dsl-dataset-row:last-child{border-bottom:0}.dsl-dataset-row:hover{background:var(--dsl-bg)}.dsl-dataset-main{min-width:0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start}.dsl-dataset-icon{width:34px;height:34px}.dsl-dataset-main strong{font-size:13px}.dsl-dataset-main code{margin-left:8px;color:var(--dsl-muted);font-size:10px}.dsl-dataset-main p{margin:5px 0 0;color:var(--dsl-muted);font-size:10px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.dsl-source-cell span{display:block;font-size:11px;font-weight:650}.dsl-source-cell small,.dsl-coverage small,.dsl-updated{color:var(--dsl-muted);font-size:10px}.dsl-coverage strong{font-size:11px}.dsl-progress{height:4px;margin:5px 0;background:var(--dsl-bg);border-radius:99px;overflow:hidden}.dsl-progress i{display:block;height:100%;background:var(--dsl-primary)}.dsl-relation-count{display:flex;align-items:center;gap:5px;font-size:11px}.dsl-row-action{width:30px;height:30px;display:grid;place-items:center;border:0;border-radius:7px;background:transparent;cursor:pointer}.dsl-row-action:hover{background:var(--dsl-bg)}.dsl-empty{padding:34px;color:var(--dsl-muted);text-align:center;font-size:12px}
.dsl-semantic-callout{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:13px;align-items:center;padding:14px 15px;border:1px solid var(--dsl-line);border-radius:11px;background:var(--dsl-bg)}.dsl-callout-icon{width:42px;height:42px;background:var(--dsl-surface);box-shadow:0 2px 7px rgba(0,0,0,.06)}.dsl-semantic-callout strong{font-size:13px}.dsl-semantic-callout p{margin:5px 0 0;color:var(--dsl-muted);font-size:11px;line-height:1.45}
.dsl-identity{padding:18px}.dsl-identity-grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(320px,1.6fr);gap:14px}.dsl-source-picker{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) auto;gap:10px;align-items:end;margin-top:15px;padding-top:15px;border-top:1px solid var(--dsl-line-soft)}.dsl-source-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) auto;gap:12px;align-items:center;margin-top:15px;padding-top:15px;border-top:1px solid var(--dsl-line-soft)}.dsl-source-strip>span:not(.dsl-status){min-width:0}.dsl-source-strip strong{display:block;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.dsl-detail-tabs{display:flex;gap:5px;border-bottom:1px solid var(--dsl-line)}.dsl-detail-tabs button{padding:9px 14px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--dsl-muted);cursor:pointer;font-size:12px}.dsl-detail-tabs button.active{border-bottom-color:var(--dsl-primary);color:var(--dsl-text);font-weight:650}
.dsl-field-wrap{width:100%;overflow:auto;border:1px solid var(--dsl-line);border-radius:8px}.dsl-field-table{width:100%;min-width:1200px;border-collapse:collapse;table-layout:fixed}.dsl-field-table th{padding:9px 8px;background:var(--dsl-bg);border-bottom:1px solid var(--dsl-line);color:var(--dsl-muted);font-size:10px;text-align:left}.dsl-field-table td{padding:9px 8px;border-bottom:1px solid var(--dsl-line-soft);vertical-align:top;font-size:10px}.dsl-field-table tr:last-child td{border-bottom:0}.dsl-field-table th:nth-child(1),.dsl-field-table td:nth-child(1){width:52px;text-align:center}.dsl-field-table th:nth-child(2),.dsl-field-table td:nth-child(2){width:140px}.dsl-field-table th:nth-child(3),.dsl-field-table td:nth-child(3){width:125px}.dsl-field-table th:nth-child(4),.dsl-field-table td:nth-child(4){width:150px}.dsl-field-table th:nth-child(5),.dsl-field-table td:nth-child(5){width:155px}.dsl-field-table th:nth-child(6),.dsl-field-table td:nth-child(6){width:330px}.dsl-field-table th:nth-child(7),.dsl-field-table td:nth-child(7){width:175px}.dsl-field-table th:nth-child(8),.dsl-field-table td:nth-child(8){width:62px;text-align:center}.dsl-field-table input[type="checkbox"]{width:16px;height:16px;accent-color:var(--dsl-primary)}.dsl-field-code{display:grid;gap:5px;justify-items:start}.dsl-type{display:inline-block;padding:4px 6px;border:1px solid color-mix(in srgb,#647794 25%,var(--dsl-line));border-radius:5px;background:color-mix(in srgb,#647794 8%,var(--dsl-surface));color:color-mix(in srgb,var(--dsl-text) 76%,#647794);font-size:10px;word-break:break-word}.dsl-db-comment{color:var(--dsl-muted);line-height:1.45}.dsl-fields-footer{display:flex;justify-content:space-between;gap:12px;color:var(--dsl-muted);font-size:10px}.dsl-fields-footer strong{color:var(--dsl-text)}
.dsl-topology-manager{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:0;padding:0;overflow:visible}.dsl-topology-primary{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:start;padding:15px 16px}.dsl-topology-icon{width:42px;height:42px;background:color-mix(in srgb,#637794 14%,var(--dsl-surface));color:#647794}.dsl-topology-copy{min-width:0;display:grid;gap:4px}.dsl-topology-copy small{color:var(--dsl-muted);font-size:9px}.dsl-topology-copy select{width:min(520px,100%);padding:7px 9px;border:1px solid var(--dsl-line);border-radius:8px;background:var(--dsl-bg);font-size:14px;font-weight:700}.dsl-topology-copy p{margin:0;color:var(--dsl-muted);font-size:10px;line-height:1.45}.dsl-topology-side{display:grid;align-content:center;gap:9px;padding:14px 16px;border-left:1px solid var(--dsl-line-soft);background:var(--dsl-bg)}.dsl-topology-stats{display:flex;justify-content:flex-end;gap:8px}.dsl-topology-stats span{min-width:62px;display:grid;place-items:center;gap:2px;padding:7px 9px;border:1px solid var(--dsl-line);border-radius:8px;background:var(--dsl-surface)}.dsl-topology-stats strong{font-size:13px}.dsl-topology-stats small{color:var(--dsl-muted);font-size:8px}.dsl-topology-scope{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 16px;border-top:1px solid var(--dsl-line);background:var(--dsl-bg)}.dsl-topology-scope>div:first-child{display:flex;align-items:center;gap:10px;min-width:0}.dsl-topology-scope strong{display:block;font-size:11px}.dsl-topology-scope small{display:block;color:var(--dsl-muted);font-size:9px;line-height:1.4}
.dsl-legend{display:flex;align-items:center;gap:15px;flex-wrap:wrap;color:var(--dsl-muted);font-size:10px}.dsl-legend span{display:flex;align-items:center;gap:6px}.dsl-legend i{display:block;width:23px;border-top:2px solid var(--dsl-text)}.dsl-legend i.candidate{border-top-style:dashed;color:var(--dsl-warning)}.dsl-topology-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(310px,.55fr);gap:12px;min-width:0}.dsl-graph{position:relative;min-height:515px;overflow:auto;padding:28px;border:1px solid var(--dsl-line);border-radius:9px;background:var(--dsl-bg)}.dsl-graph-grid{position:relative;z-index:2;min-width:620px;display:grid;grid-template-columns:repeat(2,minmax(240px,1fr));gap:85px 90px}.dsl-node{overflow:hidden;border:1px solid var(--dsl-line);border-radius:9px;background:var(--dsl-surface);box-shadow:0 4px 14px rgba(0,0,0,.05)}.dsl-node-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px;padding:10px 11px;border-bottom:1px solid var(--dsl-line);background:var(--dsl-bg)}.dsl-node-head strong{display:block;font-size:11px}.dsl-node-head code{display:block;margin-top:3px;color:var(--dsl-muted);font-size:8px;overflow:hidden;text-overflow:ellipsis}.dsl-node-fields{display:grid}.dsl-node-field{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:6px 10px;border-bottom:1px solid var(--dsl-line-soft);font-size:9px}.dsl-node-field:last-child{border-bottom:0}.dsl-node-field span{color:var(--dsl-muted)}.dsl-relation-ribbon{grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:8px;margin:-55px 0 -55px;color:var(--dsl-muted);font-size:9px}.dsl-relation-ribbon::before,.dsl-relation-ribbon::after{content:"";width:88px;border-top:2px solid var(--dsl-text)}.dsl-relation-ribbon.candidate::before,.dsl-relation-ribbon.candidate::after{border-top-style:dashed;border-color:var(--dsl-warning)}.dsl-inspector{display:grid;gap:10px;align-content:start}.dsl-relation-card{padding:13px}.dsl-relation-card+.dsl-relation-card{margin-top:8px}.dsl-endpoint{padding:7px 8px;border:1px solid var(--dsl-line-soft);border-radius:6px;background:var(--dsl-bg)}.dsl-endpoint code{display:block;font-size:9px;word-break:break-all}.dsl-endpoint small{display:block;margin-top:3px;color:var(--dsl-muted);font-size:8px}.dsl-arrow{display:grid;place-items:center;height:24px;color:var(--dsl-muted)}.dsl-rule-details summary{cursor:pointer;font-weight:650;font-size:11px}.dsl-rule-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.dsl-rule-list span{padding:8px;border:1px solid var(--dsl-line-soft);border-radius:7px;background:var(--dsl-bg);font-size:9px}
.dsl-modal-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:24px;background:rgba(15,15,15,.42);backdrop-filter:blur(3px)}.dsl-modal{width:min(760px,calc(100vw - 36px));max-height:min(820px,calc(100vh - 36px));display:grid;grid-template-rows:auto minmax(0,1fr) auto;overflow:hidden;border:1px solid var(--dsl-line);border-radius:15px;background:var(--dsl-surface);box-shadow:0 28px 80px rgba(0,0,0,.25)}.dsl-modal-wide{width:min(1040px,calc(100vw - 36px))}.dsl-modal-header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:20px 22px 16px;border-bottom:1px solid var(--dsl-line-soft)}.dsl-modal-header h2{margin:3px 0 0;font-size:20px}.dsl-modal-header p{margin:6px 0 0;color:var(--dsl-muted);font-size:12px;line-height:1.55}.dsl-modal-body{min-height:0;overflow:auto;padding:18px 22px}.dsl-modal-footer{display:flex;justify-content:flex-end;gap:8px;padding:13px 22px;border-top:1px solid var(--dsl-line-soft)}.dsl-modal-close{width:32px;height:32px;display:grid;place-items:center;border:1px solid var(--dsl-line-soft);border-radius:9px;background:var(--dsl-bg);cursor:pointer}.dsl-export-list,.dsl-context-switcher{display:grid;gap:8px}.dsl-export-item,.dsl-context-switcher button{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;border:1px solid var(--dsl-line);border-radius:9px;background:var(--dsl-surface);text-align:left}.dsl-export-item.selected,.dsl-context-switcher button.selected{border-color:var(--dsl-muted);background:var(--dsl-bg)}.dsl-context-layout{display:grid;grid-template-columns:240px minmax(0,1fr);gap:14px}.dsl-context-switcher button{grid-template-columns:minmax(0,1fr);cursor:pointer}.dsl-context-switcher strong,.dsl-context-switcher code{display:block;font-size:10px}.dsl-context-switcher small{color:var(--dsl-muted);font-size:9px}.dsl-context-panel{display:grid;gap:12px}.dsl-context-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.dsl-context-block{padding:13px;border:1px solid var(--dsl-line);border-radius:9px}.dsl-context-block h3{margin:0 0 10px;font-size:12px}.dsl-context-block pre{max-height:360px;overflow:auto;margin:0;padding:11px;border-radius:7px;background:var(--dsl-bg);font-size:10px;white-space:pre-wrap}.dsl-context-field{display:grid;grid-template-columns:minmax(90px,.5fr) minmax(0,1fr);gap:8px;padding:6px 0;border-bottom:1px solid var(--dsl-line-soft);font-size:9px}.dsl-context-field:last-child{border:0}.dsl-context-field strong{display:block;font-size:10px}.dsl-context-field span{color:var(--dsl-muted)}
.dsl-concepts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:12px}.dsl-concept{padding:11px;border:1px solid var(--dsl-line);border-radius:8px}.dsl-concept p{margin:5px 0;color:var(--dsl-muted);font-size:10px;line-height:1.45}.dsl-concept small{color:var(--dsl-muted);font-size:9px}.dsl-hint{padding:13px;border:1px dashed var(--dsl-line);border-radius:8px;color:var(--dsl-muted);font-size:11px;line-height:1.5}
/* 卡片按实际可用宽度自动换列，空白区域不再受固定页面宽度限制。 */
.dsl-source-browser{margin-top:15px;padding-top:15px;border-top:1px solid var(--dsl-line-soft)}
.dsl-source-heading{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px}
.dsl-source-heading span{color:var(--dsl-muted);font-size:10px}
.dsl-source-browser .dsl-source-picker{grid-template-columns:repeat(3,minmax(0,1fr));margin-top:10px;padding-top:0;border-top:0}
.dsl-source-control{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
.dsl-source-feedback{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px;color:var(--dsl-muted);font-size:11px;line-height:1.5}
.dsl-source-feedback .dsl-message{width:100%;align-items:center;flex-wrap:wrap}.dsl-source-feedback .dsl-message>span{flex:1 1 220px;overflow-wrap:anywhere}
.dsl-select:disabled{opacity:.65;cursor:not-allowed}
.dsl-required{color:var(--dsl-error);font-size:10px;font-weight:600;white-space:nowrap}
.dsl-field-error{color:var(--dsl-error);font-size:11px;line-height:1.5;overflow-wrap:anywhere}
.dsl-field-hint,.dsl-form-note{color:var(--dsl-muted);font-size:11px;line-height:1.5}
.dsl-form-note{margin:0 0 14px}.dsl-form-note .dsl-required{margin-right:4px}
.dsl-input[aria-invalid="true"],.dsl-select[aria-invalid="true"]{border-color:var(--dsl-error)}
.dsl-validation-summary{padding:12px 15px;border:1px solid color-mix(in srgb,var(--dsl-error) 40%,var(--dsl-line));border-radius:9px;background:color-mix(in srgb,var(--dsl-error) 6%,var(--dsl-surface));color:var(--dsl-error);font-size:12px;line-height:1.6}
.dsl-validation-summary ul{margin:5px 0 0;padding-left:19px}.dsl-validation-summary button{border:0;background:transparent;color:inherit;cursor:pointer;text-align:left;padding:2px 0;white-space:normal;overflow-wrap:anywhere;text-decoration:underline;text-underline-offset:3px}
.dsl-validation-summary button:focus-visible{outline:2px solid var(--dsl-error);outline-offset:2px}
.dsl-source-browser:focus-visible,.dsl-source-strip:focus-visible{outline:2px solid var(--dsl-error);outline-offset:4px}
.dsl-preview-modes{display:flex;gap:4px;margin-bottom:16px;padding:4px;width:fit-content;background:var(--dsl-bg);border:1px solid var(--dsl-line);border-radius:9px}.dsl-preview-modes button{border:0;background:transparent;border-radius:6px;padding:8px 15px;cursor:pointer;color:var(--dsl-muted);font:inherit}.dsl-preview-modes button.selected{background:var(--dsl-surface);color:var(--dsl-text);box-shadow:0 1px 4px #0001;font-weight:600}
.dsl-preview-layout{align-items:start}.dsl-preview-layout .dsl-context-switcher{align-content:start;align-items:start;gap:8px;min-width:0}.dsl-preview-layout .dsl-context-switcher>button{min-height:0;height:auto;padding:12px;gap:6px}.dsl-preview-layout .dsl-context-switcher small{color:var(--dsl-muted)}.dsl-preview-pages{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:12px}.dsl-preview-pages .dsl-button{font-size:11px}
.dsl-preview-controls{display:flex;align-items:end;flex-wrap:wrap;gap:10px;margin-top:12px}.dsl-preview-controls .dsl-field{flex:1 1 200px}.dsl-preview-explanation{margin-top:14px;color:var(--dsl-muted)}.dsl-context-panel details>summary{cursor:pointer;font-size:11px}.dsl-context-panel details[open]>summary{margin-bottom:10px}.dsl-context-panel p,.dsl-context-panel small{line-height:1.65;overflow-wrap:anywhere}.dsl-context-panel small{color:var(--dsl-muted)}.dsl-context-panel pre{max-height:300px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}
.dsl-semantic-fields>div{display:grid;grid-template-columns:minmax(100px,.45fr) minmax(0,1fr);gap:14px;padding:10px 0;border-bottom:1px solid var(--dsl-line-soft);font-size:12px}.dsl-semantic-fields code,.dsl-semantic-fields span{min-width:0;overflow-wrap:anywhere}.dsl-semantic-fields small,.dsl-semantic-fields strong{display:block}.dsl-semantic-fields strong{margin-bottom:4px}.dsl-semantic-fields details{margin-top:6px;color:var(--dsl-muted)}.dsl-semantic-fields details p{margin:5px 0}.dsl-preview-search{max-width:250px}.dsl-preview-metrics{display:flex;gap:16px;flex-wrap:wrap}.dsl-preview-warning{color:var(--dsl-warning)}
.dsl-preview-relation{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--dsl-line-soft)}.dsl-preview-relation>span{flex:1 1 200px;min-width:0}.dsl-preview-relation>p{flex:1 1 200px;min-width:0}.dsl-preview-relation code{overflow-wrap:anywhere}.dsl-preview-relation strong,.dsl-preview-relation small{display:block}
.dsl-field-picker{padding:10px 0}.dsl-field-choices{display:grid;gap:8px;margin-top:10px}.dsl-field-choices label{display:flex;align-items:start;gap:8px;font-size:11px}.dsl-field-choices label span{min-width:0;overflow-wrap:anywhere}.dsl-field-choices small{display:block}.dsl-batch-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px}.dsl-batch-row>div{min-width:0;overflow-wrap:anywhere}.dsl-batch-row p{margin:5px 0}.dsl-batch-row .dsl-button{flex-shrink:0}
.dsl-comment-copy{margin-top:12px;padding:12px;border:1px solid var(--dsl-line-soft);border-radius:8px;background:var(--dsl-bg);min-width:0}
.dsl-comment-copy-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.dsl-comment-copy-toolbar>strong{font-size:11px}
.dsl-comment-copy-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0;max-width:100%}.dsl-comment-copy-actions .dsl-select{width:auto;max-width:100%}
.dsl-comment-copy-hint{margin:8px 0 0;color:var(--dsl-muted);font-size:11px;line-height:1.6;overflow-wrap:anywhere}
.dsl-comment-copy-result{display:grid;gap:4px;margin-top:9px;padding-top:9px;border-top:1px solid var(--dsl-line);font-size:11px;line-height:1.6;overflow-wrap:anywhere}.dsl-comment-copy-result>span{color:var(--dsl-muted)}
.dsl-comment-copy-result details{color:var(--dsl-warning)}.dsl-comment-copy-result summary{cursor:pointer}.dsl-comment-copy-result ul{margin:6px 0 0;padding-left:20px}
.dsl-connection-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))}
.dsl-summary-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))}
.dsl-field,.dsl-input,.dsl-select,.dsl-textarea,.dsl-search,.dsl-search input{min-width:0}
.dsl-list-toolbar{flex-wrap:wrap}.dsl-search{flex:0 1 360px;max-width:100%}
.dsl-page-header>.dsl-actions{min-width:0;max-width:100%}
.dsl-connection-head strong,.dsl-source-cell,.dsl-node-head strong{overflow-wrap:anywhere}
.dsl-query-head,.dsl-section-title,.dsl-fields-footer,.dsl-safety{flex-wrap:wrap}
@container dsl-workspace (max-width:980px){
  .dsl-page-header{align-items:flex-start;flex-direction:column}
  .dsl-page-header>.dsl-actions{width:100%}
  .dsl-topology-grid,.dsl-topology-manager{grid-template-columns:1fr}
  .dsl-topology-side{border-left:0;border-top:1px solid var(--dsl-line-soft)}
  .dsl-topology-stats{justify-content:flex-start}
  .dsl-topology-scope{grid-column:auto;align-items:flex-start;flex-direction:column}
  .dsl-rule-list{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@container dsl-workspace (max-width:720px){
  .dsl-shell{padding-inline:0}.dsl-tabs{width:100%;overflow:auto}.dsl-tabs button{flex:1}
  .dsl-query-line,.dsl-identity-grid,.dsl-source-picker,.dsl-source-strip{grid-template-columns:1fr}
  .dsl-source-browser .dsl-source-picker{grid-template-columns:1fr}
  .dsl-page>.dsl-section>.dsl-form-grid{grid-template-columns:1fr}
  .dsl-list-toolbar{align-items:stretch}.dsl-list-toolbar>.dsl-actions{width:100%}
  .dsl-semantic-callout{grid-template-columns:auto minmax(0,1fr)}
  .dsl-semantic-callout .dsl-button{grid-column:1/-1}
  .dsl-graph{padding:16px}.dsl-graph-grid{min-width:520px}
  .dsl-topology-primary{grid-template-columns:1fr}.dsl-topology-icon{display:none}
}
@container dsl-workspace (max-width:420px){
  .dsl-connection-meta{grid-template-columns:1fr}
  .dsl-detail-tabs{overflow-x:auto}.dsl-detail-tabs button{flex:none}
}
@media(max-width:720px){.dsl-source-browser .dsl-source-picker{grid-template-columns:1fr}}
@media(max-width:980px){.dsl-topology-grid{grid-template-columns:1fr}.dsl-topology-manager{grid-template-columns:1fr}.dsl-topology-side{border-left:0;border-top:1px solid var(--dsl-line-soft)}.dsl-topology-stats{justify-content:flex-start}.dsl-topology-scope{grid-column:auto;align-items:flex-start;flex-direction:column}.dsl-rule-list{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:720px){.dsl-shell{padding-inline:0}.dsl-tabs{width:100%;overflow:auto}.dsl-tabs button{flex:1}.dsl-page-header{align-items:flex-start;flex-direction:column}.dsl-page-header .dsl-actions{width:100%}.dsl-connection-meta{grid-template-columns:1fr}.dsl-query-line,.dsl-form-grid,.dsl-identity-grid,.dsl-source-picker,.dsl-source-strip,.dsl-context-layout,.dsl-context-columns,.dsl-concepts{grid-template-columns:1fr}.dsl-span-2{grid-column:auto}.dsl-semantic-callout{grid-template-columns:auto minmax(0,1fr)}.dsl-semantic-callout .dsl-button{grid-column:1/-1}.dsl-modal-backdrop{padding:8px}.dsl-modal,.dsl-modal-wide{width:calc(100vw - 16px);max-height:calc(100vh - 16px)}.dsl-graph{padding:16px}.dsl-graph-grid{min-width:520px}.dsl-topology-primary{grid-template-columns:1fr}.dsl-topology-icon{display:none}}
.dsl-query-pagination{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin:14px 0;min-width:0}
.dsl-query-pagination label{display:flex;align-items:center;gap:8px}.dsl-query-pagination .dsl-select{width:110px}
.dsl-query-pagination>span{flex:1 1 220px;color:var(--dsl-muted);font-size:12px;text-align:center}
.dsl-query-fragment{margin-top:12px;min-width:0}.dsl-query-fragment pre{max-height:300px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;background:var(--dsl-bg);padding:12px;border:1px solid var(--dsl-line)}
.dsl-query-notes{color:var(--dsl-muted);font-size:12px;line-height:1.6}.dsl-query-notes summary{cursor:pointer}
.dsl-paged-table{max-height:max(80px,min(43vh,390px,calc(100dvh - 480px)));overflow:auto;min-width:0}.dsl-paged-table th{position:sticky;top:0;background:var(--dsl-surface);z-index:1}
.dsl-numbered-pagination{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin:14px 0;color:var(--dsl-muted);font-size:12px;min-width:0}
.dsl-page-buttons,.dsl-numbered-pagination form,.dsl-numbered-pagination label{display:flex;flex-wrap:wrap;align-items:center;gap:6px}.dsl-page-buttons .dsl-button{min-width:34px;padding-inline:9px}.dsl-numbered-pagination .dsl-input{width:66px;padding:7px}.dsl-numbered-pagination form{margin:0}
`;
		//#endregion
		//#region src/client/dataset-source.mjs
		/** 库表选择只使用服务端返回的目录；每次切换撤销上一轮请求，避免慢响应串入新来源。 */
		function createDatasetSourceCatalog(loaders) {
			let snapshot = {
				connectionId: "",
				database: "",
				table: "",
				databases: [],
				tables: [],
				metadata: null,
				loading: "",
				error: null
			};
			const listeners = /* @__PURE__ */ new Set();
			let revision = 0;
			let request;
			const emit = (patch) => {
				snapshot = {
					...snapshot,
					...patch
				};
				for (const listener of listeners) listener();
			};
			const begin = () => {
				request?.abort();
				request = new AbortController();
				return {
					revision: ++revision,
					signal: request.signal
				};
			};
			const current = (run) => run.revision === revision && !run.signal.aborted;
			const fail = (run, stage, error) => {
				if (current(run)) emit({
					loading: "",
					error: {
						stage,
						message: error instanceof Error ? error.message : String(error)
					}
				});
			};
			const names = (rows) => [...new Set((rows || []).filter((value) => typeof value === "string" && value.length > 0))];
			async function readFields(run) {
				emit({
					loading: "fields",
					error: null,
					metadata: null
				});
				try {
					const metadata = await loaders.inspect({
						connectionId: snapshot.connectionId,
						database: snapshot.database,
						table: snapshot.table
					}, run.signal);
					if (!current(run)) return;
					if (!Array.isArray(metadata?.fields) || !metadata.fields.length) throw new Error("没有读取到字段，请检查表是否存在以及账号的元数据读取权限");
					emit({
						metadata,
						loading: ""
					});
				} catch (error) {
					fail(run, "fields", error);
				}
			}
			async function readTables(run, preferredTable = "") {
				emit({
					loading: "tables",
					error: null,
					tables: [],
					metadata: null
				});
				try {
					const tables = names(await loaders.tables(snapshot.connectionId, snapshot.database, run.signal));
					if (!current(run)) return;
					const table = tables.includes(preferredTable) ? preferredTable : "";
					emit({
						tables,
						table,
						loading: ""
					});
					if (table) await readFields(run);
				} catch (error) {
					fail(run, "tables", error);
				}
			}
			async function selectConnection(connectionId, preferredDatabase = "", preferredTable = "") {
				const run = begin();
				emit({
					connectionId,
					database: preferredDatabase,
					table: preferredTable,
					databases: [],
					tables: [],
					metadata: null,
					loading: connectionId ? "databases" : "",
					error: null
				});
				if (!connectionId) return;
				try {
					const databases = names(await loaders.databases(connectionId, run.signal));
					if (!current(run)) return;
					const database = databases.includes(preferredDatabase) ? preferredDatabase : databases.length === 1 ? databases[0] : "";
					emit({
						databases,
						database,
						table: database === preferredDatabase ? preferredTable : "",
						loading: ""
					});
					if (database) await readTables(run, database === preferredDatabase ? preferredTable : "");
				} catch (error) {
					fail(run, "databases", error);
				}
			}
			async function selectDatabase(database) {
				if (database && !snapshot.databases.includes(database)) return;
				const run = begin();
				emit({
					database,
					table: "",
					tables: [],
					metadata: null,
					loading: "",
					error: null
				});
				if (database) await readTables(run);
			}
			async function selectTable(table) {
				if (table && (!snapshot.database || !snapshot.tables.includes(table))) return;
				const run = begin();
				emit({
					table,
					metadata: null,
					loading: "",
					error: null
				});
				if (table) await readFields(run);
			}
			return {
				getSnapshot: () => snapshot,
				subscribe(listener) {
					listeners.add(listener);
					return () => listeners.delete(listener);
				},
				cancel() {
					revision++;
					request?.abort();
				},
				selectConnection,
				selectDatabase,
				selectTable,
				refreshDatabases: () => selectConnection(snapshot.connectionId, snapshot.database, snapshot.table),
				refreshTables() {
					if (!snapshot.database || !snapshot.databases.includes(snapshot.database)) return;
					return readTables(begin(), snapshot.table);
				},
				refreshFields() {
					if (!snapshot.table || !snapshot.tables.includes(snapshot.table)) return;
					return readFields(begin());
				}
			};
		}
		function sameDatasetSource(left, right) {
			return [
				"connectionId",
				"database",
				"table"
			].every((key) => (left[key] || "") === (right[key] || ""));
		}
		/** 数据库定义始终以新读取结果为准，仅保留同表字段上用户维护的业务语义。 */
		function mergeDatasetMetadata(previousFields, metadata) {
			const previous = new Map((previousFields || []).map((field) => [field.name, field]));
			const editable = [
				"businessName",
				"customComment",
				"semanticConceptId",
				"enabled",
				"sensitive"
			];
			return {
				tableComment: metadata.tableComment || "",
				metadataVersion: metadata.metadataVersion,
				fields: metadata.fields.map((field) => {
					const old = previous.get(field.name);
					const semantics = old ? Object.fromEntries(editable.filter((key) => Object.hasOwn(old, key)).map((key) => [key, old[key]])) : {};
					return {
						...field,
						...semantics
					};
				})
			};
		}
		/** 只检查保存所需信息；业务用途、字段语义和统一概念仍可留空。 */
		function validateDatasetDraft(draft = {}, { editing = false, source = {}, connections } = {}) {
			const issues = /* @__PURE__ */ new Map();
			const add = (field, message) => issues.set(field, {
				field,
				message
			});
			const name = typeof draft.name === "string" ? draft.name.trim() : "";
			if (!name) add("name", "请填写数据集名称");
			else if (name.length > 200) add("name", `数据集名称不能超过 200 个字符`);
			const selection = editing ? draft : source;
			if (!selection.connectionId) add("connectionId", "请选择来源连接");
			else if (Array.isArray(connections) && !connections.some((item) => item.id === selection.connectionId)) add("connectionId", "来源连接已不存在，请返回连接管理检查");
			if (!selection.database) add("database", "请选择来源数据库");
			if (!selection.table) add("table", "请选择来源表");
			if (!editing) {
				const targets = {
					databases: "database",
					tables: "table",
					fields: "fields"
				};
				const loadingMessages = {
					databases: "数据库列表正在加载，请等待完成后选择来源数据库",
					tables: "数据表列表正在加载，请等待完成后选择来源表",
					fields: "字段定义正在读取，请等待完成后再保存"
				};
				const errorMessages = {
					databases: "数据库列表加载失败，请点击“重试加载数据库”后再保存",
					tables: "数据表列表加载失败，请点击“重试加载数据表”后再保存",
					fields: "字段定义读取失败，请点击“重试读取字段”后再保存"
				};
				if (source.loading) {
					add(targets[source.loading] || "fields", loadingMessages[source.loading] || "数据来源正在读取，请稍后再保存");
					return [...issues.values()];
				}
				if (source.error) {
					add(targets[source.error.stage] || "fields", errorMessages[source.error.stage] || "数据来源读取失败，请检查并重试");
					return [...issues.values()];
				}
				if (selection.database && !source.databases?.includes(selection.database)) add("database", "来源数据库已失效，请重新选择");
				if (selection.table && !source.tables?.includes(selection.table)) add("table", "来源表已失效，请重新选择");
				if (selection.connectionId && selection.database && selection.table && (!source.metadata?.fields?.length || !sameDatasetSource(draft, source))) add("fields", "尚未取得当前来源表的字段定义，请重新读取字段后再保存");
			}
			if (selection.connectionId && selection.database && selection.table && !draft.fields?.length && !issues.has("fields")) add("fields", "请先成功读取至少一个字段，再保存数据集");
			return [...issues.values()];
		}
		//#endregion
		//#region src/client/field-comment-copy.mjs
		const COMMENT_COPY_TARGETS = Object.freeze({
			businessName: Object.freeze({
				label: "业务名称",
				maxLength: 200
			}),
			customComment: Object.freeze({
				label: "自定义业务注释",
				maxLength: 5e3
			})
		});
		function copyDatabaseComments(fields, target, { overwrite = false } = {}) {
			if (!Object.hasOwn(COMMENT_COPY_TARGETS, target)) throw new Error("不支持的注释复制目标");
			const { label, maxLength } = COMMENT_COPY_TARGETS[target];
			const rows = Array.isArray(fields) ? fields : [];
			const result = {
				target,
				label,
				maxLength,
				total: rows.length,
				copied: 0,
				overwritten: 0,
				preserved: 0,
				emptyComment: 0,
				unchanged: 0,
				tooLong: [],
				fields: rows
			};
			const next = rows.map((field) => {
				const raw = typeof field.databaseComment === "string" ? field.databaseComment.trim() : "";
				if (!raw) {
					result.emptyComment++;
					return field;
				}
				const previous = typeof field[target] === "string" ? field[target] : "";
				const occupied = Boolean(previous.trim());
				if (occupied && !overwrite) {
					result.preserved++;
					return field;
				}
				const value = target === "businessName" ? raw.replace(/[\r\n\u2028\u2029]+/g, " ") : raw;
				if (value.length > maxLength) {
					result.tooLong.push({
						name: field.name,
						length: value.length
					});
					return field;
				}
				if (previous === value) {
					result.unchanged++;
					return field;
				}
				result.copied++;
				if (occupied) result.overwritten++;
				return {
					...field,
					[target]: value
				};
			});
			if (result.copied) result.fields = next;
			return result;
		}
		//#endregion
		//#region src/client/semantic-preview.tsx
		function useRead(api, path, body, dependency) {
			const [value, setValue] = (0, react.useState)({
				data: null,
				error: "",
				busy: true
			});
			const [attempt, setAttempt] = (0, react.useState)(0);
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				setValue({
					data: null,
					error: "",
					busy: true
				});
				api(path, body, { signal: controller.signal }).then((data) => {
					if (!controller.signal.aborted) setValue({
						data,
						error: "",
						busy: false
					});
				}).catch((error) => {
					if (!controller.signal.aborted) setValue({
						data: null,
						error: error.message,
						busy: false
					});
				});
				return () => controller.abort();
			}, [
				api,
				path,
				dependency,
				attempt
			]);
			return {
				...value,
				retry: () => setAttempt((n) => n + 1)
			};
		}
		function Pages({ ui, next, previous, onNext, onPrevious }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsl-preview-pages",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ui.Button, {
					disabled: !previous,
					onClick: onPrevious,
					children: "上一页"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ui.Button, {
					disabled: !next,
					onClick: onNext,
					children: "下一页"
				})]
			});
		}
		function FieldPicker({ ui, dataset, picked, onChange }) {
			const [keyword, setKeyword] = (0, react.useState)(""), [cursors, setCursors] = (0, react.useState)([""]);
			const cursor = cursors[cursors.length - 1];
			const resource = useRead(ui.api, "/semantic/context/fields", {
				datasetId: dataset.id,
				keyword,
				cursor,
				limit: 10
			}, JSON.stringify([
				dataset.id,
				keyword,
				cursor
			]));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsl-field-picker",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					className: "dsl-input",
					"aria-label": `搜索${dataset.name}的字段`,
					placeholder: "搜索字段、业务名称或注释",
					value: keyword,
					onChange: (e) => {
						setKeyword(e.target.value);
						setCursors([""]);
					}
				}), resource.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					role: "alert",
					className: "dsl-hint",
					children: [resource.error, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ui.Button, {
						onClick: () => {
							setCursors([""]);
							resource.retry();
						},
						children: "重新检索"
					})]
				}) : resource.busy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "正在读取字段…" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", { children: [
						"共 ",
						resource.data.total,
						" 个可用字段；勾选后点击“生成预览”"
					] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsl-field-choices",
						children: resource.data.fields.map((field) => {
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: picked.some((p) => p.datasetId === dataset.id && p.field === field.name),
								onChange: (e) => onChange(e.target.checked ? [...picked, {
									datasetId: dataset.id,
									field: field.name
								}] : picked.filter((p) => !(p.datasetId === dataset.id && p.field === field.name)))
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: field.name }),
								" · ",
								field.type,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: field.label || field.meaning || "未填写业务说明" })
							] })] }, field.name);
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pages, {
						ui,
						previous: cursors.length > 1,
						next: resource.data.nextCursor,
						onPrevious: () => setCursors(cursors.slice(0, -1)),
						onNext: () => setCursors([...cursors, resource.data.nextCursor])
					})
				] })]
			});
		}
		function FullDetails({ ui, datasetId }) {
			const [page, setPage] = (0, react.useState)(0), [query, setQuery] = (0, react.useState)("");
			const resource = useRead(ui.api, "/semantic/context/dataset", { id: datasetId }, datasetId);
			(0, react.useEffect)(() => {
				setPage(0);
				setQuery("");
			}, [datasetId]);
			if (resource.error) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				role: "alert",
				className: "dsl-hint",
				children: [resource.error, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ui.Button, {
					onClick: resource.retry,
					children: "重新读取"
				})]
			});
			if (resource.busy) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsl-hint",
				children: "正在读取完整语义资料…"
			});
			const context = resource.data.context, dataset = context.dataset;
			const fields = dataset.fields.filter((f) => `${f.name} ${f.businessName} ${f.businessComment} ${f.databaseComment}`.toLowerCase().includes(query.toLowerCase()));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsl-context-panel",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsl-context-block",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: dataset.name }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
								dataset.source.connectionName,
								" · ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("code", { children: [
									dataset.source.database,
									".",
									dataset.source.table
								] })
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: dataset.purpose || "未填写表用途" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", { children: [
								"原表注释：",
								dataset.source.tableComment || "数据库未提供",
								"。完整资料用于核对，不会自动整份发送给模型。"
							] })
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsl-context-block",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-query-head",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h3", { children: [
									"字段语义 · ",
									dataset.fields.length,
									" 项"
								] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "dsl-input dsl-preview-search",
									"aria-label": "搜索完整字段语义",
									placeholder: "搜索字段或业务含义",
									value: query,
									onChange: (e) => {
										setQuery(e.target.value);
										setPage(0);
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dsl-semantic-fields",
								children: fields.slice(page * 12, page * 12 + 12).map((field) => {
									const meaning = field.businessComment || field.databaseComment || "", label = field.businessName || field.semanticConcept?.name || "";
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("code", { children: [field.name, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: field.dataType })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										label && label !== meaning ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: label }) : null,
										meaning || label || "未填写业务说明",
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: "来源与定义" }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: ["数据库原注释：", field.databaseComment || "未提供"] }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: ["自定义注释：", field.businessComment || "未填写，采用数据库原注释"] }),
											field.semanticConcept ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
												"统一语义：",
												field.semanticConcept.name,
												" · ",
												field.semanticConcept.definition
											] }) : null
										] })
									] })] }, field.name);
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pages, {
								ui,
								previous: page > 0,
								next: (page + 1) * 12 < fields.length,
								onPrevious: () => setPage(page - 1),
								onNext: () => setPage(page + 1)
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsl-context-block",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h3", { children: [
							"允许使用的关系 · ",
							context.relations.length,
							" 条"
						] }), context.relations.length ? context.relations.map((r) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsl-preview-relation",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
									r.source.datasetName,
									" · ",
									r.source.connectionName,
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("code", { children: [
										r.source.database,
										".",
										r.source.table,
										".",
										r.source.field
									] })
								] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: ui.CARDINALITY[r.type] || r.type }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
									r.target.datasetName,
									" · ",
									r.target.connectionName,
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("code", { children: [
										r.target.database,
										".",
										r.target.table,
										".",
										r.target.field
									] })
								] })
							]
						}, r.id)) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "暂无已确认且端点可用的拓扑关系。" })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
						className: "dsl-context-block",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: "查看完整结构化资料（兼容接口）" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", { children: JSON.stringify(context, null, 2) })]
					})
				]
			});
		}
		function TaskPreview({ ui, state, datasetId }) {
			const [question, setQuestion] = (0, react.useState)(""), [scope, setScope] = (0, react.useState)("all"), [maxTokens, setMaxTokens] = (0, react.useState)(6e3);
			const [result, setResult] = (0, react.useState)(null), [busy, setBusy] = (0, react.useState)(false), [error, setError] = (0, react.useState)(""), [picked, setPicked] = (0, react.useState)([]), [dirty, setDirty] = (0, react.useState)(false);
			const requestRef = react.default.useRef(null);
			(0, react.useEffect)(() => () => requestRef.current?.abort(), []);
			(0, react.useEffect)(() => {
				requestRef.current?.abort();
				setBusy(false);
				setResult(null);
				setPicked([]);
				setError("");
			}, [
				scope,
				datasetId,
				question,
				maxTokens
			]);
			const generate = async () => {
				requestRef.current?.abort();
				const controller = new AbortController();
				requestRef.current = controller;
				setBusy(true);
				setError("");
				try {
					if (!question.trim()) throw new Error("请先输入业务问题，例如：按区域查询本月用电量");
					const body = {
						question,
						maxTokens,
						includeFields: picked,
						...scope === "current" ? { datasetId } : scope !== "all" ? { topologyId: scope } : {}
					};
					const data = await ui.api("/semantic/context/task", body, { signal: controller.signal });
					if (!controller.signal.aborted) {
						setResult(data.result);
						setDirty(false);
					}
				} catch (e) {
					if (!controller.signal.aborted) setError(e.message);
				} finally {
					if (!controller.signal.aborted) setBusy(false);
				}
			};
			const context = result?.context;
			const find = (id) => context?.datasets.find((d) => d.id === id);
			const endpoint = (ep) => {
				const d = find(ep.datasetId);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: d?.name }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: d?.source.connectionName }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("code", { children: [
						d?.source.database,
						".",
						d?.source.table,
						".",
						ep.field
					] })
				] });
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsl-context-panel",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: "dsl-context-block",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: "这个问题需要哪些数据库语义？" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "只检索已保存的语义资料，不查询业务数据，也不调用大模型。" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							className: "dsl-textarea",
							"aria-label": "预览业务问题",
							maxLength: 1e3,
							placeholder: "例如：按区域查询本月用电量，需要哪些表和字段？",
							value: question,
							onChange: (e) => setQuestion(e.target.value)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsl-preview-controls",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ui.Field, {
									label: "检索范围",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										className: "dsl-select",
										value: scope,
										onChange: (e) => setScope(e.target.value),
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "all",
												children: "全部启用数据集（按需选取）"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "current",
												children: "左侧当前数据集"
											}),
											state.topologies.filter((t) => t.enabled !== false).map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
												value: t.id,
												children: ["拓扑：", t.name]
											}, t.id))
										]
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ui.Field, {
									label: "本次语义预算（Token / 文本计量单位）",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
										className: "dsl-select",
										value: maxTokens,
										onChange: (e) => setMaxTokens(Number(e.target.value)),
										children: [
											2e3,
											4e3,
											6e3,
											8e3,
											16e3
										].map((n) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
											value: n,
											children: [n.toLocaleString(), " · 估算上限"]
										}, n))
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ui.Button, {
									kind: "primary",
									disabled: busy || !datasetId,
									onClick: generate,
									children: busy ? "正在生成…" : "生成预览"
								})
							]
						}),
						error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "alert",
							className: "dsl-field-error",
							children: error
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
							className: "dsl-preview-explanation",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: "按需加载与预算说明" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "按表用途、字段/注释、统一语义及别名检索；保留匹配字段与标识、时间、单位等关键字段。只补齐已确认关联路径，不把语义相同当成可关联。原始资料不删除。" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "实际调用会结合宿主模型窗口和会话用量重新检查，预留回答与安全余量。无法读取会话计量时，仅执行单次上限并明确提示；这不是整个会话容量的保证。" })
							]
						})
					]
				}), result ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsl-context-block",
						"aria-live": "polite",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-query-head",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: result.status === "ok" ? "本次上下文" : result.status === "budget_exceeded" ? "本次内容超出预算" : "需要补充检索条件" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ui.StatusPill, { children: result.budget?.estimatedTokens ? `约 ${result.budget.estimatedTokens.toLocaleString()} Token` : "未载入语义" })]
							}),
							result.budget?.requiredEstimate ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
								"所需约 ",
								result.budget.requiredEstimate.toLocaleString(),
								"，当前上限 ",
								result.budget.limit.toLocaleString(),
								"。未发送残缺内容。"
							] }) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: result.budget?.note }),
							result.nextAction ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: result.nextAction }) : null,
							dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dsl-preview-warning",
								children: "补选字段已改变，请点击“生成预览”更新结果。"
							}) : null,
							context ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsl-preview-metrics",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: [context.datasets.length, " 张表"] }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: [context.datasets.reduce((n, d) => n + d.fields.length, 0), " 个字段"] }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: [context.relations.length, " 条确认关系"] })
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
									"未载入 ",
									context.datasets.reduce((n, d) => n + d.omittedFields, 0),
									" 个非相关字段；另有 ",
									result.selection.omittedDatasets,
									" 个候选数据集未选入，可缩小范围后补查。"
								] }),
								result.selection.disconnected.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dsl-preview-warning",
									children: "部分表之间没有已确认路径，不能据此自动关联。"
								}) : null
							] }) : null
						]
					}),
					context?.datasets.map((d) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsl-context-block",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-query-head",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: d.name }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: d.selectionReason })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
								d.source.connectionName,
								" · ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("code", { children: [
									d.source.database,
									".",
									d.source.table
								] })
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: d.purpose || "未填写用途" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dsl-semantic-fields",
								children: d.fields.map((f) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("code", { children: [f.name, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: f.type })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									f.label ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: f.label }) : null,
									f.meaning || (!f.label ? "未填写业务说明" : ""),
									f.conceptId ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", { children: ["统一语义：", context.concepts.find((c) => c.id === f.conceptId)?.name] }) : null
								] })] }, f.name))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", { children: [
								"补选字段（还有 ",
								d.omittedFields,
								" 个未载入）"
							] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldPicker, {
								ui,
								dataset: d,
								picked,
								onChange: (next) => {
									setPicked(next);
									setDirty(true);
								}
							})] })
						]
					}, d.id)),
					context ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsl-context-block",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: "允许使用的关联路径" }), context.relations.length ? context.relations.map((r) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsl-preview-relation",
							children: [
								endpoint(r.source),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: ui.CARDINALITY[r.type] || r.type }),
								endpoint(r.target),
								r.description ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: r.description }) : null
							]
						}, r.id)) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "本次没有载入已确认关系；禁止猜测关联。" })]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
						className: "dsl-context-block",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: "查看本次工具返回结构（紧凑格式）" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "与智能体使用同一构建逻辑；实际调用时会重新计算会话预算。下方内容只返回一次，不额外重复自然语言与结构化全文。" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", { children: JSON.stringify(result) })
						]
					})] }) : null
				] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsl-hint",
					children: "先输入问题，再生成本次需要的语义上下文。左侧目录不会整份发送给模型。"
				})]
			});
		}
		function SemanticPreview({ ui, state, initialId, onClose }) {
			const [mode, setMode] = (0, react.useState)("task"), [datasetId, setDatasetId] = (0, react.useState)(initialId || state.datasets.find((d) => d.enabled !== false)?.id || "");
			const [keyword, setKeyword] = (0, react.useState)(""), [cursors, setCursors] = (0, react.useState)([""]);
			const cursor = cursors[cursors.length - 1];
			const resource = useRead(ui.api, "/semantic/context/catalog", {
				keyword,
				cursor,
				limit: 8
			}, JSON.stringify([keyword, cursor]));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ui.Modal, {
				wide: true,
				eyebrow: "统一数据语义层",
				title: "预览大模型上下文",
				description: "完整资料用于维护核对；模型按当前问题获取必要语义，不自动载入全部数据集。",
				onClose,
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ui.Button, {
					onClick: onClose,
					children: "关闭"
				}),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsl-preview-modes",
					role: "group",
					"aria-label": "语义预览模式",
					children: [["task", "按问题预览"], ["full", "完整详情"]].map(([id, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-pressed": mode === id,
						className: mode === id ? "selected" : "",
						onClick: () => setMode(id),
						children: label
					}, id))
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsl-context-layout dsl-preview-layout",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
						className: "dsl-context-switcher",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "dsl-input",
								"aria-label": "检索语义目录",
								placeholder: "搜索数据集、表或业务词",
								value: keyword,
								onChange: (e) => {
									setKeyword(e.target.value);
									setCursors([""]);
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: resource.data ? `${resource.data.total} 个匹配数据集` : "目录读取中…" }),
							resource.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								role: "alert",
								children: [resource.error, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ui.Button, {
									onClick: () => {
										setCursors([""]);
										setKeyword("");
										resource.retry();
									},
									children: "重新检索"
								})]
							}) : null,
							resource.data?.datasets.map((d) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: datasetId === d.id ? "selected" : "",
								"aria-pressed": datasetId === d.id,
								onClick: () => setDatasetId(d.id),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: d.name }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("code", { children: [
										d.source.database,
										".",
										d.source.table
									] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", { children: [d.fieldCount, " 个可用字段"] })
								]
							}, d.id)),
							resource.data?.total === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "暂无匹配数据集" }) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pages, {
								ui,
								previous: cursors.length > 1,
								next: resource.data?.nextCursor,
								onPrevious: () => setCursors(cursors.slice(0, -1)),
								onNext: () => setCursors([...cursors, resource.data.nextCursor])
							})
						]
					}), datasetId ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-preview-content",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							hidden: mode !== "task",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TaskPreview, {
								ui,
								state,
								datasetId
							})
						}), mode === "full" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FullDetails, {
							ui,
							datasetId
						}) : null]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsl-hint",
						children: "请先创建并启用数据集。"
					})]
				})]
			});
		}
		function RelationBatchModal({ ui, topology, modelReady = false, inputBudget = 8e3, sampleValues, onClose, onSaved }) {
			const [offset, setOffset] = (0, react.useState)(0), [budget, setBudget] = (0, react.useState)(inputBudget), [refreshKey, setRefreshKey] = (0, react.useState)(0);
			const [busy, setBusy] = (0, react.useState)(false), [message, setMessage] = (0, react.useState)(""), [completed, setCompleted] = (0, react.useState)(/* @__PURE__ */ new Set());
			const resource = useRead(ui.api, "/semantic/relations/plan-llm", {
				topologyId: topology.id,
				offset,
				inputBudget: budget,
				limit: 6
			}, JSON.stringify([
				topology.id,
				offset,
				budget,
				refreshKey
			]));
			const plan = resource.data?.plan;
			const planVersion = react.default.useRef("");
			(0, react.useEffect)(() => {
				if (plan?.version && planVersion.current !== plan.version) {
					planVersion.current = plan.version;
					setCompleted(/* @__PURE__ */ new Set());
					setMessage("");
				}
			}, [plan?.version]);
			const run = async (index) => {
				if (busy) return;
				setBusy(true);
				setMessage("");
				try {
					const response = await ui.api("/semantic/relations/identify-llm", {
						topologyId: topology.id,
						batchIndex: index,
						planVersion: plan.version,
						inputBudget: budget,
						sampleValues
					});
					setCompleted((previous) => new Set([...previous, index]));
					setMessage(`第 ${index + 1} 批完成：新增 ${response.summary.created} 条，复核通过 ${response.summary.deterministicAccepted} 条；仍需人工确认。`);
					await onSaved();
				} catch (error) {
					setMessage(error.message);
				} finally {
					setBusy(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ui.Modal, {
				wide: true,
				eyebrow: "控制识别范围与调用成本",
				title: `分批识别 · ${topology.name}`,
				description: "规划不调用模型；点击某批的识别按钮才会真实调用一次模型，可能产生费用。",
				onClose: busy ? () => {} : onClose,
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ui.Button, {
					disabled: busy,
					onClick: onClose,
					children: "关闭"
				}),
				children: [
					!modelReady ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsl-hint",
						children: "尚未选择模型服务与模型，可以先查看计划；返回拓扑页配置后才能执行识别。"
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-preview-controls",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ui.Field, {
							label: "单批输入预算（Token / 文本计量单位）",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
								className: "dsl-select",
								disabled: busy,
								value: budget,
								onChange: (e) => {
									setBudget(Number(e.target.value));
									setOffset(0);
								},
								children: [
									4e3,
									8e3,
									16e3
								].map((n) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: n,
									children: n.toLocaleString()
								}, n))
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ui.Button, {
							disabled: busy,
							onClick: () => {
								setOffset(0);
								setRefreshKey(refreshKey + 1);
							},
							children: "重新规划"
						})]
					}),
					resource.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "alert",
						children: resource.error
					}) : null,
					plan ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
							plan.datasetCount,
							" 张表 / ",
							plan.fieldCount,
							" 个字段，共 ",
							plan.totalBatches.toLocaleString(),
							" 批；本窗口本计划已完成 ",
							completed.size,
							" 批。完成情况仅在本窗口记录，候选关系已持久保存，重复识别按字段对去重。"
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsl-hint",
							children: plan.note
						}),
						plan.batches.map((batch) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "dsl-context-block dsl-batch-row",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: [
									"第 ",
									batch.index + 1,
									" 批"
								] }),
								batch.datasets.map((d) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
									d.name,
									" · ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("code", { children: [
										d.database,
										".",
										d.table
									] }),
									" · ",
									d.fields,
									" 个字段"
								] }, d.id)),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", { children: [
									"预计输入约 ",
									batch.estimatedTokens.toLocaleString(),
									" Token",
									batch.fits ? "" : " · 超预算，请调整说明或预算"
								] })
							] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ui.Button, {
								disabled: busy || !modelReady || !batch.fits || completed.has(batch.index),
								onClick: () => run(batch.index),
								children: completed.has(batch.index) ? "本窗口已完成" : busy ? "识别中…" : "识别此批"
							})]
						}, batch.index)),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pages, {
							ui,
							previous: !busy && offset > 0,
							next: !busy && plan.nextOffset !== null,
							onPrevious: () => setOffset(Math.max(0, offset - 6)),
							onNext: () => setOffset(plan.nextOffset)
						})
					] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "正在规划批次…" }),
					message ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "status",
						children: message
					}) : null
				]
			});
		}
		//#endregion
		//#region src/client/dataset-pagination.mjs
		/** 页码与固定行数页装配：网络分片不是用户看到的页数。只保留当前页。 */
		function pageNumbers(current, total) {
			if (!total) return [];
			const numbers = [...new Set([
				1,
				total,
				current - 2,
				current - 1,
				current,
				current + 1,
				current + 2
			])].filter((number) => number >= 1 && number <= total).sort((a, b) => a - b);
			return numbers.flatMap((number, index) => index && number - numbers[index - 1] > 1 ? [`gap-${number}`, number] : [number]);
		}
		function validatePage(text, total) {
			if (!/^\d+$/.test(String(text).trim())) throw new Error("请输入有效的整数页码");
			const page = Number(text);
			if (!Number.isSafeInteger(page) || page < 1 || page > total) throw new Error(`请输入1到${total}之间的页码`);
			return page;
		}
		async function loadNumberedPage(fetchPage, request, { isCurrent = () => true, onCursor = () => {}, maxBytes = 32 * 1024 * 1024 } = {}) {
			let chunk = await fetchPage({
				...request,
				maxTokens: 16e3
			});
			const rows = [];
			let fragment = "", fragmentRow = 0, bytes = 0;
			for (;;) {
				onCursor(chunk.cursor);
				if (!isCurrent()) return null;
				if (["failed", "budget_exceeded"].includes(chunk.status)) throw new Error(chunk.error || chunk.nextAction || "查询未完整完成");
				bytes += JSON.stringify(chunk.rows || []).length * 2 + (chunk.rowFragment?.text.length || 0) * 2;
				if (bytes > maxBytes) throw new Error("当前页内容超过浏览器32MiB保护上限，请减少每页行数；未截断数据，模型接口仍可无损分片读取");
				rows.push(...chunk.rows || []);
				if (chunk.rowFragment) {
					const f = chunk.rowFragment;
					if (fragment && fragmentRow !== f.rowNumber || f.offset !== fragment.length) throw new Error("页内数据分片不连续，请重新读取本页");
					fragmentRow = f.rowNumber;
					fragment += f.text;
					if (f.complete) {
						rows.push(JSON.parse(fragment));
						fragment = "";
						fragmentRow = 0;
					}
				}
				if (chunk.pageComplete || chunk.status === "collecting" && !chunk.rows?.length && !chunk.rowFragment) {
					if (fragment) throw new Error("记录尚未完整获取，请刷新本页；不会展示被截断的记录");
					return {
						...chunk,
						rows,
						rowFragment: void 0,
						rowStart: (request.page - 1) * request.limit + 1
					};
				}
				if (!chunk.pageNextCursor) throw new Error("缺少页内续读游标，不能把部分结果作为完整页面");
				chunk = await fetchPage({
					cursor: chunk.pageNextCursor,
					limit: request.limit,
					maxTokens: 16e3
				});
			}
		}
		//#endregion
		//#region src/client/dataset-query.tsx
		/** 单页替换显示；只保存游标，不把所有业务行累积到浏览器内存。 */
		function DatasetQueryBrowser({ dataset, onClose, ui }) {
			const { api, Modal, Button, Message, QueryResult } = ui;
			const [result, setResult] = (0, react.useState)(null);
			const [message, setMessage] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const [pageNumber, setPageNumber] = (0, react.useState)(1);
			const [jumpPage, setJumpPage] = (0, react.useState)("1");
			const [pageSize, setPageSize] = (0, react.useState)(100);
			const currentCursor = (0, react.useRef)("");
			const mounted = (0, react.useRef)(false);
			const generation = (0, react.useRef)(0);
			const tableViewport = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (tableViewport.current) tableViewport.current.scrollTop = 0;
			}, [result?.cursor]);
			const release = (cursor) => cursor ? api("/semantic/query/dataset", {
				datasetId: dataset.id,
				request: {
					cursor,
					action: "close"
				}
			}).catch(() => {}) : Promise.resolve();
			const load = async (cursor = "", page = 1, initial = false, limit = pageSize) => {
				const version = ++generation.current;
				setBusy(true);
				setMessage(null);
				let issuedCursor = "";
				const isCurrent = () => mounted.current && generation.current === version;
				try {
					const value = await loadNumberedPage((request) => api("/semantic/query/dataset", {
						datasetId: dataset.id,
						request
					}), {
						...cursor ? { cursor } : {},
						page,
						limit
					}, {
						isCurrent,
						onCursor: (value) => {
							issuedCursor = value || issuedCursor;
							if (isCurrent()) currentCursor.current = issuedCursor || cursor;
						}
					});
					if (!isCurrent()) {
						if (initial) await release(issuedCursor);
						return;
					}
					setResult(value);
					setPageNumber(page);
					setPageSize(limit);
					setJumpPage(String(page));
				} catch (error) {
					if (isCurrent()) setMessage({
						kind: "error",
						text: error.message
					});
					else if (initial) await release(issuedCursor);
				} finally {
					if (isCurrent()) setBusy(false);
				}
			};
			(0, react.useEffect)(() => {
				mounted.current = true;
				load("", 1, true);
				return () => {
					mounted.current = false;
					generation.current++;
					release(currentCursor.current);
					currentCursor.current = "";
				};
			}, [dataset.id]);
			(0, react.useEffect)(() => {
				if (result?.status !== "collecting" || busy || message?.kind === "error") return;
				const timer = setTimeout(() => load(currentCursor.current, pageNumber), 1e3);
				return () => clearTimeout(timer);
			}, [
				result?.status,
				busy,
				pageNumber,
				pageSize,
				message
			]);
			const refresh = async () => {
				setBusy(true);
				await release(currentCursor.current);
				currentCursor.current = "";
				setResult(null);
				await load("", 1, true);
			};
			const jump = () => {
				try {
					load(currentCursor.current, validatePage(jumpPage, result?.totalPages || 0));
				} catch (error) {
					setMessage({
						kind: "error",
						text: error.message
					});
				}
			};
			const rows = result?.rows || [];
			const totalPages = result?.totalPages;
			const canPage = !busy && totalPages > 0 && !!currentCursor.current;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Modal, {
				wide: true,
				eyebrow: "全量查询 · 分页浏览",
				title: `浏览 ${dataset.name}`,
				description: "读取当前数据集全部可查询字段与记录，每页显示部分内容；不受200条总量限制。敏感和停用字段仍排除。",
				onClose,
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					onClick: onClose,
					children: "关闭并释放查询"
				}),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Message, { value: message }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-query-pagination",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: ["每页 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
								className: "dsl-select",
								"aria-label": "每页行数",
								value: pageSize,
								disabled: busy || !currentCursor.current,
								onChange: (event) => load(currentCursor.current, 1, false, Number(event.target.value)),
								children: [
									20,
									50,
									100,
									200
								].map((size) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
									value: size,
									children: [size, " 行"]
								}, size))
							})] }),
							result?.status === "collecting" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								disabled: busy,
								onClick: () => load(currentCursor.current, pageNumber),
								children: "刷新采集进度"
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								disabled: busy,
								onClick: refresh,
								children: "重新查询最新数据"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsl-hint",
						role: "status",
						"aria-live": "polite",
						children: !result ? message?.kind === "error" ? "查询未完成，请查看上方提示后重试。" : "正在创建查询结果…" : result.status === "failed" ? result.error : result.status === "budget_exceeded" ? result.nextAction : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: result.complete ? "当前为最后一页" : result.status === "collecting" ? "数据库正在采集结果，总页数待确定" : "完整结果已就绪，可翻页或直接跳转" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
							result.totalRows === null ? `已采集 ${result.capturedRows} 条，总数待查询结束确定` : `共 ${result.totalRows} 条`,
							rows.length ? ` · 当前第 ${result.rowStart}–${result.readThrough} 条` : "",
							totalPages !== null && totalPages !== void 0 ? ` · 第 ${totalPages ? pageNumber : 0} / ${totalPages} 页` : ""
						] })] })
					}),
					rows.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsl-paged-table",
						ref: tableViewport,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(QueryResult, { value: {
							...result,
							columns: result.columns?.length ? result.columns : Object.keys(rows[0])
						} })
					}) : null,
					result?.complete && !rows.length && !result.rowFragment ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsl-empty",
						children: "没有更多记录"
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
						className: "dsl-numbered-pagination",
						"aria-label": "数据集分页器",
						"aria-busy": busy,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [totalPages === null || totalPages === void 0 ? "总页数待确定" : `共 ${result.totalRows} 条 · ${totalPages} 页`, busy ? " · 正在读取…" : ""] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-page-buttons",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										disabled: !canPage || pageNumber <= 1,
										onClick: () => load(currentCursor.current, pageNumber - 1),
										children: "上一页"
									}),
									pageNumbers(pageNumber, totalPages).map((page) => typeof page === "number" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										kind: page === pageNumber ? "primary" : "default",
										"aria-label": `第 ${page} 页`,
										"aria-current": page === pageNumber ? "page" : void 0,
										disabled: !canPage,
										onClick: () => load(currentCursor.current, page),
										children: page
									}, page) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										"aria-hidden": "true",
										children: "…"
									}, page)),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										disabled: !canPage || pageNumber >= totalPages,
										onClick: () => load(currentCursor.current, pageNumber + 1),
										children: "下一页"
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
								noValidate: true,
								onSubmit: (event) => {
									event.preventDefault();
									jump();
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [
									"前往 ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: "dsl-input",
										type: "number",
										min: "1",
										max: totalPages || 1,
										step: "1",
										"aria-label": "跳转页码",
										disabled: !canPage,
										value: jumpPage,
										onChange: (event) => setJumpPage(event.target.value)
									}),
									" 页"
								] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									type: "submit",
									disabled: !canPage,
									children: "跳转"
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
						className: "dsl-query-notes",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: "查询完整性说明" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "每次新查询在数据库执行一次完整只读查询，并流式缓存结果。翻页不会重新扫描数据库，因此无主键、排序值重复或翻页期间源数据变化不会造成分页漏行。数据一致性仍由数据库自身的引擎与读取隔离语义决定。" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "总页数 = 总记录数 ÷ 每页行数后向上取整。采集完成前总页数待确定，不能跳转未知页面。网络分片在本页内自动装配，不会改变页数；跳到最后一页不等于已经查看前面的页。浏览器单页32MiB保护上限不影响模型接口无损分片读取。" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "查询失败、超时、缓存空间不足、权限变化或游标失效时，会明确提示未完整完成。缓存空闲一小时过期，关闭窗口或重启服务会释放/失效。需要最新记录请重新查询。" })
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/index.tsx
		const API_PREFIX = "/api/database-connections";
		const PLUGIN_ID = "@deepseek-ai/dsh-database-connections";
		const PLUGIN_VERSION = "2.1.0";
		const EMPTY_STATE = {
			datasets: [],
			semanticConcepts: [],
			relations: [],
			topologies: [],
			modelConfig: {}
		};
		const DEFAULT_PORT = {
			mysql: 3306,
			clickhouse: 8123
		};
		const CARDINALITY = {
			"one-to-one": "一对一（1:1）",
			"one-to-many": "一对多（1:N）",
			"many-to-one": "多对一（N:1）",
			"many-to-many": "多对多（N:N）"
		};
		const STATUS = {
			confirmed: "已人工确认",
			candidate: "候选待确认",
			rejected: "已拒绝"
		};
		const ORIGIN = {
			manual: "手动维护",
			rule: "规则引擎",
			llm: "大模型识别"
		};
		var ApiFailure = class extends Error {
			status;
			versionMismatch;
			constructor(message, status = 0, versionMismatch = false) {
				super(message);
				this.status = status;
				this.versionMismatch = versionMismatch;
			}
		};
		async function api(path, body, { signal } = {}) {
			const init = {
				method: body === void 0 ? "GET" : "POST",
				headers: { "Content-Type": "application/json" },
				signal
			};
			if (body !== void 0) init.body = JSON.stringify(body);
			let response;
			try {
				response = await fetch(`${API_PREFIX}${path}`, init);
			} catch (error) {
				if (signal?.aborted) throw error;
				throw new ApiFailure("无法连接到 DSH 后端服务");
			}
			let value;
			try {
				value = await response.json();
			} catch {
				throw new ApiFailure(`后端返回了非 JSON 响应（HTTP ${response.status}）`, response.status);
			}
			if (!response.ok || value?.ok === false) {
				const original = value?.error || `请求失败（HTTP ${response.status}）`;
				const mismatch = path.startsWith("/semantic/") && (response.status === 404 || /未知.*接口/.test(original));
				throw new ApiFailure(mismatch ? "浏览器端已载入数据库语义层 2.0，但 DSH 宿主端仍是旧版本。请重启 DSH 后重新打开插件。" : original, response.status, mismatch);
			}
			return value;
		}
		function usePluginStyles() {
			(0, react.useEffect)(() => {
				const id = "dsh-database-semantic-layer-styles";
				if (document.getElementById(id)) return;
				const style = document.createElement("style");
				style.id = id;
				style.dataset.plugin = PLUGIN_ID;
				style.textContent = PLUGIN_STYLES;
				document.head.appendChild(style);
				return () => style.remove();
			}, []);
		}
		function textError(error) {
			return error instanceof Error ? error.message : String(error);
		}
		function cellText(value) {
			if (value === null || value === void 0) return "";
			return typeof value === "object" ? JSON.stringify(value) : String(value);
		}
		function connectionPayload(connection, credentials = {}) {
			return {
				id: connection.id || "",
				name: connection.name || "",
				type: connection.type || "mysql",
				host: connection.host || "",
				port: Number(connection.port) || DEFAULT_PORT[connection.type || "mysql"],
				username: credentials.username || connection.username || "",
				password: credentials.password || connection.password || "",
				database: connection.database || ""
			};
		}
		function sourceLabel(dataset, connections) {
			return {
				connection: connections.find((item) => item.id === dataset.connectionId)?.name || "连接已删除",
				path: `${dataset.database}.${dataset.table}`
			};
		}
		function semanticCount(dataset) {
			return (dataset.fields || []).filter((field) => field.businessName || field.customComment || field.semanticConceptId).length;
		}
		function endpointText(endpoint, datasets) {
			const dataset = datasets.find((item) => item.id === endpoint.datasetId);
			return `${dataset?.name || "未知数据集"}｜${dataset?.database || "未知数据库"}.${dataset?.table || "未知表"}.${endpoint.field}`;
		}
		function createExportDocument(connections) {
			return {
				format: "dsh-plugin-config",
				formatVersion: 1,
				plugin: PLUGIN_ID,
				pluginVersion: PLUGIN_VERSION,
				exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
				secretPolicy: "credentials-omitted",
				items: connections.map(({ id, name, type, host, port, database }) => ({
					id,
					name,
					type,
					host,
					port,
					database
				}))
			};
		}
		function downloadDocument(value) {
			const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 16).replace(/[-:T]/g, "");
			const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `dsh-database-connections-${stamp}.dshconfig.json`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
		}
		function Button({ children, kind = "default", icon: Icon, iconOnly = false, className = "", ...props }) {
			const names = [
				"dsl-button",
				kind === "primary" ? "dsl-button-primary" : "",
				kind === "danger" ? "dsl-button-danger" : "",
				iconOnly ? "dsl-icon-button" : "",
				className
			].filter(Boolean).join(" ");
			const accessibleName = props["aria-label"] || (iconOnly && typeof children === "string" ? children : void 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: names,
				...props,
				"aria-label": accessibleName,
				title: iconOnly && typeof children === "string" ? children : props.title,
				children: [Icon ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
					size: 16,
					"aria-hidden": "true"
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children })]
			});
		}
		function StatusPill({ children, kind = "neutral" }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: `dsl-status dsl-status-${kind}`,
				children
			});
		}
		function Message({ value }) {
			if (!value) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `dsl-message dsl-message-${value.kind === "error" ? "error" : "ok"}`,
				role: "status",
				children: [value.kind === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, { size: 16 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, { size: 16 }), value.text]
			});
		}
		function Field({ label, children, span = false, required = false, error, hint, messageId }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: `dsl-field ${span ? "dsl-span-2" : ""}`,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [label, required ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsl-required",
						"aria-hidden": "true",
						children: " * 必填"
					}) : null] }),
					children,
					error || hint ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", {
						id: messageId,
						className: error ? "dsl-field-error" : "dsl-field-hint",
						children: error || hint
					}) : null
				]
			});
		}
		function PageHeader({ eyebrow, title, description, actions }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
				className: "dsl-page-header",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
					eyebrow ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsl-eyebrow",
						children: eyebrow
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", { children: title }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: description })
				] }), actions ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsl-actions",
					children: actions
				}) : null]
			});
		}
		function Modal({ eyebrow, title, description, children, footer, onClose, wide = false }) {
			(0, react.useEffect)(() => {
				const close = (event) => {
					if (event.key === "Escape") onClose();
				};
				window.addEventListener("keydown", close);
				return () => window.removeEventListener("keydown", close);
			}, [onClose]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsl-modal-backdrop",
				role: "presentation",
				onMouseDown: (event) => {
					if (event.target === event.currentTarget) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: `dsl-modal ${wide ? "dsl-modal-wide" : ""}`,
					role: "dialog",
					"aria-modal": "true",
					"aria-label": title,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							className: "dsl-modal-header",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dsl-eyebrow",
									children: eyebrow
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: title }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: description })
							] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsl-modal-close",
								"aria-label": "关闭",
								onClick: onClose,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, {})
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsl-modal-body",
							children
						}),
						footer ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("footer", {
							className: "dsl-modal-footer",
							children: footer
						}) : null
					]
				})
			});
		}
		function ConnectionEditor({ connection, onClose, onSaved }) {
			const editing = Boolean(connection?.id);
			const [form, setForm] = (0, react.useState)(connection ? {
				...connection,
				username: "",
				password: ""
			} : {
				id: "",
				name: "",
				type: "mysql",
				host: "",
				port: "3306",
				username: "",
				password: "",
				database: ""
			});
			const [showPassword, setShowPassword] = (0, react.useState)(false);
			const [busy, setBusy] = (0, react.useState)(false);
			const [message, setMessage] = (0, react.useState)(null);
			const patch = (value) => setForm((current) => ({
				...current,
				...value
			}));
			const test = async () => {
				setBusy(true);
				setMessage(null);
				try {
					setMessage({
						kind: "ok",
						text: (await api("/test", { connection: connectionPayload(form) })).message || "连接成功"
					});
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				} finally {
					setBusy(false);
				}
			};
			const save = async () => {
				if (!form.name.trim() || !form.host.trim()) {
					setMessage({
						kind: "error",
						text: "请填写连接名称和主机地址"
					});
					return;
				}
				setBusy(true);
				setMessage(null);
				try {
					const data = await api("/save", { connection: connectionPayload(form) });
					const saved = (data.connections || []).find((item) => item.id === form.id || item.name === form.name.trim());
					onSaved(data.connections || [], saved);
					onClose();
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				} finally {
					setBusy(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Modal, {
				eyebrow: "连接管理",
				title: editing ? "编辑数据库连接" : "新建数据库连接",
				description: editing ? "原用户名和密码不会回显；留空表示保持原凭据。" : "MySQL（关系型数据库）与 ClickHouse（列式分析数据库）使用同一套连接能力。",
				onClose,
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						onClick: onClose,
						children: "取消"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						icon: _deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16,
						disabled: busy,
						onClick: test,
						children: busy ? "处理中…" : "测试连接"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						kind: "primary",
						icon: _deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16,
						disabled: busy || !form.name.trim() || !form.host.trim(),
						onClick: save,
						children: "保存连接"
					})
				] }),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-form-grid",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "连接名称",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "dsl-input",
									value: form.name,
									onChange: (event) => patch({ name: event.target.value }),
									placeholder: "例如：生产环境 MySQL"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "数据库类型",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: "dsl-select",
									value: form.type,
									onChange: (event) => patch({
										type: event.target.value,
										port: String(DEFAULT_PORT[event.target.value])
									}),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "mysql",
										children: "MySQL（关系型数据库）"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "clickhouse",
										children: "ClickHouse（列式分析数据库）"
									})]
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "主机地址",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "dsl-input",
									value: form.host,
									onChange: (event) => patch({ host: event.target.value }),
									placeholder: "127.0.0.1"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "端口",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "dsl-input",
									inputMode: "numeric",
									value: form.port,
									onChange: (event) => patch({ port: event.target.value })
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "默认数据库",
								span: true,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "dsl-input",
									value: form.database,
									onChange: (event) => patch({ database: event.target.value })
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: editing ? "新用户名（可选）" : "用户名",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "dsl-input",
									autoComplete: "off",
									value: form.username,
									onChange: (event) => patch({ username: event.target.value }),
									placeholder: editing ? "留空则保持原用户名" : "请输入数据库用户名"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: editing ? "新密码（可选）" : "密码",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsl-row",
									style: { flexWrap: "nowrap" },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: "dsl-input",
										autoComplete: "new-password",
										type: showPassword ? "text" : "password",
										value: form.password,
										onChange: (event) => patch({ password: event.target.value }),
										placeholder: editing ? "留空则保持原密码" : "请输入数据库密码"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										icon: showPassword ? _deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16 : _deepseek_ai_dsh_client_ui_primitives.IconDataOutline16,
										iconOnly: true,
										"aria-label": showPassword ? "隐藏密码" : "显示密码",
										onClick: () => setShowPassword((value) => !value),
										children: showPassword ? "隐藏密码" : "显示密码"
									})]
								})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-privacy",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, { size: 18 }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "创建成功后完全隐藏凭据" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "用户名和密码只用于连接认证；连接卡片、查看详情、数据浏览、查询和导出内容均不显示明文。" })] })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: { marginTop: 12 },
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Message, { value: message })
					})
				]
			});
		}
		function ExportConnections({ connections, onClose, notify }) {
			const [selectedIds, setSelectedIds] = (0, react.useState)(connections.map((item) => item.id));
			const toggle = (id) => setSelectedIds((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
			const run = () => {
				const selected = connections.filter((item) => selectedIds.includes(item.id));
				downloadDocument(createExportDocument(selected));
				notify(`已导出 ${selected.length} 个数据库连接；文件不包含用户名和密码`);
				onClose();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Modal, {
				wide: true,
				eyebrow: "连接迁移",
				title: "批量导出数据库连接",
				description: "选择一个或多个连接，导出为 DSH 插件配置文件；凭据不会写入文件。",
				onClose,
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					onClick: onClose,
					children: "取消"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					kind: "primary",
					icon: _deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16,
					disabled: !selectedIds.length,
					onClick: run,
					children: "导出选中连接"
				})] }),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsl-export-list",
					children: connections.map((connection) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: `dsl-export-item ${selectedIds.includes(connection.id) ? "selected" : ""}`,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: selectedIds.includes(connection.id),
								onChange: () => toggle(connection.id)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `dsl-db-icon ${connection.type}`,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDataOutline16, {})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: connection.name }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", { children: [
									connection.type === "mysql" ? "MySQL（关系型数据库）" : "ClickHouse（列式分析数据库）",
									" · ",
									connection.host,
									":",
									connection.port
								] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: connection.database || "未指定默认数据库" })
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusPill, {
								kind: "success",
								children: "可导出"
							})
						]
					}, connection.id))
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsl-privacy",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, { size: 18 }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "批量导出不携带凭据" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "目标环境导入后，需要重新填写用户名和密码并测试连接。" })] })]
				})]
			});
		}
		function BrowseConnection({ connection, onClose, onCreateDataset }) {
			const [databases, setDatabases] = (0, react.useState)([]);
			const [tables, setTables] = (0, react.useState)([]);
			const [database, setDatabase] = (0, react.useState)(connection.database || "");
			const [table, setTable] = (0, react.useState)("");
			const [result, setResult] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const [message, setMessage] = (0, react.useState)(null);
			const operational = connectionPayload(connection);
			const loadDatabases = (0, react.useCallback)(async () => {
				setBusy(true);
				try {
					const data = await api("/databases", { connection: operational });
					setDatabases(data.rows || []);
					if (!database && data.rows?.length) setDatabase(data.rows[0]);
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				} finally {
					setBusy(false);
				}
			}, [connection.id]);
			const loadTables = async () => {
				setBusy(true);
				try {
					const data = await api("/tables", {
						connection: operational,
						database
					});
					setTables(data.rows || []);
					if (data.rows?.length) setTable(data.rows[0]);
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				} finally {
					setBusy(false);
				}
			};
			const preview = async () => {
				if (!table) return;
				setBusy(true);
				try {
					setResult(await api("/query", {
						connection: operational,
						sql: `SELECT * FROM \`${table.replace(/`/g, "``")}\` LIMIT 100`
					}));
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				} finally {
					setBusy(false);
				}
			};
			(0, react.useEffect)(() => {
				loadDatabases();
			}, [loadDatabases]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Modal, {
				wide: true,
				eyebrow: "数据浏览",
				title: `浏览 ${connection.name}`,
				description: "从真实数据库读取数据库、表和最多 100 行样例数据。",
				onClose,
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					onClick: onClose,
					children: "关闭"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					kind: "primary",
					icon: _deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16,
					disabled: !table,
					onClick: () => {
						onClose();
						onCreateDataset(connection.id, database, table);
					},
					children: "用此表创建数据集"
				})] }),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-form-grid",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
							label: "数据库",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-row",
								style: { flexWrap: "nowrap" },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: "dsl-select",
									value: database,
									onChange: (event) => {
										setDatabase(event.target.value);
										setTables([]);
										setTable("");
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: "选择数据库"
									}), databases.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: name,
										children: name
									}, name))]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									icon: _deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16,
									iconOnly: true,
									onClick: loadDatabases,
									disabled: busy,
									children: "读取数据库"
								})]
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
							label: "数据表",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-row",
								style: { flexWrap: "nowrap" },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: "dsl-select",
									value: table,
									onChange: (event) => setTable(event.target.value),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: "选择数据表"
									}), tables.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: name,
										children: name
									}, name))]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									icon: _deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16,
									iconOnly: true,
									onClick: loadTables,
									disabled: busy || !database,
									children: "读取数据表"
								})]
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsl-row",
						style: { marginTop: 12 },
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							icon: busy ? _deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16 : _deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16,
							disabled: busy || !table,
							onClick: preview,
							children: busy ? "读取中…" : "预览数据"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: { marginTop: 12 },
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Message, { value: message })
					}),
					result ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(QueryResult, { value: result }) : null
				]
			});
		}
		function QueryResult({ value }) {
			const columns = value.columns || [];
			const rows = value.rows || [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsl-query-result",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: columns.map((column) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: column }, column)) }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: rows.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: columns.map((column) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: cellText(row[column]) }, column)) }, index)) })] }), !rows.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsl-empty",
					children: "查询成功，没有返回数据"
				}) : null]
			});
		}
		function ConnectionsPage({ onCreateDataset }) {
			const [connections, setConnections] = (0, react.useState)([]);
			const [state, setState] = (0, react.useState)(EMPTY_STATE);
			const [dialog, setDialog] = (0, react.useState)(null);
			const [message, setMessage] = (0, react.useState)(null);
			const [testingId, setTestingId] = (0, react.useState)("");
			const [checked, setChecked] = (0, react.useState)({});
			const [queryConnectionId, setQueryConnectionId] = (0, react.useState)("");
			const [sql, setSql] = (0, react.useState)("SELECT * FROM your_table LIMIT 100");
			const [queryResult, setQueryResult] = (0, react.useState)(null);
			const [queryBusy, setQueryBusy] = (0, react.useState)(false);
			const [conflictPolicy, setConflictPolicy] = (0, react.useState)("skip");
			const importRef = (0, react.useRef)(null);
			const reload = (0, react.useCallback)(async () => {
				try {
					const data = await api("/list");
					setConnections(data.connections || []);
					setQueryConnectionId((current) => current || data.connections?.[0]?.id || "");
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				}
				try {
					setState((await api("/semantic/state")).state || EMPTY_STATE);
				} catch (error) {
					if (error.versionMismatch) setMessage({
						kind: "error",
						text: error.message
					});
				}
			}, []);
			(0, react.useEffect)(() => {
				reload();
			}, [reload]);
			const notify = (text) => setMessage({
				kind: "ok",
				text
			});
			const test = async (connection) => {
				setTestingId(connection.id);
				try {
					const data = await api("/test", { connection: connectionPayload(connection) });
					setChecked((current) => ({
						...current,
						[connection.id]: "刚刚"
					}));
					notify(`${connection.name}：${data.message || "连接成功"}`);
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				} finally {
					setTestingId("");
				}
			};
			const remove = async (connection) => {
				if (!globalThis.confirm(`确定删除连接“${connection.name}”吗？`)) return;
				try {
					setConnections((await api("/delete", { id: connection.id })).connections || []);
					setDialog(null);
					notify(`连接“${connection.name}”已删除`);
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				}
			};
			const importFile = async (event) => {
				const file = event.target.files?.[0];
				event.target.value = "";
				if (!file) return;
				try {
					if (file.size > 5 * 1024 * 1024) throw new Error("配置文件不能超过 5 MB");
					const data = await api("/import", {
						document: JSON.parse(await file.text()),
						conflictPolicy
					});
					setConnections(data.connections || []);
					const summary = data.summary || {};
					notify(`导入完成：新增 ${summary.imported || 0} 个，覆盖 ${summary.replaced || 0} 个，副本 ${summary.copied || 0} 个，跳过 ${summary.skipped || 0} 个。凭据需重新填写。`);
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				}
			};
			const runQuery = async () => {
				const connection = connections.find((item) => item.id === queryConnectionId);
				if (!connection || !sql.trim()) return;
				setQueryBusy(true);
				setQueryResult(null);
				try {
					setQueryResult(await api("/query", {
						connection: connectionPayload(connection),
						sql
					}));
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				} finally {
					setQueryBusy(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsl-page",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PageHeader, {
						eyebrow: "数据入口",
						title: "数据库连接",
						description: "统一管理 MySQL（关系型数据库）与 ClickHouse（列式分析数据库）的连接、数据集和只读查询。",
						actions: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								icon: _deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16,
								disabled: !connections.length,
								onClick: () => setDialog({ type: "export" }),
								children: "批量导出"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								ref: importRef,
								type: "file",
								accept: ".json,.dshconfig",
								hidden: true,
								onChange: importFile
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								className: "dsl-select",
								"aria-label": "导入冲突处理",
								style: { width: 128 },
								value: conflictPolicy,
								onChange: (event) => setConflictPolicy(event.target.value),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "skip",
										children: "导入时跳过"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "replace",
										children: "导入时覆盖"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "copy",
										children: "导入为副本"
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								onClick: () => importRef.current?.click(),
								children: "批量导入"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								kind: "primary",
								icon: _deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16,
								onClick: () => setDialog({
									type: "edit",
									connection: null
								}),
								children: "新建连接"
							})
						] })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Message, { value: message }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-connection-grid",
						children: [connections.map((connection) => {
							const datasetCount = (state.datasets || []).filter((item) => item.connectionId === connection.id).length;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
								className: "dsl-card dsl-connection-card",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsl-connection-head",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: `dsl-db-icon ${connection.type}`,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDataOutline16, { size: 20 })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: connection.name }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
												connection.type === "mysql" ? "MySQL（关系型数据库）" : "ClickHouse（列式分析数据库）",
												" · ",
												connection.host,
												":",
												connection.port
											] })] }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusPill, {
												kind: "success",
												children: "已配置"
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsl-connection-meta",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: "默认数据库" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: connection.database || "未指定" })] }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: "已创建数据集" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: [datasetCount, " 个"] })] }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: "最近检查" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: testingId === connection.id ? "正在检查…" : checked[connection.id] || "尚未检查" })] })
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsl-actions",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
												icon: _deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16,
												onClick: () => setDialog({
													type: "browse",
													connection
												}),
												children: "浏览数据"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
												icon: _deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16,
												disabled: testingId === connection.id,
												onClick: () => test(connection),
												children: testingId === connection.id ? "测试中…" : "测试连接"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
												kind: "primary",
												icon: _deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16,
												onClick: () => onCreateDataset(connection.id),
												children: "创建数据集"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
												icon: _deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutline16,
												onClick: () => setDialog({
													type: "more",
													connection
												}),
												children: "更多"
											})
										]
									})
								]
							}, connection.id);
						}), !connections.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsl-section dsl-empty",
							children: "暂无数据库连接，请先新建连接。"
						}) : null]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsl-section",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-query-head",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "数据浏览与只读查询" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "连接层用于人工验证表结构和数据样例；查询仍受只读语句白名单约束。" })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusPill, { children: "最多 200 行 · 约 15 秒" })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dsl-form-grid",
								style: { marginTop: 12 },
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: "执行连接",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										className: "dsl-select",
										value: queryConnectionId,
										onChange: (event) => setQueryConnectionId(event.target.value),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "",
											children: "请选择连接"
										}), connections.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: item.id,
											children: item.name
										}, item.id))]
									})
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-query-line",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: "dsl-textarea dsl-code",
									"aria-label": "只读 SQL 查询",
									value: sql,
									onChange: (event) => setSql(event.target.value)
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									icon: queryBusy ? _deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16 : _deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16,
									disabled: queryBusy || !queryConnectionId || !sql.trim(),
									onClick: runQuery,
									children: queryBusy ? "查询中…" : "执行查询"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-safety",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, { size: 14 }), "仅允许 SELECT / SHOW / DESCRIBE / EXPLAIN / WITH（只读语句）"]
							}),
							queryResult ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(QueryResult, { value: queryResult }) : null
						]
					}),
					dialog?.type === "edit" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConnectionEditor, {
						connection: dialog.connection,
						onClose: () => setDialog(null),
						onSaved: (items) => {
							setConnections(items);
							notify(dialog.connection ? "连接已更新；凭据继续隐藏" : "连接已创建；用户名和密码已隐藏");
						}
					}) : null,
					dialog?.type === "export" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExportConnections, {
						connections,
						onClose: () => setDialog(null),
						notify
					}) : null,
					dialog?.type === "browse" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BrowseConnection, {
						connection: dialog.connection,
						onClose: () => setDialog(null),
						onCreateDataset
					}) : null,
					dialog?.type === "more" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Modal, {
						eyebrow: "连接管理",
						title: dialog.connection.name,
						description: "两种数据库使用统一的查看、编辑和删除操作；不会显示用户名与密码。",
						onClose: () => setDialog(null),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							onClick: () => setDialog(null),
							children: "关闭"
						}),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsl-export-list",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								className: "dsl-export-item",
								type: "button",
								onClick: () => setDialog({
									type: "edit",
									connection: dialog.connection
								}),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "编辑连接" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: "修改名称、地址、端口、默认数据库或重新填写凭据" })] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								className: "dsl-export-item",
								type: "button",
								onClick: () => remove(dialog.connection),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "删除连接" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: "存在数据集引用时会由服务端阻止删除" })] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {})
								]
							})]
						})
					}) : null
				]
			});
		}
		function SummaryCard({ icon: Icon, label, value, note, tone = "" }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
				className: `dsl-card dsl-summary-card ${tone ? `dsl-summary-${tone}` : ""}`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsl-summary-icon",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, { size: 19 })
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: label }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: value }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: note })
				] })]
			});
		}
		function ConceptManager({ state, refresh, onClose }) {
			const [form, setForm] = (0, react.useState)({
				id: "",
				name: "",
				definition: "",
				aliases: ""
			});
			const [message, setMessage] = (0, react.useState)(null);
			const save = async () => {
				try {
					await api("/semantic/concepts/save", { concept: {
						...form,
						aliases: form.aliases.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean)
					} });
					await refresh();
					setForm({
						id: "",
						name: "",
						definition: "",
						aliases: ""
					});
					setMessage({
						kind: "ok",
						text: "统一语义概念已保存"
					});
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				}
			};
			const edit = (concept) => setForm({
				id: concept.id,
				name: concept.name,
				definition: concept.definition || "",
				aliases: (concept.aliases || []).join("，")
			});
			const remove = async (concept) => {
				if (!globalThis.confirm(`删除统一语义概念“${concept.name}”吗？字段绑定会同时解除。`)) return;
				try {
					await api("/semantic/concepts/delete", { id: concept.id });
					await refresh();
					if (form.id === concept.id) setForm({
						id: "",
						name: "",
						definition: "",
						aliases: ""
					});
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Modal, {
				wide: true,
				eyebrow: "统一业务词汇",
				title: "统一语义概念",
				description: "把不同表中名称不同、但业务含义相同的字段归到同一个概念；概念相同不自动等于可以关联。",
				onClose,
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					onClick: onClose,
					children: "关闭"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					kind: "primary",
					icon: _deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16,
					disabled: !form.name.trim(),
					onClick: save,
					children: form.id ? "保存修改" : "新增概念"
				})] }),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-form-grid",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "概念名称",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "dsl-input",
									value: form.name,
									onChange: (event) => setForm({
										...form,
										name: event.target.value
									}),
									placeholder: "例如：计量设备标识"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "别名（逗号分隔）",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "dsl-input",
									value: form.aliases,
									onChange: (event) => setForm({
										...form,
										aliases: event.target.value
									}),
									placeholder: "meter_id，meter_code"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "业务定义",
								span: true,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: "dsl-textarea",
									value: form.definition,
									onChange: (event) => setForm({
										...form,
										definition: event.target.value
									}),
									placeholder: "说明这个概念在业务中的唯一含义"
								})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: { marginTop: 12 },
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Message, { value: message })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-concepts",
						children: [(state.semanticConcepts || []).map((concept) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
							className: "dsl-concept",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsl-query-head",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: concept.name }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsl-row",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
											icon: _deepseek_ai_dsh_client_ui_primitives.IconEditOutline16,
											iconOnly: true,
											"aria-label": `编辑${concept.name}`,
											onClick: () => edit(concept),
											children: "编辑"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
											kind: "danger",
											icon: _deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16,
											iconOnly: true,
											"aria-label": `删除${concept.name}`,
											onClick: () => remove(concept),
											children: "删除"
										})]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: concept.definition || "未填写业务定义" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", { children: ["别名：", concept.aliases?.length ? concept.aliases.join("、") : "无"] })
							]
						}, concept.id)), !state.semanticConcepts?.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsl-hint",
							children: "还没有统一语义概念，可先新增一个，再在数据集字段中绑定。"
						}) : null]
					})
				]
			});
		}
		const semanticPreviewUi = {
			api,
			Modal,
			Button,
			Field,
			Message,
			StatusPill,
			CARDINALITY
		};
		function DatasetContextModal({ state, initialId, onClose }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SemanticPreview, {
				ui: semanticPreviewUi,
				state,
				initialId,
				onClose
			});
		}
		function DatasetPreview({ dataset, onClose }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DatasetQueryBrowser, {
				dataset,
				onClose,
				ui: {
					api,
					Modal,
					Button,
					Message,
					QueryResult
				}
			});
		}
		function DatasetSourcePicker({ source, catalog, connections, disabled, validationErrors = {}, validationId }) {
			const databaseLoading = source.loading === "databases";
			const tableLoading = source.loading === "tables";
			const fieldLoading = source.loading === "fields";
			const progress = databaseLoading ? "正在加载当前连接下的数据库…" : tableLoading ? "正在加载当前数据库下的数据表…" : fieldLoading ? "正在自动读取所选表的字段类型和数据库注释…" : source.metadata ? `已自动读取 ${source.metadata.fields.length} 个字段，可继续编辑业务语义。` : !source.connectionId ? "请选择数据库连接，系统会自动加载库表目录。" : !source.databases.length ? "当前连接没有可访问的数据库，请检查账号权限后刷新。" : !source.database ? "请选择一个数据库，继续展开该库下的数据表。" : !source.tables.length ? "当前数据库没有可访问的数据表，请检查账号权限后刷新。" : "请选择数据表，系统会自动带出字段类型、原始注释和表注释。";
			const retries = {
				databases: catalog.refreshDatabases,
				tables: catalog.refreshTables,
				fields: catalog.refreshFields
			};
			const retryLabels = {
				databases: "重试加载数据库",
				tables: "重试加载数据表",
				fields: "重试读取字段"
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsl-source-browser",
				"data-dataset-field": "fields",
				tabIndex: -1,
				role: "group",
				"aria-label": "数据来源与字段读取",
				"aria-describedby": validationErrors.fields ? `${validationId}-fields` : void 0,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-source-heading",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "按层级选择数据来源" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "连接 → 数据库 → 数据表 → 字段定义" })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-source-picker",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "来源连接",
								required: true,
								error: validationErrors.connectionId,
								messageId: `${validationId}-connectionId`,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: "dsl-select",
									"aria-label": "来源连接",
									required: true,
									"aria-invalid": Boolean(validationErrors.connectionId),
									"aria-describedby": validationErrors.connectionId ? `${validationId}-connectionId` : void 0,
									"data-dataset-field": "connectionId",
									value: source.connectionId,
									disabled,
									onChange: (event) => {
										const connection = connections.find((item) => item.id === event.target.value);
										catalog.selectConnection(event.target.value, connection?.database || "");
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: "请选择连接"
									}), connections.map((connection) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
										value: connection.id,
										children: [
											connection.name,
											"｜",
											connection.type === "mysql" ? "MySQL" : "ClickHouse"
										]
									}, connection.id))]
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "来源数据库",
								required: true,
								error: validationErrors.database,
								messageId: `${validationId}-database`,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsl-source-control",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										className: "dsl-select",
										"aria-label": "来源数据库",
										required: true,
										"aria-invalid": Boolean(validationErrors.database),
										"aria-describedby": validationErrors.database ? `${validationId}-database` : void 0,
										"data-dataset-field": "database",
										"aria-busy": databaseLoading,
										disabled: disabled || !source.connectionId || databaseLoading || !source.databases.length,
										value: source.databases.includes(source.database) ? source.database : "",
										onChange: (event) => void catalog.selectDatabase(event.target.value),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "",
											children: databaseLoading ? "正在加载数据库…" : !source.connectionId ? "请先选择连接" : !source.databases.length ? "暂无可访问的数据库" : "请选择数据库"
										}), source.databases.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: name,
											children: name
										}, name))]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										icon: databaseLoading ? _deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16 : _deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16,
										iconOnly: true,
										disabled: disabled || !source.connectionId || databaseLoading,
										onClick: () => void catalog.refreshDatabases(),
										children: "刷新数据库列表"
									})]
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "来源表",
								required: true,
								error: validationErrors.table,
								messageId: `${validationId}-table`,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsl-source-control",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										className: "dsl-select",
										"aria-label": "来源表",
										required: true,
										"aria-invalid": Boolean(validationErrors.table),
										"aria-describedby": validationErrors.table ? `${validationId}-table` : void 0,
										"data-dataset-field": "table",
										"aria-busy": tableLoading,
										disabled: disabled || databaseLoading || tableLoading || !source.database || !source.tables.length,
										value: source.tables.includes(source.table) ? source.table : "",
										onChange: (event) => void catalog.selectTable(event.target.value),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "",
											children: tableLoading ? "正在加载数据表…" : !source.database ? "请先选择数据库" : !source.tables.length ? "暂无可访问的数据表" : "请选择数据表"
										}), source.tables.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: name,
											children: name
										}, name))]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										icon: tableLoading ? _deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16 : _deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16,
										iconOnly: true,
										disabled: disabled || databaseLoading || tableLoading || !source.database || !source.databases.includes(source.database),
										onClick: () => void catalog.refreshTables(),
										children: "刷新数据表列表"
									})]
								})
							})
						]
					}),
					source.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsl-source-feedback",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsl-message dsl-message-error",
							role: "alert",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, { size: 16 }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									retryLabels[source.error.stage].replace("重试", ""),
									"失败：",
									source.error.message,
									"。请检查连接、网络与账号权限后重试。"
								] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									onClick: () => void retries[source.error.stage](),
									disabled,
									children: retryLabels[source.error.stage]
								})
							]
						})
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-source-feedback",
						role: "status",
						children: [
							source.loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDataOutline16, { size: 14 }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: progress }),
							source.metadata ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								icon: _deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16,
								disabled,
								onClick: () => void catalog.refreshFields(),
								children: "重新读取字段"
							}) : null
						]
					}),
					validationErrors.fields ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsl-field-error",
						id: `${validationId}-fields`,
						children: validationErrors.fields
					}) : null
				]
			});
		}
		function FieldCommentCopy({ fields, disabled, onApply }) {
			const [mode, setMode] = (0, react.useState)("empty");
			const [result, setResult] = (0, react.useState)(null);
			const [pendingTarget, setPendingTarget] = (0, react.useState)(null);
			const pending = pendingTarget ? copyDatabaseComments(fields, pendingTarget, { overwrite: true }) : null;
			const apply = (plan) => {
				if (disabled) return;
				if (plan.copied) onApply(plan.fields);
				setResult(plan);
				setPendingTarget(null);
			};
			const copy = (target) => {
				if (disabled) return;
				const plan = copyDatabaseComments(fields, target, { overwrite: mode === "overwrite" });
				if (plan.overwritten) setPendingTarget(target);
				else apply(plan);
			};
			const notes = result ? [
				result.overwritten ? `其中覆盖 ${result.overwritten} 项` : "",
				result.preserved ? `保留已有内容 ${result.preserved} 项` : "",
				result.emptyComment ? `无数据库注释 ${result.emptyComment} 项` : "",
				result.unchanged ? `内容相同 ${result.unchanged} 项` : "",
				result.tooLong.length ? `超长跳过 ${result.tooLong.length} 项` : ""
			].filter(Boolean) : [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsl-comment-copy",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-comment-copy-toolbar",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "数据库注释一键复制" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsl-comment-copy-actions",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: "dsl-select",
									"aria-label": "注释复制方式",
									disabled,
									value: mode,
									onChange: (event) => setMode(event.target.value),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "empty",
										children: "仅填空白项（默认）"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "overwrite",
										children: "覆盖已有内容"
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									disabled,
									onClick: () => copy("businessName"),
									children: "复制到业务名称"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									disabled,
									onClick: () => copy("customComment"),
									children: "复制到自定义业务注释"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsl-comment-copy-hint",
						children: "作用于当前表全部字段，跳过无注释和超长项；业务名称的换行转为空格。复制后可继续编辑，点击“保存数据集”生效。"
					}),
					result ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-comment-copy-result",
						role: "status",
						"aria-live": "polite",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: result.copied ? `已复制 ${result.copied} 项至${result.label}，尚未保存。` : `未修改${result.label}。` }),
							notes.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [notes.join("；"), "。"] }) : null,
							result.tooLong.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", { children: [
								"查看超长字段（目标最多 ",
								result.maxLength,
								" 个字符，未截断）"
							] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", { children: result.tooLong.map((field) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: field.name }),
								"：",
								field.length,
								" 个字符，请手动精简后填写。"
							] }, field.name)) })] }) : null
						]
					}) : null,
					pending ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Modal, {
						eyebrow: "覆盖确认",
						title: `覆盖已有${pending.label}？`,
						description: "此操作只修改当前数据集草稿，不会修改数据库原注释；点击保存数据集后才会生效。",
						onClose: () => setPendingTarget(null),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							onClick: () => setPendingTarget(null),
							children: "取消"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							kind: "danger",
							disabled,
							onClick: () => apply(copyDatabaseComments(fields, pendingTarget, { overwrite: true })),
							children: "确认覆盖并复制"
						})] }),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
							"将复制 ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: pending.copied }),
							" 项数据库注释到“",
							pending.label,
							"”，其中 ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: pending.overwritten }),
							" 项已有内容会被覆盖。"
						] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsl-comment-copy-hint",
							children: "没有原注释、内容相同或超长的字段保持不变。若要保留人工内容，请取消并选择“仅填空白项（默认）”。"
						})]
					}) : null
				]
			});
		}
		function DatasetEditor({ initial, connections, state, onCancel, onSaved, onDeleted, onOpenTopology }) {
			const [draft, setDraft] = (0, react.useState)(() => JSON.parse(JSON.stringify(initial)));
			const [activeTab, setActiveTab] = (0, react.useState)("fields");
			const [busy, setBusy] = (0, react.useState)(false);
			const [message, setMessage] = (0, react.useState)(null);
			const [previewOpen, setPreviewOpen] = (0, react.useState)(false);
			const [submitAttempted, setSubmitAttempted] = (0, react.useState)(false);
			const [saving, setSaving] = (0, react.useState)(false);
			const savePending = (0, react.useRef)(false);
			const editorRef = (0, react.useRef)(null);
			const serverMessageRef = (0, react.useRef)(null);
			const validationId = (0, react.useId)();
			const editing = Boolean(draft.id);
			const selectedConnection = connections.find((item) => item.id === draft.connectionId);
			const connectionRef = (0, react.useRef)(connections);
			connectionRef.current = connections;
			const sourceCatalog = (0, react.useMemo)(() => {
				const payload = (id) => {
					const connection = connectionRef.current.find((item) => item.id === id);
					if (!connection) throw new Error("数据库连接已不存在，请返回连接管理检查");
					return connectionPayload(connection);
				};
				return createDatasetSourceCatalog({
					databases: async (id, signal) => (await api("/databases", { connection: payload(id) }, { signal })).rows,
					tables: async (id, database, signal) => (await api("/tables", {
						connection: payload(id),
						database
					}, { signal })).rows,
					inspect: async (selection, signal) => (await api("/semantic/datasets/inspect", selection, { signal })).metadata
				});
			}, []);
			const source = (0, react.useSyncExternalStore)(sourceCatalog.subscribe, sourceCatalog.getSnapshot);
			(0, react.useEffect)(() => {
				if (editing) return;
				sourceCatalog.selectConnection(initial.connectionId || "", initial.database || "", initial.table || "");
				return () => sourceCatalog.cancel();
			}, [sourceCatalog, editing]);
			(0, react.useEffect)(() => {
				if (editing) return;
				setDraft((current) => {
					const sameSource = sameDatasetSource(current, source);
					const fields = sameSource ? current.fields || [] : [];
					return {
						...current,
						connectionId: source.connectionId,
						database: source.database,
						table: source.table,
						...source.metadata ? mergeDatasetMetadata(fields, source.metadata) : {
							fields,
							tableComment: sameSource ? current.tableComment || "" : "",
							metadataVersion: sameSource ? current.metadataVersion : ""
						}
					};
				});
			}, [source, editing]);
			const validationIssues = validateDatasetDraft(draft, {
				editing,
				source,
				connections
			});
			const visibleIssues = submitAttempted ? validationIssues : [];
			const validationErrors = Object.fromEntries(visibleIssues.map((issue) => [issue.field, issue.message]));
			const focusIssue = (field) => requestAnimationFrame(() => {
				let target = editorRef.current?.querySelector(`[data-dataset-field="${field}"]`);
				if (!target || target.disabled) target = editorRef.current?.querySelector("[data-dataset-field=\"fields\"]");
				target?.focus({ preventScroll: true });
				target?.scrollIntoView({
					block: "center",
					behavior: "auto"
				});
			});
			const relations = state.relations.filter((relation) => relation.source.datasetId === draft.id || relation.target.datasetId === draft.id);
			const patch = (value) => setDraft((current) => ({
				...current,
				...value
			}));
			const updateField = (name, value) => setDraft((current) => ({
				...current,
				fields: (current.fields || []).map((field) => field.name === name ? {
					...field,
					...value
				} : field)
			}));
			const inspect = async () => {
				setBusy(true);
				setMessage(null);
				try {
					const data = await api("/semantic/datasets/inspect", {
						connectionId: draft.connectionId,
						database: draft.database,
						table: draft.table
					});
					setDraft((current) => ({
						...current,
						...mergeDatasetMetadata(current.fields, data.metadata)
					}));
					setMessage({
						kind: "ok",
						text: `已从数据库读取 ${data.metadata.fields.length} 个字段、字段类型和数据库注释`
					});
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				} finally {
					setBusy(false);
				}
			};
			const save = async () => {
				if (savePending.current || busy) return;
				setSubmitAttempted(true);
				setMessage(null);
				if (validationIssues.length) {
					focusIssue(validationIssues[0].field);
					return;
				}
				savePending.current = true;
				setBusy(true);
				setSaving(true);
				try {
					await onSaved((await api("/semantic/datasets/save", { dataset: draft })).dataset);
				} catch (error) {
					setMessage({
						kind: "error",
						text: `保存失败：${textError(error)}。已保留当前填写内容，请检查后重试。`
					});
					requestAnimationFrame(() => {
						serverMessageRef.current?.focus({ preventScroll: true });
						serverMessageRef.current?.scrollIntoView({
							block: "center",
							behavior: "auto"
						});
					});
				} finally {
					savePending.current = false;
					setBusy(false);
					setSaving(false);
				}
			};
			const remove = async () => {
				if (!globalThis.confirm(`删除数据集“${draft.name}”吗？`)) return;
				try {
					await api("/semantic/datasets/delete", { id: draft.id });
					await onDeleted();
				} catch (error) {
					if (/级联删除/.test(textError(error)) && globalThis.confirm(`${textError(error)}\n是否继续级联删除？`)) {
						await api("/semantic/datasets/delete", {
							id: draft.id,
							cascade: true
						});
						await onDeleted();
					} else setMessage({
						kind: "error",
						text: textError(error)
					});
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsl-page",
				ref: editorRef,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PageHeader, {
						eyebrow: editing ? "数据集详情" : "新建数据集",
						title: draft.name || "未命名数据集",
						description: "数据库原始字段、类型和注释只读保留；数据集名称、表用途、业务名称、自定义注释与统一语义概念可维护。",
						actions: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								onClick: onCancel,
								children: "返回列表"
							}),
							editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								icon: _deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16,
								onClick: () => setPreviewOpen(true),
								children: "浏览数据"
							}) : null,
							editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								kind: "danger",
								icon: _deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16,
								onClick: remove,
								children: "删除"
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								kind: "primary",
								icon: _deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16,
								disabled: busy,
								onClick: save,
								children: saving ? "保存中…" : busy ? "读取中…" : "保存数据集"
							})
						] })
					}),
					visibleIssues.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-validation-summary",
						role: "alert",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "暂未保存，请补充或检查以下内容：" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", { children: visibleIssues.map((issue) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => focusIssue(issue.field),
							children: issue.message
						}) }, issue.field)) })]
					}) : null,
					message ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						ref: serverMessageRef,
						tabIndex: -1,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Message, { value: message })
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsl-card dsl-identity",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: "dsl-form-note",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsl-required",
									children: "* 必填"
								}), " 项填写完整且字段读取成功后即可保存；表用途、业务名称、自定义注释和统一语义概念均为选填。"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-identity-grid",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: "数据集名称",
									required: true,
									error: validationErrors.name,
									hint: `最多 200 个字符`,
									messageId: `${validationId}-name`,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: "dsl-input",
										"aria-label": "数据集名称",
										required: true,
										maxLength: 200,
										"aria-invalid": Boolean(validationErrors.name),
										"aria-describedby": `${validationId}-name`,
										"data-dataset-field": "name",
										disabled: busy,
										value: draft.name || "",
										onChange: (event) => patch({ name: event.target.value }),
										placeholder: "例如：电表采集明细"
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: "表的业务作用（选填）",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
										className: "dsl-textarea",
										"aria-label": "表的业务作用",
										disabled: busy,
										value: draft.purpose || "",
										onChange: (event) => patch({ purpose: event.target.value }),
										placeholder: "说明这张表在业务中做什么、数据粒度和典型用途"
									})
								})]
							}),
							editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-source-strip",
								"data-dataset-field": "fields",
								tabIndex: -1,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: "来源连接" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: selectedConnection?.name || "连接已删除" })] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: "来源数据库" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: draft.database }) })] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: "来源表" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: draft.table }) })] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusPill, { children: "物理来源不可编辑" })
								]
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DatasetSourcePicker, {
								source,
								catalog: sourceCatalog,
								connections,
								disabled: busy,
								validationErrors,
								validationId
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-privacy",
								style: { marginTop: 14 },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDataOutline16, { size: 18 }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "数据库表注释" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: draft.tableComment || ((draft.fields || []).length ? "数据库未提供表注释" : "选择数据表后会自动读取表注释。") })] })]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-detail-tabs",
						role: "tablist",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: activeTab === "fields" ? "active" : "",
								onClick: () => setActiveTab("fields"),
								children: "字段定义"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: activeTab === "relations" ? "active" : "",
								onClick: () => setActiveTab("relations"),
								children: "关联关系"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: activeTab === "context" ? "active" : "",
								onClick: () => setActiveTab("context"),
								children: "大模型上下文"
							})
						]
					}),
					activeTab === "fields" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsl-section",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-section-title",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "字段定义" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "字段名、字段类型、数据库注释来自物理库；业务名称、自定义业务注释、统一语义概念和敏感标记可编辑。" })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsl-row",
									children: [editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										icon: _deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16,
										disabled: busy,
										onClick: inspect,
										children: "同步表结构"
									}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusPill, {
										kind: (draft.fields || []).length ? "success" : "neutral",
										children: !editing && source.loading === "fields" ? "正在自动读取字段…" : (draft.fields || []).length ? `已读取 ${draft.fields.length} 个字段` : "尚未读取字段"
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldCommentCopy, {
								fields: draft.fields || [],
								disabled: busy || !(draft.fields || []).length || !editing && (Boolean(source.loading) || Boolean(source.error) || !source.metadata || !sameDatasetSource(draft, source)),
								onApply: (fields) => patch({ fields })
							}, JSON.stringify([
								draft.id,
								draft.connectionId,
								draft.database,
								draft.table,
								draft.metadataVersion
							])),
							(draft.fields || []).length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dsl-field-wrap",
								style: { marginTop: 12 },
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
									className: "dsl-field-table",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "启用" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "数据库字段" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "字段类型" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "数据库注释" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "业务名称" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "自定义业务注释" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "统一语义概念" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "敏感" })
									] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: draft.fields.map((field) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											"aria-label": `启用${field.name}`,
											checked: field.enabled !== false,
											onChange: (event) => updateField(field.name, { enabled: event.target.checked })
										}) }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "dsl-field-code",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: field.name }), field.primaryKey ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusPill, { children: "主键" }) : null]
										}) }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
											className: "dsl-type",
											children: field.dataType
										}) }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsl-db-comment",
											children: field.databaseComment || "数据库未提供"
										}) }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: "dsl-input",
											"aria-label": `${field.name}的业务名称`,
											maxLength: COMMENT_COPY_TARGETS.businessName.maxLength,
											disabled: busy,
											value: field.businessName || "",
											onChange: (event) => updateField(field.name, { businessName: event.target.value })
										}) }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
											className: "dsl-textarea",
											"aria-label": `${field.name}的自定义业务注释`,
											maxLength: COMMENT_COPY_TARGETS.customComment.maxLength,
											disabled: busy,
											rows: 2,
											value: field.customComment || "",
											onChange: (event) => updateField(field.name, { customComment: event.target.value })
										}) }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
											className: "dsl-select",
											value: field.semanticConceptId || "",
											onChange: (event) => updateField(field.name, { semanticConceptId: event.target.value }),
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "",
												children: "未关联"
											}), state.semanticConcepts.map((concept) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: concept.id,
												children: concept.name
											}, concept.id))]
										}) }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											"aria-label": `敏感字段${field.name}`,
											checked: field.sensitive === true,
											onChange: (event) => updateField(field.name, { sensitive: event.target.checked })
										}) })
									] }, field.name)) })]
								})
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dsl-hint",
								style: { marginTop: 12 },
								children: source.loading === "fields" ? "正在读取所选表的字段定义，请稍候…" : source.error?.stage === "fields" ? "字段读取失败，请在数据来源区域重试；成功前不能保存数据集。" : "请按“来源连接 → 来源数据库 → 来源表”逐级选择，选表后自动读取字段，无需手填库名和表名。"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-fields-footer",
								style: { marginTop: 10 },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["数据库原始元数据：", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "只读保留" })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["业务语义：", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "可编辑并版本记录" })] })]
							})
						]
					}) : null,
					activeTab === "relations" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsl-section",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsl-section-title",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "已确认关系与识别候选" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "关系的新增、修改、删除和人工确认统一在所属业务拓扑中完成。" })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								kind: "primary",
								icon: _deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16,
								onClick: onOpenTopology,
								children: "打开关系拓扑"
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: { marginTop: 12 },
							children: relations.length ? relations.map((relation) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
								className: "dsl-card dsl-relation-card",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsl-query-head",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusPill, {
											kind: relation.status === "confirmed" ? "success" : relation.status === "candidate" ? "warning" : "neutral",
											children: STATUS[relation.status]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: CARDINALITY[relation.cardinality] })]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dsl-endpoint",
										style: { marginTop: 8 },
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: endpointText(relation.source, state.datasets) })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dsl-arrow",
										children: "↕"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dsl-endpoint",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: endpointText(relation.target, state.datasets) })
									})
								]
							}, relation.id)) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dsl-hint",
								children: "当前数据集还没有关系。"
							})
						})]
					}) : null,
					activeTab === "context" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsl-section",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsl-section-title",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "提供给大模型的受控语义上下文" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "保存数据集后可从列表统一预览，并在多个数据集之间切换。" })] })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsl-hint",
							style: { marginTop: 12 },
							children: "上下文由数据集用途、启用且非敏感的字段语义、统一语义概念，以及关系拓扑中已人工确认的关系自动生成；候选关系不会进入。"
						})]
					}) : null,
					previewOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DatasetPreview, {
						dataset: draft,
						onClose: () => setPreviewOpen(false)
					}) : null
				]
			});
		}
		function DatasetsPage({ preset, clearPreset, onOpenTopology }) {
			const [connections, setConnections] = (0, react.useState)([]);
			const [state, setState] = (0, react.useState)(EMPTY_STATE);
			const [loading, setLoading] = (0, react.useState)(true);
			const [versionReady, setVersionReady] = (0, react.useState)(true);
			const [message, setMessage] = (0, react.useState)(null);
			const [query, setQuery] = (0, react.useState)("");
			const [editor, setEditor] = (0, react.useState)(null);
			const [modal, setModal] = (0, react.useState)(null);
			const [syncing, setSyncing] = (0, react.useState)(false);
			const refresh = (0, react.useCallback)(async () => {
				setLoading(true);
				const [connectionResult, semanticResult] = await Promise.allSettled([api("/list"), api("/semantic/state")]);
				if (connectionResult.status === "fulfilled") setConnections(connectionResult.value.connections || []);
				else setMessage({
					kind: "error",
					text: textError(connectionResult.reason)
				});
				if (semanticResult.status === "fulfilled") {
					setState(semanticResult.value.state || EMPTY_STATE);
					setVersionReady(true);
				} else {
					const error = semanticResult.reason;
					setVersionReady(!error?.versionMismatch);
					setMessage({
						kind: "error",
						text: textError(error)
					});
				}
				setLoading(false);
			}, []);
			(0, react.useEffect)(() => {
				refresh();
			}, [refresh]);
			(0, react.useEffect)(() => {
				if (!preset || loading || editor) return;
				const connection = connections.find((item) => item.id === preset.connectionId) || connections[0];
				if (connection) setEditor({
					name: "",
					purpose: "",
					enabled: true,
					connectionId: connection.id,
					database: preset.database || connection.database || "",
					table: preset.table || "",
					fields: []
				});
				clearPreset();
			}, [
				preset,
				loading,
				connections,
				editor,
				clearPreset
			]);
			const beginNew = () => {
				const connection = connections[0];
				if (!connection) {
					setMessage({
						kind: "error",
						text: "请先在“连接管理”中创建数据库连接"
					});
					return;
				}
				setEditor({
					name: "",
					purpose: "",
					enabled: true,
					connectionId: connection.id,
					database: connection.database || "",
					table: "",
					fields: []
				});
			};
			const saved = async (dataset) => {
				await refresh();
				setEditor(null);
				setMessage({
					kind: "ok",
					text: `数据集“${dataset.name}”已保存，真实数据库元数据与自定义业务语义已合并。`
				});
			};
			const syncAll = async () => {
				setSyncing(true);
				try {
					for (const dataset of state.datasets) await api("/semantic/datasets/sync", { id: dataset.id });
					await refresh();
					setMessage({
						kind: "ok",
						text: `已同步 ${state.datasets.length} 个数据集的表结构`
					});
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				} finally {
					setSyncing(false);
				}
			};
			if (editor) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DatasetEditor, {
				initial: editor,
				connections,
				state,
				onCancel: () => setEditor(null),
				onSaved: saved,
				onDeleted: async () => {
					await refresh();
					setEditor(null);
					setMessage({
						kind: "ok",
						text: "数据集已删除"
					});
				},
				onOpenTopology
			});
			const fieldTotal = state.datasets.reduce((sum, dataset) => sum + (dataset.fields?.length || 0), 0);
			const annotated = state.datasets.reduce((sum, dataset) => sum + semanticCount(dataset), 0);
			const coverage = fieldTotal ? Math.round(annotated / fieldTotal * 100) : 0;
			const confirmed = state.relations.filter((item) => item.status === "confirmed").length;
			const candidate = state.relations.filter((item) => item.status === "candidate").length;
			const filtered = state.datasets.filter((dataset) => `${dataset.name}${dataset.table}${dataset.purpose}`.toLowerCase().includes(query.toLowerCase()));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsl-page",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PageHeader, {
						eyebrow: "统一数据语义层",
						title: "数据集",
						description: "把数据库的物理表翻译成大模型能稳定理解、可追溯、可关联的业务数据资产。",
						actions: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							kind: "primary",
							icon: _deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16,
							disabled: !connections.length || !versionReady,
							onClick: beginNew,
							children: "新建数据集"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Message, { value: message }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-summary-grid",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SummaryCard, {
								icon: _deepseek_ai_dsh_client_ui_primitives.IconDataOutline16,
								label: "数据集",
								value: `${state.datasets.length} 个`,
								note: `来自 ${new Set(state.datasets.map((item) => item.connectionId)).size} 个数据库连接`
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SummaryCard, {
								icon: _deepseek_ai_dsh_client_ui_primitives.IconListPenOutline16,
								label: "字段语义覆盖",
								value: `${coverage}%`,
								note: `${annotated} / ${fieldTotal} 个字段已解释`,
								tone: "success"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SummaryCard, {
								icon: _deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16,
								label: "表关联关系",
								value: `${state.relations.length} 条`,
								note: `${confirmed} 条确认，${candidate} 条待审核`,
								tone: "warning"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsl-card dsl-dataset-list",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsl-list-toolbar",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-search",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									"aria-label": "搜索数据集",
									placeholder: "搜索数据集、表名或业务含义",
									value: query,
									onChange: (event) => setQuery(event.target.value)
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-actions",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									onClick: () => setModal({ type: "concepts" }),
									children: "统一语义概念"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									icon: syncing ? _deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16 : _deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16,
									disabled: syncing || !state.datasets.length,
									onClick: syncAll,
									children: syncing ? "同步中…" : "同步表结构"
								})]
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsl-table-scroll",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsl-dataset-head",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "数据集与业务含义" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "来源" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "语义完整度" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "关系" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "更新时间" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})
									]
								}),
								filtered.map((dataset) => {
									const source = sourceLabel(dataset, connections);
									const datasetCoverage = dataset.fields?.length ? Math.round(semanticCount(dataset) / dataset.fields.length * 100) : 0;
									const relationCount = state.relations.filter((relation) => relation.source.datasetId === dataset.id || relation.target.datasetId === dataset.id).length;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsl-dataset-row",
										role: "button",
										tabIndex: 0,
										onClick: () => setEditor(JSON.parse(JSON.stringify(dataset))),
										onKeyDown: (event) => {
											if (event.key === "Enter") setEditor(JSON.parse(JSON.stringify(dataset)));
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "dsl-dataset-main",
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "dsl-dataset-icon",
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDataOutline16, {})
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: dataset.name }),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: dataset.table }),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: dataset.purpose || dataset.tableComment || "未填写表的业务作用" })
												] })]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "dsl-source-cell",
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: source.connection }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: source.path })]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "dsl-coverage",
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: [datasetCoverage, "%"] }),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: "dsl-progress",
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { width: `${datasetCoverage}%` } })
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", { children: [
														semanticCount(dataset),
														" / ",
														dataset.fields?.length || 0,
														" 个字段"
													] })
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "dsl-relation-count",
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLinkOutline16, { size: 14 }),
													relationCount,
													" 条"
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "dsl-updated",
												children: dataset.updatedAt ? new Date(dataset.updatedAt).toLocaleString("zh-CN", { hour12: false }) : "—"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												className: "dsl-row-action",
												"aria-label": `查看${dataset.name}`,
												type: "button",
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {})
											})
										]
									}, dataset.id);
								}),
								!filtered.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dsl-empty",
									children: loading ? "正在读取数据集…" : "没有找到匹配的数据集"
								}) : null
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsl-semantic-callout",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsl-callout-icon",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconApiOutline14, { size: 22 })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "大模型实际看到的不是建表语句，而是受控语义目录" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "每次调用只提供数据集用途、字段业务含义、统一语义概念，以及关系拓扑中的已确认关系和来源证据。" })] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								icon: _deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16,
								disabled: !state.datasets.length,
								onClick: () => setModal({ type: "context" }),
								children: "预览大模型上下文"
							})
						]
					}),
					modal?.type === "concepts" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConceptManager, {
						state,
						refresh,
						onClose: () => setModal(null)
					}) : null,
					modal?.type === "context" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DatasetContextModal, {
						state,
						connections,
						initialId: state.datasets[0]?.id,
						onClose: () => setModal(null)
					}) : null,
					modal?.type === "preview" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DatasetPreview, {
						dataset: modal.dataset,
						onClose: () => setModal(null)
					}) : null
				]
			});
		}
		function TopologyEditor({ topology, datasets, onClose, onSaved, onDeleted }) {
			const [draft, setDraft] = (0, react.useState)(() => JSON.parse(JSON.stringify(topology)));
			const [message, setMessage] = (0, react.useState)(null);
			const toggleDataset = (id) => setDraft((current) => ({
				...current,
				datasetIds: current.datasetIds.includes(id) ? current.datasetIds.filter((item) => item !== id) : [...current.datasetIds, id]
			}));
			const save = async () => {
				try {
					await onSaved((await api("/semantic/topologies/save", { topology: draft })).topology);
					onClose();
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				}
			};
			const remove = async () => {
				if (!draft.id || !globalThis.confirm(`删除关系拓扑“${draft.name}”吗？关系资产本身会保留。`)) return;
				try {
					await api("/semantic/topologies/delete", { id: draft.id });
					await onDeleted();
					onClose();
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Modal, {
				wide: true,
				eyebrow: "业务关系视图",
				title: draft.id ? "编辑关系拓扑" : "新建关系拓扑",
				description: "一个系统可以维护多个业务主题拓扑；把真正相关的表加入当前主题，无关表无需放在一起。",
				onClose,
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					draft.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						kind: "danger",
						icon: _deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16,
						onClick: remove,
						children: "删除拓扑"
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						onClick: onClose,
						children: "取消"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						kind: "primary",
						icon: _deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16,
						disabled: !draft.name.trim() || draft.datasetIds.length < 2,
						onClick: save,
						children: "保存拓扑"
					})
				] }),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-form-grid",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
							label: "拓扑名称",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "dsl-input",
								value: draft.name || "",
								onChange: (event) => setDraft({
									...draft,
									name: event.target.value
								}),
								placeholder: "例如：能源计量主题拓扑"
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
							label: "拓扑用途",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								className: "dsl-textarea",
								value: draft.purpose || "",
								onChange: (event) => setDraft({
									...draft,
									purpose: event.target.value
								}),
								placeholder: "说明这组表支持哪类业务分析"
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-section-title",
						style: { marginTop: 16 },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "选择当前拓扑包含的数据表" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "至少选择两张表；同一个数据集可以被多个业务拓扑复用。" })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(StatusPill, { children: [draft.datasetIds.length, " 张表"] })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsl-concepts",
						children: datasets.map((dataset) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: `dsl-concept ${draft.datasetIds.includes(dataset.id) ? "selected" : ""}`,
							style: { cursor: "pointer" },
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsl-row",
									style: { flexWrap: "nowrap" },
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: draft.datasetIds.includes(dataset.id),
											onChange: () => toggleDataset(dataset.id)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsl-dataset-icon",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDataOutline16, {})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: dataset.name }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("code", {
											style: {
												display: "block",
												fontSize: 9
											},
											children: [
												dataset.database,
												".",
												dataset.table
											]
										})] })
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: ["数据库表注释：", dataset.tableComment || "无"] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", { children: ["统一业务用途：", dataset.purpose || "未填写"] })
							]
						}, dataset.id))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: { marginTop: 12 },
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Message, { value: message })
					})
				]
			});
		}
		function RelationEditor({ relation, topology, state, onClose, onSaved }) {
			const topologyDatasets = topology.datasetIds.map((id) => state.datasets.find((item) => item.id === id)).filter(Boolean);
			const first = topologyDatasets[0];
			const second = topologyDatasets[1] || first;
			const [draft, setDraft] = (0, react.useState)(() => relation ? {
				id: relation.id,
				source: { ...relation.source },
				target: { ...relation.target },
				cardinality: relation.cardinality,
				status: relation.status === "confirmed" ? "confirmed" : "candidate",
				businessDescription: relation.businessDescription || ""
			} : {
				source: {
					datasetId: first?.id || "",
					field: first?.fields?.find((field) => field.enabled !== false)?.name || ""
				},
				target: {
					datasetId: second?.id || "",
					field: second?.fields?.find((field) => field.enabled !== false)?.name || ""
				},
				cardinality: "many-to-one",
				status: "candidate",
				businessDescription: ""
			});
			const [message, setMessage] = (0, react.useState)(null);
			const datasetFor = (side) => topologyDatasets.find((item) => item.id === draft[side].datasetId);
			const chooseDataset = (side, id) => {
				const dataset = topologyDatasets.find((item) => item.id === id);
				setDraft((current) => ({
					...current,
					[side]: {
						datasetId: id,
						field: dataset?.fields?.find((field) => field.enabled !== false)?.name || ""
					}
				}));
			};
			const chooseField = (side, field) => setDraft((current) => ({
				...current,
				[side]: {
					...current[side],
					field
				}
			}));
			const save = async () => {
				try {
					await api("/semantic/relations/save", { relation: {
						...draft,
						topologyId: topology.id
					} });
					await onSaved();
					onClose();
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				}
			};
			const endpointFields = (dataset) => (dataset?.fields || []).filter((field) => field.enabled !== false);
			const fieldLabel = (field) => {
				const concept = state.semanticConcepts.find((item) => item.id === field.semanticConceptId);
				return `${field.name}｜${field.dataType}｜数据库注释：${field.databaseComment || "无"}｜统一语义：${concept?.name || field.businessName || "未解释"}`;
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Modal, {
				wide: true,
				eyebrow: "关系资产维护",
				title: relation ? "编辑字段关系" : "手动添加字段关系",
				description: "端点选择同时展示数据库表、字段类型、数据库注释、业务名称和统一语义，便于人工判断。",
				onClose,
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					onClick: onClose,
					children: "取消"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					kind: "primary",
					icon: _deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16,
					disabled: !draft.source.datasetId || !draft.source.field || !draft.target.datasetId || !draft.target.field || draft.status === "confirmed" && !draft.businessDescription.trim(),
					onClick: save,
					children: "保存关系"
				})] }),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsl-form-grid",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
							label: "来源数据集 / 数据库表",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
								className: "dsl-select",
								value: draft.source.datasetId,
								onChange: (event) => chooseDataset("source", event.target.value),
								children: topologyDatasets.map((dataset) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
									value: dataset.id,
									children: [
										dataset.name,
										"｜",
										dataset.database,
										".",
										dataset.table,
										"｜",
										dataset.tableComment || dataset.purpose || "无注释"
									]
								}, dataset.id))
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
							label: "来源字段（类型｜数据库注释｜统一语义）",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
								className: "dsl-select",
								value: draft.source.field,
								onChange: (event) => chooseField("source", event.target.value),
								children: endpointFields(datasetFor("source")).map((field) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: field.name,
									children: fieldLabel(field)
								}, field.name))
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
							label: "目标数据集 / 数据库表",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
								className: "dsl-select",
								value: draft.target.datasetId,
								onChange: (event) => chooseDataset("target", event.target.value),
								children: topologyDatasets.map((dataset) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
									value: dataset.id,
									children: [
										dataset.name,
										"｜",
										dataset.database,
										".",
										dataset.table,
										"｜",
										dataset.tableComment || dataset.purpose || "无注释"
									]
								}, dataset.id))
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
							label: "目标字段（类型｜数据库注释｜统一语义）",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
								className: "dsl-select",
								value: draft.target.field,
								onChange: (event) => chooseField("target", event.target.value),
								children: endpointFields(datasetFor("target")).map((field) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: field.name,
									children: fieldLabel(field)
								}, field.name))
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
							label: "关联基数",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
								className: "dsl-select",
								value: draft.cardinality,
								onChange: (event) => setDraft({
									...draft,
									cardinality: event.target.value
								}),
								children: Object.entries(CARDINALITY).map(([id, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: id,
									children: label
								}, id))
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
							label: "确认状态",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								className: "dsl-select",
								value: draft.status,
								onChange: (event) => setDraft({
									...draft,
									status: event.target.value
								}),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "candidate",
									children: "候选待确认"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "confirmed",
									children: "人工确认"
								})]
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
							label: "关系依据与业务说明（人工确认必填）",
							span: true,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								className: "dsl-textarea",
								value: draft.businessDescription,
								onChange: (event) => setDraft({
									...draft,
									businessDescription: event.target.value
								}),
								placeholder: "说明为什么能关联、哪一端唯一，以及业务上用于什么分析"
							})
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: { marginTop: 12 },
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Message, { value: message })
				})]
			});
		}
		function TopologyGraph({ datasets, relations, concepts }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsl-graph",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsl-graph-grid",
					children: [datasets.map((dataset) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
						className: "dsl-node",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsl-node-head",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsl-dataset-icon",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDataOutline16, {})
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: dataset.name }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("code", { children: [
								dataset.database,
								".",
								dataset.table
							] })] })]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsl-node-fields",
							children: (dataset.fields || []).filter((field) => field.enabled !== false).slice(0, 6).map((field) => {
								const concept = concepts.find((item) => item.id === field.semanticConceptId);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsl-node-field",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: field.name }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: concept?.name || field.businessName || field.databaseComment || field.dataType })]
								}, field.name);
							})
						})]
					}, dataset.id)), relations.map((relation) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: `dsl-relation-ribbon ${relation.status === "candidate" ? "candidate" : ""}`,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
							endpointText(relation.source, datasets),
							" · ",
							CARDINALITY[relation.cardinality],
							" · ",
							endpointText(relation.target, datasets)
						] })
					}, relation.id))]
				})
			});
		}
		function RuleDetails({ rules }) {
			if (!rules) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
				className: "dsl-section dsl-rule-details",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: "查看关系识别规则说明" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						style: {
							color: "var(--dsl-muted)",
							fontSize: 10,
							lineHeight: 1.5
						},
						children: [
							"规则版本：",
							rules.version,
							"。字段对先经过硬阻断，再按可解释证据计分；达到阈值也只生成待人工确认候选。"
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsl-rule-list",
						children: Object.entries(rules.weights || {}).map(([name, score]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: name }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
							"最高 ",
							score,
							" 分"
						] }, name))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						className: "dsl-code",
						style: {
							overflow: "auto",
							fontSize: 9
						},
						children: JSON.stringify({
							thresholds: rules.thresholds,
							hardGates: rules.hardGates
						}, null, 2)
					})
				]
			});
		}
		function TopologyPage() {
			const [state, setState] = (0, react.useState)(EMPTY_STATE);
			const [models, setModels] = (0, react.useState)({
				available: false,
				providers: []
			});
			const [rules, setRules] = (0, react.useState)(null);
			const [selectedId, setSelectedId] = (0, react.useState)("");
			const [modal, setModal] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const [sampleValues, setSampleValues] = (0, react.useState)(false);
			const [message, setMessage] = (0, react.useState)(null);
			const refresh = (0, react.useCallback)(async () => {
				try {
					const data = await api("/semantic/state");
					setState(data.state || EMPTY_STATE);
					setSelectedId((current) => data.state.topologies.some((item) => item.id === current) ? current : data.state.topologies[0]?.id || "");
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				}
				try {
					setModels((await api("/semantic/models")).models || {
						available: false,
						providers: []
					});
				} catch {}
				try {
					setRules((await api("/semantic/rules")).rules || null);
				} catch {}
			}, []);
			(0, react.useEffect)(() => {
				refresh();
			}, [refresh]);
			const selected = state.topologies.find((item) => item.id === selectedId);
			const topologyRelations = selected ? selected.relationIds.map((id) => state.relations.find((item) => item.id === id)).filter(Boolean) : [];
			const topologyDatasets = selected ? selected.datasetIds.map((id) => state.datasets.find((item) => item.id === id)).filter(Boolean) : [];
			const identify = async (kind) => {
				if (!selected) return;
				if (kind === "llm") {
					setModal({ type: "batches" });
					return;
				}
				setBusy(true);
				setMessage(null);
				try {
					const data = await api(`/semantic/relations/${kind === "llm" ? "identify-llm" : "identify-rules"}`, {
						topologyId: selected.id,
						sampleValues
					});
					await refresh();
					setMessage({
						kind: "ok",
						text: kind === "llm" ? `大模型识别并经过确定性复核：新增 ${data.summary?.created || 0} 条、刷新 ${data.summary?.refreshed || 0} 条候选。` : `规则引擎识别完成：新增 ${data.summary?.created || 0} 条、刷新 ${data.summary?.refreshed || 0} 条候选。`
					});
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				} finally {
					setBusy(false);
				}
			};
			const confirm = async (relation) => {
				if (!relation.businessDescription?.trim()) {
					setModal({
						type: "relation",
						relation: {
							...relation,
							status: "confirmed"
						}
					});
					setMessage({
						kind: "error",
						text: "人工确认前请先补充关系依据与业务说明"
					});
					return;
				}
				try {
					await api("/semantic/relations/confirm", { id: relation.id });
					await refresh();
					setMessage({
						kind: "ok",
						text: "关系已人工确认，现在可以进入其他插件和大模型的语义上下文。"
					});
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				}
			};
			const reject = async (relation) => {
				try {
					await api("/semantic/relations/reject", { id: relation.id });
					await refresh();
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				}
			};
			const removeRelation = async (relation) => {
				if (!globalThis.confirm("删除这条关系吗？")) return;
				try {
					await api("/semantic/relations/delete", { id: relation.id });
					await refresh();
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				}
			};
			const modelConfig = state.modelConfig || {
				provider: "",
				model: ""
			};
			const modelOptions = ((models.providers?.find((item) => item.id === modelConfig.provider))?.models || []).map((item) => typeof item === "string" ? {
				id: item,
				label: item
			} : {
				id: item.id || item.name,
				label: item.name || item.id
			});
			const saveModel = async (patch) => {
				try {
					await api("/semantic/model/save", { modelConfig: {
						...modelConfig,
						...patch
					} });
					await refresh();
				} catch (error) {
					setMessage({
						kind: "error",
						text: textError(error)
					});
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsl-page dsl-page-wide",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PageHeader, {
						eyebrow: "统一数据语义层",
						title: "数据库关系拓扑",
						description: "按业务主题维护多个拓扑；规则引擎和大模型只生成候选，必须人工确认后其他插件才能使用。",
						actions: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							kind: "primary",
							icon: _deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16,
							disabled: state.datasets.length < 2,
							onClick: () => setModal({
								type: "topology",
								topology: {
									name: "",
									purpose: "",
									enabled: true,
									datasetIds: [],
									relationIds: []
								}
							}),
							children: "新建拓扑"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Message, { value: message }),
					state.topologies.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsl-card dsl-topology-manager",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-topology-primary",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsl-topology-icon",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, { size: 22 })
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsl-topology-copy",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: "当前业务主题拓扑" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
											"aria-label": "切换关系拓扑",
											value: selectedId,
											onChange: (event) => setSelectedId(event.target.value),
											children: state.topologies.map((topology) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
												value: topology.id,
												children: [
													topology.name,
													"｜",
													topology.datasetIds.length,
													" 张表｜",
													topology.relationIds.length,
													" 条关系"
												]
											}, topology.id))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [selected?.purpose || "未填写拓扑用途", "。切换后，下方识别范围、图谱和关系列表同步变化。"] })
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-topology-side",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsl-topology-stats",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: selected?.datasetIds.length || 0 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: "当前表" })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: topologyRelations.length }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: "当前关系" })] })]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dsl-actions",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										icon: _deepseek_ai_dsh_client_ui_primitives.IconEditOutline16,
										onClick: () => setModal({
											type: "topology",
											topology: JSON.parse(JSON.stringify(selected))
										}),
										children: "编辑当前拓扑"
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-topology-scope",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsl-topology-icon",
									style: {
										width: 34,
										height: 34
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, {})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: "以下操作只针对当前选中的关系拓扑" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: selected?.name }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: "规则引擎与大模型均只生成候选；可手动添加、编辑、确认或删除。" })
								] })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsl-actions",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											style: {
												display: "inline-flex",
												alignItems: "center",
												gap: 5,
												color: "var(--dsl-muted)",
												fontSize: 10
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: sampleValues,
												onChange: (event) => setSampleValues(event.target.checked)
											}), "使用脱敏值匹配"]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
											icon: _deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16,
											disabled: busy,
											onClick: () => identify("rules"),
											children: busy ? "识别中…" : "规则引擎识别"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
											icon: _deepseek_ai_dsh_client_ui_primitives.IconSparkle16,
											disabled: busy,
											onClick: () => identify("llm"),
											children: "大模型识别关系"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
											kind: "primary",
											icon: _deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16,
											disabled: !selected || selected.datasetIds.length < 2,
											onClick: () => setModal({
												type: "relation",
												relation: null
											}),
											children: "手动添加关系"
										})
									]
								})]
							})
						]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsl-section dsl-empty",
						children: "暂无关系拓扑。请先创建至少两个数据集，再按业务主题新建拓扑。"
					}),
					selected ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-query-head",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsl-legend",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {}), "已确认关系"] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: "candidate" }), "候选待确认"] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDataOutline16, { size: 14 }), "当前拓扑数据表"] })
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusPill, { children: selected.name })]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsl-topology-grid",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
							className: "dsl-section",
							style: { padding: 10 },
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TopologyGraph, {
								datasets: topologyDatasets,
								relations: topologyRelations,
								concepts: state.semanticConcepts
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("aside", {
							className: "dsl-inspector",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: "dsl-section",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsl-section-title",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "当前拓扑关系" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "端点同时标注数据集、数据库表和字段。" })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(StatusPill, {
										kind: "success",
										children: [topologyRelations.filter((item) => item.status === "confirmed").length, " 条已确认"]
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: { marginTop: 10 },
									children: topologyRelations.length ? topologyRelations.map((relation) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
										className: "dsl-card dsl-relation-card",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "dsl-query-head",
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(StatusPill, {
													kind: relation.status === "confirmed" ? "success" : relation.status === "candidate" ? "warning" : "neutral",
													children: [
														STATUS[relation.status],
														"｜",
														ORIGIN[relation.origin]
													]
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: CARDINALITY[relation.cardinality] })]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "dsl-endpoint",
												style: { marginTop: 8 },
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: endpointText(relation.source, state.datasets) })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "dsl-arrow",
												children: "↕"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "dsl-endpoint",
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: endpointText(relation.target, state.datasets) })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
												style: {
													color: "var(--dsl-muted)",
													fontSize: 9,
													lineHeight: 1.45
												},
												children: [
													"置信度 ",
													relation.confidence,
													"%｜",
													relation.businessDescription || "未填写关系依据"
												]
											}),
											relation.hardBlocks?.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "dsl-message dsl-message-error",
												children: relation.hardBlocks.join("；")
											}) : null,
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "dsl-actions",
												children: [
													relation.status !== "confirmed" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
														onClick: () => confirm(relation),
														children: "人工确认"
													}) : null,
													relation.status !== "rejected" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
														onClick: () => reject(relation),
														children: "拒绝"
													}) : null,
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
														icon: _deepseek_ai_dsh_client_ui_primitives.IconEditOutline16,
														onClick: () => setModal({
															type: "relation",
															relation
														}),
														children: "编辑"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
														kind: "danger",
														icon: _deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16,
														onClick: () => removeRelation(relation),
														children: "删除"
													})
												]
											}),
											relation.evidence?.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
												style: { marginTop: 8 },
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", {
													style: {
														cursor: "pointer",
														fontSize: 9
													},
													children: "查看可解释证据"
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
													style: {
														paddingLeft: 18,
														color: "var(--dsl-muted)",
														fontSize: 9
													},
													children: relation.evidence.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
														item.label,
														"：",
														item.score,
														"/",
														item.weight,
														" 分；",
														item.detail
													] }, item.code))
												})]
											}) : null
										]
									}, relation.id)) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dsl-hint",
										children: "暂无关系。可使用规则引擎、大模型辅助或手动添加。"
									})
								})]
							})
						})]
					})] }) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dsl-section",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-section-title",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "大模型识别配置" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: models.available ? "从 Harness（模型服务）读取真实供应商与模型；只发送元数据、语义和规则候选，不发送连接凭据。" : models.error || "当前未提供模型服务，仍可使用规则引擎。" })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusPill, {
									kind: models.available ? "success" : "neutral",
									children: models.available ? "模型服务可选择" : "仅规则引擎可用"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsl-form-grid",
								style: { marginTop: 10 },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: "模型服务提供方（Provider，供应商）",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										className: "dsl-select",
										value: modelConfig.provider || "",
										disabled: !models.available,
										onChange: (event) => {
											const firstModel = models.providers.find((item) => item.id === event.target.value)?.models?.[0];
											saveModel({
												provider: event.target.value,
												model: typeof firstModel === "string" ? firstModel : firstModel?.id || firstModel?.name || ""
											});
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "",
											children: "未选择"
										}), (models.providers || []).map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: item.id,
											children: item.name || item.id
										}, item.id))]
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: "模型（Model）",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										className: "dsl-select",
										value: modelConfig.model || "",
										disabled: !modelConfig.provider,
										onChange: (event) => void saveModel({ model: event.target.value }),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "",
											children: "未选择"
										}), modelOptions.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: item.id,
											children: item.label
										}, item.id))]
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dsl-hint",
								style: { marginTop: 10 },
								children: "大模型只能从当前拓扑的已有字段白名单中选择端点；输出还会经过类型、唯一性、值覆盖率等确定性复核，最终仍需人工确认。"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RuleDetails, { rules }),
					modal?.type === "batches" && selected ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RelationBatchModal, {
						ui: semanticPreviewUi,
						topology: selected,
						modelReady: Boolean(models.available && modelConfig.provider && modelConfig.model),
						sampleValues,
						onClose: () => setModal(null),
						onSaved: refresh
					}) : null,
					modal?.type === "topology" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TopologyEditor, {
						topology: modal.topology,
						datasets: state.datasets,
						onClose: () => setModal(null),
						onSaved: async (topology) => {
							await refresh();
							setSelectedId(topology.id);
							setMessage({
								kind: "ok",
								text: `关系拓扑“${topology.name}”已保存`
							});
						},
						onDeleted: refresh
					}) : null,
					modal?.type === "relation" && selected ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RelationEditor, {
						relation: modal.relation,
						topology: selected,
						state,
						onClose: () => setModal(null),
						onSaved: async () => {
							await refresh();
							setMessage({
								kind: "ok",
								text: "关系已保存；只有人工确认的关系会进入其他插件和大模型的语义上下文。"
							});
						}
					}) : null
				]
			});
		}
		function WorkspaceTabs({ active, onChange }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsl-tabs",
				role: "tablist",
				"aria-label": "数据库统一语义层功能",
				children: [
					{
						id: "connections",
						label: "连接管理",
						icon: _deepseek_ai_dsh_client_ui_primitives.IconDataOutline16
					},
					{
						id: "datasets",
						label: "数据集",
						icon: _deepseek_ai_dsh_client_ui_primitives.IconListPenOutline16
					},
					{
						id: "topology",
						label: "关系拓扑",
						icon: _deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16
					}
				].map(({ id, label, icon: Icon }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					role: "tab",
					"aria-selected": active === id,
					onClick: () => onChange(id),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, { size: 16 }), label]
				}, id))
			});
		}
		function DatabaseSemanticLayerSection() {
			usePluginStyles();
			const [tab, setTab] = (0, react.useState)("connections");
			const [datasetPreset, setDatasetPreset] = (0, react.useState)(null);
			const openDataset = (connectionId = "", database = "", table = "") => {
				setDatasetPreset({
					connectionId,
					database,
					table,
					key: Date.now()
				});
				setTab("datasets");
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsl-root",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsl-shell",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkspaceTabs, {
							active: tab,
							onChange: (next) => {
								setTab(next);
								if (next !== "datasets") setDatasetPreset(null);
							}
						}),
						tab === "connections" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConnectionsPage, { onCreateDataset: openDataset }) : null,
						tab === "datasets" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DatasetsPage, {
							preset: datasetPreset,
							clearPreset: () => setDatasetPreset(null),
							onOpenTopology: () => setTab("topology")
						}) : null,
						tab === "topology" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TopologyPage, {}) : null
					]
				})
			});
		}
		const inject = ["slots"];
		function apply(ctx) {
			const myPlugins = "my-plugins.section";
			const settings = "settings.section";
			let dispose = null;
			let target = null;
			const mount = () => {
				const next = ctx.slots.spec(myPlugins) ? myPlugins : settings;
				if (next === target && dispose) return;
				if (dispose) {
					try {
						dispose();
					} catch {}
					dispose = null;
				}
				target = next;
				if (!ctx.slots.spec(next)) return;
				dispose = ctx.slots.register({
					name: next,
					id: "database-connections",
					order: 100,
					label: "数据库连接"
				}, DatabaseSemanticLayerSection);
			};
			ctx.effect(() => {
				const offMyPlugins = ctx.slots.subscribe(myPlugins, mount);
				const offSettings = ctx.slots.subscribe(settings, mount);
				mount();
				return () => {
					offMyPlugins();
					offSettings();
					if (dispose) dispose();
				};
			}, "database-connections: section target");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map