# Goalkeeper Trapezoid Goal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the triangular goalkeeper goal with a visually aligned, physically complete front-high/rear-low trapezoid cage.

**Architecture:** `goal-net-geometry.js` becomes the shared source of truth for cage points, rails, roof height, net panel bounds, and soft-net collision. Three.js builds the visible frame and net from those exports, while Rapier builds rigid frame colliders from the same named segments.

**Tech Stack:** JavaScript ES modules, Three.js, Rapier 3D, Vitest, Vite, Playwright browser verification.

---

### Task 1: Shared Trapezoid Geometry Contract

**Files:**
- Modify: `tool-sources/goalkeeper-landscape/src/physics/goal-net-geometry.js`
- Modify: `tool-sources/goalkeeper-landscape/tests/goal-net-physics.test.js`

- [ ] **Step 1: Write failing geometry tests**

Import `GOAL_CAGE_POINTS`, `GOAL_FRAME_SEGMENTS`, and `getGoalRoofHeightAtZ`, then assert:

```js
expect(GOAL_NET_GEOMETRY.rearHeight).toBe(1.95);
expect(GOAL_NET_GEOMETRY.cageDepth).toBe(2.05);
expect(GOAL_CAGE_POINTS.rearTopLeft.x).toBe(-GOAL_NET_GEOMETRY.halfWidth);
expect(GOAL_CAGE_POINTS.rearTopLeft.y).toBe(1.95);
expect(GOAL_CAGE_POINTS.rearTopLeft.z).toBe(
  GOAL_NET_GEOMETRY.netPlaneZ + GOAL_NET_GEOMETRY.cageDepth,
);
expect(getGoalRoofHeightAtZ(GOAL_NET_GEOMETRY.netPlaneZ)).toBe(GOAL_NET_GEOMETRY.height);
expect(getGoalRoofHeightAtZ(GOAL_CAGE_POINTS.rearTopLeft.z)).toBe(1.95);
expect(GOAL_FRAME_SEGMENTS.map((segment) => segment.name)).toEqual([
  "crossbar", "front-left-post", "front-right-post",
  "top-left-rail", "top-right-rail", "rear-left-upright",
  "rear-right-upright", "bottom-left-rail", "bottom-right-rail", "rear-bottom-rail",
]);
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `cd tool-sources/goalkeeper-landscape && npm test -- --run tests/goal-net-physics.test.js`

Expected: FAIL because the new exports and dimensions do not exist.

- [ ] **Step 3: Add canonical points and segments**

Extend `GOAL_NET_GEOMETRY` with `rearHeight: 1.95`, `cageDepth: 2.05`, `frameRadius: 0.06`, and `netSlack: 0.12`. Export frozen point and segment maps:

```js
export const GOAL_CAGE_POINTS = Object.freeze({
  frontBottomLeft: point(-halfWidth, 0, netPlaneZ),
  frontTopLeft: point(-halfWidth, height, netPlaneZ),
  frontTopRight: point(halfWidth, height, netPlaneZ),
  frontBottomRight: point(halfWidth, 0, netPlaneZ),
  rearBottomLeft: point(-halfWidth, 0, rearZ),
  rearTopLeft: point(-halfWidth, rearHeight, rearZ),
  rearTopRight: point(halfWidth, rearHeight, rearZ),
  rearBottomRight: point(halfWidth, 0, rearZ),
});
```

Build `GOAL_FRAME_SEGMENTS` only from those points. Implement `getGoalRoofHeightAtZ(z)` as a clamped linear interpolation from front height to rear height.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `cd tool-sources/goalkeeper-landscape && npm test -- --run tests/goal-net-physics.test.js`

Expected: PASS.

### Task 2: Four-Surface Soft Net Collision

**Files:**
- Modify: `tool-sources/goalkeeper-landscape/src/physics/goal-net-geometry.js`
- Modify: `tool-sources/goalkeeper-landscape/tests/goal-net-physics.test.js`
- Modify: `tool-sources/goalkeeper-landscape/tests/rapier-world.test.js`

- [ ] **Step 1: Write failing rear, side, top, and seam tests**

Add deterministic states that sweep a radius-0.11 ball across each cage boundary:

```js
const rear = resolveGoalNetCollision(makeState({
  previousPosition: { x: 0, y: 1, z: rearZ - 0.2 },
  position: { x: 0, y: 1, z: rearZ + 0.04 },
  velocity: { x: 0, y: 0, z: 16 },
}));
expect(rear).toMatchObject({ collided: true, panel: "rear" });

