# Checkmi maintenance

The user requested the existing BC dashboard at `https://yinpengtao.cn/checkmi/` with no homepage, navigation, finance listing, sitemap or assistant recommendation entry. It is a directly accessible page; this is not an access-code gate. Route-specific `X-Robots-Tag` asks crawlers not to index it.

As of 2026-09-07, the user explicitly requested that future releases update only this personal website. Stop synchronizing the separate ChatGPT Sites deployment; leave that existing deployment unchanged unless the user asks otherwise. This supersedes prior dual-destination publishing instructions.

The dashboard has its own stylesheet and runtime in `public/checkmi/`. Next rewrites `/checkmi/` to its static `index.html`; the site's existing trailing-slash policy redirects `/checkmi` to `/checkmi/`. Do not wrap it in the personal site's layout or add an iframe. HTTPS JSON imports retain their browser CORS restrictions. Only `/checkmi/:path*` allows HTTPS `connect-src`; preserve the other global security directives.

Authoritative source is the sibling workspace `AI经济性测算项目/bi-dashboard`. The original Excel and full extraction remain in that workspace and must not be copied here. Business documentation is maintained there and mirrored into `public/checkmi/业务逻辑说明.md`. The built template and bounded example data are part of the requested dashboard.

To update:

1. Implement and verify in the dashboard source repository, then commit the exact source.
2. Run `pnpm build:checkmi` there. It produces `dist/checkmi` without changing the Sites build.
3. Run `node scripts/sync-checkmi.mjs <absolute dashboard dist/checkmi path> <full source HEAD>` in this repository. It copies only the validated entry, entry and lazy-loaded JS/CSS assets, icon, template and business document, and records hashes in `docs/checkmi-release.json`.
4. Run the route/asset contract, lint and production build. With the built site running, use `node scripts/verify-checkmi.mjs <origin>` to verify `/checkmi`, `/checkmi/`, both downloads, referenced assets, headers and absence of a listing entry by HTTP. Imported asset bytes are preserved by the scoped `.gitattributes` rule.
5. Commit and push to `main` using the site's existing Vercel Git integration, then confirm deployment status and the live route.

Do not edit minified assets. No uploaded files or saved scenarios are sent to the site's server by this tool. They remain in the browser page session; refresh restores the example baseline.

## Validation receipt · 2026-09-07

- Upstream: 36 economics/import/comparison/P&L tests passed; TypeScript and `/checkmi/` production build passed.
- Personal site: 23 route, security and release checks passed; production build and TypeScript passed. Lint had no errors; four pre-existing Goalkeeper unused-variable warnings remain.
- Local production HTTP: `/checkmi` redirects to `/checkmi/`; standalone HTML, all six deployed files, both downloads and scoped CSP match. Homepage and sitemap remain available without a checkmi entry. No browser interaction or visual QA was performed.

## Current page structure

Overview, project/model portfolio, scenario comparison, cash snapshot, P&L, data/methodology last. The fixed control deck has native page tabs on the first row and a compact operating-parameter trigger plus project/year/model/gate/country filters on the second. Nav and filter strips scroll horizontally when narrow. The editor expands below the deck in normal document flow; opening from a scrolled position returns to the top. The Collapsible root spans all page panels to keep the deck sticky; collapsing preserves assumptions and snapshots. Per-page hero headings stay omitted. P&L body rows are compact (roughly 29px for one-line subjects), without repeated source-row labels; optional subject drilldown still exposes provenance. Portfolio and coverage use the same upstream economics engine; see the synchronized business document for formulas and boundaries.

Only baseline and user-adjusted live conventions are provided; no system-authored parameter presets. The user can restore baseline or preserve their own adjusted snapshots for comparison. Operating cards now have metric-specific tones, related facts and neutral baseline deltas; these styles never assign a favorable/adverse rating.

Analytical text uses objective metric names, units, scope and data boundaries. Reading-order suggestions, rhetorical titles and duplicate scenario-update notes have been removed; detailed calculation sequence remains in Data & Methodology and the business document.

