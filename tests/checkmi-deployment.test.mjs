import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import config from "../next.config.ts";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("checkmi is a direct standalone route with scoped interface access and no indexing", async () => {
  const rewrites = await config.rewrites();
  assert.deepEqual(rewrites.find((rule) => rule.source === "/checkmi/"), {
    source: "/checkmi/", destination: "/checkmi/index.html",
  });
  assert.equal(config.trailingSlash, true);
  const rules = await config.headers();
  const scoped = rules.find((rule) => rule.source === "/checkmi/:path*");
  const global = rules.find((rule) => rule.source === "/:path*");
  assert.ok(rules.indexOf(scoped) > rules.indexOf(global));
  const csp = (rule) => rule.headers.find((header) => header.key === "Content-Security-Policy").value;
  assert.match(csp(scoped), /connect-src 'self' https:/);
  assert.match(csp(global), /connect-src 'self';/);
  assert.match(csp(scoped), /frame-ancestors 'none'/);
  assert.match(scoped.headers.find((header) => header.key === "X-Robots-Tag").value, /noindex/);
  for (const file of ["src/app/page.tsx", "src/app/sitemap.ts", "src/components/layout/SiteNavigation.tsx", "src/lib/finance/model-registry.json", "src/lib/data/generated/content.ts"]) {
    assert.doesNotMatch(await read(file), /\/checkmi\b/, `No listing entry in ${file}`);
  }
});

test("checkmi release contains matching assets, downloadable template and business document", async () => {
  const release = JSON.parse(await read("docs/checkmi-release.json"));
  assert.equal(release.basePath, "/checkmi/");
  assert.match(release.sourceCommit, /^[a-f0-9]{40}$/);
  for (const file of release.files) {
    const data = await readFile(new URL(`../public/checkmi/${file.file}`, import.meta.url));
    assert.equal(data.length, file.bytes);
    assert.equal(createHash("sha256").update(data).digest("hex"), file.sha256, file.file);
  }
  const html = await read("public/checkmi/index.html");
  const paths = [...html.matchAll(/(?:src|href)="(\/checkmi\/[^"?#]+)"/g)].map((match) => match[1].slice("/checkmi/".length));
  assert.ok(paths.some((file) => file.endsWith(".js")));
  assert.ok(paths.some((file) => file.endsWith(".css")));
  for (const file of paths) assert.ok(release.files.some((entry) => entry.file === file));
  const bundle = await read(`public/checkmi/${release.files.find((file) => file.file.endsWith(".js")).file}`);
  assert.ok(bundle.includes("基础数据生成损益"));
  assert.ok(bundle.includes("当前项目未配置 Mapping 规则"));
  assert.ok(bundle.includes("应用生成的损益"));
  assert.ok(bundle.includes("上传基础数据文件"));
  assert.ok(bundle.includes("本项目车型"));
  assert.ok(!bundle.includes("多个车型、版型和年度"));
  assert.ok(!bundle.includes("待接入系统规则"));
  assert.ok(bundle.includes("./templates/车型损益表_空白公式模板.xlsx"));
  assert.ok(bundle.includes("./业务逻辑说明.md"));
  const template = await readFile(new URL("../public/checkmi/templates/经营测算_标准底表.xlsx", import.meta.url));
  // Keep the old workbook artifact compatible without advertising a new-plan path.
  assert.ok(release.files.some(file => file.file === "templates/经营测算_标准底表.xlsx"));
  assert.equal(template.subarray(0, 2).toString(), "PK");
  const pnlPath = "templates/车型损益表_空白公式模板.xlsx";
  assert.ok(release.files.some(file => file.file === pnlPath));
  const pnl = await readFile(new URL(`../public/checkmi/${pnlPath}`, import.meta.url));
  assert.equal(pnl.subarray(0, 2).toString(), "PK");
  const businessRules = await read("public/checkmi/业务逻辑说明.md");
  assert.match(businessRules, /三行浅色高亮文字/);
  assert.match(businessRules, /加权售价\/BOM/);
  assert.match(businessRules, /科目与数据/);
  assert.match(businessRules, /最细规则优先/);
  assert.match(businessRules, /一个测算项目只对应一款车型/);
  assert.match(businessRules, /模板不包含车型列/);
  assert.match(businessRules, /Modena、Lemans、Kunlun、Ultra/);
  assert.match(businessRules, /普通测算用户不上传 Mapping/);
  assert.match(businessRules, /总额分摊/);
  assert.match(businessRules, /不展示投资总额/);
  assert.match(businessRules, /下载项目 \/ 打开项目/);
  assert.match(businessRules, /现金流是完整项目的独立上传快照/);
});

test("checkmi publishes lazy Excel-export imports alongside the entry bundle", async () => {
  const release = JSON.parse(await read("docs/checkmi-release.json"));
  const files = new Set(release.files.map(entry => entry.file));
  let dynamicImports = 0;
  for (const file of files) {
    if (!file.endsWith(".js")) continue;
    const code = await read(`public/checkmi/${file}`);
    for (const match of code.matchAll(/import\(["'`](\.\/[a-zA-Z0-9._-]+\.js)["'`]\)/g)) {
      dynamicImports++;
      assert.ok(files.has(`assets/${match[1].slice(2)}`), `Unpublished dynamic import in ${file}: ${match[1]}`);
    }
  }
  assert.ok(dynamicImports > 0, "Excel generation remains lazy-loaded");
});
