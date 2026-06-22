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
const mouseTrail = await readFile(
  new URL("../src/components/ui/MouseTrail.tsx", import.meta.url),
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

test("root layout lets Framer Motion follow the user reduced-motion preference globally", () => {
  assert.match(layout, /import \{ MotionConfig \} from "framer-motion"/);
  assert.match(layout, /<MotionConfig\s+reducedMotion="user">[\s\S]*<PageTransition>\{children\}<\/PageTransition>[\s\S]*<\/MotionConfig>/);
});

test("site navigation is SSR-capable and exposed through a header landmark", () => {
  assert.match(clientShell, /import SiteNavigation from "@\/components\/layout\/SiteNavigation"/);
  assert.doesNotMatch(
    clientShell,
    /dynamic\(\(\) => import\("@\/components\/layout\/SiteNavigation"\)[\s\S]*?ssr:\s*false/
  );
  assert.equal((navigation.match(/<header\s+aria-label="网站导航"/g) || []).length, 2);
  assert.match(navigation, /<header\s+aria-label="网站导航"[\s\S]*<button/);
  assert.match(navigation, /<header\s+aria-label="网站导航"[\s\S]*<nav\s+aria-label="网站导航"/);
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

test("decorative mouse trail respects reduced motion and avoids expensive blend mode", () => {
  assert.match(mouseTrail, /import \{ useReducedMotion \} from "framer-motion"/);
  assert.match(mouseTrail, /const prefersReducedMotion = useReducedMotion\(\)/);
  assert.match(mouseTrail, /const shouldDisableTrail = isTouchDevice \|\| prefersReducedMotion/);
  assert.match(mouseTrail, /if \(shouldDisableTrail\) return/);
  assert.match(mouseTrail, /if \(shouldDisableTrail\) return null/);
  assert.match(mouseTrail, /const PARTICLE_SPAWN_INTERVAL_MS = 32/);
  assert.match(mouseTrail, /let lastParticleEmitTime = 0/);
  assert.match(mouseTrail, /if \(eventTime - lastParticleEmitTime < PARTICLE_SPAWN_INTERVAL_MS\) return/);
  assert.match(mouseTrail, /if \(particles\.length >= maxParticles\) return/);
  assert.match(mouseTrail, /Math\.min\(PARTICLES_PER_EMIT, availableSlots\)/);
  assert.doesNotMatch(mouseTrail, /for \(let i = 0; i < 3; i\+\+\)/);
  assert.doesNotMatch(mouseTrail, /mix-blend-multiply/);
});
