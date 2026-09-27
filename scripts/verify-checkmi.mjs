import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const origin = new URL(process.argv[2]);
const release = JSON.parse(await readFile(new URL("../docs/checkmi-release.json", import.meta.url), "utf8"));
const request = (pathname, options = {}) => fetch(new URL(pathname, origin), { signal: AbortSignal.timeout(30_000), ...options });

const short = await request("/checkmi", { redirect: "manual" });
assert.ok([307, 308].includes(short.status), "Bare path must redirect to the canonical slash path");
assert.equal(new URL(short.headers.get("location"), origin).pathname, "/checkmi/");
const page = await request("/checkmi/");
assert.equal(page.status, 200);
assert.match(page.headers.get("content-type"), /text\/html/);
assert.match(page.headers.get("x-robots-tag"), /noindex/);
assert.match(page.headers.get("content-security-policy"), /connect-src 'self' https:/);
const html = await page.text();
assert.equal(createHash("sha256").update(html).digest("hex"), release.files.find((file) => file.file === "index.html").sha256);
console.log("PASS /checkmi -> /checkmi/; standalone HTML and scoped headers match");

for (const file of release.files) {
  const response = await request(`/checkmi/${file.file}`);
  assert.equal(response.status, 200, file.file);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256, file.file);
  console.log(`PASS /checkmi/${file.file} (${bytes.length} bytes)`);
}
for (const pathname of ["/", "/sitemap.xml"]) {
  const response = await request(pathname);
  assert.equal(response.status, 200, pathname);
  assert.match(response.headers.get("content-security-policy"), /connect-src 'self';/);
  assert.doesNotMatch(await response.text(), /\/checkmi\b/);
}
console.log("PASS homepage and sitemap remain available without a checkmi entry");
