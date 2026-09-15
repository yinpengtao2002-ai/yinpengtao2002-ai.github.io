# Checkmi maintenance

## Unit/rate performance and contribution-first overview · revision60

Source40cafc21e6013c3e1fed62d27352a4d5f741901d places model contribution first in overview, before the four KPI cards. Lifecycle and model gross/EBIT panels pair per-unit profit bars (万元/台) with corresponding margin lines (%). Sum quantities, net revenue and profits before calculating units/rates. Money labels remain below their own bars; rate point labels, axes and model/scenario/benchmark numeric tables include %. Remove the overview break-even widget while keeping financial math and Excel contracts intact. Unit-default waterfall, full model names, global scopes and unchanged model-share denominator remain.

Verification:193 source tests, TypeScript, lint and production build pass. Updated overview-performance verifies exact baseline/adjusted year/model units and rates, table-first order, percentage displays, removed widget and1366/390 bounds. model-overview, operating-bridge and benchmark-upload pass. Long model names and final continuous parameter interaction pass against the fixed production preview, with no runtime errors. Business1.60/public mirror, focused business guides and Agent documentation are synchronized. Personal routing/build verification and immutable asset hashes accompany this release; publish only /checkmi/, with no homepage link or Sites sync.

## Full model names, unit-first waterfall and performance order · revision59

Source f030fc139f5406e1117d52f861204bb49c778dba renders complete model/category labels with measured-width SVG wrapping, word-aware English breaks and Unicode grapheme fallback. Model performance allocates label height without shrinking the plot; horizontal model bars widen the name area and grow row spacing; benchmark charts reduce categories per page on narrow screens. Full model dropdown options wrap, and compact selected fields expose full names on hover. No name, record identity, financial aggregation or shared axis scale is changed.

Overview now presents lifecycle performance, immediately model gross/EBIT performance, then one continuous operating waterfall. The waterfall defaults to unit元/台 and retains its total亿元 switch, shared ledger and zero-volume behavior. The lower metric selector still controls model bars/matrix/annual trend; global filters/scenarios retain their meaning.

Verification:192 source tests, TypeScript, lint and source build pass. Long-model-names checks complete Chinese/English names, no label clipping/overlap,1366/390 bounds, all models reachable by paging, full dropdown text, correct order and unit default against development and the built preview. Existing model-overview, operating-bridge and benchmark-upload suites pass. Final repeated parameter-interaction passes against the fixed production preview; no runtime errors. Personal16 routing/deployment tests and production build pass. Business1.59/public mirror, focused business docs and maintenance instructions match. Publish personal /checkmi/ only, no homepage entrance or Sites sync.


## Global model scope and unit/rate combination charts · revision58

Source e44269d45307bbdde31455ea0da0f9a327d26dac removes the secondary frozen model console. Only metric is local; global filters and display/reference scenarios drive model results. Horizontal model bars and always-visible annual matrix share a desktop row, with annual trend and contribution in separate full-width rows. Volume-share tracks and values align without rebasing selected-model shares. Overview now has one operating waterfall with total/unit switching and unchanged ledger/zero-sales/detail behavior.

Benchmark comparison now displays actual unit net/gross/EBIT and gross/EBIT margins, without total or delta selectors. Gross/EBIT panels, annual view and model views pair monetary bars (万元/台) with smooth percentage lines; both model scales are shared across datasets/pages. Missing values stay missing, independent dataset scope and base-only scenarios remain. Entry uses existing750ms bar/line/dot reveal without replay on edits.

Verification:190 source tests, TypeScript, lint and source build pass. Updated model-overview, model-console, operating-bridge, benchmark-upload and repeated parameter-interaction browser suites pass, including mixed3/4-file uploads, first benchmark against demo, exact unit/rate results, saved Mix/scenarios, global filters, P&L drilldown, aligned shares, zero-volume bridge,1366/390 no-overflow and stable continuous drags. Personal16 deployment/routing tests and production build pass. Business1.58, public mirror, focused business guides, README and Agent notes match. Financial engine and Excel contracts unchanged. Publish only personal /checkmi/ without a homepage entrance or Sites sync.


## Unified model console and explicit benchmark upload · revision57

Source 726b3c0e0d59561a0abeeb1039a30d7894e80e21 replaces the model region's independent selectors with one shared console for metric, model identity, summary year and scenario. Model performance joins this region below project economics. Summary year scopes amount views while the annual line/matrix preserve time context; matrix becomes an expandable audit surface. Annual trend and contribution always occupy separate full-width rows. The console sticks below the measured global deck; model filters preserve the all-model quantity-share denominator and never apply assumptions or alter global scenario selection.

Reproduced and fixed the fresh-session benchmark import bug: 上传对标数据 was forced into first-base replacement, leaving the benchmark page empty. All upload entrances on the benchmark page now explicitly append against the current base, including demo. Ordinary first-base import remains available and preserves previously added benchmarks. Purpose controls are visible before application; importing against demo does not mark it as an uploaded real base.

Business1.57/public mirror, focused business guides, README and Agent instructions match. Verification:192 source tests, TypeScript, changed-file lint and source build pass; model-console, model-overview, benchmark-upload and repeated parameter-interaction browser suites pass, including exact first-benchmark reproduction, shared result/scenario scope, preserved shares, P&L drilldown,1366/390 layouts, pinned console, measured disclosure height/reduced motion and repeated drags without errors. Personal16 deployment/routing tests and production build pass. Financial formulas and Excel templates/export implementations remain unchanged. Publish personal /checkmi/ only without homepage links or Sites synchronization.

