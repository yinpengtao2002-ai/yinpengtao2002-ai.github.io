# Goalkeeper Redesign Design

Date: 2026-07-06

## Summary

This redesign turns the current single-file Canvas prototype into a lightweight, skill-focused first-person goalkeeper game. The target experience is a 60-second challenge where the player reads the shooter's body language, reacts to fast 2.5D ball flight, and uses highly elastic gloves to deflect shots away from goal.

The game should feel like a clean cartoon mobile sports game: bright, readable, responsive, and physical. The core challenge is not a hidden score formula. The player should learn to read the shooter, move early, meet the ball with the gloves, and see the result through believable ball deflection.

## Product Direction

- Genre: first-person goalkeeper skill challenge.
- Visual style: clean cartoon mobile game, bright field, crisp ball, expressive gloves, readable shooter animation.
- Main device targets: both landscape mobile touch and desktop mouse.
- Session structure: 60-second timed challenge with a 5-goal concession limit.
- Scoring rule: saved or deflected out shots add score; goals do not.
- Core skill: read shot intent from shooter animation rather than relying on persistent trajectory hints.

## Current Problems To Fix

The current prototype already has a Canvas field, gloves, ball flight, score, timer, audio, pause, and miss handling, but several issues block it from becoming a good game:

- New players can reach 3 misses and end the round within a few seconds.
- The end screen restart button can be blocked by the Canvas pointer layer.
- The displayed level is always `1`, so it behaves like nonfunctional UI.
- The settings button only flashes text and does not open a real setting or pause menu.
- Combo and multiplier exist internally but are not explained through the main HUD.
- Ball and glove interaction is based on a large radius/contact-quality check rather than a more physical deflection model.
- Game state, input, physics, rendering, audio, and UI are concentrated in one large JavaScript file, making tuning hard.

## Gameplay Loop

1. The round starts with the player positioned in front of the goal.
2. A shooter prepares a shot with a short readable animation.
3. The shooter animation hints at the likely shot direction and ball type through approach angle, body lean, kicking foot, and leg swing.
4. The ball launches quickly with 2.5D movement: lateral motion, height, distance to the player, gravity, curve, and spin.
5. The player drags the gloves to meet the ball.
6. If the ball collides with the elastic glove surfaces, it deflects according to the contact normal, glove velocity, rebound, friction, and damping.
7. If the ball exits the dangerous goal plane, the player scores.
8. If the ball crosses into the goal mouth, the player concedes a goal.
9. The round ends after 60 seconds or 5 conceded goals.

## Shot Reading

The game should emphasize reading the shooter before the ball arrives.

Shooter cues:

- Approach angle hints at near-post or far-post intent.
- Body lean hints at curve and shot height.
- Plant-foot direction hints at lateral placement.
- Swing path hints at low drive, rising shot, or dipping shot.
- Contact frame and ball spin hint at curve direction.

Trajectory aids should be restrained. The first few shots may use subtle training cues, but the main game should avoid constant answer-line overlays.

## Physics Model

The game uses a hand-tuned 2.5D physics model rather than a full 3D engine.

Coordinate model:

- `x`: horizontal field position relative to the goal.
- `y`: ball height.
- `z`: distance from the goalkeeper, with lower `z` visually closer to the player.

Ball state:

- Position: `x`, `y`, `z`.
- Velocity: `vx`, `vy`, `vz`.
- Acceleration: gravity and optional curve force.
- Spin: visual spin plus curve influence.
- Radius: visual radius derived from depth.
- Outcome flags: live, saved, deflected, goal, net impact, expired.

Ball behavior:

- Shots are fast enough to feel demanding.
- Gravity creates visible dip on higher shots.
- Curve force creates in-swinging and out-swinging movement.
- Air damping keeps the motion controllable and prevents extreme values.
- Near-camera scale increases the sense of speed.

Glove model:

- Two separate glove contact bodies, one left and one right.
- Each glove has position, previous position, velocity, radius/shape data, and contact material.
- Gloves are highly elastic and tend to slap the ball away.
- Glove movement direction matters: moving into the ball creates a stronger rebound than passively blocking.
- Off-center contacts can redirect the ball poorly and still allow a goal.

Collision response:

- Detect contact between the ball volume and glove contact surfaces.
- Estimate contact normal from the nearest glove surface.
- Use relative velocity to decide impulse strength.
- Apply high restitution for strong rebound.
- Apply friction/tangential impulse so glancing hits can skid or spin away.
- Add a small absorption term to avoid uncontrollable jitter.
- Trigger visual squash, glove recoil, impact line, and sound from the same collision event.

The physics should prioritize convincing play feel over scientific simulation.

## Input Design

Desktop mouse:

- Direct pointer tracking.
- Minimal smoothing.
- Allows precise fast movement.

Landscape mobile touch:

