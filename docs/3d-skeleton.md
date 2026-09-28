# Design note: a 3D skeleton, still drawn as SVG

Status: **built** (Sep 2026): exercise format **v2**. The app draws and solves every exercise in 3D, the library
was converted, and format 1 is no longer read or written. What's left is fixing the poses that the range-of-motion
check used to flag (all fixed; see "The range check").

## Why

Until Sep 2026 the engine (`src/core.js`) was a flat 2D figure that pretended to have depth. Joints turn in the picture
plane; "front" vs "side" view is a blend of two sets of angles (`v` 0 → 1); anything toward or away from the
camera is faked with the `*Depth` joints (foreshortening by cos). Which leg is in front is a fixed drawing
order, overridden per step with `layers`.

That held up for most of the library, but depth kept leaking through:

- **Crossing legs** (Star Excursions, PRs #6–#10): `layers`, a "swap only while the legs are apart" rule, a
  look-ahead during holds, a moved middle pose and extra "Behind the standing heel" steps, all to fake one
  fact: the reaching foot is *behind* the standing leg.
- **The camera turning** (side ↔ front) interpolates two unrelated sets of angles, so limbs can take paths no
  body could, and feet appear to slide sideways while the view turns (accepted in HANDOFF §7).
- **Twists and circles** out of the picture plane (hip circles, arm circles seen from the side, rotations) are
  approximations; hip circles only show the side-to-side part and lean on the compass.
- **Authors** (people and AI prompts) have to think in two separate angle conventions and choose a view per
  step, which is the hardest part of the format to get right.

A 3D skeleton removes the cause instead of patching each case.

## What it is

- Each joint gets a **3D rotation** (three angles, or a swing + twist), relative to its parent, in a body frame:
  x = the figure's right, y = up, z = forward.
- **Forward kinematics** gives 3D points for every body point (the same names as today: `ankleL`, `toeR`,
  `handL`…).
- A **camera** is just a rotation about the vertical axis (side = 90°, front = 0°, anything in between),
  plus the existing framing. The view turning becomes a real turn: bodies stay rigid.
- **Drawing** stays SVG: project each bone's endpoints, then draw bones **sorted by depth** (far to near). The
  crossing leg is behind because it *is* behind. `layers` goes away.
- Everything above the drawing keeps working on projected (or full 3D) points: floor and surfaces
  (`supportY`), `anchor`, `touch`, `plant`, `reach`, `keep`, props, the hand-off of planted points between
  steps, and the animation checks.

No library is needed: the maths is a few hundred lines (small matrices, two-bone IK in 3D). No WebGL, no GPU
cost on the cover screen, still works offline, still one file for the single-file build.

## The format (exercise v2)

```jsonc
{ "version": 2, …,
  "keyframes": [ {
      "name": "Reach back left", "cue": "…",
      "camera": 90,                   // degrees around the vertical: 90 = side (facing right), 0 = front
      "anchor": "ankleL", "anchorX": -40, "anchorZ": 40,   // where the pinned point is (sideways, forward)
      "touch": [{ "point": "toeR", "adjust": "hipR" }],       // "hipR" = its forward number; "hipR.side", "hipR.turn"
      "pose": {
        "torso":  [35, 0, 0],         // spine and whole body: forward (bend +), side (lean right +), turn (left +)
        "hipR":   [-39.5, -25, 0],    // limbs: forward (+), side (out +), turn (out +)
        "kneeR":  15,                 // hinges stay one number
        …
      } } ] }
```

- Hinge joints (knees, elbows, ankles) stay a single angle; ball joints (hips, shoulders, spine segments, neck,
  whole body) take three. Unlisted = 0.
- Signs follow the body, not the screen: "forward is positive" means the same thing from any camera and on
  either side, which also makes mirroring simple (swap L/R; negate the spine's and whole body's side and turn).
- `view` became `camera` (a number); the `*Depth` joints are gone (they were the missing axis); `layers` is gone;
  `reach.bend` is gone (a hinge bends one way); positions on the stage are world x (sideways) and z (forward):
  `anchorX`/`anchorZ`, props' `z`/`x`, a band's fixed spot `{x, y, z}`, a wall `beside` or not.
- `version: 2`. Format 1 isn't read any more: the owner's call once everything was converted, as there were no
  other users yet.

## Converting the library (137 exercises, Sep 2026)

Done by a one-off script (in git history: `tools/v1/convert.cjs`, removed with the v1 engine):

- The v1 engine resolved each step (touch, reach, keep, plant), step 1's 3D skeleton gave its points in 3D, and the
  v2 angles were **measured** from those points: whole body and spine directly (one angle in the picture plane =
  lean forward from the side, sideways from the front), limbs as forward/side/turn + bend. Where several angles give
  the same pose, the one closest to the v1 numbers was kept, so deliberate windings (`540`, `-235`) and the way
  every move turns carried over.
- Every converted pose reproduces its v1 picture exactly (0.00 px, from its own camera). Played side by side, 125 of
  the 137 exercises stay within 2 px of the old animation through every move; the rest differ where the 3D figure
  moves differently from the 2D blend (the camera turning, a sliding foot's knee bending forward instead of
  sideways), which was checked by eye.
- Fixed on the way: side-view left limbs "toward the camera" (across the body in 3D, but meant as out to their own
  side) read as outward; front-view feet (sideways stubs in 2D) set level; the Star Excursions' reaches given real
  directions (back-left goes back and across, the crossing leg is behind the standing one because it is) and one
  standing-foot spot for both cameras; the Supported Headstand's arms, which were the mirror image in depth of
  Dolphin's (the forearms flipped over between the two); Bound Angle's move gained a quiet knees-up step so the knees
  don't dip through the floor.

## What changes for people

- **Nearly nothing visible** at first, except that crossings, twists and camera turns look right.
- **The pose editor** has three steppers per ball joint (forward, side, turn), one per hinge, and a camera row.
  Easier to reason about than the old signs, because they don't depend on the view.
- **AI prompts** are simpler: one angle convention, no per-step view juggling.
- **Submissions** (step 7) only ever see one format, which is why this went first.

## Risks and costs

- **Size of the job**: similar to step 3. Engine rewrite of FK/IK/placement (the contact logic mostly stays),
  converter, editor, prompts, schema v2, checks on v2.
- **Regressions** in carefully tuned exercises. Mitigation: the checks, the comparison page, and converting in
  bulk only once they pass.
- **Performance**: a depth sort of ~16 bones per frame is trivial.
- **What it doesn't solve**: a stick figure still can't show hand grips, facial cues or muscle engagement; the
  words carry that, as now.

## Plan

1. ✅ 3D FK + projection + depth-sorted SVG drawing, fed by converted v1 poses: the picture matches.
2. ✅ Contact solving (anchor, touch, plant, reach, keep, surfaces) on 3D points; checks on v2.
3. ✅ Schema v2, converter, library converted, failures fixed (or listed as known issues, with why).
4. ✅ Pose editor, format reference and AI prompts for v2; `layers` and depth joints removed; format 1 no longer
   read or written.
5. ✅ The problem poses (below), and the build rejects poses past "flexible".

## Joint model

Modelled on a jointed artist's mannequin (the owner's suggestion, Sep 2026): the same pieces and the same kinds of
joint, so a pose can only do what a body can. The mannequin sets **which joints exist and how each one moves**; the
**limits come from human range of motion**, not from the wooden figure (whose limits are mechanical: it can't reach
fully overhead, and some knees bend slightly backwards).