## Multi-table benchmarking and consolidated overview · revision56

Source 56dbb2792994d0ba241dbbb141fe9166f1dec5c8 introduces independent named dataset collections: first upload replaces demo/base; subsequent mixed XLSX/CSV/JSON files append benchmarks, while explicit base replacement resets base assumptions/snapshots and preserves benchmarks. Batch failures do not partially apply. The new 对标比较 tab provides shared total/unit/rate observation, selectable reference, separate dataset project/country/gate scopes, common/all/single years, annual lines and shared-scale model panels. Only the base receives a selected current/saved assumption; benchmark records never inherit it.

Navigation now has five tabs: overview, scenarios, benchmarks, cash and P&L. Data/definitions and model-analysis tabs are removed; downloads live in the import dialog. Annual model lines move to the overview bottom left of contribution, stack on narrow screens, and disappear for a single year. Scenario/model measures include unit gross and EBIT rate, with weighted numerators/denominators and percentage-point deltas. Parameter labels say 调整车型 / 调整年度. The business1.56 document, README and Agent notes match; formula/template/export contracts are unchanged.

Verification:189 source tests, TypeScript, changed-file lint, source build and16 personal deployment/routing contracts pass. Browser checks cover real mixed batch uploads through four datasets, renaming/removal, failed/successful base replacement, separate scope/scenario results, weighted units/rates/missing years, preserved benchmark settings across tabs, original model matrix/drilldown and fixed share denominator, both template downloads/styled exports, repeated parameter drags/numeric linkage/Mix locks/zero quantity,1366/390 layouts and real height transitions/reduced motion. Fixes a blank-screen cause where old bar indices referenced a shorter replacement dataset; rectangle color now uses its own payload. Publish personal /checkmi/ only, without a homepage entry or Sites synchronization.

## Remove redundant navigation shortcuts · revision55

Source 646fbda8cc18d773f8b5451ceef2f7b15411b330 removes 查看情景比较, 车型年度走势, 查看计算口径 and the break-even card's 调整经营参数 shortcut, including unused callback props and icons. The six top tabs and top parameter trigger remain the navigation entrances. Keep scenario saving/reset, model filtering, filter reset, matrix P&L drilldown, detail disclosures and the break-even comparison arrow. No financial or Excel changes. Historical local design demos remain unchanged.

Business1.55/public mirrors and README match. TypeScript and changed-file lint pass. Browser verification confirms absent duplicate buttons, all six top tabs and parameter save/reset availability,1366/390 layouts, retained model comparison/drilldown and accurate shares under filters, actual Mix edits and saved scenarios. Personal16 deployment/routing contracts and production build pass. Publish personal /checkmi/ only without a homepage entry or Sites synchronization.

## Aligned values, corrected model panels and stable shares · revision54

Source 5f909ffc9e197573d0947757adec71dbe24e6c05 places lifecycle/model total values below their actual bars, with per-vehicle values beside line points. Direct numbers omit unit suffixes; axes/tooltips retain 亿元 and 万元/台. Native bar geometry keeps values aligned when reference bars appear after an edit. Signed/tiny precision, smooth lines, subsecond entry and narrow pagination remain. Move the horizontal model comparison and numerical matrix together to overview before 车型贡献; keep annual model lines on 车型分析. The matrix retains year selection and P&L drilldown.

车型贡献 volume shares use all models in the same project/country/gate/year and displayed scenario as the denominator. Viewing only C preserves23.7%, while actual Mix changes and scenario selection still update the share. Headline metrics and P&L continue using the selected model scope. Business1.54/public mirrors match; Excel and the financial engine are unchanged.

Verification:183 source tests, TypeScript, changed-file lint and four browser suites pass. Checks cover actual bar/value alignment after reference-series insertion, positive/negative1366/390 layouts, chart placement, weighted single/all-year results, matrix drilldown, C23.7% under model selection and annual filters, actual Mix change to30%, and saved/baseline scenario switching. Continuous editing, reduced motion and total/unit waterfall regressions pass. Personal16 deployment/routing contracts and production build pass. Publish personal /checkmi/ only, with no homepage entry or Sites synchronization.

## Direct chart values and overview model comparisons · revision53

Source b0520c02173e4d9da287d2408fc0343e2eed5516 restores smooth connected model unit lines. Lifecycle/model total bars and unit points now carry direct values, including both compared scenarios. Totals remain 亿元; both charts' unit axes, labels and tooltips use 万元/台 without changing ledger amounts. Tiny signed amounts retain necessary precision. A bounded label layout separates annotations without moving marks; Recharts' label layer keeps them above bars, and the same subsecond reveal keeps labels/lines synchronized. Narrow screens paginate both dimensions with stable full-range scales. Hidden chart tooltips reset stale transforms to prevent overflow after resizing.

The annual model lines and 年度车型对比 horizontal bars move together to overview before 车型贡献. Bars default to 全部年度 and also accept a single year within the global filter. All-year totals/volumes are summed before deriving weighted unit EBIT and gross margin; missing and zero remain distinct. Model Analysis retains its numerical matrix and P&L drilldown. Business1.53/public mirrors match. Excel templates, exports and economics are unchanged.

