import { expect, test } from "@playwright/test";

test("goalkeeper starts when opened from the thinking lab", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/thinking-lab/");
  await page.locator('a[href="/tools/goalkeeper-landscape/"]').click();
  await page.waitForURL("**/tools/goalkeeper-landscape/");
  await expect.poll(
    () => page.evaluate(() => Boolean(Reflect.get(window, "goalkeeperRuntime"))),
    { timeout: 30_000 },
  ).toBe(true);
  await expect(page.locator("canvas").first()).toBeVisible();
  expect(errors).toEqual([]);
});

for (const entry of ["direct", "catalog"] as const) {
  test(`profit structure unlocks and renders charts after ${entry} entry`, async ({ page }) => {
    // Only replace server access verification; the browser engine and charts are real.
    await page.route("**/api/private-tool-access/", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token: "e2e-private-token",
        expiresAt: new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
      }),
    }));
    if (entry === "direct") {
      await page.goto("/finance/profit-structure/");
    } else {
      await page.goto("/finance/");
      await page.locator('a[href="/finance/profit-structure/"]').click();
      await page.waitForURL("**/finance/profit-structure/");
    }

    await page.getByPlaceholder("输入内测密钥").fill("e2e-access-code");
    await page.getByRole("button", { name: "进入", exact: true }).click();
    await expect(page.locator("#profit-structure-message-area")).toContainText("示例数据", { timeout: 30_000 });
    await expect(page.locator(".profit-structure-tool .js-plotly-plot").first()).toBeVisible();
    await expect(page.locator(".engine-load-error")).toHaveCount(0);
  });
}

for (const width of [1280, 390]) {
  test(`monthly controls and uploaded filters survive re-entry at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/finance/");
    await page.locator('a[href="/finance/monthly-trend/"]').click();
    await expect(page.locator(".monthly-trend-tool .js-plotly-plot")).toHaveCount(6);
    if (width === 390) await page.getByRole("button", { name: "展开控制台", exact: true }).click();

    await page.locator("#monthly-file-input").setInputFiles({
      name: "reentry.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("\uFEFF" + [
        "月份,大区,国家,销量,净收入,成本,边际",
        "2026-01,欧洲,法国,10,1000,-600,400",
        "2026-01,亚洲,日本,20,1600,-1000,600",
        "2026-02,欧洲,法国,12,1200,-720,480",
        "2026-02,亚洲,日本,22,1760,-1100,660",
      ].join("\n")),
    });
    const status = page.locator("#monthly-data-status");
    await expect(status).toContainText("reentry.csv · 4 行");
    await page.getByLabel("关注指标").selectOption("边际");
    const regionFilter = page.locator('.excel-filter-shell[data-filter-dimension="大区"]');
    await regionFilter.locator(".excel-filter-trigger").click();
    await regionFilter.getByRole("button", { name: "清空", exact: true }).click();
    await regionFilter.getByRole("menuitemcheckbox", { name: "欧洲", exact: true }).click();
    await regionFilter.getByRole("button", { name: "应用", exact: true }).click();
    await expect(status).toContainText("reentry.csv · 2 行 · 1 个筛选");
    if (width === 390) await page.getByRole("button", { name: "收起控制台", exact: true }).click();

    await page.getByRole("button", { name: "返回上一页" }).click();
    await page.waitForURL("**/finance/");
    await expect(page.locator(".monthly-trend-tool")).toHaveCount(0);
    await page.locator('a[href="/finance/monthly-trend/"]').click();
    await expect(page.locator(".monthly-trend-tool .js-plotly-plot")).toHaveCount(6);
    if (width === 390) await page.getByRole("button", { name: "展开控制台", exact: true }).click();

    await expect(page.getByLabel("关注指标")).toHaveValue("边际");
    await expect(page.locator("#monthly-metric-select option")).toHaveCount(3);
    await regionFilter.locator(".excel-filter-trigger").click();
    await expect(regionFilter.getByRole("menuitemcheckbox", { name: /欧洲/ })).toHaveAttribute("aria-checked", "true");
    await expect(regionFilter.getByRole("menuitemcheckbox", { name: /亚洲/ })).toHaveAttribute("aria-checked", "false");
    await regionFilter.locator(".excel-filter-trigger").click();
    await expect(status).toContainText("reentry.csv · 2 行 · 1 个筛选");
    await page.getByRole("button", { name: "重置筛选", exact: true }).click();
    await expect(status).toContainText("reentry.csv · 4 行");
    await expect(status).not.toContainText("个筛选");
  });
}
