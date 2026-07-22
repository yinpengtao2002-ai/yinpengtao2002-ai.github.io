import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("mobile navigation supports focus, Escape and the current-page state", async ({ page }) => {
  await page.goto("/finance/");

  const toggle = page.getByRole("button", { name: "打开网站导航" });
  await toggle.click();

  const closeToggle = page.getByRole("button", { name: "关闭网站导航" });
  await expect(closeToggle).toBeVisible();
  await expect(page.getByRole("link", { name: "首页" })).toBeFocused();
  await expect(page.getByRole("link", { name: "财务模型" })).toHaveAttribute("aria-current", "page");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "打开网站导航" })).toBeFocused();
});

test("mobile production routes do not overflow or log console errors", async ({ page }) => {
  const routes = [
    "/",
    "/finance/",
    "/finance/business-analysis/",
    "/finance/monthly-trend/",
    "/finance/sensitivity-analysis/",
    "/finance/margin-analysis/",
  ];

  for (const route of routes) {
    const consoleErrors: string[] = [];
    const recordConsoleError = (message: { text: () => string }) => {
      consoleErrors.push(message.text());
    };
    page.on("console", (message) => {
      if (message.type() === "error") recordConsoleError(message);
    });

    await page.goto(route);
    await page.waitForLoadState("networkidle");

    const viewport = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.innerWidth + 1);
    expect(consoleErrors, `${route} emitted console errors`).toEqual([]);

    page.removeAllListeners("console");
  }
});