Verification:183 source tests, TypeScript and changed-file lint pass. Browser checks verify actual single/all-year results, weighted ratios, current/reference linkage, relocated order, retained matrix drilldown, direct value/unit accuracy, connected lines, positive/negative1366/390 label separation and no horizontal page overflow. Overview total/unit waterfall and repeated parameter/negative-EBIT/reduced-motion regressions pass. Personal16 routing/deployment contracts and37-page build pass. Publish only personal /checkmi/ without a homepage entry or Sites synchronization.

## Overview rates, model performance and amount-basis badges · revision52

Source 19e88bfe998f5e883d0a4dd428ed6a4c293defc0 makes gross/EBIT rates the primary overview profit values, with their total amounts below and percentage-point comparisons. Both continuous operating bridges have prominent, distinct 总额 · 亿元 / 单车 · 元/台 badges. Add model performance below lifecycle performance: aggregate selected years by full model identity, compare gross and EBIT total bars with quantity-weighted unit dots, and keep nominal categories unconnected. Shared filters and scenario choices, equal-value de-duplication, missing/zero cases and signed fixed losses remain consistent with the ledger. Responsive model pagination uses the same axes across pages and never changes filters. Annual charts retain their prior rules.

Verification:180 source tests, TypeScript and changed-file lint pass. Browser checks independently verify rate/amount card values, percentage-point differences, badges, model total/unit tooltips, yearly/model filters, live scenario changes, zero-revenue rates, identity handling,1366/390 layouts and stable pagination scales. Continuous total/unit waterfall and repeated signed-parameter chart-update/reduced-motion regressions pass. Both business1.52 document copies match. Personal16 deployment/routing contracts and37-page production build pass. No workbook/import/export or cash-flow logic changed. Publish only personal /checkmi/ without a homepage entry or Sites synchronization.

## Continuous operating waterfalls in total and per-vehicle views · revision51

Source 343fb87889ebb287c79f4d7c9ff00a12b47aea1c joins the overview's former income/gross and gross/EBIT bridges into one full-width MSRP→net revenue→gross→EBIT chart. The matching chart directly below divides every amount, cumulative coordinate and child breakdown by the same selected scenario quantity. Total labels use 亿元; per-vehicle labels use integer 元/台 (two decimals below1 yuan) and two-decimal details, without rounding the ledger. Zero-quantity per-vehicle values are unavailable while total fixed costs/losses remain. Four cumulative anchors start at zero and have no constituent popover; signed account movements, genuine residuals, original colors and subsecond progressive entry remain. Desktop columns are tighter and narrow charts rotate to fit without horizontal dragging.

Remove only the overview's final net-profit metric card, leaving four cards, the break-even component, net-profit/income-tax calculations and other net-profit uses intact. The two Excel templates, r50 footer/freeze and all import/export rules are unchanged. Business1.51 mirrors match. Verification:177 source tests, TypeScript and changed-file lint pass; browser checks independently reconcile total/per-vehicle amounts, hover units, current scenario amounts, price edits, year/model filters, zero quantities, four cards, preserved break-even,1366/390 layout and entrance motion. Existing continuous chart-update, negative-EBIT and reduced-motion regressions pass. Personal16 deployment/routing contracts and37-page build pass. Publish only personal /checkmi/ with no homepage entry or Sites synchronization.

## Restored parameter footer and frozen column headers · revision50

Source dcf565c0053e4477b20da10aeb076e1a40866a35 restores the established calculation-parameter and filling-instruction styling in template rows70:89. Main rows1:69 retain the exact original BC formatting. The workbook keeps the original style registries and indices, appending only the footer styles and dependencies; do not replace the complete style table and lose this exception again. Parameter input colors, two-decimal percentages, note wrapping, row heights and merges are restored without changing any values, formulas or economics. Both the blank download and complete scenario export now freeze the first five header rows and first two columns at C6, retaining70% zoom. The current-filtered report is unchanged.

Verification:172 source tests, TypeScript and changed-test lint pass. The independent source contract retains7659 main/header cell style indices and row attributes, original style-registry prefixes, theme, widths and header content;2220 footer cells, row attributes and merges match the r48 footer. All9879 workbook values/formulas and all merges remain unchanged from r49. Reopened calculation probes and template/complete-export visual checks pass. Full-export tests cover actual parameter values, dynamically shifted footer rows, note merges and C6 views. Browser checks pass for complete saved/baseline/difference exports and formula/pasted-value imports. Business1.50 mirrors match; personal16 routing/deployment contracts and37-page production build pass. Only the personal /checkmi/ route is published, with no homepage entry or Sites synchronization.

## Exact BC source formatting and BOM child label · revision49

Source 38906cd3595adf8b02dfec054189bdf77a3232cc supersedes r48's partial style alignment. The upload template now carries the original BC worksheet's full style table/theme and mapped cell, row, column and view metadata: fonts, grey italics, original exceptional colors, borders, alignments/leading indentation, number formats, heights, outline/hidden states, C1 freeze and70% zoom. Remove the invented B2:B5 identification block and restore the original B1 title. Keep established business rows, including the reserved cost input at its source2pt height, and preserve original inputs/core formulas. Base BOM is now - BOM成本; old unprefixed templates remain accepted.

