# Goalkeeper Landscape Lab Design

## Context

The current goalkeeper game at `/tools/goalkeeper-landscape` is playable and should stay stable while we improve the weakest areas: ball-ground behavior, glove contact feedback, and scene asset quality. We already use Rapier for physics, so the next step is not to replace the engine. The next step is to create an isolated experiment surface where physics and asset candidates can be evaluated before anything is migrated into the live game.

## Decision

Create a hidden but ungated lab route:

`/tools/goalkeeper-landscape-lab`

The route must not appear in the public navigation, Thinking Lab tool list, sitemap, or visible discovery surfaces. Anyone who knows the URL can open it. If the lab later includes private or license-uncleared assets, it can be moved behind the existing private-tool access mechanism.

## Goals

- Keep `/tools/goalkeeper-landscape` unchanged as the stable player-facing game.
- Provide a focused place to test physics scenarios without waiting through full gameplay loops.
- Provide a focused place to review scene assets, licenses, and rendering/performance fit.
- Make good experiments easy to compare, screenshot, and eventually migrate into the stable game.

## Non-Goals

- Do not replace Rapier with another physics engine in this phase.
- Do not directly ship new physics behavior to the stable game from the lab.
- Do not import third-party assets into production without explicit license review.
- Do not add this lab to navigation, sitemap, or public tool listings.

## Route Shape

The lab should live under `src/app/tools/goalkeeper-landscape-lab/`.

The page should use a restrained workbench layout:

- Left rail: lab identity, route context, and mode switch.
- Main preview: a large visual area for either physics or asset review.
- Right or lower telemetry area: numeric readouts, selected case details, and notes.

The first version should be a real route, not a redirect and not a marketing page. It should be usable immediately as an internal testing surface.

## Physics Lab

The Physics Lab is for repeatable collision and ball-behavior cases. It should begin with deterministic test scenarios rather than full gameplay:

- Low rolling ball: verify ground contact, rolling friction, bounce damping, and spin decay.
- Center catch: verify pocket catch behavior and contact quality.
- Side parry: verify glove swipe transfer, lateral deflection, and rebound speed.
- Rising palm: verify upward glove motion and realistic lift.
- Poor contact: verify brushing, partial deflection, and goal continuation.

Each scenario should show:

- active scenario name;
- outcome state;
- ball position, velocity, and angular velocity;
- last contact type, point, normal, and strength when available;
- visible debug markers for contact points and rough trajectory;
- a quick reset/replay action.

The lab should reuse the current Rapier world and shot/glove modules where possible. If a new helper is needed, it should be small and route-local until it proves useful enough to migrate.

## Asset Lab

The Asset Lab is for reviewing scene upgrades before they become game dependencies.

The first version should support an asset candidate list rather than a full asset pipeline. Each candidate should record:

- asset name;
- category: field, goal, ball, glove, shooter, stadium, lighting, or material;
- source URL or local path;
- license;
- status: candidate, approved for prototype, rejected, or needs review;
- intended use in the game;
- rough performance notes.

The preview area should initially support placeholder cards and local GLB/GLTF preview wiring. Real downloaded assets should only be added after license and source are clear.

Candidate starting points:

- Khronos glTF Sample Assets for loader and rendering pipeline validation.
- Kenney official assets for CC0-style low-poly candidates, downloaded from official sources rather than third-party mirrors.
- Small custom procedural assets when a real licensed model is not yet available.

## Data And State

The lab should avoid persistent server state in the first version. Scenario definitions and asset candidates can be static local data. This keeps the route easy to review and avoids adding an API surface.

If later we want comparison notes or screenshots saved, that should be a separate phase.

## Testing

The route needs contract tests that lock the hidden nature of the lab:

- route file exists and renders a lab page;
- route is not included in `sitemap.ts`;
- route is not included in Thinking Lab content;
- route is not included in global navigation/tool discovery;
- route does not redirect away from the lab;
- route includes clear `Physics Lab` and `Asset Lab` surfaces.

Physics behavior changes should continue to use Vitest tests in `tool-sources/goalkeeper-landscape/tests/`, especially `rapier-world.test.js`, before migrating any lab finding into the stable game.

Browser verification should cover desktop and mobile widths because the game is landscape-first and the lab will be used for visual review.

## Rollout

Phase 1: Build the hidden route shell with Physics Lab and Asset Lab placeholders, deterministic scenario list, asset candidate list, and route-discovery contract tests.

Phase 2: Wire the Physics Lab to the existing Rapier world with deterministic scenario replay and telemetry.

Phase 3: Add GLB/GLTF asset preview support and a first curated candidate list with license notes.

Phase 4: Promote only validated physics and asset improvements into `/tools/goalkeeper-landscape` through small, test-backed changes.

## Risks

- The lab could accidentally become discoverable. Contract tests should explicitly prevent this.
- Asset work can drift into license risk. The Asset Lab should treat license as a first-class field.
- Physics experiments can become overbuilt. The lab should start with deterministic cases and telemetry, not a full editor.
- Route code can duplicate too much of the game. The first implementation should reuse existing modules where practical and keep experimental code route-local until proven.
