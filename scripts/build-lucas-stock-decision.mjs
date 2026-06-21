import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const appDir = resolve(repoRoot, "src/lib/lucas/stock-decision/app");
const outputPath = resolve(repoRoot, "src/lib/lucas/stock-decision/stockDecisionHtml.ts");

async function readAppFile(relativePath) {
  return readFile(resolve(appDir, relativePath), "utf8");
}

function stripKellyExports(source) {
  return source.replace(/\bexport\s+(?=(function|const|let|var|class)\b)/g, "");
}

function stripKellyModuleImport(source) {
  return source.replace(
    /^import\s*\{[\s\S]*?\}\s*from\s*["']\.\/lib\/kelly\.js\?v=\d+["'];\s*/m,
    "",
  );
}

const [indexHtml, styles, kellyLibrary, kellyModule] = await Promise.all([
  readAppFile("index.html"),
  readAppFile("src/styles.css"),
  readAppFile("src/lib/kelly.js"),
  readAppFile("src/kelly-module.js"),
]);

const runtime = `${stripKellyExports(kellyLibrary)}\n\n${stripKellyModuleImport(kellyModule)}`;
const bundledHtml = indexHtml
  .replace(/\s*<link rel="stylesheet" href="\.\/src\/styles\.css\?v=\d+"\s*\/>/, `\n    <style>\n${styles}\n    </style>`)
  .replace(/\s*<script type="module" src="\.\/src\/kelly-module\.js\?v=\d+"><\/script>/, `\n    <script>\n${runtime}\n    </script>`);

const output = `// Generated from the local Lucas stock-decision app in ./app.\n// Edit ./app first, then run: node scripts/build-lucas-stock-decision.mjs\nexport const stockDecisionHtml = ${JSON.stringify(bundledHtml)};\n`;

await writeFile(outputPath, output);