Average/lifecycle use quantity totals and quantity-weighted unit amounts. Ratios follow the original scope and signs: blank through revenue deductions, signed profit/net revenue, and negative signed cost/net revenue. Auxiliary cells are ignored by the importer. The complete exporter reuses the template style table and every mapped style/group attribute instead of recreating an appearance; dynamic rows retain template hierarchy. The existing current-filter report keeps its independent report format. Upload identification uses existing business/header anchors; original BC recognition, economic calculations, zero-volume handling and numeric override rules remain intact.

Verification:169 source tests, TypeScript and changed-file lint pass. An independent contract extracted from the original workbook checks7659 raw cell styles, all mapped row/column/view metadata,555 header values, merges and exact styles/theme hashes. Reopened effective styles and1800 prior inputs/formulas also match; temporary BOM changes reconcile through annual and lifecycle EBIT. Rendered template and complete export were inspected. Browser checks pass for formula and pasted-value imports, added years/subjects, actual BOM dash, complete saved/baseline/difference exports and1366/390px layout. Business1.49 mirrors match. Personal16 routing/deployment checks and37-page production build pass. Publish only the personal /checkmi/ route; no Sites or homepage entry.

## BC column layout and two P&L exports · revision48

Source 1b7283599e0c171a780c222e7d23b0e40c7fa725 aligns the downloadable P&L template with the original BC测算模板 through A:DG:111 column widths, grouped headers, model/Average, income-ratio and lifecycle columns, spacer columns, original Normal font 等线12 and theme. All r47 subjects and formulas remain in order; data moves down one row, labels to B, freeze C6. Only actual annual model amount columns are imported. Auxiliary columns never affect validation or calculations; dynamic groups and legacy templates remain supported.

The original export is now 导出当前筛选损益表 and retains its filtered report format. Adjacent 导出完整损益表 fills the upload-template layout from the chosen scenario's entire dataset, ignoring top filters and exporting actual values even from a difference view. It preserves actual custom subjects, separate outside-BOM gifts, pasted totals, source precision and tariffs. Zero-volume records without budgets retain scenario unit inputs; incompatible remaining budgets, input signs, prices, quantities and excessive column counts produce explicit errors before a misleading file is generated. Dedicated project/country/gate metadata and original income-tax grouping are not representable in this template; the documented roundtrip guarantee covers operating amounts through EBIT.

Validation:163 source tests, TypeScript and changed-file lint pass. Browser checks cover both import modes, extra years/models/subjects, auxiliary junk, repeated edits and1366/390px layout. Complete-export browser checks verify saved scenario versus later edits, full25 model-years despite one-model/year filtering, baseline and difference modes, exact re-imported economics and template styling. Read-only workbook checks verify111 widths and headers plus1800 mapped original input/formula cells; reopened calculations and rendered exports pass. Business1.48 mirrors match. Personal16 routing/deployment tests and37-page production build pass. Ten-file release includes both template files and all shared/lazy Excel chunks. Publish only direct personal /checkmi/; no homepage entry or Sites update.

## Explicit BOM base and subtotal · revision47

Source 4a6c77801ebc8a0f0372c8140e469fd2347a0854 supersedes r46's inclusive-input convention: physical17 BOM成本总额 now sums18 base BOM成本,19 gift and20 tooling. Overall cost counts the subtotal once. The upload adapter detects the explicit parent label; canonical20 is the parent,1000 is the known driver-linked base child. Legacy r45/r46 definitions and amounts remain compatible. Numeric subtotal overrides and independent additional subjects retain their existing rules.

P&L/Excel place the base directly below its parent, before gift/tooling. The operating waterfall shows the same three constituents and omits the separate gift bar when its source row is absent. Source/demo/standard-format economics and cash are unchanged. Business1.47/public mirror match; the styled template retains B5 freeze and five year/model header groups.

Validation:142 source tests, TypeScript, changed-file lint, and formula/values-only browser imports pass. Browser verifies four-row UI/Excel hierarchy and exact sum with two-decimal formatting. Reopened workbook input changes verify100000+2000+3000=105000, gift+2000 lowers unit EBIT95000→93000, then base+10000 lowers it to83000. Read-only comparison confirms2,094 preserved cells with shifted formulas/styles/heights/merges and zero cached errors. Personal16 deployment/routing tests and37-page build pass. Publish only the direct personal /checkmi/ route.

## Simplified BOM inputs in the P&L download · revision46

Source e6f95a3124f3843cfd3cc9aab655217ca076e171 removes the template's BOM unallocated input and separate duplicate gift row. BOM is now a yellow complete signed unit-cost input; the single retained gift and tooling rows are included breakdowns. Cost/gross/EBIT count the BOM parent once. Later Excel references, source formats, row heights and note merges move two rows; B5 freeze and all five year/model groups remain. Original attachment, standard template, demo/source economics and compatibility with old template IDs1000/23 remain unchanged.

Verification:139 source tests, TypeScript and changed-test lint pass. Reopened XLSX calculation changes BOM−100000→−110000 and EBIT100000→90000 yuan/vehicle with no duplicate detail charge. Read-only comparison verifies2,095 retained cells, shifted formulas/styles/heights/merges and no cached errors. Browser formula and values-only uploads, custom rows/years/models, exact formatted Excel values, parameter edits and compact layout pass. Business1.46 mirrors match. Personal16 deployment/routing tests and37-page build pass. Only personal direct /checkmi/ is published.

