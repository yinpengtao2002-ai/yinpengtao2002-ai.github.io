# Agent Handoff Notes

This file is the first place future AI agents should read before changing this project.

## Project Overview

- This is Lucas Yin's personal website: `yinpengtao.cn`.
- Tech stack: Next.js 16, TypeScript, App Router, Tailwind CSS v4, Framer Motion.
- Main branch is `main`; changes are expected to be committed and pushed directly unless the user says otherwise.
- The user prefers fast practical fixes, but visual details matter a lot, especially mobile UI, typography, and back-navigation behavior.

## Common Commands

- Lint selected files: `npx eslint path/to/file.tsx`
- Type check: `npx tsc --noEmit`
- Production build: `npm run build`

Important: `npm run build` runs `scripts/generate-content.js` first and often rewrites `src/lib/data/generated/content.ts`. If the generated file change is unrelated to the task, restore it before committing:

```bash
git restore --worktree -- src/lib/data/generated/content.ts
```

## Key Project Structure

- `src/app/page.tsx`: homepage sections.
- `src/components/layout/Hero.tsx`: homepage hero typography and animation.
- `src/components/ChatWidget.tsx`: floating AI assistant, including mobile sheet/fullscreen behavior.
- `src/app/article/[category]/[slug]/article-client.tsx`: article rendering.
- `src/lib/markdown/normalizeStrongEmphasis.ts`: fixes Markdown bold edge cases such as `**"$text"**` and `**$81.40/桶**`.
- `scripts/generate-content.js`: merges local Markdown and Notion content into generated data.
- `content/`: local Markdown content source.
- `public/tools/margin-analysis/`: static HTML/CSS/JS version of the margin analysis tool.
- `src/app/finance/margin-analysis/page.tsx`: embeds the static margin analysis tool.

## Behavior Rules To Preserve

- Back buttons should return to the real previous page using `router.back()`, with a sensible fallback only when no browser history exists.
- Mobile AI links to internal pages should close the AI panel so the destination page is not covered.
- Desktop AI should remain a side/floating assistant where possible; do not blindly apply mobile behavior to desktop.
- Avoid reverting user changes or generated work unless the user explicitly asks.
- Keep mobile and desktop in one responsive implementation when feasible; do not create separate feature forks unless there is a clear reason.

## Design Notes

- Current global typography uses Poppins for UI/headings and Lora for body/article text.
- Hero subtitle has custom display handling; typography has been sensitive, so change it carefully.
- The site visual direction is warm, Claude/Anthropic-inspired, light, editorial, and restrained.
- Avoid adding fake controls. If a control looks interactive, it should have a real purpose.

## Markdown File Inventory

- `agent.md`: this handoff file. Keep it current when project conventions change.
- `content/finance/margin-analysis.md`: active content source for the finance card/list entry. Do not delete casually.
- `website-changelog.md`: useful narrative history of the website rebuild. Not used by runtime, but valuable documentation.
- `README.md`: mostly default create-next-app boilerplate and currently outdated. Candidate for replacement, not urgent.
- `findings.md`: old January 2026 refactor audit. Mostly stale historical planning material.
- `progress.md`: old January 2026 refactor progress log. Mostly stale historical planning material.
- `task_plan.md`: old January 2026 refactor plan. Mostly stale and not representative of the current codebase.

Do not delete stale Markdown files without explicit user confirmation.

## Recent Gotchas

- The margin analysis tool is now static frontend files, not Streamlit. Only the required files were copied into `public/tools/margin-analysis/`.
- The source folder on Desktop contained extra files such as `.git`, `.DS_Store`, `.claude`, `.devcontainer`, and `agent.md`; these were intentionally not copied into this project.
- Markdown bold rendering had CommonMark delimiter issues when `**` touched quote/currency characters; use the existing normalizer rather than patching article text by hand.
