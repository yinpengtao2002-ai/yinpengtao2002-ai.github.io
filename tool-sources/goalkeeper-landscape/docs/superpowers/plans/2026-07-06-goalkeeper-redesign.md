# Goalkeeper Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the goalkeeper prototype as a Vite-powered, first-person, 2.5D skill challenge with fast curved shots and highly elastic glove deflections.

**Architecture:** Convert the current static Canvas prototype into focused ES modules. Keep Canvas rendering, but separate game state, shot generation, ball physics, glove physics, pointer input, audio, HUD, and rendering so tuning can happen independently.

**Tech Stack:** Vite, vanilla JavaScript ES modules, Canvas 2D, Vitest, Playwright CLI for smoke verification.

---

## File Structure

- Modify: `index.html` - keep the game shell, switch script loading to Vite module entry, simplify HUD.
- Modify: `styles.css` - keep responsive landscape layout, fix overlay pointer events, update HUD and controls.
- Create: `package.json` - add Vite, Vitest, and local scripts.
- Create: `src/main.js` - app startup, runtime loop, wiring between modules.
- Create: `src/config/game-config.js` - constants for timing, scoring, goal dimensions, and tuning.
- Create: `src/math/vector.js` - small vector helpers used by physics and tests.
- Create: `src/game/game-state.js` - round lifecycle, score, conceded goals, pause/end states.
- Create: `src/game/shot-director.js` - shooter cue phases, shot generation, difficulty curve.
- Create: `src/physics/ball-physics.js` - 2.5D ball integration, projection, goal-plane handling.
- Create: `src/physics/glove-physics.js` - glove movement, contact bodies, elastic collision response.
- Create: `src/input/pointer-input.js` - mouse/touch pointer normalization and smoothing.
- Create: `src/audio/audio-engine.js` - generated impact/save/goal sounds.
- Create: `src/ui/hud.js` - DOM updates and button callbacks.
- Create: `src/render/renderer.js` - field, shooter, ball, gloves, effects, and overlay rendering.
- Create: `tests/physics.test.js` - ball and glove physics behavior tests.
- Create: `tests/game-state.test.js` - round state and scoring behavior tests.
- Create: `tests/shot-director.test.js` - shot cue and difficulty behavior tests.

## Task 1: Tooling And Test Harness

**Files:**
- Create: `package.json`
- Create: `src/config/game-config.js`
- Create: `src/math/vector.js`
- Create: `tests/physics.test.js`

- [ ] **Step 1: Write the first failing physics/vector test**

Create `tests/physics.test.js`:

```js
import { describe, expect, it } from "vitest";
import { clamp, length3, normalize3 } from "../src/math/vector.js";

describe("vector helpers", () => {
  it("normalizes a 3D vector and clamps scalar values", () => {
    expect(clamp(12, 0, 10)).toBe(10);
    expect(length3({ x: 3, y: 4, z: 12 })).toBeCloseTo(13);
    expect(normalize3({ x: 0, y: 3, z: 4 })).toEqual({
      x: 0,
      y: 0.6,
      z: 0.8,
    });
  });
});
```

- [ ] **Step 2: Add package scripts**

Create `package.json`:

```json
{
  "name": "goalkeeper-landscape",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "test": "vitest run",
    "build": "vite build",
    "preview": "vite preview --host 127.0.0.1"
  },
  "devDependencies": {
    "vite": "^7.0.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 3: Run the test to verify RED**

Run: `npm install` then `npm test -- tests/physics.test.js`

Expected: FAIL because `src/math/vector.js` does not exist.

- [ ] **Step 4: Implement vector helpers and config**

Create `src/math/vector.js` with `clamp`, `lerp`, `length2`, `length3`, `normalize2`, `normalize3`, `dot2`, `dot3`, and `scale3`.

Create `src/config/game-config.js` with constants for `ROUND_SECONDS = 60`, `MAX_CONCEDED = 5`, score values, goal dimensions, physics tuning, and input tuning.

- [ ] **Step 5: Run the test to verify GREEN**

Run: `npm test -- tests/physics.test.js`

Expected: PASS.

## Task 2: Game State

**Files:**
- Create: `tests/game-state.test.js`
- Create: `src/game/game-state.js`

- [ ] **Step 1: Write failing game-state tests**

Create `tests/game-state.test.js` with tests for:

```js
import { describe, expect, it } from "vitest";
import { createGameState, recordGoal, recordSave, startRound, tickRound, togglePause } from "../src/game/game-state.js";

