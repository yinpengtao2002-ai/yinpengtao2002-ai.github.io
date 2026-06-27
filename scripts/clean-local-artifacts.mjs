import { rm, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LOCAL_ARTIFACTS = ["output", ".playwright-cli", "tsconfig.tsbuildinfo"];
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(scriptDirectory, "..");

function getRootFromArgs(args) {
  const rootFlagIndex = args.indexOf("--root");

  if (rootFlagIndex === -1) {
    return defaultRoot;
  }

  const root = args[rootFlagIndex + 1];

  if (!root) {
    throw new Error("Missing value for --root");
  }

  return resolve(root);
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

const root = getRootFromArgs(process.argv.slice(2));
let removedCount = 0;

for (const artifact of LOCAL_ARTIFACTS) {
  const targetPath = resolve(root, artifact);

  if (!(await pathExists(targetPath))) {
    console.log(`Skipped ${artifact} (not present)`);
    continue;
  }

  await rm(targetPath, { recursive: true, force: true });
  removedCount += 1;
  console.log(`Removed ${artifact}`);
}

if (removedCount === 0) {
  console.log("No local artifacts to clean.");
}
