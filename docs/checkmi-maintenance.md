# Checkmi maintenance

The user requested the existing BC dashboard at `https://yinpengtao.cn/checkmi/` with no homepage, navigation, finance listing, sitemap or assistant recommendation entry. It is a directly accessible page; this is not an access-code gate. Route-specific `X-Robots-Tag` asks crawlers not to index it.

The dashboard has its own stylesheet and runtime in `public/checkmi/`. Next rewrites `/checkmi/` to its static `index.html`; the site's existing trailing-slash policy redirects `/checkmi` to `/checkmi/`. Do not wrap it in the personal site's layout or add an iframe. HTTPS JSON imports retain their browser CORS restrictions. Only `/checkmi/:path*` allows HTTPS `connect-src`; preserve the other global security directives.

Authoritative source is the sibling workspace `AI经济性测算项目/bi-dashboard`. The original Excel and full extraction remain in that workspace and must not be copied here. Business documentation is maintained there and mirrored into `public/checkmi/业务逻辑说明.md`. The built template and bounded example data are part of the requested dashboard.

To update:

1. Implement and verify in the dashboard source repository, then commit the exact source.
2. Run `pnpm build:checkmi` there. It produces `dist/checkmi` without changing the Sites build.
3. Run `node scripts/sync-checkmi.mjs <absolute dashboard dist/checkmi path> <full source HEAD>` in this repository. It copies only the validated entry, referenced assets, icon, template and business document, and records hashes in `docs/checkmi-release.json`.
4. Run the route/asset contract, lint and production build. With the built site running, use `node scripts/verify-checkmi.mjs <origin>` to verify `/checkmi`, `/checkmi/`, both downloads, referenced assets, headers and absence of a listing entry by HTTP. Imported asset bytes are preserved by the scoped `.gitattributes` rule.
5. Commit and push to `main` using the site's existing Vercel Git integration, then confirm deployment status and the live route.

Do not edit minified assets. No uploaded files or saved scenarios are sent to the site's server by this tool. They remain in the browser page session; refresh restores the example baseline.

## Validation receipt · 2026-09-07

- Upstream: 36 economics/import/comparison/P&L tests passed; TypeScript and `/checkmi/` production build passed.
- Personal site: 23 route, security and release checks passed; production build and TypeScript passed. Lint had no errors; four pre-existing Goalkeeper unused-variable warnings remain.
- Local production HTTP: `/checkmi` redirects to `/checkmi/`; standalone HTML, all six deployed files, both downloads and scoped CSP match. Homepage and sitemap remain available without a checkmi entry. No browser interaction or visual QA was performed.

## Current page structure

Overview, project/model portfolio, break-even analysis, scenario comparison, cash snapshot, P&L, data/methodology last. The seven-tab navigation stays fixed at the viewport top while scrolling. Per-page hero headings are omitted. Operating parameters use a full-width horizontal bar and expand downward inline with shared global state; collapsing preserves assumptions and snapshots. P&L body rows are compact (roughly 29px for one-line subjects), without repeated source-row labels; optional subject drilldown still exposes provenance. Portfolio and coverage use the same upstream economics engine; see the synchronized business document for formulas and boundaries.

Only baseline and user-adjusted live conventions are provided; no system-authored parameter presets. The user can restore baseline or preserve their own adjusted snapshots for comparison. Operating cards now have metric-specific tones, related facts and neutral baseline deltas; these styles never assign a favorable/adverse rating.
