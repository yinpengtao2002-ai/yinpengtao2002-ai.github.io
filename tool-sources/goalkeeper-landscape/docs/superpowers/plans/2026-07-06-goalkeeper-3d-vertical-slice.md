# Goalkeeper 3D Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Canvas-first goalkeeper prototype with a playable Three.js + Rapier3D vertical slice where fast football shots originate from the shooter, gloves are smaller physical bodies, and saves/goals resolve through 3D physics.

**Architecture:** Keep the existing Vite app, HUD, audio, pointer collection, and round state, but boot a new 3D runtime from `src/main.js`. Add focused modules for 3D shot planning, pointer-to-world glove mapping, Rapier physics, and Three.js procedural visuals.

**Tech Stack:** Vite, vanilla JavaScript ES modules, Three.js, `@dimforge/rapier3d-compat`, Vitest, browser verification via local dev server.

---

## File Structure

- Modify: `package.json` - add `three` and `@dimforge/rapier3d-compat`.
- Modify: `src/main.js` - replace Canvas 2D loop with async 3D runtime boot.
- Modify: `styles.css` - adjust stage/canvas styling for a full-bleed 3D scene and keep controls clickable.
- Create: `src/game/shot-3d-director.js` - deterministic shot cues, ballistic launch planning, phase transitions.
- Create: `src/game/three-game-runtime.js` - orchestration loop, score/outcome handling, HUD/audio/effects wiring.
- Create: `src/input/glove-controller.js` - pointer-to-world glove target mapping and smoothing.
- Create: `src/physics/rapier-world.js` - Rapier world, ball, gloves, goal frame, net/backstop, collision/outcome events.
- Create: `src/three/procedural-assets.js` - procedural football texture, field, goal, net, shooter, glove meshes.
- Create: `src/three/goalkeeper-scene.js` - Three renderer, camera, scene lifecycle, visual updates.
- Create: `tests/shot-3d-director.test.js` - shot planning behavior.
- Create: `tests/glove-controller.test.js` - world mapping behavior.
- Create: `tests/rapier-world.test.js` - physics world behavior.
- Modify: `design-qa.md` - append 3D verification notes after browser checks.

## Task 1: Dependencies And 3D Shot Planning

**Files:**
- Modify: `package.json`
- Create: `src/game/shot-3d-director.js`
- Create: `tests/shot-3d-director.test.js`

- [ ] Step 1: Install runtime dependencies with `npm install three @dimforge/rapier3d-compat`.
- [ ] Step 2: Write failing tests proving shot origin is near `{ x: 0, y: 0.28, z: -30 }`, launch velocity is fast toward positive z, cue metadata exists, and late shots are faster than early shots.
- [ ] Step 3: Run `npm test -- tests/shot-3d-director.test.js` and confirm it fails because the module does not exist.
- [ ] Step 4: Implement `createShot3DDirector`, `createShot3D`, `updateShot3DDirector`, `completeShot3D`, `planBallisticVelocity`, and `difficultyFromElapsed3D`.
- [ ] Step 5: Run `npm test -- tests/shot-3d-director.test.js` and confirm it passes.

## Task 2: Glove Controller

**Files:**
- Create: `src/input/glove-controller.js`
- Create: `tests/glove-controller.test.js`

- [ ] Step 1: Write failing tests for `createGloveController`, `mapPointerToGloveTarget`, and `updateGloveController`.
- [ ] Step 2: Run `npm test -- tests/glove-controller.test.js` and confirm it fails because the module does not exist.
- [ ] Step 3: Implement bounded world mapping: left screen maps negative x, right screen maps positive x, upper screen maps higher y, target stays inside goal mouth, and touch smoothing is stronger than mouse smoothing.
- [ ] Step 4: Run `npm test -- tests/glove-controller.test.js` and confirm it passes.

## Task 3: Rapier Physics World

**Files:**
- Create: `src/physics/rapier-world.js`
- Create: `tests/rapier-world.test.js`

- [ ] Step 1: Write async failing tests for `createRapierGoalkeeperWorld`, `launchShot`, `setGloveTarget`, `step`, `getBallState`, and `resetBall`.
- [ ] Step 2: Run `npm test -- tests/rapier-world.test.js` and confirm it fails because the module does not exist.
- [ ] Step 3: Implement Rapier initialization, gravity, dynamic CCD ball, kinematic composite glove colliders, fixed goal frame/backstop, live curve force, high-elasticity contact response, and outcome classification.
- [ ] Step 4: Run `npm test -- tests/rapier-world.test.js` and confirm it passes.

## Task 4: Three.js Scene

**Files:**
- Create: `src/three/procedural-assets.js`
- Create: `src/three/goalkeeper-scene.js`
- Modify: `styles.css`

- [ ] Step 1: Create procedural assets for football texture, turf, field markings, goal frame, net material, stylized shooter, compact glove meshes, and impact effects.
- [ ] Step 2: Create `createGoalkeeperScene(canvas)` with renderer, camera, lighting, scene graph, resize, render, dispose, and `updateVisuals(snapshot)` APIs.
- [ ] Step 3: Update CSS so `#gameCanvas` stays full-size, full-bleed inside the stage, and overlays keep pointer access.
- [ ] Step 4: Run `npm run build` and fix import or bundling errors.

## Task 5: Runtime Integration

**Files:**
- Modify: `src/main.js`
- Create: `src/game/three-game-runtime.js`

- [ ] Step 1: Replace the old Canvas 2D boot in `src/main.js` with async startup for `createThreeGameRuntime`.
- [ ] Step 2: Implement runtime loop: state ticking, shot director phase updates, glove controller updates, Rapier stepping, save/goal scoring, cooldown, scene snapshot updates, HUD updates, and dev hooks on `window.goalkeeperRuntime`.
- [ ] Step 3: Preserve start, restart, pause, and sound behavior through the existing HUD module.
- [ ] Step 4: Run `npm test` and fix regressions.
- [ ] Step 5: Run `npm run build` and fix production build issues.

## Task 6: Browser Verification

**Files:**
- Modify: `design-qa.md`
- Create: `output/playwright/3d-*.png`

- [ ] Step 1: Start or reuse `npm run dev -- --port 63527`.
- [ ] Step 2: Verify desktop viewport: nonblank 3D scene, start state, shooter/ball/gloves visible, no console errors.
- [ ] Step 3: Start a round and capture a live shot where the ball launches from the shooter foot.
- [ ] Step 4: Force or play a save and capture glove rebound.
- [ ] Step 5: Force or play a miss and capture net impact.
- [ ] Step 6: Verify a mobile-shaped viewport has no overlapping HUD text and the 3D scene remains framed.
- [ ] Step 7: Append commands, observations, and screenshot paths to `design-qa.md`.

## Notes

- This workspace is not a git repository, so worktree and commit steps are intentionally skipped.
- The old Canvas modules can stay in place as reference and regression coverage. The shipped entry point should use the 3D runtime.
