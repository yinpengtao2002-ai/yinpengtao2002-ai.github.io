# Goalkeeper Trapezoid Goal Design

## Context

The goalkeeper game currently renders a goal whose side support falls diagonally from the front crossbar to a rear ground point. This reads as a triangular training frame rather than a regulation football goal. The decorative net also uses many independently hard-coded coordinates, while physics only models the three front frame members and one curved rear-net surface. That mismatch causes visible gaps, mesh outside the frame, and balls that can appear to pass through side or top netting.

The existing camera, composition, shot cadence, glove controls, score rules, and launcher remain unchanged.

## Chosen Direction

Use a balanced front-high/rear-low trapezoid based on the approved B direction:

- Front mouth: existing width and height from `SHOT_3D`.
- Rear upright height: 1.95 m.
- Cage depth: 2.05 m behind the front goal line.
- Front and rear widths: identical. The net must not flare outside the posts.
- Top rails: front crossbar corners to rear-upright tops.
- Rear uprights: rear top corners to rear ground corners.
- Bottom rails: front post bases to rear ground corners.
- Rear bottom rail: joins both rear ground corners.

This creates a clear four-corner trapezoid in side profile while keeping the front goal mouth visually and physically identical to the current game.

## Approaches Considered

### 1. Visual-only frame replacement

Replace the diagonal supports with rear uprights and rails, but leave the current net and physics unchanged. This is fast, but preserves the underlying visual/physics disagreement and does not solve side- or top-net pass-through.

### 2. Shared parameterized cage geometry (chosen)

Define the frame points, rails, and net panels once and consume them from both Three.js rendering and Rapier/game physics. This is a contained refactor with strong regression coverage and prevents future coordinate drift.

### 3. Imported goal asset with mesh colliders

Adopt a third-party GLB goal and derive collision meshes from it. This could improve detail, but introduces asset licensing, loading, mobile performance, scale alignment, and collider complexity. It is unnecessary for the present procedural visual language.

## Shared Geometry Contract

Expand `goal-net-geometry.js` into the source of truth for the complete goal cage. It will expose:

- Regulation mouth dimensions and front plane.
- Rear height and cage depth.
- Eight canonical corner points: four front and four rear.
- Frame rail segments with stable names.
- Four net panels: left side, right side, top, and rear.
- Panel sampling helpers for rendering ropes/mesh and collision projection.

Every rear or side coordinate must be derived from this contract. Rendering code must not add net vertices outside the frame silhouette.

## Rendering

`createGoalAndNet()` will retain the existing white front posts and crossbar. The old diagonal depth stanchions and outward-flared base rails will be replaced by:

- Two slightly descending top depth rails.
- Two vertical rear uprights.
- Two ground-level side rails.
- One rear ground rail.

The visible net becomes a continuous cage:

- Top panel follows both top rails from crossbar to rear top rail.
- Side panels follow each front post, top rail, rear upright, and bottom rail.
- Rear panel spans the rear uprights and allows a small inward pocket deformation without leaving the frame.
- Seams overlap by only the rope radius, so there are no floating strips or overhangs.
- The keeper-facing sightline remains readable through restrained rope thickness and opacity.

Existing decorative net layers that depend on the triangular or flared silhouette will be removed or re-derived from panel sampling. Mobile keeps the current reduced-detail budget.

## Physics

Rapier frame colliders will cover every named rail, not only the front three members. Segment colliders will be oriented capsules or cuboids derived from the shared endpoints.

Soft-net collision remains deterministic game logic rather than a cloth simulation. The resolver will test the swept ball against the four shared panel surfaces:

- Rear panel absorbs forward travel and rebounds the ball gently toward the field.
- Side panels absorb lateral escape inside the cage and redirect inward.
- Top panel absorbs upward escape and redirects downward.
- Seam contacts select one panel per substep and share the existing cooldown/event identity, preventing duplicate visual and audio feedback.

A credited glove save remains a save even if the deflected ball later contacts the net. Net contact must never rewrite the score outcome or create a second glove event.

## Testing

Add focused tests before implementation:

- Geometry contract has regulation front dimensions, 1.95 m rear height, 2.05 m depth, equal front/rear width, and a trapezoidal side profile.
- Every rendered rear rail endpoint matches a canonical geometry point.
- No side or rear net object extends outside the cage width/depth envelope.
- Rapier creates colliders for front frame, top rails, rear uprights, bottom rails, and rear rail.
- Fast balls collide with rear, left, right, and top net panels without tunneling.
- A seam impact produces one net event and one impact count.
- Existing glove save, scoring, ground, multi-ball timing, and contact-deduplication tests remain green.

Visual verification will cover desktop landscape and a representative phone landscape viewport. Checks include frame/net alignment, no mesh overhang, launcher visibility, ball visibility, and no incoherent overlap with HUD or gloves.

## Delivery

Run the goalkeeper test suite and build its Vite bundle into the website's existing tool route. Then run the relevant website build/check, push only goal-related files to `main`, and verify `/tools/goalkeeper-landscape/` on the deployed site.