- Pointer tracking with light smoothing.
- Slight input assistance to reduce finger jitter.
- No hidden auto-save behavior.
- Touch should not conflict with HUD buttons.

Both device types share the same gameplay rules. Input tuning can differ so each platform feels fair.

## Visual And Animation Direction

The style should be clean, readable, and cartoon-like.

Core visual priorities:

- The ball must always be easy to track.
- The gloves must feel close, responsive, and expressive.
- The shooter must be small but readable enough to communicate intent.
- The goal mouth and goal line must be visually clear.
- Goals, saves, and glancing touches must be distinguishable immediately.

Feedback layers:

- Before shot: shooter windup, body lean, foot plant, and leg swing.
- During flight: ball scale, spin, speed lines, curve, and dip.
- On glove contact: glove compression, ball squash, burst line, deflection arc, and short impact sound.
- On save: ball exits the goal danger area with a clear score pop.
- On goal: ball hits or passes into net with net ripple and conceded-goal feedback.

HUD direction:

- Keep score, time, conceded goals, pause, and sound.
- Remove fake level display unless level progression becomes real.
- Remove the current settings button unless a real pause/settings menu is implemented in the same version.
- Ensure start, pause, end, and restart controls receive pointer events reliably.

## Technical Architecture

The project should become a lightweight Vite app while keeping Canvas as the main renderer.

Recommended structure:

- `src/main.js`: app startup, Canvas setup, HUD setup, and main loop wiring.
- `src/game/game-state.js`: round state, score, time, conceded goals, pause, and end conditions.
- `src/game/shot-director.js`: shooter cue selection, shot generation, and difficulty curve.
- `src/physics/ball-physics.js`: 2.5D ball integration and goal-plane checks.
- `src/physics/glove-physics.js`: glove movement, contact bodies, and collision response.
- `src/input/pointer-input.js`: mouse/touch input normalization and smoothing.
- `src/render/renderer.js`: field, goal, shooter, ball, gloves, effects, and frame rendering.
- `src/ui/hud.js`: DOM HUD updates and button behavior.
- `src/audio/audio-engine.js`: short generated or asset-backed game sounds.
- `src/styles.css`: layout, HUD, overlays, and responsive presentation.

Boundaries:

- Rendering reads state and draws frames; it does not decide game rules.
- Physics updates positions and collisions; it does not update DOM.
- Input produces pointer intent; it does not directly score shots.
- Shot generation creates readable challenges; it does not draw shooter frames directly.
- UI controls start, pause, resume, restart, and sound; it does not own physics state.

## Difficulty Curve

The first version uses a timed challenge difficulty curve:

- Early phase: slower ball speed, clearer shooter cues, simple lateral placement.
- Middle phase: faster shots, stronger dip, more curve, less time to react.
- Late phase: high-speed shots with sharper cue reading and occasional glancing-save risk.

The player should not lose the entire round in the first few seconds. A new player should be able to understand what happened before failing.

## First Version Scope

Included:

- Vite app setup.
- Canvas-based first-person goalkeeper scene.
- 60-second round.
- 5 conceded goals ends the round early.
- Fast 2.5D ball flight with gravity and curve.
- Shooter windup cues.
- Two highly elastic glove contact bodies.
- Physical deflection response.
- Save/goal state resolution.
- Score, timer, conceded-goal HUD.
- Start, pause, restart, and sound controls.
- Desktop mouse and mobile touch input tuning.
- Browser verification with screenshots and interaction checks.

Excluded from first version:

- Character progression.
- Shop, skins, or unlock systems.
- Online leaderboards.
- Multi-stage campaign.
- Complex real-world 3D simulation.
- Persistent trajectory assist as the main mechanic.

## Acceptance Criteria

- The game runs from a Vite dev server.
- The round can be started, paused, resumed, ended, and restarted with real clickable controls.
- A new player does not normally end the round within the first few seconds without understanding the loop.
- Ball flight visibly supports speed, depth scaling, dip, and curve.
- Shooter cues appear before shots and correlate with shot behavior.
- Glove-ball contact creates a visible physical deflection rather than simply deleting or stopping the ball.
- High-elasticity gloves can slap the ball away, especially when moving into the shot.
- Glancing touches can still result in goals.
- Saves and goals are visually distinct.
- Mouse and touch inputs both work without conflicting with HUD buttons.
- The code is split into focused modules so physics, rendering, input, and UI can be tuned independently.
- Browser smoke testing includes at least a start-screen screenshot, gameplay screenshot, save/deflection observation, goal/end-state observation, and restart interaction.

## Implementation Notes

The implementation should avoid adding a heavy game framework. A Vite app plus Canvas modules is enough for the first version. If the self-written physics proves too unstable during implementation, a later plan can introduce a small helper for vector math, but a general-purpose 2D physics engine is not the first choice because the game needs custom 2.5D goalkeeper behavior.
