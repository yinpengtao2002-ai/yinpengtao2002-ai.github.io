import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { access, mkdir, mkdtemp, readdir, readFile, stat, writeFile } from "node:fs/promises";

const eslintConfig = await readFile(new URL("../eslint.config.mjs", import.meta.url), "utf8");
const nextConfig = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");
const packageLockJson = await readFile(new URL("../package-lock.json", import.meta.url), "utf8");
const tsconfigJson = await readFile(new URL("../tsconfig.json", import.meta.url), "utf8");
const vendorScript = await readFile(new URL("../scripts/prepare-vendor-assets.mjs", import.meta.url), "utf8");
const xlsxVendorBundle = await readFile(new URL("../public/vendor/xlsx/xlsx.full.min.js", import.meta.url), "utf8");
const perspectiveShim = await readFile(
  new URL("../src/app/finance/perspective-bi/perspective-extensions-shim.js", import.meta.url),
  "utf8"
).catch(() => "");
const notionSyncScript = await readFile(new URL("../scripts/sync-notion-content.mjs", import.meta.url), "utf8").catch(() => "");
const packageData = JSON.parse(packageJson);
const packageLockData = JSON.parse(packageLockJson);
const execFileAsync = promisify(execFile);

async function readRequiredProjectFile(path) {
  try {
    return await readFile(new URL(path, import.meta.url), "utf8");
  } catch {
    assert.fail(`${path} should exist`);
  }
}

async function assertIconAsset(path) {
  let fileInfo;

  try {
    fileInfo = await stat(new URL(path, import.meta.url));
  } catch {
    assert.fail(`${path} should exist`);
  }

  assert.ok(fileInfo.size > 1024, `${path} should be a real icon asset`);
}

async function assertProjectFileMissing(path) {
  try {
    await stat(new URL(path, import.meta.url));
  } catch {
    return;
  }

  assert.fail(`${path} should be removed instead of kept as unreferenced legacy code`);
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function collectSourceFiles(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directoryUrl);

    if (entry.isDirectory()) {
      return collectSourceFiles(entryUrl);
    }

    return /\.(?:ts|tsx)$/.test(entry.name) ? [entryUrl] : [];
  }));

  return files.flat();
}

test("eslint ignores project-local worktrees", () => {
  assert.ok(eslintConfig.includes('".worktrees/**"'));
});

test("eslint ignores local Vercel build output", () => {
  assert.ok(eslintConfig.includes('".vercel/**"'));
});

test("local generated artifact cleanup command removes only ignored work artifacts", async () => {
  assert.match(packageJson, /"clean:artifacts":\s*"node scripts\/clean-local-artifacts\.mjs"/);

  const cleanupScript = await readRequiredProjectFile("../scripts/clean-local-artifacts.mjs");
  assert.match(cleanupScript, /output/);
  assert.match(cleanupScript, /\.playwright-cli/);
  assert.match(cleanupScript, /tsconfig\.tsbuildinfo/);

  const fixtureRoot = await mkdtemp(join(tmpdir(), "lucas-site-clean-"));
  await mkdir(join(fixtureRoot, "output", "playwright"), { recursive: true });
  await mkdir(join(fixtureRoot, ".playwright-cli", "snapshots"), { recursive: true });
  await mkdir(join(fixtureRoot, "src"), { recursive: true });
  await writeFile(join(fixtureRoot, "output", "playwright", "debug.txt"), "debug output");
  await writeFile(join(fixtureRoot, ".playwright-cli", "snapshots", "trace.txt"), "trace output");
  await writeFile(join(fixtureRoot, "tsconfig.tsbuildinfo"), "compiler cache");
  await writeFile(join(fixtureRoot, "src", "keep.txt"), "keep me");

  const { stdout } = await execFileAsync(
    process.execPath,
    [new URL("../scripts/clean-local-artifacts.mjs", import.meta.url).pathname, "--root", fixtureRoot],
    { cwd: new URL("..", import.meta.url).pathname }
  );

  assert.match(stdout, /Removed output/);
  assert.match(stdout, /Removed \.playwright-cli/);
  assert.match(stdout, /Removed tsconfig\.tsbuildinfo/);
  assert.equal(await pathExists(join(fixtureRoot, "output")), false);
  assert.equal(await pathExists(join(fixtureRoot, ".playwright-cli")), false);
  assert.equal(await pathExists(join(fixtureRoot, "tsconfig.tsbuildinfo")), false);
  assert.equal(await pathExists(join(fixtureRoot, "src", "keep.txt")), true);
});