| Joint | Kind | Moves | v1 today |
|---|---|---|---|
| Pelvis (whole body) | free | position + 3 turns | 1 angle, per view |
| Lower back, upper back | ball | forward/back, side bend, twist | 1 angle each |
| Neck (head) | ball | nod, tilt, turn | 1 angle |
| Shoulder | ball | forward/back, out/in, twist | 1 angle + "toward you" |
| Elbow | hinge | bend only, one way | 1 angle, halves turnable separately |
| Hip | ball | forward/back, out/in, twist | 1 angle + "toward you" |
| Knee | hinge | bend only, one way | 1 angle, halves turnable separately |
| Ankle | 2 axes | up/down, tilt in/out | 1 angle |

Not modelled (the figure is too small to show them, or no exercise needs them yet): wrists, hands, toes, a separate
head and neck. **Later, if exercises need them:** shoulder blades (shrugging, pulling the shoulders back, a plank's
push-away) and more spine segments (Pilates rolling through the back).

### Range of motion

Degrees. A hip or shoulder is judged by **where the limb points** (how far forward, back, out to its own side, or
across the middle, from hanging straight down) and **how far it's turned** about its own axis; knees and elbows by their
bend. **Normal** is the AAOS reference for typical adults. **Flexible** is what a trained, flexible person reaches
(yoga, Pilates), with the pelvis and spine helping; past it, the pose is one no body makes.

