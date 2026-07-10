**Source Visual Truth**
- Reference images supplied by the user:
  - `/Users/lucasyin/Pictures/Photos Library.photoslibrary/resources/derivatives/masters/E/E018B424-24C9-439D-BBEB-92F0F75DEEC9_4_5005_c.jpeg`
  - `/Users/lucasyin/Pictures/Photos Library.photoslibrary/resources/derivatives/masters/6/61DA96A8-F7AF-48DD-9C80-95CD0163E938_4_5005_c.jpeg`
- Current design decision: use the references for physics/action feel and first-person goal depth, while adapting the game to the requested horizontal 16:9 mode.

**Implementation Evidence**
- Horizontal start screenshot: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/horizontal-start-final.png`
- Horizontal play/save-attempt screenshot: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/horizontal-sweep-play.png`
- Latest polished start screenshot: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/polish-horizontal-start.png`
- Latest polished gameplay screenshot: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/polish-horizontal-save-feedback.png`
- Failed-goal replay screenshots:
  - `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/failed-goal-v4-goal.png`
  - `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/failed-goal-v4-net.png`
- Latest save replay screenshots:
  - `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/sweep-save-v1-hit.png`
  - `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/sweep-save-v1-follow.png`
- Net-pocket failed-save screenshots:
  - `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/net-pocket-sequence-00.png`
  - `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/net-pocket-sequence-08.png`
- Latest save polish screenshots:
  - `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/save-polish-contact.png`
  - `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/save-polish-rebound.png`
- Composite glove physics screenshots:
  - `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/wrist-guard-save-sweep.png`
  - `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/wrist-guard-save-follow.png`
  - `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/wrist-miss-sequence-04.png`
- Browser viewport: `1280 x 720`
- State: start screen and live horizontal sweep-play validation.
- Browser UI evidence: visible text after sweep test showed `得分 500`, proving five real saves were recorded through gameplay.
- Latest browser UI evidence: visible text after direct drag test showed `扑救分 200` and `失球 0/5`, proving playable saves still work after the polish pass.
- Failed-save browser evidence: HUD moved from `失球 1/5` to `失球 2/5` and then `失球 3/5` during captured missed-save sequences, with no browser warn/error logs.
- Latest save browser evidence: a horizontal sweep save moved HUD from `扑救分 0` to `扑救分 100`, kept `失球 0/5`, and captured the saved ball continuing away with green trail/impact feedback.
- Net-pocket browser evidence: a forced missed-save sequence moved HUD through `失球 1/5` to `失球 5/5`, captured the ball trapped by a local net-pocket deformation, and produced no browser warn/error logs.
- Latest save browser evidence after net-pocket changes: a center sweep produced `扑救分 375`, `连扑 x3`, `失球 0/5`, and no browser warn/error logs.
- Composite glove browser evidence: after replacing the single inflated glove circle with palm/finger/thumb/wrist bodies and aligning glove projection to the drag target, a high sweep produced `扑救分 750`, `连扑 x5`, `失球 0/5`, and no browser warn/error logs.
- Miss-path evidence after wrist guard changes: a deliberate off-target drag still produced `失球 4/5`, visible net-pocket deformation, and no browser warn/error logs.

**Findings**
- No P0/P1/P2 findings remain for this iteration.

**Required Fidelity Surfaces**
- Fonts and typography: HUD and result copy remain readable in horizontal 16:9. Text hierarchy is clear: score/time/conceded in compact top pills, outcome in centered result panel.
- Spacing and layout rhythm: The game now uses horizontal 16:9 as the primary mode. The goal frame, side nets, top net, back net, pitch, shooter, gloves, and ball are composed in a stable first-person 3D tunnel.
- Colors and visual tokens: Green turf, gray goal interior, white frame/net, orange start/shot feedback, and white glove surfaces create a cohesive arcade-sports palette.
- Image quality and asset fidelity: Football, gloves, shooter, net cage, ball shadow, and impact trails are canvas-rendered game assets. The references' live-camera background is intentionally not copied because the requested direction is horizontal gameplay, not portrait AR cloning.
- Copy and content: Start copy remains `拖动后 / 开始`; controls are short and game-facing.

