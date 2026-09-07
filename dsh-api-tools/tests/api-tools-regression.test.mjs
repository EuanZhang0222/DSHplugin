import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const packageRoot = new URL("../", import.meta.url);

async function loadClientHelpers() {
  let captured;
  const window = {
    __ModuleLoader__: {
      load(spec) {
        captured = spec.factory((name) => {
          if (name !== "react") throw new Error(`Unexpected client dependency: ${name}`);
          return {
            createElement() {},
            useState() {},
            useEffect() {},
            useCallback(value) { return value; },
            useRef() { return { current: null }; },
            Fragment: Symbol("Fragment")
          };
        });
      }
    }
  };
  let source = await readFile(new URL("lib/client.js", packageRoot), "utf8");
  source = source.replace(
    "    exports.apply = apply;",
    "    exports.__test = { parseCurlCommand, buildSample };\n    exports.apply = apply;"
  );
  vm.runInNewContext(source, { window, URL, Blob, BigInt, Number, JSON, Object, String, Array, Symbol, console });
  return captured.__test;
}

function createSchemaStub() {
  const schema = {};
  schema.min = () => schema;
  schema.default = () => schema;
  return schema;
}

async function loadHostHelpers(overrides = {}) {
  const schema = createSchemaStub();
  const z = {
    object: () => schema,
    string: () => schema,
    number: () => schema,
    boolean: () => schema,
    union: () => schema,
    array: () => schema,
    lazy: () => schema,
    const: () => schema
  };
  let source = await readFile(new URL("lib/index.js", packageRoot), "utf8");
  source = source
    .replace(/^import .*;\r?\n/gm, "")
    .replace(
      "export { apply };",
      "globalThis.__hostTest = { coerceParamValue, stringifyJsonBody, toParamSchema, buildTool, callApi };"
    );
  const sandbox = {
    z,
    settingsNamespace: (value) => value,
    defineTool: (value) => value,
    credentialRef: (value) => value,
    randomUUID: () => "test-id",
    URL,
    BigInt,
    Number,
    JSON,
    Object,
    String,
    Array,
    Symbol,
    Set,
    Map,
    Buffer,
    AbortController,
    fetch,
    setTimeout,
    clearTimeout,
    ...overrides
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.__hostTest;
}

test("Postman cURL without a scheme imports and preserves 19-digit identifiers", async () => {
  const { parseCurlCommand, buildSample } = await loadClientHelpers();
  const nbsp = "\u00a0";
  const slash = "\\";
  const curl = [
    `curl${nbsp}--location${nbsp}--request${nbsp}POST${nbsp}'uat.poros.getech.cn/api/cms-cloud-service/energyUsedInfo/queryLocalIdUsedAndKpi' ${slash}`,
    `${slash}--header${nbsp}'authorization:${nbsp}bearer${nbsp}test-token' ${slash}`,
    `${slash}--header${nbsp}'Content-Type:${nbsp}application/json' ${slash}`,
    `${slash}--data-raw${nbsp}'{"energyCode":1605397587,"topParentId":1889923823735418881,"locationId":1930554391458054145,"startDate":"2025-12-01","endDate":"2026-01-01","resultDateType":3}'`
  ].join("\n");

  const parsed = parseCurlCommand(curl);
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.method, "POST");
  assert.equal(parsed.url, "https://uat.poros.getech.cn/api/cms-cloud-service/energyUsedInfo/queryLocalIdUsedAndKpi");
  assert.equal(parsed.urlWasNormalized, true);
  assert.equal(parsed.auth, "bearer");
  assert.equal(parsed.preservedIntegerCount, 2);

  const byName = Object.fromEntries(parsed.params.map((param) => [param.name, param]));
  assert.equal(byName.topParentId.type, "number");
  assert.equal(byName.topParentId.defaultValue, "1889923823735418881");
  assert.equal(byName.locationId.defaultValue, "1930554391458054145");
  const sample = JSON.parse(buildSample({ params: parsed.params }));
  assert.equal(sample.energyCode, 1605397587);
  assert.equal(sample.topParentId, "1889923823735418881");
  assert.equal(sample.locationId, "1930554391458054145");
});

