# Goalkeeper 3D Vertical Slice Design

Date: 2026-07-06

## Summary

This slice replaces the current Canvas-first prototype with a real-time 3D goalkeeper scene powered by Three.js and Rapier3D. The goal is not to finish a commercial sports game in one pass; the goal is to rebuild the foundation so the core moment finally feels right: a shooter at distance strikes the ball from his feet, the ball arrives fast with small realistic spin and dip, and the player's smaller gloves physically collide with the ball instead of scoring through a hidden touch-zone formula.

The existing round/HUD idea stays: 60 seconds, 5 conceded goals, score for saves, fast restart. The rendering and physics foundation change.

## Experience Goals

- The ball starts at the shooter's foot position, so players understand where the shot comes from.
- The shot feels forceful: distant small ball, rapid approach, strong scale change, audible strike, impact feedback.
- Ball flight is mostly straight, with mild curl, lift, dip, and spin instead of exaggerated arcade arcs.
- Gloves are visibly smaller, closer to real goalkeeper gloves, and represented by multiple physical colliders.
- Saves come from ball-glove collision and rebound physics. The game can still classify outcomes, but contact should be driven by physical overlap and impulse.
- Failed saves show the ball continuing into the goal/net rather than vanishing or simply incrementing a counter.
- The shooter has a simple but believable windup/kick animation, even if it is procedural rather than asset-backed.
- The visual style stays stylized/cartoon, but models should be cleaner and less toy-like.

## First Slice Scope

Included:

- Three.js scene rendered into the existing game canvas.
- Rapier3D physics world with gravity, dynamic ball rigid body, kinematic glove bodies, goal plane, and net/backstop behavior.
- Procedural 3D field, goal frame, net plane, shooter, ball, and gloves.
- Deterministic 3D shot director with cue, kick, live, goal, save, and cooldown phases.
- Pointer-to-world glove controller for desktop mouse and mobile touch.
- Physical ball-glove rebound with high glove elasticity and player movement influence.
- Net impact feedback for missed shots.
- HUD/start/pause/restart/sound flow preserved from the current app.
- Automated tests for pure 3D shot planning, input mapping, and physics integration.
- Browser verification across desktop and mobile-shaped viewports with screenshots and canvas nonblank checks.

Excluded from this slice:

- Imported character animation rigs.
- Licensed or downloaded football/player/glove assets.
- Full soft-body net simulation.
- Career mode, upgrades, shop, leaderboard, or save data.
- Perfect real-world football aerodynamics.

## Architecture

The app remains a Vite vanilla JavaScript project, but the game surface becomes a 3D runtime.

Main modules:

- `src/main.js`: async boot, DOM/HUD wiring, runtime start, resize, dev hooks.
- `src/game/three-game-runtime.js`: round loop orchestration across state, shot director, Rapier, Three scene, input, audio, and effects.
- `src/game/shot-3d-director.js`: deterministic shot cue generation, ballistic launch planning, phase updates, outcome cooldowns.
- `src/input/glove-controller.js`: pointer normalization and conversion into world-space glove target coordinates.
- `src/physics/rapier-world.js`: Rapier initialization, ball/glove rigid bodies and colliders, physics stepping, physical outcome classification.
- `src/three/goalkeeper-scene.js`: Three.js scene setup and visual updates for field, goal, net, shooter, ball, gloves, and effects.
- `src/three/procedural-assets.js`: generated football texture, glove meshes, shooter body parts, field markings, net material.

Existing modules that remain useful:

- `src/game/game-state.js`: round lifecycle and score.
- `src/audio/audio-engine.js`: generated sound hooks.
- `src/input/pointer-input.js`: pointer state collection.
- `src/ui/hud.js`: start/pause/restart/sound UI.

The old Canvas renderer and 2.5D physics modules can remain in the repo for reference and tests, but `src/main.js` should boot the 3D runtime.

## Coordinate Model

World coordinates:

- `x`: horizontal goal direction, negative left and positive right.
- `y`: height above field.
- `z`: depth, with the shooter far away at negative z and the goalkeeper/net closer to positive z.