**Physics QA**
- Added swept sphere collision for gloves, so fast shots crossing the glove plane between frames are caught instead of tunneling through.
- Increased glove physical catch body while keeping visual gloves compact.
- In-browser sweep-play test recorded `得分 500`, confirming the ball can be saved through real interaction.
- Added contact spin, compression, rebound speed, and richer impact metadata so a glove slap affects ball rotation and visual feedback.
- Latest in-browser drag test recorded `扑救分 200` and no conceded goals during the captured segment.
- Added exact goal-plane crossing resolution for failed saves so a fast shot starts its conceded replay at the real crossing point instead of popping from a deep-in-net frame.
- Extended failed-save replay to `1.35s`, slowed only the after-goal replay segment, and strengthened back-net wave rendering so the ball visibly drives into the net before the next shot.
- Added moving-glove swept collision so both the ball path and glove sweep path are considered, preventing fast hand movement from visually overlapping the ball but missing the physics contact.
- Added successful-save replay so the ball remains visible after scoring and flies away with a green deflection trail before the next shot starts.
- Tuned opening-shot targets into a reachable learning window while preserving fast shot speed, so early gameplay is less likely to feel impossible.
- Reworked failed-save net physics so the ball is absorbed and retained inside the net instead of bouncing back into the field.
- Reprojected conceded balls toward the net pocket and suppressed turf shadow during conceded replay, so failures read as a ball entering the goal/net instead of landing on the grass.
- Added a persistent net-pocket deformation around conceded balls, making the ball path and net capture visible in the failed-save moment.
- Replaced the old oversized per-glove circular collider with composite palm, finger, thumb, and wrist guard bodies, so saves come from visible contact surfaces instead of invisible halo hits.
- Aligned projected glove position with the drag target, fixing the mismatch where the player dragged near the ball but the rendered gloves stayed too low.
- Added a wrist-guard collision response for low balls that visibly pass through the raised gloves/forearms area.

**Patches Made**
- Added regression coverage for high-speed ball tunneling through gloves.
- Passed previous ball state into collision resolution.
- Implemented swept segment-vs-glove-body collision with contact normal, contact time, and elastic rebound.
- Tuned glove restitution, friction, absorption, max motion speed, and physical radius for a stronger slap/deflection feel.
- Restored horizontal 16:9 as the primary layout; portrait now shows a horizontal game stage instead of stretching to vertical.
- Improved 3D visual layering: goal net behind ball/gloves, near posts on top, ball shadow, darker stadium side panels, wider landscape cage.
- Replaced emoji HUD badges with compact PTS/TIME/GA game status chips.
- Added goalkeeper sleeves/forearms behind the gloves.
- Added glove compression, contact highlight, stronger impact burst, and brief camera shake driven by actual collision metadata.
- Added more detail to the shooter silhouette, including shorts and jersey accent.
- Added regression tests for exact goal-plane entry, readable failed-save replay duration, and delayed back-net contact during conceded replay.
- Added a longer failed-goal visual sequence with orange ball trail and wider back-net ripple.
- Added regression tests for moving-glove swept contact, opening-shot reachability, saved-ball replay, and deflected/saved trail rendering.
- Added regression coverage for trapped failed saves inside the net and renderer net-pocket state.
- Polished the football panels, glove palm seams/grip texture, and shooter follow-through/cleat details.
- Added regression coverage for visible glove-part collision, invisible-halo misses, wrist-guard saves, and direct glove drag projection.

**Follow-up Polish**
- P3: Replace emoji-like HUD symbols with a bundled icon set if the project adds an icon dependency.
- P3: Add more detailed goalkeeper body animation frames for approach, strike, and recovery.
- P3: Add haptic-like screen shake and glove squash on very strong saves.

final result: passed

## 2026-07-06 3D Physics Vertical Slice QA

**Scope**
- Replaced the shipped entry point with a Three.js + Rapier3D runtime while keeping the existing Vite app shell, HUD, audio, and round state.
- Added a dynamic Rapier football, kinematic composite glove colliders, a fixed goal frame/backstop, and procedural Three.js field/goal/shooter/glove/football visuals.
- Added local-only debug hotkeys for verification on `127.0.0.1` and `localhost`: `[` forces a close glove save and `]` forces a missed shot into the net.

**Automated Verification**
- `npm test` passed with 7 test files and 41 tests before the final visual-tuning pass.
- `npm test -- tests/rapier-world.test.js` passed after adding the curved-shot corridor regression. This specifically catches the prior bug where curve acceleration was accidentally applied as a large Rapier force.
- `npm run build` passed after the final Three.js visual and mobile HUD changes.