test("project exposes a manual Notion content sync command", () => {
  assert.match(packageJson, /"sync:notion":\s*"node scripts\/sync-notion-content\.mjs"/);
  assert.match(notionSyncScript, /NOTION_TOKEN/);
  assert.match(notionSyncScript, /NOTION_AI_DATABASE_ID/);
  assert.match(notionSyncScript, /NOTION_FINANCE_DATABASE_ID/);
  assert.match(notionSyncScript, /npm run gen/);
  assert.match(notionSyncScript, /--deploy/);
  assert.match(notionSyncScript, /git commit --allow-empty/);
  assert.match(notionSyncScript, /src\/lib\/data\/generated\/content\.ts/);
  assert.doesNotMatch(notionSyncScript, /NOTION_TOKEN=/);
});

test("site publishes explicit icons for mobile home-screen bookmarks", async () => {
  const layout = await readRequiredProjectFile("../src/app/layout.tsx");
  const manifest = await readRequiredProjectFile("../src/app/manifest.ts");

  assert.match(layout, /manifest:\s*"\/manifest\.webmanifest"/);
  assert.match(layout, /apple-icon\.png/);
  assert.match(layout, /site-icon-192\.png/);
  assert.match(layout, /site-icon-512\.png/);
  assert.match(manifest, /site-icon-192\.png/);
  assert.match(manifest, /site-icon-512\.png/);
  assert.match(manifest, /purpose:\s*"any"/);
  assert.match(manifest, /purpose:\s*"maskable"/);

  await assertIconAsset("../src/app/apple-icon.png");
  await assertIconAsset("../public/site-icon-192.png");
  await assertIconAsset("../public/site-icon-512.png");
});

test("legacy animation and hero dead code stays out of the app surface", async () => {
  const layoutBarrel = await readRequiredProjectFile("../src/components/layout/index.ts");

  assert.doesNotMatch(layoutBarrel, /Hero/);
  await assertProjectFileMissing("../src/components/ParticleField.tsx");
  await assertProjectFileMissing("../src/components/TypewriterText.tsx");
  await assertProjectFileMissing("../src/components/layout/Hero.tsx");
  await assertProjectFileMissing("../src/lib/animations.ts");
  await assertProjectFileMissing("../src/lib/config/animation.ts");
});

test("unused legacy UI primitives and feature shells stay removed", async () => {
  const globals = await readRequiredProjectFile("../src/app/globals.css");

  await assertProjectFileMissing("../src/components/feature/ArticleCard.tsx");
  await assertProjectFileMissing("../src/components/feature/BackButton.tsx");
  await assertProjectFileMissing("../src/components/feature/SectionCard.tsx");
  await assertProjectFileMissing("../src/components/feature/index.ts");

  await assertProjectFileMissing("../src/components/layout/PageLayout.tsx");
  await assertProjectFileMissing("../src/components/layout/Section.tsx");

  await assertProjectFileMissing("../src/components/ui/ArtifactCard.tsx");
  await assertProjectFileMissing("../src/components/ui/Badge.tsx");
  await assertProjectFileMissing("../src/components/ui/Button.tsx");
  await assertProjectFileMissing("../src/components/ui/Card.tsx");
  await assertProjectFileMissing("../src/components/ui/Container.tsx");
  await assertProjectFileMissing("../src/components/ui/Icon.tsx");
  await assertProjectFileMissing("../src/components/ui/ThinkingSubtitle.tsx");
  await assertProjectFileMissing("../src/components/ui/index.ts");

  const layoutBarrel = await readRequiredProjectFile("../src/components/layout/index.ts");
  assert.doesNotMatch(layoutBarrel, /PageLayout|Section/);
  assert.doesNotMatch(globals, /\.artifact-(?:card|window|code|chart|image)/);
  assert.doesNotMatch(globals, /\.card-hover/);
});

