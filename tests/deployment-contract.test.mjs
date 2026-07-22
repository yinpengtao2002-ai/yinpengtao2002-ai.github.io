import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);

test("Vercel is the only supported production build target", async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const nextConfig = await readFile(path.join(root, "next.config.ts"), "utf8");
  const readme = await readFile(path.join(root, "README.md"), "utf8");

  assert.equal(packageJson.scripts["build:static"], undefined);
  assert.doesNotMatch(nextConfig, /STATIC_EXPORT|output:\s*"export"/);
  assert.match(readme, /Vercel 是唯一受支持的生产目标/);
  assert.match(readme, /GitHub Pages[^\n]*遗留发布面/);
  assert.doesNotMatch(readme, /npm run build:static|STATIC_EXPORT=true/);
});

test("AI environment documentation matches the server configuration", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const envExample = await readFile(path.join(root, ".env.example"), "utf8");
  const documented = `${readme}\n${envExample}`;

  for (const variable of [
    "AI_PROVIDER_ORDER",
    "AI_PRIMARY_API_KEY",
    "AI_PRIMARY_API_URL",
    "AI_PRIMARY_MODEL",
    "DEEPSEEK_API_KEY",
    "DEEPSEEK_API_URL",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "PRIVATE_TOOL_ACCESS_KEY",
    "PRIVATE_TOOL_TOKEN_SECRET",
  ]) {
    assert.match(documented, new RegExp(`\\b${variable}\\b`), `${variable} must be documented`);
  }

  assert.doesNotMatch(readme, /CHAT_API_KEY|CHAT_API_URL|CHAT_MODEL(?:_FALLBACK)?/);
  assert.doesNotMatch(envExample, /reuses the primary NewAPI connection/);
});

test("patched Next, Sharp and DOMPurify versions are pinned", async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  assert.equal(packageJson.dependencies.next, "16.2.11");
  assert.match(packageJson.dependencies.sharp, /0\.35\./);
  assert.match(packageJson.dependencies.dompurify, /3\.4\.(?:1[2-9]|[2-9]\d)/);
  assert.equal(packageJson.devDependencies["eslint-config-next"], "16.2.11");
  assert.equal(packageJson.overrides.sharp, "0.35.0");
});