| Joint | Normal (AAOS) | Flexible |
|---|---|---|
| Hip: forward / back | 120 / 30 | 170 / 60 |
| Hip: out / across | 45 / 30 | 95 / 45 |
| Hip: turn in / out | 40 / 45 | 60 / 90 |
| Knee, bend | 0 – 135 | −10 – 165 |
| Shoulder: back / across (forward, out and overhead are all reachable) | 60 / 40 | 110 / 60 |
| Shoulder: turn in / out | 70 / 90 | 90 / 110 |
| Elbow, bend | 0 – 150 | −10 – 170 |

Sources: AAOS normal values (American Academy of Orthopaedic Surgeons; see e.g. the CDC's Normal Joint Range of Motion
Study, https://archive.cdc.gov/www_cdc_gov/ncbddd/jointrom/index.html). The "flexible" column is our own working
limit. The figure has no shoulder blades, which give a real arm about 30° more: the shoulder's flexible column
includes them (without it, no stick figure could reach its heels in Camel).

### The range check

`tools/rom.cjs` checks every step of every exercise (after touch, reach and keep are solved, both sides, both
directions). **The build fails on any joint past "flexible"**; past normal is only counted (expected for yoga and deep
stretches). How it measures, and why:

- **Where a limb points** is measured from its direction, not from the joint's three numbers one by one: those change
  meaning near overhead (an arm straight up is forward 180, or out to the side 180, or back −180 turned round), so a
  check on the numbers flags good poses.
- **How far a limb is turned** depends on the path its swing is measured along (Codman's paradox). Clinically it's
  measured after the forward and side swings, which is the order of the joint's own numbers, so the check uses the
  joint's own turn, in whichever of its two equivalent spellings (`[f, side, turn]` or `[f + 180, 180 − side,
  turn + 180]`) turns less.

**Fixed (Sep 2026, after the conversion).** The check found 34 exercises past "flexible". All now pass:

- **Knees folded flat** (a real knee stops around 155–160°): seated folds now turn the thigh out so the shin lies on
  the floor beside it (Seated Hamstring Stretch, Head-to-Knee, Revolved Head-to-Knee, Half Lord of the Fishes); knee-up
  steps raise the knee instead of folding it flat (Marichyasana I and III); Child's Pose, Crow, Gate, Easy Pose and
  Lotus bend 155°.
- **Folds made at the hip that a body makes elsewhere**: Warrior 3 tips the whole body (the back leg is in line, not
  bent 90° back); Wheel arches the spine (and gained a "hands by your ears" step); Dancer leans the body and lifts the
  leg with the knee bent, the hand holding the foot; Pigeon tilts the pelvis, with the front shin across the body on
  the floor; Camel arches the upper back to reach the heels; Revolved Side Angle tilts the pelvis.
- **Arms turned half round by the conversion** (the 2D pictures bent those elbows backwards): Overhead Triceps (arms
  forward over the top), Crunch (hands behind the head, elbows out), Half-Kneeling Hip Flexor (hand on the hip), Towel
  stretch (the lower hand behind the back turned in), Swan (hands under the shoulders), Barbell Squat (hands on the bar,
  elbows down), Neck and Cross-Body stretches.
- **Bound Angle** rebuilt: knees out and low, soles together, hands holding the feet. **Side Plank** is a real roll
  about the body's long axis (a quiet halfway step keeps it a roll), seen from the side, so the camera no longer turns.
  **Wide-Legged Forward Bend** has its legs apart (the side view never showed them). **Firefly** legs go forward and
  out.

## Progress

- Step 1 (Sep 2026): a 3D skeleton fed by v1 poses matched the 2D picture on all 545 steps (0.0000 px), and found
  what the conversion would have to fix (crossing legs known only to `layers`, limbs straight in 2D but bent in 3D).
- Steps 2–4 (Sep 2026): `src/core.js` is the 3D engine (joints, FK, camera, placement, touch/reach/keep/slide in
  3D); the app draws each bone by depth; the library, schema, editor, format reference, AI prompt and tests are v2.
  `tools/viewer3d.html` plays any exercise from any camera.

## Decisions for the owner

- ~~Go / no-go, and timing~~: **go**, as v2, before step 7 (owner, Sep 2026).
- ~~Keep a v1 export?~~ No; and v1 import stops as soon as everything is v2 (owner, Sep 2026).