**Browser Verification**
- Desktop viewport: `1280 x 720`
- Mobile viewport: `393 x 852`
- Dev URL: `http://127.0.0.1:63527/`
- Browser console: no warn/error logs in the desktop flight, forced save/miss, or mobile checks.

**Screenshots**
- Desktop start: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/3d-desktop-start.png`
- Live shot sequence: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/3d-fixed-seq-00.png`
- Goal/net moment: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/3d-fixed-seq-10.png`
- Forced save follow-through: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/3d-forced-save-follow.png`
- Dense save ball visibility: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/3d-save-dense-02.png`
- Mobile start: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/3d-mobile-start.png`
- Mobile flight: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/3d-mobile-flight.png`

**Findings**
- The ball now remains in a plausible physical corridor and can be seen as it approaches, with a football texture and subtle halo/trail for readability.
- Failed saves visibly drive into the net and increment conceded goals.
- Forced save validation recorded score increases through the Rapier glove collision path.
- Mobile HUD no longer clips horizontally; compact labels and a two-row layout keep all counters/buttons inside the viewport.
- Remaining P3: the procedural shooter/glove assets are cleaner than the old Canvas version but still not production-asset quality. A later pass should replace them with rigged/imported models and authored animations.

## 2026-07-06 3D Framing And Scale Tuning QA

**Scope**
- Moved the 3D shot origin from the far `z=-30` line to a closer `z=-22` shooter-foot launch point.
- Shortened 3D flight timing so shots still arrive with a harder, faster feel after moving the shooter closer.
- Reframed the camera with desktop and portrait-responsive positions so the complete goal frame has visible margins instead of filling the whole screen.
- Reduced football visual radius, halo scale, glove visual scale, glove spacing, and Rapier glove collider radii so contact better matches the smaller gloves.

**Automated Verification**
- `npm test -- tests/glove-controller.test.js tests/rapier-world.test.js tests/shot-3d-director.test.js tests/procedural-assets.test.js tests/goalkeeper-scene-tuning.test.js` passed: 5 files, 14 tests.
- `npm test` passed: 9 files, 45 tests.
- `npm run build` passed.
- Known non-failing warnings: `@dimforge/rapier3d-compat` emits a deprecated initialization warning during Node/Vitest initialization, and Vite reports the Rapier/Three bundle chunk is larger than 500 kB.

**Browser Verification**
- Desktop viewport: `1280 x 720`
- Mobile viewport: `393 x 852`
- Dev URL: `http://127.0.0.1:63527/`
- Browser console after desktop/mobile checks: no warn/error logs.
- Pixel check: all captured scenes are nonblank with sampled color counts of 171, 122, and 175 respectively.

**Screenshots**
- Desktop start, complete goal with margins: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/3d-tuned-desktop-start.png`
- Desktop live shot/goal moment with smaller ball and gloves: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/3d-tuned-desktop-flight.png`
- Mobile start, full goal visible in portrait viewport: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/3d-tuned-mobile-start.png`

**Findings**
- Goal framing now leaves clear sky/field margins around the full frame on desktop and keeps the whole goal visible on the tested mobile viewport.
- The ball starts far smaller at the closer shooter line and remains readable without becoming oversized near the goal.
- Gloves are visually smaller and the physics collider cluster was tightened so saves depend less on a large invisible catch area.
- The closer launch point keeps the shooter/ball relationship more coherent while preserving fast arrival speed.

## 2026-07-06 Reference Glove And Field Style QA

**Scope**
- Reworked the procedural goalkeeper gloves to echo the generated reference image: orange-red shell, rounded fingers, lighter palm pad, bright seam/highlight strips, and black cuff with orange trim.
- Reworked the field from a flat green plane into a softer training-pitch surface with deterministic grass texture, mowing bands, perspective white markings, and a light penalty arc.
- Preserved the existing horizontal game framing and gameplay scale instead of copying the generated image's portrait proportions.

**Automated Verification**
- `npm test -- tests/procedural-assets.test.js` passed: 1 file, 3 tests.
- `npm test` passed: 9 files, 47 tests.
- `npm run build` passed.
- Known non-failing warnings: `@dimforge/rapier3d-compat` emits a deprecated initialization warning during Node/Vitest/browser initialization, and Vite reports the Rapier/Three bundle chunk is larger than 500 kB.

**Browser Verification**
- Desktop landscape viewport: `1280 x 720`
- Mobile landscape viewport: `852 x 393`
- Dev URL: `http://127.0.0.1:63527/`
- Browser console after the final desktop capture: 0 errors, 1 known Rapier initialization warning.
- Browser start-click verification captured a live gameplay frame after pressing the start button.

