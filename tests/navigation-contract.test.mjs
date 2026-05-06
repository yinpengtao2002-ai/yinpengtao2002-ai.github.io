import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const navigation = await readFile(
  new URL("../src/components/layout/SiteNavigation.tsx", import.meta.url),
  "utf8"
);
const layout = await readFile(
  new URL("../src/app/layout.tsx", import.meta.url),
  "utf8"
);
const pageTransition = await readFile(
  new URL("../src/components/layout/PageTransition.tsx", import.meta.url),
  "utf8"
);

test("thinking lab list page keeps global navigation even with a trailing slash", () => {
  assert.match(navigation, /pathname !== "\/thinking-lab\/"/);
});

test("root layout wraps pages with a restrained route transition", () => {
  assert.match(layout, /import PageTransition from "@\/components\/layout\/PageTransition"/);
  assert.match(layout, /<PageTransition>\{children\}<\/PageTransition>/);
  assert.match(pageTransition, /AnimatePresence/);
  assert.match(pageTransition, /usePathname/);
  assert.match(pageTransition, /prefersReducedMotion/);
  assert.match(pageTransition, /mode="wait"/);
  assert.match(pageTransition, /y:\s*12/);
  assert.doesNotMatch(pageTransition, /x:\s*["'{-]/);
});

test("site navigation follows homepage section visibility", () => {
  assert.match(navigation, /sectionId:\s*"home"/);
  assert.match(navigation, /sectionId:\s*"finance"/);
  assert.match(navigation, /sectionId:\s*"thinking"/);
  assert.match(navigation, /sectionId:\s*"contact"/);
  assert.match(navigation, /IntersectionObserver/);
  assert.match(navigation, /activeSectionId/);
  assert.match(navigation, /home-nav-active-pill/);
  assert.match(navigation, /layoutId="home-nav-active-pill"/);
});
