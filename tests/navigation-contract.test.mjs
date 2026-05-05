import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const navigation = await readFile(
  new URL("../src/components/layout/SiteNavigation.tsx", import.meta.url),
  "utf8"
);

test("thinking lab list page keeps global navigation even with a trailing slash", () => {
  assert.match(navigation, /pathname !== "\/thinking-lab\/"/);
});