test("absolute cURL URLs and ordinary numbers keep their original behavior", async () => {
  const { parseCurlCommand } = await loadClientHelpers();
  const parsed = parseCurlCommand("curl -X POST 'http://127.0.0.1:43210/echo' -d '{\"count\":3}'");
  assert.equal(parsed.url, "http://127.0.0.1:43210/echo");
  assert.equal(parsed.urlWasNormalized, false);
  assert.equal(parsed.preservedIntegerCount, 0);
  assert.equal(parsed.params[0].defaultValue, "3");
});

test("host serializes exact integer literals as unquoted JSON numbers", async () => {
  const { coerceParamValue, stringifyJsonBody, toParamSchema } = await loadHostHelpers();
  const parameter = {
    name: "locationId",
    type: "number",
    required: true,
    description: "位置标识",
    defaultValue: "1930554391458054145",
    children: []
  };
  const value = coerceParamValue(parameter, parameter.defaultValue);
  assert.equal(typeof value, "bigint");
  assert.equal(value.toString(), parameter.defaultValue);
  assert.equal(
    stringifyJsonBody({ energyCode: 1605397587, locationId: value }),
    '{"energyCode":1605397587,"locationId":1930554391458054145}'
  );
  assert.equal(toParamSchema(parameter).type, "string");
});

test("host refuses an already-rounded unsafe JavaScript number", async () => {
  const { coerceParamValue } = await loadHostHelpers();
  const parameter = { name: "locationId", type: "number", children: [] };
  assert.throws(
    () => coerceParamValue(parameter, 1930554391458054145),
    /安全整数范围/
  );
});

test("parameter schemas compile with the real installed DSH tool compiler", async () => {
  const { defineTool } = await import(process.env.DSH_TOOLS_MODULE || "@deepseek-ai/dsh-tools");
  const { buildTool } = await loadHostHelpers({ defineTool });
  const tool = buildTool({toolId:"used_details", purpose:"用能明细", method:"POST", url:"http://localhost/", auth:"none", params:[{name:"id",type:"number",source:"agent",required:true,defaultValue:"1930554391458054145"}]}, {});
  assert.equal(tool.name, "used_details");
});

async function withResponseServer(handler, run) {
  const { createServer } = await import("node:http");
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const { callApi } = await loadHostHelpers();
  const api = {method:"GET", url:`http://127.0.0.1:${server.address().port}`, params:[], auth:"none", maxResponseBytes:1024};
  try { await run((signal, timeout=2000, overrides={})=>callApi({...api,...overrides}, {}, {}, signal, timeout)); }
  finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
}

test("timeout covers a response body stalled after headers", async () => {
  await withResponseServer((_req,res)=>{res.writeHead(200);res.write('{');}, async call=>{
    const start=Date.now(); await assert.rejects(call(undefined,100), /abort/i); assert.ok(Date.now()-start<1500);
  });
});

test("caller cancellation remains connected after headers", async () => {
  const controller=new AbortController();
  await withResponseServer((_req,res)=>{res.writeHead(200);res.write('{');setTimeout(()=>controller.abort(),30);}, async call=>{
    await assert.rejects(call(controller.signal), /abort/i);
  });
});

test("streaming size limit rejects before the response completes", async () => {
  await withResponseServer((_req,res)=>{res.writeHead(200);res.write('x'.repeat(2048));}, async call=>{
    await assert.rejects(call(), /响应过大/);
  });
});

test("normal JSON response still returns complete data", async () => {
  await withResponseServer((_req,res)=>res.end('{"code":0,"value":123}'), async call=>{
    const result=await call();assert.equal(result.status,200);assert.equal(result.data.value,123);
    assert.equal(Object.hasOwn(result, "error"), false);
    assert.deepEqual(JSON.parse(JSON.stringify(result)), { ...result, data: { ...result.data } });
  });
});

test("HTTP errors return valid JSON without an undefined data field", async () => {
  await withResponseServer((_req,res)=>{res.writeHead(403);res.end('{"message":"denied"}');},async call=>{
    const result=await call();assert.equal(result.ok,false);assert.equal(Object.hasOwn(result,"data"),false);
    assert.equal(result.error.message,"denied");
  });
});