## P&L Excel export revision · 2026-09-07

Operating cards appear only on overview. P&L opens directly to the ledger beneath shared controls. The global result-export action/code is removed; P&L retains a styled .xlsx export of the chosen scope, view, unit and grouping. It includes every visible/off-screen ledger group and a separate source/assumptions sheet, preserving raw numbers, percent/percentage-point formats, null/zero distinctions, neutral hierarchy colors, frozen headings and print titles. It is a numeric snapshot, not a formula model.

ExcelJS is loaded on demand. `sync-checkmi.mjs` validates and copies all regular flat JS/CSS assets from the built assets directory, including dynamic imports. Do not return to copying only index.html references; that breaks Excel export online. The release manifest and HTTP verification must include all lazy chunks. Upstream now has 41 passing tests, including five XLSX readback cases; actual workbook top/EBIT/assumption renders were inspected separately from browser QA.

## Compact summaries and account bridges · 2026-09-07

P&L uses one toolbar for view/unit/group selectors and XLSX export; remove its visible title, subtitle, counts and scroll prompt. Keep its accessible name, ledger and source drilldown. Overview shortcuts for MIX, loss count and safety margin are removed; their destination tabs remain. Summary cards across overview, portfolio/coverage and cash use reduced spacing.

Scenario comparison adds gross and EBIT waterfalls over two visible snapshots. The signed account differences reconcile to existing result anchors, preserving cost/expense residuals, no-data versus zero-volume losses, and scope disclosure. A labelled focused scale shows small movements; crossing zero retains the zero line. These are account variances, not causal attribution to individual parameters. Upstream has 45 passing tests; actual component SVGs were rendered separately from browser QA.

## Full-page ledger and comparison order · 2026-09-07

Main P&L is a full document-flow table, with no height-limited inner scroll pane. The two header rows stick below the measured global deck; their row offsets track actual wrapping. Wide model/year columns use document horizontal scrolling with a sticky subject column and viewport-width navigation/controls. Compact normal model columns expand with the viewport. Keep observer cleanup, scrollbar-aware width and main-table selector specificity; the optional source-record dialog is separate. Profit-scale bars and annual charts now precede the account waterfalls. Export/calculation behavior is unchanged.

## Scoped assumptions and named snapshots · 2026-09-07

Upstream supports six operating percentage overrides per model-year record, chosen independently of view filters. Local values replace global defaults relative to source, with per-field inheritance reset and immutable snapshot copies. Totals, MIX, annual results, portfolio, P&L and break-even share effective row assumptions. Break-even follows adjusted volume MIX; all-zero volume falls back to source MIX. Fixed-mode/group/tax stay global. Export's existing assumptions sheet includes the relevant local scope and numeric percentages.

Scenario names are required and collision-safe; stable UUIDs drive chart state and removal. Names appear in charts, legends, waterfall options and saved tables. Removed repeated retention copy; existing ephemeral/latest-four behavior remains. Break-even is rebuilt around quantity/threshold and annual EBIT comparison, with collapsed methodology. Upstream 51 calculation/import/export tests pass. The model-year line/bar/table proposal is design-only and awaits business review; do not publish it as implemented functionality.

## Batch scope and model-year comparison · 2026-09-07

Upstream now ships the previously reviewed model comparison at the top of the portfolio tab, plus an overview shortcut. Lines, focused-year bars and matrix share five metrics and baseline/current/model selection; matrix drilldown preserves full dimensions and convention/unit. Project cards/details remain collapsed, old static top-ten bars are replaced. Multi-select year/model editing uses the shared slider/input even for mixed values; selected sets intersect and retain immutable per-field override behavior. Fifty-five upstream tests pass. Public route, scope and no-entry policy remain unchanged.

## Independent model rows and fixed total Mix · 2026-09-07