**Screenshots**
- Desktop landscape start: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/glove-field-polish-v3-start.png`
- Desktop landscape live frame: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/glove-field-polish-v3-flight.png`
- Mobile landscape start: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/glove-field-polish-mobile-landscape.png`

**Findings**
- The gloves now read closer to the reference-image style while staying compact enough for the existing horizontal goalkeeper view.
- The grass texture is smoother and less blocky after upgrading the texture size and using linear filtering.
- The horizontal layout remains intact; the reference image influenced material/style only, not screen proportions.

## 2026-07-06 Soft Glove Physics QA

**Scope**
- Reduced Rapier glove collider restitution and increased friction so passive hand contact no longer behaves like a hard spring wall.
- Replaced the glove contact response with a two-layer model: a low-energy soft block for waiting/slow hands, and an added slap force only when recent glove swipe speed is high.
- Added a short swipe-speed memory with an effective speed cap so quick player movement still transfers force at contact without producing extreme debug-input rebounds.
- Stored contact diagnostics on glove hits: effective glove speed, soft block speed, slap speed, and final contact strength.

**Automated Verification**
- `npm test -- tests/rapier-world.test.js` passed: 1 file, 6 tests.
- `npm test` passed: 9 files, 48 tests.
- `npm run build` passed.
- Numeric probe after tuning:
  - Soft block: outcome `deflected`, z velocity `-4.15`, strength `4.89`, slap speed `0`.
  - Fast swipe: outcome `deflected`, z velocity `-17.8`, strength `66.46`, slap speed `14`.
- Known non-failing warnings: `@dimforge/rapier3d-compat` emits a deprecated initialization warning during Node/Vitest initialization, and Vite reports the Rapier/Three bundle chunk is larger than 500 kB.

**Browser Verification**
- Desktop landscape viewport: `1280 x 720`
- Dev URL: `http://127.0.0.1:63527/`
- Final page probe: title `弹力手套守门挑战`, 1 canvas, boot status `started`, start overlay visible.
- Browser console after final reload: no error logs.
- Note: the in-app browser did not reliably trigger the local debug keyboard shortcut, so physics behavior was verified through the Rapier test/probe path while browser verification focused on load health and rendering.

**Screenshots**
- Final browser reload: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/soft-glove-physics-final.png`
- Earlier smoke frame: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/soft-glove-physics-browser.png`
- Debug-key attempt frame: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/soft-glove-physics-forced-save.png`

**Findings**
- Waiting hands now absorb and return the ball weakly instead of launching it away.
- Fast swipes still produce a clear punched-away save with stronger rebound and spin.
- The capped effective glove speed keeps impact effects forceful without reintroducing the over-elastic feel from the previous model.

## 2026-07-06 Controlled Elasticity And Shot Pressure QA

**Scope**
- Increased passive glove rebound from a deadened soft block to a controlled elastic parry.
- Added a downward punch component so ordinary saves can drive the ball quickly toward the grass instead of just letting it fall.
- Reused a capped effective glove velocity for lateral transfer, keeping fast swipes powerful while preventing extreme sideways launches.
- Moved the shooter line closer from `z=-22` to `z=-19` and shortened 3D flight windows to raise shot pressure.

**Automated Verification**
- `npm test -- tests/shot-3d-director.test.js tests/procedural-assets.test.js tests/rapier-world.test.js` passed: 3 files, 13 tests.
- `npm test` passed: 9 files, 48 tests.
- `npm run build` passed.
- Numeric probe after tuning:
  - Shot line: origin z `-19`, early flight time `0.55`, early z velocity `43`, late z velocity `54.37`.
  - Waiting block: outcome `deflected`, velocity `{ x: -0.51, y: -3.28, z: -8.38 }`, strength `9.23`.
  - Quick swipe: outcome `deflected`, velocity `{ x: 8.14, y: -3.42, z: -20.85 }`, strength `69.52`.
- Known non-failing warnings: `@dimforge/rapier3d-compat` emits a deprecated initialization warning during Node/Vitest initialization, and Vite reports the Rapier/Three bundle chunk is larger than 500 kB.

**Browser Verification**
- Desktop landscape viewport: `1280 x 720`
- Dev URL: `http://127.0.0.1:63527/`
- Final page probe: title `弹力手套守门挑战`, 1 canvas, boot status `started`, start overlay visible.
- Browser console after final reload: no error logs.