Key anchors:

- Shooter foot / ball launch: around `{ x: 0, y: 0.28, z: -30 }`.
- Glove save plane: around `z: 3.15`.
- Goal/net plane: around `z: 4.65`.
- Camera: inside/near the goal, looking outward toward the shooter.

This makes the ball visibly start at the shooter and travel toward the player.

## Rapier Physics

Physics objects:

- Ball: dynamic sphere rigid body, continuous collision detection enabled, high linear velocity, moderate restitution, angular velocity for visual spin.
- Gloves: two kinematic rigid bodies, each with multiple ball/capsule-style colliders for palm, fingers, thumb, and wrist. They are smaller than the previous prototype's apparent hit area.
- Goal frame: fixed cuboid colliders around the goal mouth.
- Net/backstop: fixed sensor/solid plane combination. It does not behave as full cloth, but missed balls visibly hit and settle into a net pocket effect.

Shot behavior:

- Launch velocity is computed from origin, target, gravity, and desired flight time.
- Curve is a small per-shot lateral force applied while the ball is live.
- Dip comes from gravity and optional mild downward spin force late in flight.
- Ball flight should read as powerful and almost straight, not as a lob.

Glove behavior:

- Gloves are kinematic and follow pointer targets with speed caps.
- Glove velocity is tracked in world units.
- Rapier resolves physical contact, and a focused rebound adjustment can be applied only after actual glove-ball contact to exaggerate the elastic slap feel.
- Moving into the ball creates stronger rebound than a passive block.
- Glancing contacts can still send the ball into the goal.

Outcome behavior:

- Save: after physical contact, the ball exits the goal danger volume or rebounds away from the net plane.
- Goal: the live or glancing ball crosses the goal/net plane inside the goal mouth.
- Replay: goal shots continue into the net pocket; saves keep flying briefly before the next shot.

## Visual Direction

The first slice uses procedural assets, but they must read as intentional:

- Football: clean white sphere with black patch texture and subtle seams, not a flat plain circle.
- Gloves: compact padded 3D gloves with fingers/thumb/palm colors, not oversized blobs.
- Shooter: stylized player with torso, head, planted leg, swing leg, arms, and phase-based animation.
- Field: bright turf, goal box lines, depth cues, and clear goal mouth.
- Goal/net: white frame and translucent net mesh with impact ripple.
- Effects: speed streaks during the approach, ball squash at impact, glove recoil, save/goal text feedback.

## Input

The player drags or moves the pointer to control a center target. The controller maps pointer position into a bounded world-space glove center, then Rapier moves two glove bodies around that center.

Desktop mouse should feel direct and quick. Touch should apply slight smoothing to reduce jitter but must not secretly auto-save shots.

## Testing And Verification

Automated tests:

- `tests/shot-3d-director.test.js`: launch origin is near the shooter foot, planned velocity is fast, late difficulty is faster.
- `tests/glove-controller.test.js`: pointer-to-world mapping stays bounded and maps screen sides correctly.
- `tests/rapier-world.test.js`: initialized physics world launches a ball, ball advances toward goal, and a kinematic glove collision reverses the ball away.

Manual/browser verification:

- Run the dev server.
- Confirm the 3D canvas is nonblank on desktop and mobile-shaped viewport.
- Start a round and verify the ball launches from the shooter's foot position.
- Trigger at least one save and observe physical rebound from the glove.
- Trigger at least one miss and observe ball/net continuation.
- Confirm pause, restart, and HUD controls remain clickable.

## Acceptance Criteria

- `npm test` passes.
- `npm run build` passes.
- The app boots at the existing Vite URL and shows the 3D scene as the first screen.
- Ball launch origin visually matches the shooter's foot.
- Shots are substantially faster and more forceful than the previous prototype.
- Gloves are smaller and use real physical colliders.
- A save requires physical ball-glove interaction.
- Failed saves visibly travel into the net.
- Browser screenshots demonstrate a nonblank framed 3D scene, active shot flight, glove save/rebound, and goal/net feedback.