## Pasted numbers and nonblocking reconciliation · revision45

Source bf9701f150019d3bfbf7082e1bc3f40fc5104cdb fixes a reproduced tax-total false rejection: r44 recalculated numeric tax details from parameter rates before comparing the user's pasted subtotal. Explicit finite source values, including0, now take priority for tax/VAT/warranty, subtotals and core profit metrics. Formula/blank totals retain known aggregation. Real differences are preserved as visible residuals with bounded notices rather than rejecting the file; cent rounding does not trigger mismatch notices.

Scenario changes anchor on the uploaded baseline and apply supported tax/price deltas. Manual manufacturing/selling and net/gross/EBIT differences survive quantity changes and reconcile in the ledger, P&L export, operating waterfalls and scenario bridges. Cash, standard rows, original BC compatibility, independent custom entries, fixed budgets and group inclusion once remain. Business1.45/public mirror match; templates are unchanged.

Verification:138 source tests, TypeScript and changed-file lint pass. Browser tests pass for values-only XLSX with exact exported VAT−18000/tax−600/gross69000/EBIT62000 yuan per vehicle and visible residuals, original formula fixture, downloads, added years/models, continuous absolute/percentage edits, responsive layout and native chart entrance/no-replay. Publish only personal direct /checkmi/.

Personal16 routing/deployment contracts, TypeScript and37-page production build pass. Eight-file release retains unchanged styles and both templates; only the entry/lazy-export build references and business guide change.


## Two upload templates and extensible P&L · revision44

Adds distinct P&L/standard-row upload choices with two downloadable Excel templates. The supplied P&L layout supports dynamic SOP years/model columns and inserted/deleted detail rows within known parents. Predefined sums/taxes are recalculated from input leaves; uploaded custom formulas are never executed. New subjects retain independent amounts and flow into parent totals, named hover details, scenarios and the formatted P&L export. Imported group allocation enters EBIT once; fixed expenses retain source budgets. Original BC compatibility and cash isolation remain.

Source verification:134 economics/import/export/scenario tests, TypeScript and changed-file lint; browser coverage for actual XML row/year/model edits, upload previews/errors, both downloads, reopened Excel amounts/formats, repeated absolute/percentage edits and1366/390px layout. Animation regression now compares edits against the completed entry's initialized startTime rather than a pending animation's null startTime. No chart runtime changes. Business1.44 mirrors match. The release allowlist now includes both templates and hashes eight files. Personal direct /checkmi/ only; no Sites, demos or homepage link.

Source cac1d7b8cc0f00591ec63e95ff00babbe53960ff. Personal checks:16 deployment/routing contracts pass, lint has no errors and the four existing Goalkeeper warnings, TypeScript and the37-page production build pass.


## Live amount values in price and cost · revision43

Source6e5593ee72a08a6123ac666fc55f42c45b40228a fixes the common-only amount preview: heterogeneous model/year amounts previously stayed 多值 during percentage edits. 实时金额 now displays the current-quantity-weighted unit value, including exact Mix allocations, with a small 加权 qualifier. Zero quantities use original-volume/equal reference weights; no records stay unavailable. Original-volume percentage comparison and direct monetary target/local precedence remain unchanged. Merely displaying the average never changes any underlying unit amounts.

All124 source economics/import/export/scenario tests, TypeScript, changed-file basic lint and production build pass. Expanded browser regression covers initial numeric values for all three fields, percentage edits and held-pointer live updates, Mix100% concentration, reset, target/local/save/P&L and1366/390px layout. In-app layout inspected. Business1.43 and its source mirror match. Existing quantity/Mix controls, ledger, snapshots, source workbook, cash and special totals unchanged; personal direct /checkmi/ only.

Personal validation:16 deployment/routing contracts pass, lint has no errors and the four existing Goalkeeper warnings,37-page production build and TypeScript pass. The seven-file release manifest retains the unchanged template and stylesheet.

## Absolute and percentage parameter inputs · revision42

Source81b5e91bfdab05331ea9b4f6200026d684af9343 adds final price/BOM/deduction amounts in yuan per vehicle beside percentage sliders/inputs. Amount edits display change against the immutable original; percentage edits replace the target using that same baseline. Local inputs of either mode override global defaults. Multi-record percentage summaries use original volume weights, independent of Mix; zero baseline ratios remain undefined. Known subaccounts preserve original proportions and missing-detail reconciliation.

Total vehicles and original-relative percentage are editable beside the allocation-year selector. Model quantities accept exact integers, rebalance unlocked peers, retain locked counts and feed the same annual allocation, P&L and saved-scenario ledger. Displayed two-decimal Mix never rounds an exact vehicle input. Total changes preserve actual allocation proportions including zero/restore. Numeric targets and integer allocations are included in styled Excel assumptions with correct units/formats.