**Screenshots**
- Final browser reload: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/controlled-elasticity-final.png`

**Findings**
- Passive saves now rebound with visible speed and downward force instead of only dropping at the gloves.
- Fast swipes redirect the ball sideways with a strong parry feel, while capped transfer keeps the ball from flying too far.
- The closer shooter line and shorter flight time make the shot arrive with more pressure without changing the lightweight game structure.

## 2026-07-06 Side Parry And Catch Pocket QA

**Scope**
- Shifted glove contact emphasis from downward punch to lateral parry when the ball hits off-center in the glove pocket.
- Added a catch pocket branch: centered, lower-speed hits between the gloves become an immediate `saved` catch instead of a normal rebound.
- Pinned caught balls to the glove pocket with zero velocity so the ball reads as held instead of sliding or falling away.
- Kept quick swipes powerful, but capped lateral transfer so the ball moves sideways a readable distance without flying offscreen.

**Automated Verification**
- `npm test -- tests/rapier-world.test.js` passed: 1 file, 7 tests.
- `npm test` passed: 9 files, 49 tests.
- `npm run build` passed.
- Numeric probe after tuning:
  - Offset side parry: outcome `deflected`, contact `glove`, velocity `{ x: -3.21, y: -2.71, z: -8.38 }`, strength `9.97`.
  - Center catch: outcome `saved`, contact `catch`, velocity `{ x: 0, y: 0, z: 0 }`, catch quality `0.94`.
  - Quick swipe: outcome `deflected`, contact `glove`, velocity `{ x: 11.72, y: -2.58, z: -20.85 }`, strength `72.35`.
- Known non-failing warnings: `@dimforge/rapier3d-compat` emits a deprecated initialization warning during Node/Vitest initialization, and Vite reports the Rapier/Three bundle chunk is larger than 500 kB.

**Browser Verification**
- Desktop landscape viewport: `1280 x 720`
- Dev URL: `http://127.0.0.1:63527/`
- Final page probe: title `弹力手套守门挑战`, 1 canvas, boot status `started`, start overlay visible.
- Browser console after final reload: no error logs.

**Screenshots**
- Final browser reload: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/side-parry-catch-final.png`

**Findings**
- Off-center waiting saves now produce a small left/right parry instead of mostly dropping the ball.
- Perfectly centered saves now create a distinct catch interaction and score through the existing saved outcome.
- Fast swipe saves still feel forceful, but their sideways velocity stays bounded for readability.

## 2026-07-07 Sample Audio And Reachable Catch QA

**Scope**
- Replaced the purely synthetic oscillator sound profile with real downloaded WAV samples for shot kick, glove impact/catch, and ball hitting net.
- Added an audio sample manifest and preload path; the engine falls back to the old synthesizer only if a sample cannot be decoded.
- Triggered glove/catch/net sounds at first contact instead of waiting for the later saved/goal replay state.
- Widened the Rapier catch pocket so near-center hits can realistically become catches during normal play.
- Recorded source URLs and Mixkit license reference in `public/audio/SOURCES.md`.

**Audio Sources**
- Shot kick: `public/audio/mixkit-soccer-ball-kick-2099.wav`
- Glove impact/catch: `public/audio/mixkit-hitting-soccer-ball-2112.wav`
- Net impact: `public/audio/mixkit-basketball-ball-hitting-net-2084.wav`
- License reference: `https://mixkit.co/license/`

**Automated Verification**
- `npm test -- tests/audio-engine.test.js` passed: 1 file, 2 tests.
- `npm test -- tests/rapier-world.test.js` passed: 1 file, 8 tests.
- `npm test` passed: 10 files, 52 tests.
- `npm run build` passed.
- Numeric probe after catch-pocket tuning:
  - Near-center catch: outcome `saved`, contact `catch`, velocity `{ x: 0, y: 0, z: 0 }`, catch quality `0.67`.
  - Offset side parry: outcome `deflected`, contact `glove`, velocity `{ x: -3.21, y: -2.71, z: -8.38 }`, strength `9.97`.
