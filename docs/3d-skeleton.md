# Design note: a 3D skeleton, still drawn as SVG

Status: **go** (owner, Sep 2026), as exercise format **v2**, before the submission pipeline (roadmap step 6).
Step 1 of the plan is built (see "Progress" below); the app still draws with the 2D engine.

## Why

The engine (`src/core.js`) is a flat 2D figure that pretends to have depth. Joints turn in the picture
plane; "front" vs "side" view is a blend of two sets of angles (`v` 0 → 1); anything toward or away from the
camera is faked with the `*Depth` joints (foreshortening by cos). Which leg is in front is a fixed drawing
order, overridden per step with `layers`.

That has held up for most of the library, but depth keeps leaking through:

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
      "name": "Reach left", "cue": "…",
      "camera": 0,                    // degrees around the vertical: 90 = side (facing right), 0 = front
      "pose": {
        "root":   [0, 0, 0],          // pitch (lean forward +), roll (to the figure's right +), yaw (turn left +)
        "hipR":   [-25, 20, 0],       // flex (forward +), abduct (out to the side +), rotate (toes out +)
        "kneeR":  60,                 // hinges stay one number
        "elbowL": 70,
        …
      } } ] }
```

- Hinge joints (knees, elbows) stay a single angle; ball joints (hips, shoulders, spine segments, neck) take
  three. Unlisted = neutral, as now.
- Signs follow the body, not the screen: "flex forward is positive" means the same thing from any camera and on
  either side, which also makes mirroring trivial (negate abduction and rotation, swap L/R).
- `view` becomes `camera` (a number); `*Depth` joints disappear (they were the missing axis); `layers` is
  removed.
- `version: 2`. The app keeps reading version 1 through the converter below (`upgradeFile()` already exists
  for this), so old exports, shared links and users' own exercises keep working.

## Converting the library (136 exercises)

- **Side-view steps**: today's angles are flexion in the sagittal plane → the flex component; depth joints →
  abduction toward the camera side. Mostly mechanical.
- **Front-view steps**: today's angles are abduction in the frontal plane → the abduct component.
- **Mixed** (`thighDepth`, `armDepth`… used to fake a limb coming toward the camera): the depth angle plus the
  in-plane angle give the 3D direction directly.
- A script (`tools/convert-v2.mjs`) converts every file; the build then runs the animation checks on the v2
  versions. Where a check fails, the conversion was an approximation that the old picture hid, and gets fixed
  by hand (expected: a handful — twists, circles, Star Excursions).
- The optimizer's deliberate angle representations (`540`, `-235`) carry over per component.
- Side by side comparison page during the change: v1 vs v2 of each exercise, to catch anything that looks
  different.

## What changes for people

- **Nothing visible** at first, except that crossings, twists and camera turns look right.
- **The pose editor** gets three steppers per ball joint (e.g. hip: forward/back, out/in, turn), and a camera
  stepper. Easier to reason about than today's signs, because they don't depend on the view.
- **AI prompts** get simpler: one angle convention, no per-step view juggling.
- **Submissions** (step 7) only ever see one format, which is why this goes first.

## Risks and costs

- **Size of the job**: similar to step 3. Engine rewrite of FK/IK/placement (the contact logic mostly stays),
  converter, editor, prompts, schema v2, checks on v2.
- **Regressions** in carefully tuned exercises. Mitigation: the checks, the comparison page, and converting in
  bulk only once they pass.
- **Performance**: a depth sort of ~16 bones per frame is trivial.
- **What it doesn't solve**: a stick figure still can't show hand grips, facial cues or muscle engagement; the
  words carry that, as now.

## Plan

1. ✅ 3D FK + projection + depth-sorted SVG drawing behind the existing API, fed by converted v1 poses: prove the
   picture matches (comparison page), and that crossings/turns are fixed.
2. Contact solving (anchor, touch, plant, reach, keep, surfaces) on 3D points; checks on v2.
3. Schema v2, converter, `upgradeFile()` for v1 → v2, convert the library, fix the failures.
4. Pose editor, format reference and AI prompts for v2; remove `layers` and depth joints.

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

Degrees from hanging straight down (+ = forward / out to the side). **Normal** is the AAOS reference for typical
adults. **Flexible** is what a trained, flexible person reaches (yoga, Pilates), with the pelvis and spine helping;
past it, the pose is one no body makes.

| Joint | Normal (AAOS) | Flexible |
|---|---|---|
| Hip, forward (flexion) / back (extension) | 120 / 30 | 170 / 60 |
| Hip, out (abduction) / in (adduction) | 45 / 30 | 95 / 45 |
| Knee, bend | 0 – 135 | −10 – 165 |
| Shoulder, forward (flexion) / back (extension) | 180 / 60 | 180 / 80 |
| Elbow, bend | 0 – 150 | −10 – 170 |

Sources: AAOS normal values (American Academy of Orthopaedic Surgeons; see e.g. the CDC's Normal Joint Range of Motion
Study, https://archive.cdc.gov/www_cdc_gov/ncbddd/jointrom/index.html). The "flexible" column is our own working
limit, to be tightened if it lets through poses that look wrong.

### The range check

`S3D.joints()` measures each joint from the 3D points, in the body's own frame (the same numbers from any view);
`S3D.outOfRange(points, 'normal' | 'flexible')` compares them with the table, and `tools/check3d.cjs` reports both
for the whole library (informational for now: it doesn't fail the build).

- **Past normal** is expected for yoga and deep stretches: the report only counts exercises per joint.
- **Past flexible** is listed step by step; these are the poses to fix when converting. As of Sep 2026 (21
  exercises):
  - **Knees folded completely flat** (170–180°: sitting cross-legged, kneeling, Crow, Pigeon, Marichyasana…): the
    stick figure folds the shin onto the thigh; a real knee stops around 155–160°. In v2 the shin sits beside the
    thigh.
  - **Backbends made at the hip** (Wheel, Dancer, Pigeon's back leg): the 2D figure bends at the hip what a body
    bends mostly in the spine. v2 moves it into the lower and upper back.
  - **Arms far behind** (Chair Dip, Camel, Plow, Pyramid): shoulder extension past 80°, where a body uses the
    shoulder blades and a twist.
  - **Swan's elbows** folded to 171° (hands under the shoulders): a real elbow stops around 150°.
  - A few hip readings in deep folds and twists (Extended Side Angle, Revolved Head-to-Knee, Half Moon), to look at
    in the comparison page.
- Two things can't be judged until v2 adds the shoulder's twist: which way an elbow bends, and an arm raised
  *behind* the body (flexion over the top, or out to the side and twisted, like hands behind the head). The check
  skips both rather than guess.
- Once v2 poses are written directly as joint angles, the same limits apply at the source: the pose editor clamps
  to them and the build rejects poses past "flexible", including ones written by AI.

## Progress

**Step 1 (built).** `src/skeleton3d.js` gives every body point the coordinate the 2D figure leaves out: the hips' and
shoulders' width, and `*Depth` angles (a limb turned toward the camera by d goes L·sin d toward it; the picture shows
L·cos d). `project(points, yaw)` is the camera; `drawOrder()` sorts the parts far to near.
- `tools/check3d.cjs` (run by the build): from each step's own view the 3D figure is today's picture, **0.0000 px
  apart on all 545 steps** of the library (both sides, both directions). Front-view feet are the one deliberate
  difference: the 2D engine draws them as sideways stubs; the 3D foot points forward.
- `tools/compare3d.html` (serve the repo root; open `/tools/compare3d.html?ex=<id>`): today's figure beside the 3D one,
  with a camera slider. Between steps the 3D bones turn (slerp), so limbs keep their length through camera turns.
- What it found, for step 3 (converting the library):
  - **Crossing legs.** 8 Star Excursion steps tell the 2D engine which leg is behind (`layers`). In 2 of them the
    pose's own depth agrees; in 6 the pose doesn't hold the fact at all (front-view reaches with no depth, and two
    side-view reaches whose diagonal behind the standing leg is missing). Converting them means writing the reach
    as a real direction (back and across), after which `layers` can go.
  - **Limbs straight in 2D but bent in 3D.** A knee or elbow at 0° whose two halves turn toward the camera by
    different amounts is bent in 3D. 22 such limbs remain: some intended (a bench-press elbow bending toward the
    camera), some not (Arm Circles' elbows, the Wall Sit + Pull-Apart knees). Leg Circles had this and is fixed.
  - The check prints both lists.

## Decisions for the owner

- ~~Go / no-go, and timing~~: **go**, as v2, before step 7 (owner, Sep 2026).
- Whether to keep a v1 export for a while (for anyone with tools built on v1), or read-only v1 support is
  enough. Needed by step 3.