All122 upstream economics/import/export/scenario tests, TypeScript, changed-file basic lint and production build pass. New browser regression verifies bidirectional price and total inputs, scope, continuous dragging beyond prior slider limits, exact counts, locks, saves/P&L and1366/390px overflow. Existing repeated-parameter and native chart-motion regressions pass. In-app desktop/narrow layouts inspected; temporary viewport reset. Business doc1.42 matches source mirror. Original workbook, cash and special fee-total rules unchanged; retain revision41 crash fix. Personal direct /checkmi/ only.

Personal verification:16 deployment/routing contracts pass, ESLint has no errors and the four existing Goalkeeper warnings,37-page Vercel production build and TypeScript pass. Seven manifest files include the new entry/CSS/lazy Excel chunk, matching business guide and unchanged template.

## Repeated parameter edit crash · revision41

Resolves the revision40 open investigation below. The user's actual production Chrome captured React185 (maximum update depth) in Recharts Bar animation-end state updates, invoked by JavascriptAnimate cleanup. Price/cost and Mix both continuously update these charts. All four production Bar declarations now use native SVG entrance clips with Recharts JS animation disabled, eliminating that cleanup/state feedback path. Keep numeric-zero origins in both orientations, signed amounts, custom model colors,750ms entry and reduced motion. In-place edits render final values and retain completed clips. Existing line/marker, waterfall and business rules remain unchanged.

Source53fee82582f6b9698ac035ae48b90c06445e5b29:112 source regressions, TypeScript, basic changed-file lint and build passed. Browser regression first failed on continued geometry interpolation before the fix and now passes; it also checks entry duration, negative EBIT, zero origin, no replay during edits and reduced motion. Repeated parameter drags/numeric/save/navigation pass at1366x768 and2560x1264. Exact fatal stack was captured in the user's session; the headless test reproduces the unsafe animation behavior, not a deterministic fatal race. Business guide1.41 matches its source mirror. Only personal direct /checkmi/, no homepage entry, demos or Sites.

## First Mix drag and total-row composition · revision40

Capture resolved editor selection on first Mix write to prevent all-years scope becoming the new plan year list and remounting the active slider. A failing browser test reached24.39% instead of60% before the fix; it passes afterward and preserves the actual slider DOM. Composition returns to the right of total sales, uses the same plan shares/colors, and wraps on narrow screens. Reserve restore-action space to avoid first-edit layout jumps. No economics changes.

112 source tests, TypeScript, basic changed-file lint and the continuous-drag/numeric/save/navigation browser regression passed.1280x640 editor187.93px and no page overflow;390px page375/375 and editor326/326. Business guide1.40 mirrored.

OPEN: user-reported white-screen crash after2–3 edits has not been reproduced or resolved. No captured error in their existing older tabs; fresh local/production and in-app repeated-edit probes produced no uncaught errors. Await exact reproducing steps; do not advertise this release as a white-screen fix. Upstream docs/parameter-workbench.md contains investigation evidence. Personal direct /checkmi/ only, no homepage entry, demos or Sites.

## Compact notebook parameters · revision39

User requests a much smaller editor on14-inch notebooks, and reiterates no total/unit fee selectors. Monetary totals and tax remain; presentation now uses a single horizontal category/save/reset/compare toolbar, four expense fields, and five Mix model inputs per desktop row. Remove duplicated titles, descriptions, composition strip and disabled tariff input; tariff is a short inactive label. Narrow inputs remain readable with two columns. Single Mix plan no longer duplicates a tab; multi-plan/conflict selection remains. Historical local demos use compact=false.

1366×768 special panel falls417.59→182.64px; price/Mix about188px.1280×640 fits the common controls without internal overflow;390px page/editor have no horizontal overflow. Cap280px and48dvh minus the measured toolbar, with120px floor, keeps long/error states internally scrollable. Height motion remains0.26s; after a1945px P&L scroll the deck spans0–294.30px and two frozen table headers begin295/345px. Quantity/Mix edits, scoped monetary input and blank-name saved alias were exercised. Source112 tests, TypeScript, basic changed-file lint and build pass; document1.39 is mirrored. No model, source, P&L/export numbers or cash changes. Publish only direct /checkmi/, no home entry, demos or Sites.


## Editable expense totals · revision38

User clarified special adjustments require actual monetary amounts. Production now has four direct total inputs in 万元: manufacturing/R&D/fixed selling/group allocation. No total/unit selector or group-rate input; price/cost keeps price/BOM/deductions. Monetary scope follows top filters, shown explicitly. Capture original fee proportions by record ID once; viewing subsets or subsequent quantity/Mix changes never repartition the total. Partial edits preserve other scopes, zero is explicit, restore removes only selected amounts. Fixed totals and child ledger feed gross/EBIT, annual tax and break-even; group is charged once. Unchanged source group-ratio behavior remains only until an explicit amount is entered.

Preserve B layout and0.26s actual-height motion. Saved amount maps are deep-copied and participate in duplicate-current matching. Excel keeps the signed main ledger and adds numeric expense assumptions with scope/unit notes. Business guide1.38 is synchronized. Upstream112 tests, TypeScript, basic changed-file lint and production build pass. Browser confirms totals unchanged after1.2m volume/modelA40%Mix, saved name alias, filtered annual allocation and390px no page/editor overflow. Only personal /checkmi/, no homepage entry/demos/Sites.


## Special allocations and four-metric comparison · revision 37