- Known non-failing warnings: `@dimforge/rapier3d-compat` emits a deprecated initialization warning during Node/Vitest initialization, and Vite reports the Rapier/Three bundle chunk is larger than 500 kB.

**Browser And Asset Verification**
- Desktop landscape viewport: `1280 x 720`
- Dev URL: `http://127.0.0.1:63527/`
- Final page probe: title `弹力手套守门挑战`, 1 canvas, boot status `started`, start overlay visible.
- Browser console after final reload: no error logs.
- Local HTTP asset checks returned `200 OK` with `Content-Type: audio/wav` for all three WAV files.

**Screenshots**
- Final browser reload: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/sample-audio-catch-final.png`

**Findings**
- Core game events now use real sample-based contact sounds rather than abstract tones.
- The catch branch is materially easier to trigger: a small near-center offset is now accepted as a catch.
- Offset saves still side-parry instead of being swallowed by the expanded catch pocket.

## 2026-07-07 Layered Glove Physics And Edge Shot QA

**Scope**
- Rebalanced mature 3D shots so the goalkeeper sees more far-post, low-corner, and high-corner targets instead of mostly central shots.
- Added short-lived upward glove momentum memory so a rising glove can palm or tip the ball upward even when contact happens a few frames after the drag.
- Reduced the default downward punch in glove contacts and added a small cushioned lift so passive saves read as soft blocks rather than every ball dropping straight down.
- Let poor-quality brush contacts keep traveling through the glove plane toward the net, so touching the ball is not automatically a save.

**Automated Verification**
- `npm test -- tests/rapier-world.test.js` passed: 1 file, 10 tests.
- `npm test -- tests/shot-3d-director.test.js` passed: 1 file, 5 tests.
- `npm test` passed: 10 files, 55 tests.
- `npm run build` passed.
- Numeric probe after physics tuning:
  - Offset waiting block: outcome `deflected`, contact `glove`, final velocity `{ x: -3.21, y: -0.90, z: -2.81 }`.
  - Fast sideways slap: outcome `deflected`, contact `glove`, final velocity `{ x: 11.72, y: -0.05, z: -6.34 }`.
  - Rising palm: outcome `deflected`, contact `glove`, final velocity `{ x: -4.55, y: 5.87, z: -6.58 }`.
  - Poor brush: outcome `goal`, contact `net`, final position `{ x: -0.33, y: 1.21, z: 4.67 }`.
- Mature shot sampling over 80 seeded shots produced `54` wide-edge targets, `44` vertical-edge targets, and `27` corner targets, while central targets dropped to `3`.
- Known non-failing warnings: `@dimforge/rapier3d-compat` emits a deprecated initialization warning during Node/Vitest initialization, and Vite reports the Rapier/Three bundle chunk is larger than 500 kB.

**Browser Verification**
- Desktop landscape viewport: `1280 x 720`
- Dev URL: `http://127.0.0.1:63527/?gloveFieldPolish=1783349358699`
- Final page probe: title `弹力手套守门挑战`, 1 canvas, start overlay visible.
- Browser console after final reload: no error logs.

**Screenshots**
- Final browser reload: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/physics-shot-distribution-final.png`

**Findings**
- Saves now split into several readable outcomes: catch, side parry, upward palm, and poor-contact goal.
- Slow/off-center blocks no longer feel like every ball is punched straight forward.
- Late-round shot targets now lean toward uncomfortable edges and corners, matching the requested higher difficulty distribution.

## 2026-07-07 Shooter And Field Polish QA

**Scope**
- Reworked the distant shooter as a more readable stylized striker with hair, neck, jersey panels, sleeves, boot studs, and grounded shadows.
- Slightly increased the shooter visual scale so the character details remain legible from the goalkeeper camera without changing the actual shot origin.
- Added lightweight pitch depth: goalmouth wear patches, shooting-lane guides, depth bands, and a penalty spot.
- Kept the field simple and procedural so the game remains suitable for a lightweight web or mini-app build.

**Automated Verification**
- `npm test -- tests/procedural-assets.test.js` passed: 1 file, 5 tests.
- `npm test` passed: 10 files, 57 tests.
- `npm run build` passed.
- Known non-failing warnings: `@dimforge/rapier3d-compat` emits a deprecated initialization warning during Node/Vitest initialization, and Vite reports the Rapier/Three bundle chunk is larger than 500 kB.

**Browser Verification**
- Desktop landscape viewport: `1280 x 720`
- Dev URL: `http://127.0.0.1:63527/?gloveFieldPolish=1783349358699`
- Final page probe: title `弹力手套守门挑战`, 1 canvas, start overlay visible before play.
- Gameplay probe after clicking `开始`: game timer active, 1 canvas, browser console had no error logs.

