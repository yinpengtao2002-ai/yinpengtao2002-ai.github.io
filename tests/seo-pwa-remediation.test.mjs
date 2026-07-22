import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(target) : [target];
  }));
  return nested.flat();
}

async function readPngSize(relativePath) {
  const image = await readFile(path.join(root, relativePath));
  assert.equal(image.subarray(1, 4).toString("ascii"), "PNG", `${relativePath} must be a PNG`);
  return {
    width: image.readUInt32BE(16),
    height: image.readUInt32BE(20),
  };
}

test("page metadata relies on the root brand suffix and publishes one explicit social image", async () => {
  const appFiles = await listFiles(path.join(root, "src/app"));
  const pageFiles = appFiles.filter((file) => file.endsWith("/page.tsx"));

  for (const file of pageFiles) {
    const source = await readFile(file, "utf8");
    const titleLiterals = [...source.matchAll(/title:\s*["'`](.*?)["'`]/g)].map((match) => match[1]);
    for (const title of titleLiterals) {
      assert.doesNotMatch(title, /Lucas Yin/, `${path.relative(root, file)} duplicates the root title suffix`);
    }
  }

  const layout = await readFile(path.join(root, "src/app/layout.tsx"), "utf8");
  assert.match(layout, /template:\s*"%s \| Lucas Yin \(殷鹏焘\)"/);
  assert.match(layout, /url:\s*"\/images\/og\/lucas-yin-financial-modeling-ai\.png"/);
  assert.match(layout, /width:\s*1200/);
  assert.match(layout, /height:\s*630/);
  assert.match(layout, /twitter:[\s\S]*images:/);
  assert.deepEqual(await readPngSize("public/images/og/lucas-yin-financial-modeling-ai.png"), {
    width: 1200,
    height: 630,
  });
});

test("sitemap omits unreliable modification dates instead of stamping every build", async () => {
  const sitemap = await readFile(path.join(root, "src/app/sitemap.ts"), "utf8");
  assert.doesNotMatch(sitemap, /lastModified:\s*new Date\(\)/);
  assert.doesNotMatch(sitemap, /:\s*new Date\(\)/);
  assert.match(sitemap, /item\.date\s*\?/);
  assert.doesNotMatch(
    sitemap,
    /url:\s*`\$\{BASE_URL\}\/finance\/finance-ai-assistant`,/,
    "the finance AI route already comes from financeContent",
  );
});

test("manifest uses dedicated safe-area maskable icons", async () => {
  const manifest = await readFile(path.join(root, "src/app/manifest.ts"), "utf8");
  assert.match(manifest, /site-icon-maskable-192\.png/);
  assert.match(manifest, /site-icon-maskable-512\.png/);
  assert.doesNotMatch(manifest, /site-icon-192\.png[\s\S]{0,160}purpose:\s*"maskable"/);
  assert.doesNotMatch(manifest, /site-icon-512\.png[\s\S]{0,160}purpose:\s*"maskable"/);
  assert.deepEqual(await readPngSize("public/site-icon-maskable-192.png"), { width: 192, height: 192 });
  assert.deepEqual(await readPngSize("public/site-icon-maskable-512.png"), { width: 512, height: 512 });
});
