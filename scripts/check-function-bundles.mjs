import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const appDirectory = join(root, ".next/server/app");
// Leave room below Vercel's 250 MB limit for platform-specific runtime files.
const budget = 200 * 1024 * 1024;

async function tracedFiles(tracePath) {
  const trace = JSON.parse(await readFile(tracePath, "utf8"));
  return trace.files.map((file) => resolve(dirname(tracePath), file));
}

const runtimeFiles = await tracedFiles(join(root, ".next/next-server.js.nft.json"));
const traceNames = (await readdir(appDirectory, { recursive: true }))
  .filter((name) => /(?:^|\/)(?:page|route)\.js\.nft\.json$/.test(name));
assert.ok(traceNames.length > 0, "Build Next.js before checking function bundles");

const sizes = new Map();
const results = [];
for (const name of traceNames) {
  const tracePath = join(appDirectory, name);
  const files = new Set([...runtimeFiles, ...await tracedFiles(tracePath), tracePath.replace(/\.nft\.json$/, "")]);
  for (const file of files) {
    if (!sizes.has(file)) sizes.set(file, (await stat(file)).size);
  }
  const bytes = [...files].reduce((total, file) => total + sizes.get(file), 0);
  results.push({ name: name.replace(/\.js\.nft\.json$/, ""), bytes, files });
}

results.sort((a, b) => b.bytes - a.bytes);
for (const result of results.filter((result) => result.bytes > budget)) {
  console.error(`Oversized function trace: ${result.name} (${(result.bytes / 1024 / 1024).toFixed(1)} MiB)`);
  const largestFiles = [...result.files].sort((a, b) => sizes.get(b) - sizes.get(a)).slice(0, 5);
  for (const file of largestFiles) {
    console.error(`  ${(sizes.get(file) / 1024 / 1024).toFixed(1)} MiB  ${relative(root, file)}`);
  }
}
assert.ok(results.every((result) => result.bytes <= budget), "Function dependency traces exceed the 200 MiB budget");
console.log(`Function bundle check passed: ${results.length} traces; largest ${results[0].name} ${(results[0].bytes / 1024 / 1024).toFixed(1)} MiB (includes shared Next runtime)`);