**Screenshots**
- Start screen: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/character-field-polish-start.png`
- Gameplay screen: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/character-field-polish-gameplay.png`

**Findings**
- The shooter now reads more like an actual small footballer at the far end instead of a plain stick/block figure.
- The field keeps the existing clean arcade composition while adding enough texture and markings to feel less empty.
- The added geometry stayed within the existing scene style and did not affect physics or game-state tests.

## 2026-07-07 Launcher And Standard Pitch QA

**Scope**
- Replaced the distant human shooter model with a polished procedural ball launcher while keeping the existing `createShooterModel` / `updateShooterModel` scene contract.
- Added machine details: chassis, rotating side wheels, barrel, muzzle ring, hopper, feed ball, tripod stand, status lights, and ground shadow.
- Updated the animation from body windup to launcher aiming, wheel spin, feed-ball charge, and firing-state light changes.
- Reworked the field from training-lane markings to standard football pitch markings: touchlines, goal line, penalty area, goal area, penalty spot, penalty arc, center line, center circle, and near corner arcs.

**Automated Verification**
- `npm test -- tests/procedural-assets.test.js` passed: 1 file, 5 tests.
- `npm test` passed: 10 files, 57 tests.
- `npm run build` passed.
- Known non-failing warnings: `@dimforge/rapier3d-compat` emits a deprecated initialization warning during Node/Vitest initialization, and Vite reports the Rapier/Three bundle chunk is larger than 500 kB.

**Browser Verification**
- Desktop landscape viewport: `1280 x 720`
- Dev URL: `http://127.0.0.1:63527/?gloveFieldPolish=1783349358699`
- Start and gameplay probes both rendered 1 canvas.
- Gameplay probe after clicking `开始`: timer active, browser console had no error logs.

**Screenshots**
- Start screen: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/launcher-standard-field-start-v2.png`
- Gameplay screen: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/launcher-standard-field-gameplay-v2.png`

**Findings**
- The far source now reads as a compact launching machine instead of a difficult-to-polish tiny footballer.
- The pitch lines are closer to a real football half: penalty area, goal area, center markings, and touchlines are now visible in the goalkeeper view.
- The change stayed visual-only for gameplay: shot origin, ball physics, glove physics, and scoring behavior were not rewired.

## 2026-07-07 Mobile Forced Landscape QA

**Scope**
- Added mobile landscape helpers that detect portrait phone viewports, mark the stage as forced landscape, and request the browser Screen Orientation API on start/restart when available.
- Kept rendering math on the unrotated landscape stage dimensions so the Three camera and canvas stay at a wide aspect ratio even when CSS rotates the visible stage.
- Remapped pointer coordinates through the forced landscape rotation so touch dragging still lands on the expected glove position.
- Added mobile browser meta hints for landscape orientation and a CSS fallback that rotates the game stage in portrait phone viewports.
- Fixed the portrait-phone fallback alignment so the rotated stage fills the full mobile viewport instead of leaving a black side band.

**Automated Verification**
- `npm test -- tests/mobile-landscape.test.js` passed: 1 file, 5 tests.
- `npm test` passed: 11 files, 62 tests.
- `npm run build` passed.
- Known non-failing warnings: `@dimforge/rapier3d-compat` emits a deprecated initialization warning during Node/Vitest initialization, and Vite reports the Rapier/Three bundle chunk is larger than 500 kB.

**Browser Verification**
- Mobile portrait viewport: `390 x 844`
- Dev URL: `http://127.0.0.1:63527/?gloveFieldPolish=1783349358699`
- Final page probe: title `弹力手套守门挑战`, 1 canvas, boot status `started`, `stage.dataset.mobileLandscape = forced`.
- Final rotated stage bounds covered the full viewport: `left 0`, `top 0`, `right 390`, `bottom 844`.
- Render dimensions stayed landscape: stage/client canvas `844 x 390`.
- Browser console after final reload: no error logs.