Parameter editor defaults to independent model rows with a metric selector, sliders/numeric fields and optional model-year split. Total/Mix mode fixes an explicit project/country/gate/year scope, supports integer total vehicles, proportional balancing of unlocked model shares, and share locks. Multiple disjoint scopes may coexist; view filters never renormalize their allocations. Captured model-year volume profiles define annual distribution. All operating views/export use the same materialized integer quantities; raw volume percentages resume when a plan is removed. Named snapshots include plans and locks; reset/import clear them. Cash remains independent. See the mirrored business document and upstream docs/volume-mix.md. Source build and full regression suite are required before syncing; no browser interaction QA is claimed.

Saved assumptions may now be selected independently as primary/reference across overview, portfolio, resilience and P&L. Both are recalculated under the same current view filters; this does not mutate the saved original snapshot or current editing state. Editing returns primary to live current, applying restores the saved settings/scope, deleting a selected ID falls back safely. All role labels and Excel headers use actual scenario names; difference export includes both numeric assumption sets. Standalone comparison retains the original saved scope/results. Upstream 69 regressions pass.

## Shared parameter surface · revision 15

Upstream replaces per-model rows and metric/mode switching with one always-visible six-field grid. Empty model/year selectors mean global defaults; a constrained scope edits only intersecting records. Existing raw local values appear as clickable model shortcut chips that restore edited scope without applying/copying parameters. Total/Mix defaults collapsed below the grid; allocation and saved-scenario rules remain unchanged. All-covered volume controls link to Mix. Reset/import restore editor defaults. Sync source business documentation and both output chunks; no browser QA is claimed.

## Optional names and direct P&L choice · revision 16

Scenario titles are optional; blank/whitespace gets the first unused `情景 N` starting at 1. Preserve explicit-name normalization and UUID identity. P&L's 查看数据 directly selects baseline/current/any saved scenario; difference view reveals the two comparison choices. Selection reuses shared scenario state, current filters and effective assumptions without applying a snapshot. Excel keeps exact selected labels and parameters. Remove the duplicate global scenario row on P&L. Break-even page, overview card, DataView formula and dedicated component/styles are removed; six tabs remain. Business documentation is synchronized. Only the personal website is published; do not sync Sites.

Revision 16 also replaces the raw local audit with explicit target selection and grouped numeric edit records (full model identity + identical override vector + exact years), editable/removable per record group. Mix expands directly to an unpersisted current-volume preview; actual edits create/update a disjoint allocation, keeping original economic rules and snapshots. No creation wizard. Scope controls stay read-only; overlap warnings route to existing plans. Locks use clear automatic/held-share labels; reset clears preview selectors. No browser interaction QA is claimed.

## Overview widget and metric grouping · revision 17

Restore the overview break-even widget only; the standalone page remains removed. It follows the selected primary scenario, current scope and effective Mix/local settings. Place the scenario pair to the right of filters in one horizontally scrollable toolbar within the sticky deck. Remove the supporting 项目汇总与经营明细 disclosure/component. Group profit comparison bars by EBIT and net profit, with scenarios as the series; use the same scenario colors as annual lines. Keep comparison filters, signed/null semantics, full ledger/export and cash boundaries unchanged. Business documentation is synchronized; publish only this personal route.

## Compact Mix, unit profit lines and special adjustments · revision 18

Total vehicles now sits beside allocation years; compact model rows retain all Mix controls and source quantities. Overview gross/EBIT charts overlay annual weighted per-vehicle lines (right yuan/vehicle axis) on total bars (left 100m-yuan axis). Both selected scenarios share filters and show unit differences even if totals match; zero-volume unit values are gaps.

Group allocation is now mandatory for baseline and every scenario, superseding older toggle instructions. Source expenses/EBIT omit row70; upstream adds it exactly once and recomputes annual tax/net profit. Preserve raw workbook validation/cash snapshots. Special adjustments keeps global fixed-cost mode and income tax; a blank disabled tariff-rate placeholder has no calculation or snapshot effect. XLSX notes and business doc use the same rule. Publish only /checkmi/ without navigation entry; Sites stays unchanged.

