import { expect, test } from "@playwright/test";

test("production pages send the hardened content security policy", async ({ page }) => {
  const response = await page.goto("/");
  const policy = response?.headers()["content-security-policy"] ?? "";

  expect(policy).toContain("script-src-attr 'none'");
  expect(policy).toContain("connect-src 'self'");
  expect(policy).not.toContain("'unsafe-eval'");
});

test("private srcDoc remains script-capable without same-origin privileges", async ({ page }) => {
  await page.route("**/api/private-tool-access/", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: "e2e-private-token" }),
    });
  });
  await page.route("**/api/lucas/stock-decision*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html><body><p>isolated private tool</p></body></html>",
    });
  });

  await page.goto("/Lucas/");
  await page.getByLabel("访问码").fill("e2e-access-code");
  await page.getByRole("button", { name: "进入" }).click();

  const privateFrame = page.getByTitle("股票决策系统");
  await expect(privateFrame).toHaveAttribute("sandbox", "allow-scripts");
  await expect(privateFrame).not.toHaveAttribute("sandbox", /allow-same-origin/);
});
