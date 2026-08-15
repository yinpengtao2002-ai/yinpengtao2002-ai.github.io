import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { extname } from "node:path";

const publicSourceRoots = [
  new URL("../src/", import.meta.url),
  new URL("../public/", import.meta.url),
];
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".webmanifest",
  ".yaml",
  ".yml",
]);
const forbiddenEmployerMarkers = [
  new RegExp("\\u5947\\u745e", "u"),
  new RegExp("\\u0063\\u0068\\u0065\\u0072\\u0079", "iu"),
];

async function collectTextFiles(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const nestedFiles = await Promise.all(entries.map(async (entry) => {
    const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directoryUrl);

    if (entry.isDirectory()) {
      return collectTextFiles(entryUrl);
    }

    return textExtensions.has(extname(entry.name)) ? [entryUrl] : [];
  }));

  return nestedFiles.flat();
}

test("public website source omits former employer identifiers", async () => {
  const files = (await Promise.all(publicSourceRoots.map(collectTextFiles))).flat();
  const violations = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (forbiddenEmployerMarkers.some((pattern) => pattern.test(source))) {
      violations.push(file.pathname);
    }
  }

  assert.deepEqual(violations, []);
});
