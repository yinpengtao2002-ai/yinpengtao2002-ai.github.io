import { copyFile, mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [buildArg, sourceCommit] = process.argv.slice(2);
if (!buildArg || !/^[a-f0-9]{40}$/.test(sourceCommit ?? "")) {
  throw new Error("Usage: node scripts/sync-checkmi.mjs <validated dist/checkmi directory> <full source commit>");
}
const build = path.resolve(buildArg);
const destination = path.join(root, "public", "checkmi");
if (build === destination || build.startsWith(destination + path.sep)) {
  throw new Error("Build input must be separate from the deployed output");
}
const fixedFiles = ["index.html", "favicon.svg", "业务逻辑说明.md", "templates/经营测算_标准底表.xlsx"];
const html = await readFile(path.join(build, "index.html"), "utf8");
const assets = [...html.matchAll(/(?:src|href)="(\/checkmi\/assets\/[^"?#]+)"/g)].map((match) => match[1].slice("/checkmi/".length));
if (!assets.some((file) => file.endsWith(".js")) || !assets.some((file) => file.endsWith(".css"))) {
  throw new Error("Expected a built /checkmi/ entry with local JavaScript and CSS");
}
for (const asset of assets) {
  if (!/^assets\/[a-zA-Z0-9._-]+\.(js|css)$/.test(asset)) throw new Error("Unexpected asset path");
}
// Include lazy-loaded export chunks as well as the HTML's entry assets.
// Only accept regular, flat build assets; never follow symlinks or source directories.
const generatedAssets = await readdir(path.join(build, "assets"), { withFileTypes: true });
for (const entry of generatedAssets) {
  if (!entry.isFile() || !/^[a-zA-Z0-9._-]+\.(js|css)$/.test(entry.name)) {
    throw new Error(`Unexpected generated asset: ${entry.name}`);
  }
}
assets.push(...generatedAssets.map(entry => `assets/${entry.name}`).sort());
const files = [...new Set([...fixedFiles, ...assets])];
const payloads = await Promise.all(files.map(async (file) => {
  const data = await readFile(path.join(build, file));
  return { file, data, sha256: createHash("sha256").update(data).digest("hex") };
}));

// All inputs are validated before publishing. Never traverse or copy the source tree.
for (const { file } of payloads) {
  const target = path.resolve(destination, file);
  if (!target.startsWith(destination + path.sep)) throw new Error("Output path outside /checkmi");
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(build, file), target);
}
const assetDirectory = path.join(destination, "assets");
for (const name of await readdir(assetDirectory)) {
  if (!/^[a-zA-Z0-9._-]+\.(js|css)$/.test(name) || assets.includes(`assets/${name}`)) continue;
  const target = path.resolve(assetDirectory, name);
  if (!target.startsWith(assetDirectory + path.sep)) throw new Error("Obsolete asset path outside /checkmi/assets");
  if ((await stat(target)).isFile()) await unlink(target);
}
await mkdir(path.join(root, "docs"), { recursive: true });
await writeFile(path.join(root, "docs/checkmi-release.json"), JSON.stringify({
  source: "BC economics dashboard",
  sourceCommit,
  basePath: "/checkmi/",
  files: payloads.map(({ file, data, sha256 }) => ({ file, bytes: data.length, sha256 })),
}, null, 2) + "\n");
console.log(`Synced ${payloads.length} validated files to public/checkmi; source ${sourceCommit}`);