describe("game state", () => {
  it("starts a 60 second round and ends after time expires", () => {
    let state = startRound(createGameState());
    expect(state.running).toBe(true);
    expect(state.timeLeft).toBe(60);
    state = tickRound(state, 60.1);
    expect(state.running).toBe(false);
    expect(state.ended).toBe(true);
    expect(state.endReason).toBe("time");
  });

  it("adds score for saves and ends after five conceded goals", () => {
    let state = startRound(createGameState());
    state = recordSave(state);
    expect(state.score).toBeGreaterThan(0);
    for (let i = 0; i < 5; i += 1) state = recordGoal(state);
    expect(state.conceded).toBe(5);
    expect(state.ended).toBe(true);
    expect(state.endReason).toBe("conceded");
  });

  it("pauses without consuming round time", () => {
    let state = startRound(createGameState());
    state = togglePause(state);
    state = tickRound(state, 10);
    expect(state.timeLeft).toBe(60);
    expect(state.paused).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `npm test -- tests/game-state.test.js`

Expected: FAIL because `src/game/game-state.js` does not exist.

- [ ] **Step 3: Implement game state**

Create `src/game/game-state.js` exporting `createGameState`, `startRound`, `tickRound`, `recordSave`, `recordGoal`, `togglePause`, and `finishRound`.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test -- tests/game-state.test.js`

Expected: PASS.

## Task 3: Ball And Glove Physics

**Files:**
- Modify: `tests/physics.test.js`
- Create: `src/physics/ball-physics.js`
- Create: `src/physics/glove-physics.js`

- [ ] **Step 1: Add failing physics tests**

Extend `tests/physics.test.js` with tests proving:

```js
import { createBall, integrateBall, projectBall, didBallEnterGoal } from "../src/physics/ball-physics.js";
import { createGloves, updateGloves, resolveGloveCollision } from "../src/physics/glove-physics.js";

describe("2.5D ball physics", () => {
  it("moves a fast shot toward the keeper while gravity creates visible dip", () => {
    const ball = createBall({
      position: { x: 0, y: 1.9, z: 26 },
      velocity: { x: 0.2, y: 1.4, z: -30 },
      curve: 0,
      spin: 3,
    });
    const next = integrateBall(ball, 0.25);
    expect(next.position.z).toBeLessThan(ball.position.z);
    expect(next.velocity.y).toBeLessThan(ball.velocity.y);
    expect(projectBall(next, { width: 1280, height: 720 }).radius).toBeGreaterThan(12);
  });

  it("lets elastic gloves slap a ball away using relative velocity", () => {
    const gloves = updateGloves(createGloves(), { x: 650, y: 500 }, 0.016, { width: 1280, height: 720, inputMode: "mouse" });
    const ball = createBall({
      position: { x: 0.1, y: 1.3, z: 1.2 },
      velocity: { x: 0, y: -0.2, z: -28 },
      curve: 0,
      spin: 0,
    });
    const result = resolveGloveCollision(ball, gloves, { width: 1280, height: 720 });
    expect(result.hit).toBe(true);
    expect(result.ball.velocity.z).toBeGreaterThan(0);
    expect(result.ball.outcome).toBe("deflected");
  });

  it("classifies a live ball crossing the goal plane as a goal", () => {
    const ball = createBall({
      position: { x: 0, y: 1.2, z: -0.1 },
      velocity: { x: 0, y: 0, z: -20 },
      curve: 0,
      spin: 0,
    });
    expect(didBallEnterGoal(ball)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- tests/physics.test.js`

Expected: FAIL because ball and glove modules do not exist.

- [ ] **Step 3: Implement physics modules**

Create `src/physics/ball-physics.js` and `src/physics/glove-physics.js` with the APIs used by the tests. Physics should include gravity, curve force, depth projection, high glove restitution, friction, and goal-plane checks.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test -- tests/physics.test.js`

Expected: PASS.

## Task 4: Shot Director

**Files:**
- Create: `tests/shot-director.test.js`
- Create: `src/game/shot-director.js`

- [ ] **Step 1: Write failing shot-director tests**

Create `tests/shot-director.test.js` with tests for:

```js
import { describe, expect, it } from "vitest";
import { createShotDirector, updateShotDirector } from "../src/game/shot-director.js";

describe("shot director", () => {
  it("starts each shot with a readable cue phase before launch", () => {
    const director = createShotDirector({ seed: 7 });
    expect(director.phase).toBe("cue");
    expect(director.currentShot.cue.lean).toMatch(/left|right|center/);
    expect(director.currentShot.cue.swing).toMatch(/drive|curl|dip/);
    expect(director.currentShot.ball).toBe(null);
  });

  it("launches a ball after the cue duration", () => {
    let director = createShotDirector({ seed: 7 });
    director = updateShotDirector(director, 1.2, 0.5);
    expect(director.phase).toBe("live");
    expect(director.currentShot.ball).not.toBe(null);
    expect(director.currentShot.ball.velocity.z).toBeLessThan(0);
  });

  it("increases difficulty over the round", () => {
    const early = createShotDirector({ seed: 4, elapsed: 2 });
    const late = createShotDirector({ seed: 4, elapsed: 52 });
    expect(Math.abs(late.currentShot.ballPlan.velocity.z)).toBeGreaterThan(Math.abs(early.currentShot.ballPlan.velocity.z));
    expect(late.currentShot.cueDuration).toBeLessThan(early.currentShot.cueDuration);
  });
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- tests/shot-director.test.js`

Expected: FAIL because `src/game/shot-director.js` does not exist.

- [ ] **Step 3: Implement shot director**

Create deterministic shot generation with seedable random, cue metadata, cue duration, ball plan, difficulty ramp, and update logic that launches a ball after cue time.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test -- tests/shot-director.test.js`

Expected: PASS.

## Task 5: Runtime Wiring, UI, And Rendering

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Create: `src/main.js`
- Create: `src/input/pointer-input.js`
- Create: `src/audio/audio-engine.js`
- Create: `src/ui/hud.js`
- Create: `src/render/renderer.js`

- [ ] **Step 1: Replace static script with Vite module entry**

Modify `index.html` to load `/src/main.js`, simplify HUD labels to score/time/goals, and keep accessible start/end overlays.

- [ ] **Step 2: Implement pointer input and HUD**

Create `src/input/pointer-input.js` for pointer/touch state and `src/ui/hud.js` for DOM updates. Ensure overlay buttons use pointer events and Canvas does not block restart.

- [ ] **Step 3: Implement renderer**

Create `src/render/renderer.js` to draw a bright cartoon field, goal, shooter cue pose, 2.5D ball, elastic gloves, speed lines, net ripple, and impact flashes.

- [ ] **Step 4: Implement runtime loop**

Create `src/main.js` to coordinate state, shot director, physics, input, renderer, audio, and HUD. Ensure start, pause/resume, restart, sound, and round end work.

- [ ] **Step 5: Run full tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 6: Run production build**

Run: `npm run build`

Expected: Vite build exits 0.

## Task 6: Browser Verification

**Files:**
- Create: `output/playwright/` screenshots

- [ ] **Step 1: Start dev server**

Run: `npm run dev -- --port 63527`

Expected: Vite serves the app on `http://127.0.0.1:63527/`.

- [ ] **Step 2: Capture start-screen screenshot**

Run Playwright CLI against the local URL and save `output/playwright/redesign-start.png`.

Expected: start screen shows score, time, goals, gloves, shooter, and start button.

- [ ] **Step 3: Start a round and capture gameplay**

Click start, wait for cue/ball flight, save `output/playwright/redesign-gameplay.png`.

Expected: ball flight, shooter cue/pose, gloves, and HUD are visible.

- [ ] **Step 4: Verify restart interaction**

Let the round end or force end through runtime state if needed, then click restart.

Expected: restart button is clickable and returns to an active round without Canvas intercepting pointer events.

- [ ] **Step 5: Record verification results**

Summarize test, build, screenshot, and restart results in the final response.

## Self-Review

- Spec coverage: plan covers Vite setup, modular architecture, 60-second round, 5 conceded goals, 2.5D ball physics, highly elastic gloves, shot cues, clean cartoon rendering, dual input, HUD cleanup, and browser verification.
- Placeholder scan: no unfinished-marker placeholders remain.
- Type consistency: tests and planned modules consistently use `position`, `velocity`, `curve`, `spin`, `phase`, `currentShot`, `cueDuration`, `running`, `paused`, `ended`, `score`, and `conceded`.

## Execution Notes

The workspace is not a Git repository, so worktree creation and commits cannot be performed. Implementation will run in the current workspace with the user's explicit approval.
