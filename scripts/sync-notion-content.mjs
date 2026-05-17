#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const REQUIRED_NOTION_ENV = [
  "NOTION_TOKEN",
  "NOTION_AI_DATABASE_ID",
  "NOTION_FINANCE_DATABASE_ID",
];

const EMPTY_COMMIT_COMMAND = "git commit --allow-empty";

function loadLocalEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key]) continue;

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: options.capture ? "pipe" : "inherit",
    encoding: "utf8",
    shell: false,
  });

  if (result.status !== 0) {
    const detail = options.capture ? result.stderr || result.stdout : "";
    throw new Error(`${command} ${args.join(" ")} failed${detail ? `\n${detail}` : ""}`);
  }

  return options.capture ? result.stdout.trim() : "";
}

function hasLocalNotionEnv() {
  return REQUIRED_NOTION_ENV.every((key) => Boolean(process.env[key]));
}

function generatedContentStatus() {
  return run("git", ["status", "--short", "--", "src/lib/data/generated/content.ts"], { capture: true });
}

function currentBranch() {
  return run("git", ["branch", "--show-current"], { capture: true });
}

function printUsage() {
  console.log("Notion 内容同步");
  console.log("");
  console.log("常用命令：");
  console.log("  npm run sync:notion");
  console.log("  npm run sync:notion -- --deploy");
  console.log("");
  console.log("说明：");
  console.log("- 本地有 Notion 环境变量时，会先执行 npm run gen 拉取最新文章。");
  console.log("- 使用 --deploy 时，如果本地没有 Notion 环境变量，会创建空提交并推送，用线上构建读取 Vercel 环境变量。");
  console.log(`- 空提交使用：${EMPTY_COMMIT_COMMAND}`);
  console.log("");
}

async function main() {
  const args = process.argv.slice(2);
  const shouldDeploy = args.includes("--deploy");
  const shouldHelp = args.includes("--help") || args.includes("-h");

  if (shouldHelp) {
    printUsage();
    return;
  }

  loadLocalEnvFile(".env.local");
  loadLocalEnvFile(".env");

  const hasEnv = hasLocalNotionEnv();

  if (hasEnv) {
    console.log("检测到本地 Notion 配置，开始拉取 Notion 内容。");
    run("npm", ["run", "gen"]);
  } else {
    console.log("本地没有完整 Notion 配置，跳过本地拉取。");
    console.log("如果 Notion 配置在 Vercel 上，请使用：npm run sync:notion -- --deploy");
  }

  if (!shouldDeploy) {
    console.log("本地同步步骤结束。");
    return;
  }

  const branch = currentBranch();
  if (!branch) {
    throw new Error("无法确认当前 Git 分支，已停止推送。");
  }

  const status = generatedContentStatus();
  if (status) {
    console.log("检测到本地生成内容变化，准备提交。");
    run("git", ["add", "src/lib/data/generated/content.ts"]);
    run("git", ["commit", "-m", "Sync Notion content"]);
  } else {
    console.log("本地没有文件变化，创建空提交以触发线上 Notion 同步。");
    run("git", ["commit", "--allow-empty", "-m", "Sync Notion content"]);
  }

  run("git", ["push", "origin", branch]);
  console.log(`已推送 ${branch}，线上构建会继续读取 Notion 内容。`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