## Linked sales quantity and compact Mix cards · revision 19

The active Mix pool total is editable directly in Sales Quantity via slider/numeric input, synchronized with the total beside allocation years. Shared read-only selection keeps exact disjoint pool identity; changing total preserves shares, locks and annual weights. Target year/model selectors are always visible. Mix model cards use 3/2/1 columns. Every dashboard line now uses monotoneX smoothing with original points and null gaps. No change to mandatory group allocation, tax, cash data or Excel values. Source business/Agent notes are synchronized; publish only this direct personal route.

The revision 19 package also replaces the flat default operating example with labelled deterministic model/year demo inputs. Source workbook/JSON and user imports remain untouched; cash snapshots stay original. Demo ledger amounts are rebased to source adapter semantics so mandatory group is included once, and business documentation separates demo results from original-workbook reconciliation.

## Readable lifecycle scales and demo tuning

Lifecycle axes now use explicit zero-inclusive nice ticks and padding, formatted labels and measured-label gutters; raw maxima no longer clip. Demo quantity profiles stay unchanged while price/BOM/expense paths become gradual; unit EBIT is approximately 3149/3595/3888/3793/3461 yuan. Values still flow through the same engine and P&L, with original Excel, imports and cash snapshots untouched. Business documentation is synchronized. Publish only the existing direct /checkmi/ route without adding navigation; Sites stays unchanged.

## Checkmi filter-aware charts · revision 21

Single-year overview hides unchanged lifecycle metrics while retaining actual scenario/unit differences. Model/scenario annual lines hide without two effective years; model bars and scenario profit bars/waterfalls preserve meaningful cross-category comparison. One-model bars also hide, leaving the full numeric matrix and P&L drilldown. Hidden slots collapse, expanded scopes restore charts, and no filters, assumptions or snapshots reset. Saved scenarios retain their captured scope; cash remains independent. Business/Agent docs are synchronized; publish only the existing direct /checkmi/ route without navigation entries or Sites updates.

## Checkmi break-even arrow · revision 22

The overview threshold now shows reference vehicles → selected vehicles with actual scenario names and a signed vehicle-count difference. Both sides use the same filtered records but their own drivers/effective local and Mix assumptions. Round display counts to integer vehicles; displayed delta equals displayed right minus left, with raw thresholds unchanged. Unavailable/unit-mode sides remain gaps and suppress the delta. Remove the obsolete ratio track; retain adjustment action and all financial/P&L/cash rules. Business and Agent documents are synchronized; publish only direct /checkmi/ without a navigation entry or Sites update.

## Conditional checkmi break-even comparison · revision 23

Supersedes revision 22's unconditional arrow: unchanged effective assumptions retain the original single threshold in ten-thousand vehicles, ratio track and scenario volume. Only differing settings within the viewed records show the reference → selected arrow and signed change; reset or equivalent saved settings restores the plain view. Effective quantity takes precedence over volume percentage, names and out-of-scope edits do not trigger comparison. Changed settings with equal thresholds retain zero change. Economic calculations and snapshot/P&L/cash behavior remain intact. Business doc 1.23 and Agent notes are synchronized; publish only direct /checkmi/ and verify the exact artifacts by HTTP.

## Checkmi three-stage operating waterfalls · revision 24

Overview adds MSRP → net revenue and net revenue → gross before the existing gross → EBIT card. All use the same selected, filtered Result as headline cards/P&L: calculated MSRP sales amount + VAT + deductions = revenue, then seven signed cost groups = gross. Preserve residuals, mandatory group, explicit Mix quantities, zero-volume fixed costs, negative profit and empty-data distinction. Reuse the existing SVG palette and mark format; adapt spacing to four/nine/six steps, with wider cost card and stacked narrow layout. Business doc 1.24 and source Agent/chart notes are synchronized. No financial formula, source Excel, cash snapshot, homepage entry or Sites change; publish only /checkmi/ with exact source provenance and HTTP verification.
