const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || "playwright");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const chrome = process.env.PLAYWRIGHT_CHROME || undefined;
const baseUrl = process.env.SEMANTIC_HARNESS_URL || "http://127.0.0.1:3081/";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const browser = await chromium.launch({ headless: true, ...(chrome ? { executablePath: chrome } : {}) });
  const page = await browser.newPage({ viewport: { width: 1500, height: 980 } });
  const consoleErrors = [];
  const pageErrors = [];
  const failures = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("response", (response) => {
    if (response.status() >= 400) failures.push([response.status(), response.url()]);
  });

  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await page.getByText("我的插件", { exact: true }).click();
    await page.waitForTimeout(1_200);
    await page.getByRole("button", { name: "数据库连接", exact: true }).click();
    await page.getByRole("tab", { name: "连接管理", exact: true }).waitFor({ timeout: 15_000 });
    await page.waitForTimeout(1_000);
    failures.length = 0;
    consoleErrors.length = 0;

    for (const tab of ["连接管理", "数据集", "关系拓扑"]) {
      assert((await page.getByRole("tab", { name: tab, exact: true }).count()) === 1, `缺少页签：${tab}`);
    }

    let body = await page.locator("body").innerText();
    assert(!body.includes("ems_betai"), "连接用户名不应显示在页面");
    assert(!body.includes("大模型就绪度") && !body.includes("大模型可用"), "已删除的就绪度文案不应出现");
    assert((await page.getByRole("button", { name: "保存连接", exact: true }).count()) === 1, "缺少保存连接按钮");
    assert((await page.getByRole("button", { name: "测试连接", exact: true }).count()) === 1, "缺少测试连接按钮");
    await page.screenshot({ path: path.join(root, "qa-connections.png"), fullPage: true });

    await page.getByText("uat mysql数据库", { exact: true }).click();
    await page.waitForTimeout(300);
    const usernameInput = page.locator('label:has-text("新用户名") + input');
    const passwordInput = page.locator('input[type="password"]');
    assert((await usernameInput.count()) === 1 && (await usernameInput.inputValue()) === "", "编辑连接不得回显用户名");
    assert((await passwordInput.count()) === 1 && (await passwordInput.inputValue()) === "", "编辑连接不得回显密码");
    assert((await page.getByRole("button", { name: "创建数据集", exact: true }).count()) === 1, "缺少创建数据集按钮");

    await page.getByRole("tab", { name: "数据集", exact: true }).click();
    await page.getByRole("heading", { name: "数据集", exact: true }).waitFor({ timeout: 10_000 });
    assert((await page.getByRole("button", { name: "统一语义概念", exact: true }).count()) === 1, "缺少统一语义概念按钮");
    assert((await page.getByRole("button", { name: "预览语义上下文", exact: true }).count()) === 1, "缺少预览语义上下文按钮");
    assert((await page.getByRole("button", { name: "新建数据集", exact: true }).count()) === 1, "缺少新建数据集按钮");
    await page.screenshot({ path: path.join(root, "qa-datasets-empty.png"), fullPage: true });

    await page.getByRole("button", { name: "新建数据集", exact: true }).click();
    await page.getByText("新建数据集", { exact: true }).waitFor({ timeout: 10_000 });
    assert((await page.getByText("字段类型", { exact: true }).count()) === 0, "未读取字段前不应显示伪造字段表");
    assert((await page.getByText("读取 / 刷新数据库字段", { exact: true }).count()) === 1, "缺少读取字段按钮");
    await page.screenshot({ path: path.join(root, "qa-dataset-editor.png"), fullPage: true });
    await page.getByRole("button", { name: "返回列表", exact: true }).click();

    await page.getByRole("tab", { name: "关系拓扑", exact: true }).click();
    await page.getByRole("heading", { name: "数据库关系拓扑", exact: true }).waitFor({ timeout: 10_000 });
    body = await page.locator("body").innerText();
    assert(body.includes("多个拓扑"), "缺少多拓扑说明");
    assert(body.includes("规则引擎"), "缺少规则引擎说明");
    assert(body.includes("人工确认"), "缺少人工确认说明");
    assert(!body.includes("大模型就绪度") && !body.includes("大模型可用"), "拓扑页面仍有已删除文案");
    await page.screenshot({ path: path.join(root, "qa-topology-empty.png"), fullPage: true });

    await page.setViewportSize({ width: 900, height: 720 });
    await page.waitForTimeout(500);
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      "窄窗口出现页面级横向滚动",
    );
    await page.screenshot({ path: path.join(root, "qa-topology-narrow.png"), fullPage: true });

    assert(pageErrors.length === 0, `页面脚本错误：${JSON.stringify(pageErrors)}`);
    const pluginFailures = failures.filter((item) => item[1].includes("/api/database-connections"));
    assert(pluginFailures.length === 0, `数据库插件请求失败：${JSON.stringify(pluginFailures)}`);
    assert(consoleErrors.length === 0, `浏览器控制台错误：${JSON.stringify(consoleErrors)}`);
    console.log("BROWSER_QA_OK");
    console.log(JSON.stringify({ pluginFailures, pageErrors, consoleErrors }));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