User requested price/cost before Mix, and evaluated additional special adjustments. Default group is now price/cost. R&D allocation and fixed selling can independently inherit or override the common total/unit convention; net-revenue group allocation can use an explicit rate or retain individual source rates. Group allocation always enters EBIT once. Defaults, immutable source rows, existing scoped percentages, scenario matching and independent cash snapshot remain. Mixed-mode break-even includes only effective fixed totals. P&L child rows and Excel assumptions use the same modes and numeric group rate; business guide1.37 explains sequence, scope and examples.

Scenario comparison keeps quantity, net revenue, gross and EBIT only. Four small charts group the same account together; quantity uses 万台, money uses 亿元, with independent axes. Net revenue is visually lighter. Annual lines switch EBIT/gross, and values/saved tables contain the same four metrics. Waterfalls remain below. Hidden tooltip positioning is bounded on narrow resize. Source108 regressions, TypeScript and real desktop/mobile interactions passed; upstream lint limitation remains documented. Keep personal direct-only publication, no demo entry or Sites synchronization.

Personal validation: all16 release/routing/deployment contracts passed and the37-page production build completed, including TypeScript. The seven manifest files contain the matching business document and the lazy Excel export chunk.

## B parameter workbench and saved-scenario display · revision 36

User selected B from three LOCAL design demos. Adopt its sage/neutral grouped parameter workspace in the formal dashboard: Mix, price/cost and special categories; single scenario name/save form at the editor top. Comparison's extra form is removed. Categories switch by260ms measured height, preserve values and remain inside the frozen deck; mobile Mix has two columns. Only the formal built entry is synchronized here; A/B/C demo sources and review entry remain local.

Saved-current deduplication uses full parameter/Mix state rather than formatted profit equality. Whole-page current aliases the latest matching saved name; price/cost/Mix/tax edits restore a current draft. The comparison chart omits current only when assumptions and record scope both match a saved snapshot, including its legend/value/waterfall options. A different year/model scope remains comparable. Saved deletion, record-order allocation ties, tax, locks and no-data rules are retained. Business document1.36 covers the sequence; no financial engine/source/cash/export format or homepage/Sites changes.

Revision36 verification: upstream102 regressions, TypeScript and formal build passed; real browser checks covered saved/current transitions, automatic naming, Mix total, tax, different-year scope, P&L names and desktop/390px layouts. Upstream basic lint passed with native type-aware helper unavailable on Windows (see source QA receipt). Personal16 route/release/deployment checks and37-page production build passed; ESLint has no errors and the four existing Goalkeeper warnings. The deployment test now uses `fileURLToPath` so Windows paths do not duplicate the drive letter. Slider center alignment avoids hidden-panel measurement dependence without resetting drafts. Publish only the seven manifest files and this maintenance record.

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

## Annual P&L and detailed income deductions · revision 25

P&L now offers model or annual summaries. Annual mode merges selected models by year within each project/country/gate, sorts chronologically and uses annual quantity/revenue denominators. Default 25 model-years become five year groups plus total. XLSX mirrors annual grouping with 年度损益表 naming, preserving numeric precision, formats, colors, frozen headers and scenario assumptions. Revenue waterfall expands five provided deduction subjects, plus nonzero reserved subjects and any signed unallocated balance; no parent double-counting or invented child data. Revenue/cost cards are equal width with adaptive SVG spacing. Business doc1.25 and Agent/chart notes are synchronized; source economics, original Excel, cash and direct-only personal route remain unchanged. No Sites synchronization.

## Checkmi waterfall hover detail · revision 26

Overview's three operating waterfalls retain only parent accounts (four/nine/six bars). Hover or click opens a compact panel beside the bar: signed yuan total, diverging horizontal composition stack, matched subject names and amounts. Income deduction children move out of the main chart; manufacturing/selling fixed-variable details, R&D, taxes, logistics, BOM and other-cost/expense residuals reconcile to each parent. Group allocation remains included once. Missing detail is labelled as unallocated, positive credits and zero-net offsets retain both signs. Keyboard open/dismiss, portal collision handling and fresh scoped-result lookup preserve reading/filter behavior. Business doc1.26 and source Agent/chart notes are synchronized. Annual P&L and styled Excel remain intact; no economic formula/source/cash or scenario-difference bridge changes. Publish only direct /checkmi/ without a navigation entry or Sites update.

## Checkmi vertical detail and page-entry motion · revision 27

Hover detail now matches the main chart's亿元 unit, sorts subjects by descending magnitude and uses a vertical composition column. Amount labels sit over the column with corresponding names at right; small segments keep exact heights and use leader-connected label spacing. Signed values, zeros and unallocated residuals remain. All overview/model/scenario/cash bars and lines enter concurrently in750ms, with no stagger; returning to a page replays through existing panel unmounting. Reduced-motion settings show final results directly. Business doc1.27 and source Agent/chart notes are synchronized. Financial calculations, annual P&L and styled XLSX remain intact. Focused local-browser previews verified the new detail and entry/re-entry behavior; publish only direct /checkmi/ without navigation or Sites changes.

## Checkmi synchronized markers and redesigned detail · revision 28

