import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

const assets = [
  {
    source: "node_modules/plotly.js-dist-min/plotly.min.js",
    target: "public/vendor/plotly/plotly.min.js",
  },
  {
    source: "node_modules/xlsx/dist/xlsx.full.min.js",
    target: "public/vendor/xlsx/xlsx.full.min.js",
  },
];

for (const asset of assets) {
  const sourcePath = join(rootDir, asset.source);
  const targetPath = join(rootDir, asset.target);
  await mkdir(dirname(targetPath), { recursive: true });
  await copyFile(sourcePath, targetPath);
  console.log(`Vendor asset ready: ${asset.target}`);
}
