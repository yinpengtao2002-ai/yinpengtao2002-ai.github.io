# Hex Product Stage Design

## Direction

Use Hex-style product staging as the reference for Lucas Yin's homepage and model library, without copying Hex branding. The site should feel like a personal capability profile built around a real finance-model product system.

The approved direction is a mixed asset system:

- Homepage: product-stage hero with layered model output windows, AI interpretation, charts, and tables.
- Finance model library: each model gets a chart-stacked preview image that shows what the model produces.
- Future refinement: generated direction images can be replaced or tightened with real model screenshots and HTML/CSS redraws.

## Visual Rules

- Model visuals must show the model itself, especially output charts, tables, KPI cards, and analytical views.
- Mac-style browser/app window chrome is allowed as a container, but it should not dominate the asset.
- Do not use scenic covers, mountains, bridges, landscape imagery, or decorative business metaphors as the main model image.
- Do not emphasize control consoles or settings panels in the model preview images.
- Keep the warm paper-grid background, soft shadows, ivory surfaces, muted terracotta, soft blue, sage green, warm black, and pale gray.
- Avoid neon, cyberpunk, generic SaaS gradients, stock-photo styling, and fake readable text inside generated images.

## Homepage Hero

The first screen should present Lucas as someone building practical finance-analysis systems, not just listing resume items.

The hero should include:

- A large product-stage visual made of layered finance model windows.
- A visible AI interpretation/chat panel as part of the staged product system.
- Chart/table modules as the dominant visual content.
- Clear entry actions for finance models and AI-assisted explanation.
- Lucas Yin identity retained, but secondary to the capability/product story.

## Model Preview Images

Each model preview should be a chart-module collage:

- Budget vs Actual Analysis: variance bridge, profit bridge, KPI comparison, dimension performance, variance summary table.
- Monthly Trend Analysis: trend line, YoY/MoM comparison, heatmap, structure share, concentration/ranking, KPI cards.
- Profit Sensitivity Analysis: tornado sensitivity ranking, profit waterfall, two-variable matrix, scenario comparison, result cards.
- Unit Margin Attribution: unit margin waterfall, mix/rate effect comparison, dimension drilldown, contribution table, explanation card.

## Asset Generation

Use generated images for direction and mood, especially for:

- Homepage product-stage direction image.
- First-pass model preview direction images.

Use real screenshots or HTML/CSS redraws when precision matters, especially for:

- Final model preview details.
- Charts that need to match the actual finance tools.
- Any asset where fake UI would reduce credibility.

## Implementation Shape

The first implementation pass should:

- Add a reusable model preview asset system.
- Update homepage hero from decorative floating widgets to a larger product-stage composition.
- Upgrade finance model cards to include chart-stacked preview imagery.
- Preserve existing routes, content sources, and AI assistant behavior.
- Keep mobile behavior deliberate: preview images should crop or stack cleanly and must not make the first screen feel like a giant poster with no useful content.

## Verification

Before shipping:

- Run site tests, lint, TypeScript, and the Vercel-equivalent build.
- Check desktop and mobile screenshots of the homepage and finance page.
- Confirm generated files are intentional and no unrelated content generation changes were committed.
