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
const clientShell = await readFile(
  new URL("../src/components/ClientShell.tsx", import.meta.url),
  "utf8"
);
const globals = await readFile(
  new URL("../src/app/globals.css", import.meta.url),
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
  assert.match(pageTransition, /pageInitial/);
  assert.match(pageTransition, /pathname === "\/"/);
  assert.match(pageTransition, /pathname === "\/" \|\| prefersReducedMotion \? false/);
  assert.match(pageTransition, /prefersReducedMotion/);
  assert.match(pageTransition, /mode="wait"/);
  assert.doesNotMatch(pageTransition, /initial=\{false\}/);
  assert.match(pageTransition, /y:\s*12/);
  assert.doesNotMatch(pageTransition, /x:\s*["'{-]/);
});

test("site navigation uses page links instead of scroll-tracked homepage sections", () => {
  assert.match(navigation, /sectionId:\s*"home"/);
  assert.match(navigation, /href:\s*"\/finance"[\s\S]*activePath:\s*"\/finance"/);
  assert.match(navigation, /href:\s*"\/thinking-lab"[\s\S]*activePath:\s*"\/thinking-lab"/);
  assert.doesNotMatch(navigation, /href:\s*"\/#finance"/);
  assert.doesNotMatch(navigation, /href:\s*"\/#thinking"/);
  assert.match(navigation, /sectionId:\s*"contact"/);
  assert.doesNotMatch(navigation, /IntersectionObserver/);
  assert.doesNotMatch(navigation, /activeSectionId/);
  assert.doesNotMatch(navigation, /hashSectionId/);
  assert.doesNotMatch(navigation, /pendingSectionRef/);
  assert.doesNotMatch(navigation, /syncActiveSectionFromScroll/);
  assert.doesNotMatch(navigation, /window\.addEventListener\("scroll"/);
  assert.match(navigation, /scrollToSection\("contact"\)/);
  assert.match(navigation, /home-nav-active-pill/);
  assert.match(navigation, /layoutId="home-nav-active-pill"/);
});

test("site navigation hides on the Perspective BI workbench route", () => {
  assert.match(navigation, /pathname\.startsWith\("\/finance\/perspective-bi"\)/);
  assert.match(navigation, /pathname\.startsWith\("\/finance\/profit-structure"\)/);
});

test("site keeps a single light theme without a dark-mode toggle", () => {
  assert.doesNotMatch(clientShell, /ThemeToggle/);
  assert.doesNotMatch(clientShell, /theme/i);
  assert.doesNotMatch(globals, /\[data-theme="dark"\]/);
  assert.doesNotMatch(globals, /Dark Theme/);
});
