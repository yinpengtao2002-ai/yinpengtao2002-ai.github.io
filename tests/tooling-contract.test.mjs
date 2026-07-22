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

function assertVersionAtLeast(actualVersion, minimumVersion, label) {
  const actualParts = actualVersion.split(".").map(Number);
  const minimumParts = minimumVersion.split(".").map(Number);

  for (let index = 0; index < Math.max(actualParts.length, minimumParts.length); index += 1) {
    const actualPart = actualParts[index] ?? 0;
    const minimumPart = minimumParts[index] ?? 0;

    if (actualPart > minimumPart) {
      return;
    }

    if (actualPart < minimumPart) {
      assert.fail(`${label} should be at least ${minimumVersion}; found ${actualVersion}`);
    }
  }
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

test("eslint ignores local social card handoff artifacts", async () => {
  const gitignore = await readRequiredProjectFile("../.gitignore");

  assert.ok(eslintConfig.includes('"social-card-prompt-handoff*/**"'));
  assert.match(gitignore, /social-card-prompt-handoff\*\//);
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

test("legacy finance browser engines share one typed script loader boundary", async () => {
  const loader = await readRequiredProjectFile("../src/lib/finance/browser-tool-loader.ts");
  const toolShells = [
    "../src/app/finance/business-analysis/BusinessAnalysisTool.tsx",
    "../src/app/finance/monthly-trend/MonthlyTrendTool.tsx",
    "../src/app/finance/profit-structure/ProfitStructureTool.tsx",
    "../src/app/finance/sensitivity-analysis/SensitivityTool.tsx",
  ];

  assert.match(loader, /export function loadBrowserScript/);
  assert.match(loader, /export type FinanceBrowserEngine/);
  assert.match(loader, /dispose:\s*\(\)\s*=>\s*void/);
  assert.match(loader, /export type FinanceBrowserEngineName/);
  assert.match(loader, /export async function bootFinanceBrowserEngine/);
  assert.match(loader, /__financeToolScripts/);
  assert.match(loader, /Promise<void>/);
  for (const engineName of [
    "BusinessAnalysisModel",
    "MonthlyTrendModel",
    "ProfitBridgeSensitivity",
    "ProfitStructureModel",
    "PerspectiveBIModel",
  ]) {
    assert.match(loader, new RegExp(`${engineName}\\?:\\s*FinanceBrowserEngine`));
  }

  await Promise.all(toolShells.map(async (path) => {
    const source = await readRequiredProjectFile(path);

    assert.match(source, /@\/lib\/finance\/browser-tool-loader/, `${path} should import the shared loader`);
    assert.match(source, /bootFinanceBrowserEngine/, `${path} should use the shared boot boundary`);
    assert.match(source, /engine\?\.dispose\(\)/, `${path} should dispose the loaded engine on unmount`);
    assert.doesNotMatch(source, /function loadBrowserScript/, `${path} should not keep a local script loader`);
    assert.doesNotMatch(source, /__financeToolScripts/, `${path} should not own the browser script cache type`);
    assert.doesNotMatch(source, /declare global/, `${path} should not redeclare the browser engine global`);
  }));

  const perspectiveShell = await readRequiredProjectFile("../src/app/finance/perspective-bi/PerspectiveBITool.tsx");
  assert.match(perspectiveShell, /bootFinanceBrowserEngine/);
  assert.doesNotMatch(perspectiveShell, /declare global/);
});

test("interactive viewport media queries use named breakpoint constants", async () => {
  const breakpoints = await readRequiredProjectFile("../src/lib/responsive/breakpoints.ts");
  const viewportHook = await readRequiredProjectFile("../src/lib/useLowMotionMode.ts");
  const mouseTrail = await readRequiredProjectFile("../src/components/ui/MouseTrail.tsx");
  const homeFinanceSection = await readRequiredProjectFile("../src/components/home/HomeFinanceSection.tsx");
  const studyCardsTool = await readRequiredProjectFile("../src/app/tools/study-cards/StudyCardsTool.tsx");

  assert.match(breakpoints, /SITE_MOBILE_BREAKPOINT_PX\s*=\s*768/);
  assert.match(breakpoints, /SITE_MOBILE_QUERY/);
  assert.match(breakpoints, /TOUCH_POINTER_QUERY/);
  assert.match(breakpoints, /TOUCH_OR_MOBILE_QUERY/);
  assert.match(breakpoints, /STUDY_CARDS_MOBILE_PRACTICE_QUERY/);
  assert.match(breakpoints, /STUDY_CARDS_RESULT_PORTRAIT_QUERY/);

  assert.match(viewportHook, /TOUCH_OR_MOBILE_QUERY/);
  assert.doesNotMatch(viewportHook, /MOBILE_LIKE_QUERY/);
  assert.doesNotMatch(viewportHook, /max-width:\s*768px/);

  assert.match(mouseTrail, /TOUCH_POINTER_QUERY/);
  assert.doesNotMatch(mouseTrail, /matchMedia\("\(pointer: coarse\), \(hover: none\)"\)/);

  assert.match(homeFinanceSection, /SITE_MOBILE_QUERY/);
  assert.doesNotMatch(homeFinanceSection, /MOBILE_FINANCE_QUERY/);
  assert.doesNotMatch(homeFinanceSection, /max-width:\s*768px/);

  assert.match(studyCardsTool, /STUDY_CARDS_MOBILE_PRACTICE_QUERY/);
  assert.match(studyCardsTool, /STUDY_CARDS_RESULT_PORTRAIT_QUERY/);
  assert.doesNotMatch(studyCardsTool, /matchMedia\("\(max-width:\s*(?:760|900)px\)/);
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

test("Perspective BI D3 legend chain stays on patched D3 versions", () => {
  assert.equal(packageData.overrides?.["d3-color"], "^3.1.0");
  assert.equal(packageData.overrides?.["d3-interpolate"], "^3.0.1");
  assert.equal(packageData.overrides?.["d3-scale"], "^4.0.2");
  assert.equal(packageData.overrides?.["d3-transition"], "^3.0.1");

  const installedD3Color = packageLockData.packages?.["node_modules/d3-color"];
  const installedD3Interpolate = packageLockData.packages?.["node_modules/d3-interpolate"];
  const installedD3Scale = packageLockData.packages?.["node_modules/d3-scale"];
  const installedD3Transition = packageLockData.packages?.["node_modules/d3-transition"];

  assertVersionAtLeast(installedD3Color?.version ?? "0.0.0", "3.1.0", "d3-color");
  assertVersionAtLeast(installedD3Interpolate?.version ?? "0.0.0", "3.0.1", "d3-interpolate");
  assertVersionAtLeast(installedD3Scale?.version ?? "0.0.0", "4.0.2", "d3-scale");
  assertVersionAtLeast(installedD3Transition?.version ?? "0.0.0", "3.0.1", "d3-transition");

  assert.doesNotMatch(packageLockJson, /node_modules\/d3-svg-legend\/node_modules\/d3-(?:color|interpolate|scale|transition)/);
  assert.doesNotMatch(packageLockJson, /d3-color-1\.4\.1\.tgz/);
  assert.doesNotMatch(packageLockJson, /d3-interpolate-1\.4\.0\.tgz/);
  assert.doesNotMatch(packageLockJson, /d3-scale-1\.0\.3\.tgz/);
  assert.doesNotMatch(packageLockJson, /d3-transition-1\.0\.3\.tgz/);
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

test("Next runtime, Sharp and PostCSS dependencies stay on patched versions", () => {
  assert.equal(packageData.dependencies?.next, "16.2.11");
  assert.equal(packageData.dependencies?.sharp, "0.35.0");
  assert.equal(packageData.devDependencies?.["eslint-config-next"], "16.2.11");
  assert.equal(packageData.overrides?.sharp, "0.35.0");
  assert.equal(packageData.overrides?.next?.postcss, "^8.5.10");

  const installedNext = packageLockData.packages?.["node_modules/next"];
  const installedSharp = packageLockData.packages?.["node_modules/sharp"];
  const installedEslintConfig = packageLockData.packages?.["node_modules/eslint-config-next"];
  const installedNextPostcss = packageLockData.packages?.["node_modules/next/node_modules/postcss"];

  assert.equal(installedNext?.version, "16.2.11");
  assert.equal(installedSharp?.version, "0.35.0");
  assert.equal(installedEslintConfig?.version, "16.2.11");
  assert.ok(installedNextPostcss, "Next should keep a resolved PostCSS dependency in the lockfile");
  assertVersionAtLeast(installedNextPostcss.version, "8.5.10", "Next nested PostCSS");
  assert.notEqual(installedNextPostcss.version, "8.4.31");
});

test("Mermaid parser and sanitizer dependencies stay on patched versions", () => {
  assert.equal(packageData.dependencies?.mermaid, "^11.16.0");
  assert.equal(packageData.overrides?.uuid, "^11.1.1");

  const installedMermaid = packageLockData.packages?.["node_modules/mermaid"];
  const installedParser = packageLockData.packages?.["node_modules/@mermaid-js/parser"];
  const installedDomPurify = packageLockData.packages?.["node_modules/dompurify"];
  const installedUuid = packageLockData.packages?.["node_modules/uuid"];
  const installedLodashEs = packageLockData.packages?.["node_modules/lodash-es"];

  assert.equal(installedMermaid?.version, "11.16.0");
  assertVersionAtLeast(installedParser?.version ?? "0.0.0", "1.2.0", "Mermaid parser");
  assertVersionAtLeast(installedDomPurify?.version ?? "0.0.0", "3.4.12", "DOMPurify");
  assertVersionAtLeast(installedUuid?.version ?? "0.0.0", "11.1.1", "uuid");
  assertVersionAtLeast(installedLodashEs?.version ?? "0.0.0", "4.18.1", "lodash-es");

  assert.doesNotMatch(packageLockJson, /node_modules\/langium/);
  assert.doesNotMatch(packageLockJson, /node_modules\/chevrotain/);
  assert.doesNotMatch(packageLockJson, /dompurify-3\.3\.1\.tgz/);
  assert.doesNotMatch(packageLockJson, /uuid-11\.1\.0\.tgz/);
});

test("Notion content sync uses the modern SDK without the vulnerable form-data chain", () => {
  assert.equal(packageData.dependencies?.["@notionhq/client"], "^5.22.0");

  const installedNotionClient = packageLockData.packages?.["node_modules/@notionhq/client"];
  assert.equal(installedNotionClient?.version, "5.22.0");
  assertVersionAtLeast(installedNotionClient?.engines?.node?.replace(/[^\d.]/g, "") || "0.0.0", "18.0.0", "Notion SDK Node engine");

  assert.doesNotMatch(packageLockJson, /node_modules\/@types\/node-fetch/);
  assert.doesNotMatch(packageLockJson, /node_modules\/form-data/);
  assert.doesNotMatch(packageLockJson, /form-data-4\.0\.[0-5]\.tgz/);
});

test("Perspective BI requires the private tool access key before booting", async () => {
  const tool = await readRequiredProjectFile("../src/app/finance/perspective-bi/PerspectiveBITool.tsx");
  const styles = await readRequiredProjectFile("../src/app/finance/perspective-bi/tool.css");

  assert.match(tool, /PRIVATE_TOOL_ACCESS_ENDPOINT/);
  assert.doesNotMatch(tool, /\/api\/tools\/finance-ai-assistant\/access/);
  assert.match(tool, /Perspective BI 分析台内测访问/);
  assert.match(tool, /type="password"/);
  assert.match(tool, /if \(!accessToken\) {\s+return;\s+}/);
  assert.match(tool, /\}, \[accessToken, bootAttempt\]\);/);
  assert.match(styles, /\.perspective-access-gate/);
});