Progressive line rendering now shares one750ms reveal window across smooth paths, ordinary/model-shape markers and active hover markers; points no longer appear ahead of the curve. Keep page re-entry replay, reduced-motion behavior, dashed comparisons and gaps. Hover composition uses a compact360px surface, restrained olive/sage tones, unboxed amounts on the column and names at right. Thin components retain true heights and get aligned annotations below; equal manufacturing accounts fit directly inside the stack, all-zero composition collapses the blank plot. Business doc1.28/source Agent/chart notes are synchronized. Focused browser checks cover all four chart pages, custom/active marker clipping, model-filter updates and three density cases; financial/P&L/Excel/cash/source logic is unchanged. Publish only direct /checkmi/ with exact hashes; no homepage/nav/catalog or Sites update.

## Immediate checkmi hover detail · revision 29

Hover detail now opens fully and dismisses without visual entry/exit/reveal animation. Its layout, signed amounts, sort, tiny-account annotations and pointer/keyboard handling stay unchanged. All main-chart750ms bar/line/marker motion remains. Business doc1.29 and Agent/chart notes are synchronized. Only /checkmi/ is updated; no financial/export logic, navigation/catalog entry or Sites synchronization.

## Continuous responsive waterfall and ordered entry · revision 30

The two overview income/cost cards become one12-account MSRP → net revenue → gross chart. Net revenue is a zero-anchored intermediate subtotal, carried into subsequent costs without adding it again. Preserve the6-account EBIT bridge, break-even widget and all instant hover detail. Overview/scenario waterfalls share a width-aware native plot: readable columns on wide panels, sequential rows with name/amount columns on narrow panels, without SVG minimum widths or sideways chart scrolling. Their entry-only750ms reveal follows account order and includes connectors/labels, replacing sign-dependent per-bar growth. Financial engine, data, P&L/export and smooth-line markers are unchanged. Business doc1.30 and source Agent/chart notes are synchronized;95 source regressions and focused390px browser previews cover the changes. Publish only direct /checkmi/ with exact hashes; no navigation/catalog entry or Sites update.

## Total bars without duplicate detail · revision 31

All total/subtotal waterfall bars (MSRP, net revenue, gross, EBIT) retain their figures, values and entry motion but have no hover/click/keyboard detail, since the main path already describes their composition. Non-total deduction/cost/expense bars retain immediate detail. Semantic total flags govern both trigger rendering and fresh popup lookup; no financial mapping, source data, export or responsive layout changes. Static React rendering verifies all totals are noninteractive and all other triggers remain across normal/zero/loss/scoped cases. Business doc1.31 and source Agent/chart notes are synchronized. Publish only direct /checkmi/ with exact hashes; no navigation/catalog entry or Sites update.

## Frozen expanded checkmi parameters · revision 32

The expanded parameter editor now belongs to the sticky navigation/filter deck, so scrolling result charts leaves controls available. Cap its visible height using the viewport and separately measured toolbar, and scroll longer Mix/special/save contents internally; the collapse trigger remains outside that scroll area. Measure the full deck for P&L header offsets, including open/close height changes. The nested editor follows its parent width in the wide P&L, and the Mix shortcut scrolls within it. Browser checks cover scrolled live edits, expanded/collapsed P&L headers,390px overflow and save reachability, plus cash-page suppression. Business doc1.32 and source Agent notes are synchronized. No financial/export/source data or Sites changes; publish only direct /checkmi/ with exact hashes.

## Model-analysis navigation · revision 33

Rename the visible portfolio tab to 车型分析, since it presents model-level metrics and annual comparisons. Preserve the internal key and existing scope filters, charts, P&L links and financial calculations. Business doc1.33, source Agent notes and the model-comparison design document use the same label. Publish only direct /checkmi/; no homepage/navigation/catalog entry or Sites update.

## Compact parameter saving controls · revision 34

Move the scenario name and save form beside model/year scope at the top of the expanded editor. Narrow screens wrap the form below scope but keep input/button together. Reset and view-comparison move to a compact tools row, removing the old two bottom rows and reducing spacing; desktop default editor height drops from383px to273px. Existing automatic naming, named saves, close-and-compare navigation and frozen deck/P&L offsets remain. Browser verification covers both saves, desktop/narrow width and the table header. Business doc1.34 and source Agent notes are synchronized; keep 车型分析 naming and direct-only /checkmi/ publication, without financial/export/Sites changes.

## Smooth Mix and special-adjustment sections · revision 35

Both inner parameter sections now expand/collapse through measured240ms height transitions with matching arrow rotation. Existing Base UI primitives keep hidden editors mounted, retain entered values and handle reversed transitions; the sales-to-Mix shortcut locates the section after expansion, with immediate reduced-motion behavior. The frozen height cap and compact save heading remain. Source README/Agent notes record smooth interaction as an ongoing acceptance requirement, preserving immediate hover exceptions. Browser checks cover intermediate/final heights, reversal, retained tax/Mix inputs, reset and narrow layout. Business doc1.35 is included; financial/export data and Sites remain unchanged. Publish only direct /checkmi/.

Revision38 personal checks:16 route/release/deployment tests passed; production build and TypeScript completed. ESLint has0 errors and4 existing Goalkeeper warnings.

Revision39 personal validation:16 release/routing/deployment tests pass;37-page production build and TypeScript complete. ESLint has0 errors and4 existing Goalkeeper warnings.

Revision40 personal validation:16 route/release/deployment checks and37-page build passed. ESLint0 errors,4 existing unrelated Goalkeeper warnings.