test("TypeScript extension imports are explicit without suppressing the type system", async () => {
  const tsconfig = JSON.parse(tsconfigJson);
  assert.equal(tsconfig.compilerOptions?.allowImportingTsExtensions, true);

  const sourceFiles = await collectSourceFiles(new URL("../src/", import.meta.url));
  const filesWithSuppressedExtensionImports = [];

  await Promise.all(sourceFiles.map(async (fileUrl) => {
    const source = await readFile(fileUrl, "utf8");

    if (source.includes("@ts-expect-error - Node's test runner imports")) {
      filesWithSuppressedExtensionImports.push(fileUrl.pathname);
    }
  }));

  assert.deepEqual(filesWithSuppressedExtensionImports, []);
});

test("Perspective BI dependencies and local browser assets are wired", () => {
  assert.match(packageJson, /"@perspective-dev\/client":/);
  assert.match(packageJson, /"@perspective-dev\/server":/);
  assert.match(packageJson, /"@perspective-dev\/viewer":/);
  assert.match(packageJson, /"@perspective-dev\/viewer-datagrid":/);
  assert.match(packageJson, /"@perspective-dev\/viewer-d3fc":/);
  assert.match(vendorScript, /@perspective-dev\/server\/dist\/wasm\/perspective-server\.wasm/);
  assert.match(vendorScript, /@perspective-dev\/viewer\/dist\/wasm\/perspective-viewer\.wasm/);
  assert.match(vendorScript, /@perspective-dev\/viewer\/dist\/css\/pro\.css/);
  assert.match(vendorScript, /@perspective-dev\/viewer\/dist\/css\/intl\/zh\.css/);
  assert.match(nextConfig, /@perspective-dev\/viewer\/src\/ts\/extensions\.js/);
  assert.match(nextConfig, /perspective-extensions-shim\.js/);
  assert.match(perspectiveShim, /class PerspectiveSelectDetail/);
  assert.match(perspectiveShim, /removeFilters/);
});

test("spreadsheet parser uses the patched SheetJS npm alias and matching browser asset", () => {
  assert.match(packageData.dependencies?.xlsx ?? "", /^npm:@e965\/xlsx@\^?0\.20\./);

  const installedPackage = packageLockData.packages?.["node_modules/xlsx"];
  assert.ok(installedPackage, "xlsx alias should be installed at node_modules/xlsx for existing imports");
  assert.notEqual(installedPackage.version, "0.18.5");
  assert.match(installedPackage.resolved ?? "", /@e965\/xlsx\/-\/xlsx-0\.20\./);

  assert.doesNotMatch(packageLockJson, /registry\.npmjs\.org\/xlsx\/-\/xlsx-0\.18\.5\.tgz/);
  assert.doesNotMatch(xlsxVendorBundle, /version="0\.18\.5"/);
  assert.match(xlsxVendorBundle, /version="0\.20\./);
  assert.match(vendorScript, /node_modules\/xlsx\/dist\/xlsx\.full\.min\.js/);
});

test("Perspective BI requires the private tool access key before booting", async () => {
  const tool = await readRequiredProjectFile("../src/app/finance/perspective-bi/PerspectiveBITool.tsx");
  const styles = await readRequiredProjectFile("../src/app/finance/perspective-bi/tool.css");

  assert.match(tool, /PRIVATE_TOOL_ACCESS_ENDPOINT/);
  assert.doesNotMatch(tool, /\/api\/tools\/finance-ai-assistant\/access/);
  assert.match(tool, /Perspective BI 分析台内测访问/);
  assert.match(tool, /type="password"/);
  assert.match(tool, /if \(!accessToken\) {\s+return;\s+}/);
  assert.match(tool, /\}, \[accessToken\]\);/);
  assert.match(styles, /\.perspective-access-gate/);
});