const right = resolveGoalNetCollision(makeState({
  previousPosition: { x: halfWidth - 0.2, y: 1, z: frontZ + 0.8 },
  position: { x: halfWidth + 0.04, y: 1, z: frontZ + 1.0 },
  velocity: { x: 12, y: 0, z: 10 },
}));
expect(right).toMatchObject({ collided: true, panel: "right" });
```

Add equivalent left and top cases. Add one corner sweep that crosses two boundaries in the same step and assert `impactCount === 1`, one stable `eventId`, and one selected panel.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `cd tool-sources/goalkeeper-landscape && npm test -- --run tests/goal-net-physics.test.js tests/rapier-world.test.js`

Expected: side/top cases FAIL because only the old rear pocket resolves.

- [ ] **Step 3: Implement candidate-based swept panel resolution**

For rear, left, right, and top surfaces, compute previous/current signed distance including ball radius. Reject candidates outside that panel's z/y envelope. Select only the earliest crossing candidate, then:

```js
const response = {
  rear:  { x: 0.44, y: 0.52, z: -0.16 },
  left:  { x: 0.18, y: 0.72, z: 0.58 },
  right: { x: -0.18, y: 0.72, z: 0.58 },
  top:   { x: 0.72, y: -0.2, z: 0.58 },
}[panel];
```

Scale tangential velocity by the listed factors, cap the normal rebound, clamp the position back inside the cage, and store `panel` on `netContact`. Preserve the existing cooldown and source-contact event identity.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `cd tool-sources/goalkeeper-landscape && npm test -- --run tests/goal-net-physics.test.js tests/rapier-world.test.js`

Expected: PASS with one event at seams and no scoring regression.

### Task 3: Complete Frame Colliders From Shared Segments

**Files:**
- Modify: `tool-sources/goalkeeper-landscape/src/physics/rapier-world.js`
- Modify: `tool-sources/goalkeeper-landscape/tests/rapier-world.test.js`

- [ ] **Step 1: Write a failing collider-contract test**

After constructing the world, assert:

```js
expect(world.goalFrameColliders.map((entry) => entry.name)).toEqual(
  GOAL_FRAME_SEGMENTS.map((segment) => segment.name),
);
expect(world.goalFrameColliders).toHaveLength(10);
```

Also launch balls toward a rear upright and top depth rail and assert that velocity changes while `outcome` is not rewritten.

- [ ] **Step 2: Run the test and confirm RED**

Run: `cd tool-sources/goalkeeper-landscape && npm test -- --run tests/rapier-world.test.js`

Expected: FAIL because only three unnamed front cuboids exist.

- [ ] **Step 3: Build oriented segment colliders**

Import `GOAL_FRAME_SEGMENTS`. Add `createSegmentCollider(segment)` that places a fixed cuboid at the segment midpoint, gives it half extents `(frameRadius, length / 2, frameRadius)`, and rotates its local Y axis onto the normalized segment direction using Rapier's quaternion rotation. Store `{ name, body, collider, start, end }` in `this.goalFrameColliders`.

- [ ] **Step 4: Run the test and confirm GREEN**

Run: `cd tool-sources/goalkeeper-landscape && npm test -- --run tests/rapier-world.test.js`

Expected: PASS.

### Task 4: Render The Shared Trapezoid Cage

**Files:**
- Modify: `tool-sources/goalkeeper-landscape/src/three/procedural-assets.js`
- Modify: `tool-sources/goalkeeper-landscape/tests/procedural-assets.test.js`

- [ ] **Step 1: Write failing frame and envelope tests**

Replace the triangular-frame expectations with:

```js
expect(collectByName(goal.group, /^goal-frame-top-rail-/)).toHaveLength(2);
expect(collectByName(goal.group, /^goal-frame-rear-upright-/)).toHaveLength(2);
expect(collectByName(goal.group, /^goal-frame-bottom-rail-/)).toHaveLength(2);
expect(collectByName(goal.group, /^goal-frame-rear-bottom-rail$/)).toHaveLength(1);
expect(collectByName(goal.group, /^goal-depth-stanchion-/)).toHaveLength(0);
```

For each frame object, compare `userData.segmentStart` and `segmentEnd` with the matching shared segment. Traverse objects tagged `goalNetPanel` and assert their bounding boxes remain inside `[-halfWidth, halfWidth]`, `[frontZ, rearZ]`, and the interpolated roof.

- [ ] **Step 2: Run the test and confirm RED**

Run: `cd tool-sources/goalkeeper-landscape && npm test -- --run tests/procedural-assets.test.js`

Expected: FAIL because the current goal still has diagonal stanchions and flared coordinates.

- [ ] **Step 3: Replace the frame and active net layers**

Import `GOAL_CAGE_POINTS`, `GOAL_FRAME_SEGMENTS`, and `getGoalRoofHeightAtZ`. Use the existing `makeLimb` helper for each shared segment and attach copies of its endpoints to `userData`.

Build four restrained rope-grid panels from shared bounds:

- Rear: horizontal and vertical cords at `rearZ - getRearNetSlack(x, y)`.
- Left/right: depth cords between front and rear edges plus vertical cords capped by `getGoalRoofHeightAtZ`.
- Top: depth cords from front crossbar to rear top rail plus transverse cords within `halfWidth`.

Keep the active center sightline opacity budget. Remove active decorative objects whose coordinates flare beyond `halfWidth` or stop before the rear frame. Keep stable return keys `group`, `net`, `grid`, and `dynamicNetDetails` for scene integration.

- [ ] **Step 4: Run the test and confirm GREEN**

Run: `cd tool-sources/goalkeeper-landscape && npm test -- --run tests/procedural-assets.test.js`

Expected: PASS.

### Task 5: Regression, Build, And Browser Verification

**Files:**
- Generated by build: `public/tools/goalkeeper-landscape/**`
- Verify: `tool-sources/goalkeeper-landscape/**`

- [ ] **Step 1: Run the complete game suite**

Run: `cd tool-sources/goalkeeper-landscape && npm test`

Expected: all Vitest tests PASS, including glove, scoring, ground, multi-ball, audio/contact deduplication, procedural assets, and Rapier physics.

- [ ] **Step 2: Build the game bundle into its existing route**

Run: `cd tool-sources/goalkeeper-landscape && npm run build`

Expected: Vite exits 0 and updates `public/tools/goalkeeper-landscape` through the existing build configuration.

- [ ] **Step 3: Run the website verification needed for the changed static tool**

Run from the repository root:

```bash
npx tsc --noEmit
npm run lint
```

Expected: both commands exit 0. Do not stage unrelated generated content or pre-existing finance changes.

- [ ] **Step 4: Verify desktop and phone landscape in a real browser**

Start the existing website dev server and inspect `/tools/goalkeeper-landscape/` at `1440x900`, `932x430`, and `844x390`. Capture screenshots and confirm the trapezoid silhouette, shared seams, full net enclosure, launcher readability, ball visibility, glove alignment, HUD clearance, and nonblank moving WebGL canvas.

- [ ] **Step 5: Commit only goal-related source, tests, docs, and generated tool output**

Run `git diff --check`, review `git status --short`, then stage explicit goalkeeper paths and commit with a focused message.

- [ ] **Step 6: Push and verify production**

Push `main`, watch the matching deployment/check to completion, then verify `https://yinpengtao.cn/tools/goalkeeper-landscape/` returns 200 and renders the new goal in desktop and mobile landscape.