**Screenshots**
- Forced landscape portrait viewport: `/Users/lucasyin/Desktop/goalkeeper-landscape/output/playwright/mobile-forced-landscape-portrait.png`

**Findings**
- Phone portrait entry now opens into the landscape game layout by default instead of showing the narrow portrait layout.
- Native landscape viewports and desktop layout keep the normal unrotated presentation.
- The fallback remains lightweight and web/miniprogram-friendly: no new rendering engine or heavy dependency was added.

## 2026-07-10 CC0 Environment Assets And Restrained Event Bloom QA

**Scope**
- Added a local reusable environment-asset pipeline around Three.js `HDRLoader` and `PMREMGenerator`.
- Added the Poly Haven CC0 `Autumn Field (Pure Sky)` 1K HDRI for restrained PBR reflections without replacing the authored Three.js sky.
- Added Poly Haven CC0 `Clean Asphalt` normal and roughness maps to the existing blue-green polymer court; no grass or turf color texture was introduced.
- Kept all third-party assets local under `/tools/goalkeeper-landscape/assets/environment/` and documented source URLs, hashes, and license.
- Reduced court normal strength after browser A/B isolation showed that the original normal intensity created a spotlight glare band.
- Rebalanced event presentation so ordinary saves keep local rings, sparks, glove deformation, camera micro-impulse, HUD, and audio while global Bloom is reserved for streak saves and goals.
- Added an owned mount guard so stale asynchronous boots are disposed instead of leaving duplicate RAF, physics, and audio runtimes after React development remounts or route changes.
- Reduced the continuous net shell to a soft center fade (`0.13` center visibility, `0.22` base opacity) while preserving the shaped pocket and edge lacing.
- Kept event-ribbon copy mounted through its 150ms fade-out so save and streak feedback never collapses into a blank pill.

**Asset Sources**
- HDRI: `public/assets/environment/autumn-field-puresky-1k.hdr`
- Court normal: `public/assets/environment/clean-asphalt-normal-gl-1k.jpg`
- Court roughness: `public/assets/environment/clean-asphalt-roughness-1k.jpg`
- Manifest: `public/assets/environment/SOURCES.md`
- License: Poly Haven CC0 1.0

**Automated Verification**
- `npm test` passed: 18 files, 209 tests.
- `npm run build` passed; production bundle `index-X6RGbrGx.js` was generated.
- Root route contract passed: 9 tests.
- Root `npx tsc --noEmit` passed.
- Root `npm run lint` passed with 0 errors and 3 pre-existing warnings.
- Root `npm run build:vercel` passed and generated 38 static pages.

**Browser Verification**
- Desktop landscape: `1280 x 720`, environment asset status `ready`, no browser errors.
- Mobile landscape: `844 x 390`, canvas matched the viewport exactly, environment asset status `ready`, no browser errors or warnings.
- Normal save: score `100`, global Bloom returned to ambient `0.006`, presentation wash `0.029`, sound status `ready`.
- Three-save streak: scores advanced `100 -> 225 -> 375`; only the third save activated highlight Bloom (`0.05`) and the `x3 +150` ribbon.
- Goal: conceded advanced to `1/5`, highlight Bloom `0.054`, presentation wash `0.061`, net and ball remained visible.
- Next route lifecycle: first and second visits each created exactly 1 script and 1 canvas with different mount IDs; leaving the route removed the runtime, script, and canvas.
- Mobile three-save sequence: scores advanced `100 -> 225 -> 375`, conceded stayed `0/5`, and the round remained live after the third save.
- Event-ribbon fade probe retained its last event copy while opacity transitioned to zero; no empty HUD pill remained.
- Final bundle console filter for `index-X6RGbrGx.js`: no errors or warnings.

**Findings**
- HDR/PBR assets add material depth without changing the existing camera, physics, collision shapes, or no-grass court direction.
- Ordinary saves no longer bleach the whole goal; feedback stays concentrated around the gloves and score ribbon.
- Streaks and goals still receive a stronger event tier, preserving payoff without making every contact equally loud.
- The center of the goal now reads as open play space; the net remains visible around the frame and rear pocket without becoming a white screen over the ball.
- Route changes can no longer strand an unowned game loop, addressing the duplicate-ball, duplicate-audio, and post-streak freeze failure mode at its source.
