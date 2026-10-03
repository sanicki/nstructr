# NstructR — handoff

This is the full context for whoever picks up NstructR next (written for Claude Code). It covers what exists,
how it works, the file formats, the rules the animations must obey, the decisions already made and why, and
what's left. `CLAUDE.md` is the short version; this is the reference.

Repo: https://github.com/sanicki/nstructr (one repo, **MIT license** (`LICENSE`), covering the engine, the app and the library).
Published site (once Pages is enabled): https://sanicki.github.io/nstructr/

---

## 1. What NstructR is

A web app (planned installable PWA on GitHub Pages) that shows exercises as an animated 2D stick figure and runs
**workouts**: ordered blocks of exercises with reps or hold times, sets, rests, sides and directions, with
optional voice coaching.

**Cover screen support:** the workout player works on the **cover screen of foldable flip phones** (reference device: the owner's Samsung Galaxy Z Flip7), with the phone lying on the floor in front of the
user while they exercise. It was an early focus of the app and is still an important feature, but not the app's focus
(owner, Sep 2026): keep it working, don't design the app around it. The workout player is built for it: readable from ~2 m, usable
with the fewest possible touches, nothing important at the bottom of the screen (the cover screen's camera
cutouts and flash sit along the bottom), no accidental skips.

History: it started as "Pose Player" (a yoga pose animator), became "Motion Guide" (general exercise animator),
and is now **NstructR**, with Workouts as the focus. Old names survive in localStorage keys on purpose (§11).

Library today: **358 exercises, 5 workouts** (20-minute beginner's yoga, Pilates, resistance band, free weights and kettlebell, Sep 2026, timed with Instructor on (its run-through before each set and side) at the default rests (5 s, 10 s); about 15–17 minutes without Instructor). Their default order is `library/workout-order.json` (the build sorts the bundle by it and fails if a workout is missing from it); a person's own order (`nstructr-libwk-order-v1`) comes first.

| Collection | Count | Notes |
|---|---|---|
| Yoga | 90 | Yoga Journal pose list + chair and wall versions (incl. Chair Warrior I and II, Chair Eagle; Handstand, Headstand and Forearm Stand at the wall) + common poses (Cobra, lunges, Goddess, Bound Angle Forward Bend…) + block and strap versions (incl. Cow Face arms with a strap) |
| Free weights | 65 | dumbbell, kettlebell (incl. around the world, clean, Turkish get-up), barbell, medicine ball (incl. equipment versions of bodyweight moves), farmer's carry; dumbbell and barbell versions of other exercises (batch 21) |
| Bodyweight | 43 | squats, stability ball bridge, lunges (incl. walking), push-ups, pull-up bar (pull-up, chin-up, dead hang, hanging knee raise), step-up, calf raises, tibialis raise, clamshell, bench dip, good morning, jump squat, pistol squat… |
| Resistance band | 39 | lateral band walk, 10 BHF standing exercises + seated row + routine additions + banded versions + door anchor (face pull, row, chest press, pushdown, Pallof press, woodchop) + band Pilates (Hundred, Leg Circles, Roll-Up) + band shrug (batch 27) |
| Chair-based | 29 | NHS chair/sitting exercises, chair dip, chair push-up, chair yoga, chair-supported stretches… |
| Stretches | 39 | Mayo Clinic basic stretches + routine additions + triceps, biceps, wrist flexor, shoulder shrug (batch 27, standing; the shoulder lift joint `shrugL/R` was added for it) (batch 26: nothing stretched biceps and forearms), figure-four, doorway, strap stretches + towel, chair and step versions + foam roller (calves, hamstrings, quads, upper back, glutes, IT band, lats) |
| Core | 40 | planks (incl. knee plank), hanging knee raise, stability ball (crunch, bridge, seated march), medicine ball (Russian twist, slam), bird dog, dead bug, crunch, bicycle, Russian twist, hollow hold, Pallof press, woodchop… |
| Pilates | 41 | Pilates ring (chest press, inner thigh squeeze); all 34 classical mat exercises (Leg Circles: Side and Direction, with a compass; Roll-Over, Saw, Side Kick… and the advanced ones, batch 23: Open Leg Rocker, Corkscrew, Jackknife, Boomerang…); band versions |
| Balance | 15 | Half Moon with a block, seated march on a stability ball, Star Excursion, Warrior III and Tree at the wall, single-leg stand, tandem stance, heel-to-toe walk, side stepping, balance walk, clock reach, single-leg RDL, pistol squat |
| Warm-up | 24 | arm and hip circles, shoulder shrug, leg swings, inchworm, torso twists, butt kicks, jumping jacks, high knees, jump squat, foam rolling |

227 are rep-based, 131 timed; 127 are two-sided (`bilateral`); 11 have `direction`. Common exercises per collection
still to add, and equipment to track: `docs/collection-research.md`. Equipment versions of library exercises: `docs/equipment-equivalents.md` (what was found, what's added, what's next).

---

## 2. State of the repo right now

Roadmap step 1 (§13) is **done** apart from going live (item 6 below). What's done:

- Library split into **one JSON file per exercise** (`library/exercises/<id>.json`) and per workout
  (`library/workouts/<id>.json`), each with `"$schema"` and `"version"` (2 since Sep 2026: 3D poses). **These files are now the source of
  truth.** (They were previously generated by a Python script, `gen.py`, plus an angle optimizer; both are
  retired and not in the repo — see §8.6.)
- JSON Schemas in `schema/` (draft 2020-12).
- `tools/build.mjs`: validates every file, runs the animation checks (`tools/checks.cjs`) on every exercise,
  writes `library/index.json`, assembles `_site/` (multi-file `index.html` + single-file `nstructr.html`), and draws
  `_site/og.png`, the link-preview image (`tools/og-image.cjs`: four library figures on the icon's navy, rendered
  with the engine and written as a PNG with Node's zlib, no image library; `node tools/og-image.cjs out.png` to look).
  `src/head.html` has the meta description and Open Graph tags (Sep 2026); every link, share links included, gets
  the same card, since what a share link carries is after the `#`.
- `tools/known-issues.json`: accepted deviations with reasons.
- `.github/workflows/build.yml`: PRs run the build (validation + checks); pushes to `main` also deploy `_site/`
  to Pages. One-time setup: repo Settings → Pages → Source: **GitHub Actions**. A pull request's run only cancels
  an older run of the same pull request; deploys queue (Sep 2026: sharing one group, a PR's run cancelled a merge's
  deploy).
- App loads the library at startup (`boot()` in `src/app/5-main.js`): from `window.NSTRUCTR_BUNDLE` in the
  single-file build, otherwise `fetch('library/index.json')`.
- **Library workouts** are listed in their own section on the Workouts tab (Start / **Customize**), no longer
  copied into the user's list on first run, so library updates reach everyone. At runtime they're hydrated into
  `LIB_WK` with ids `lib:<id>` (so they never clash with a user workout, including the first-run copy older
  installs have under the plain id) and `libId`. `wkById` finds both; library workouts have no editor, and
  exiting their player returns to `#/workouts`. Customize = `customizeWorkout()`: a copy named "<name> (copy)" with a new id in
  `WK.list`. History records of a library workout carry the library id plus `library: true`.
- **`u-` ids on import** (`claimIds` in `5-main.js`): an imported exercise keeps its id if it starts with `u-`,
  if it's an unchanged copy of a library exercise, or if it replaces one of the user's own saved exercises
  with that id; otherwise it's renamed `u-<id>` and workouts in the same file follow the rename.
- **File versions**: `upgradeFile()` refuses files with a `version` newer than the app's `FILE_VERSION` (2), and
  older ones too: format 1 (2D poses) stopped being read or written when the library was converted to 3D (Sep 2026,
  owner's decision; there were no other users). Exports, share links, backups and AI answers are version 2.
- AI prompts (now one prompt, Create with AI, `src/app/5-ai.js`) produce one bare exercise / workout per file matching the schemas, with `u-` ids,
  `measure`, `defaults`, `phase`, and `headLow` in the point list.
- File formats renamed to `nstructr/exercise`, `nstructr/workout`, `nstructr/log`. Old `pose-player/*` files
  (and bare single exercise/workout objects) still import.
- Browser tests ported to `tools/e2e/` (Python Playwright), pointed at a URL via `NSTRUCTR_URL`.
- Verified: build passes; both builds load 136 exercises, seed the routine, play exercises, run the full 24-item
  routine to completion; old and bare files import; gestures, editor, Instructor speech, layout, floor height and
  arm-circle continuity tests pass against the served build.

**Step 3 (simpler UI) is built**: three tabs (Workouts, Exercises, Settings), the exercise player's
tap-for-controls overlay with its details on the page below, Advanced exercise editor. See §10.

**Step 2 (installable app + backup) is built and tested on a foldable flip phone** (installed; bottom margin confirmed) (see §13): manifest, icons, service worker, storage
persistence, Backup (Export everything; a backup is imported with Import like any file), and a Material theme generated from the icon's blue.
Still to do there: test on a flip phone's cover screen as an installed app (Good Lock?).

**Still to do in step 1:** merge to `main`, enable Pages (Settings → Pages → Source: GitHub Actions), confirm
the workflow deploys, test on a foldable flip phone.

Known gap, deliberately left: exercises users saved *before* the `u-` rule keep their old ids (no migration;
a clash needs the library to add that exact id). (The other old gap, stored copies of library exercises shadowing
library fixes, is gone: bookmarks are ids now, and a changed stored copy became the user's own "(copy)".)

---

## 3. Repo layout and commands

```
index.html            (generated into _site/, not committed)
src/
  head.html           <head>, all CSS (Material 3 tokens, player, workouts, cover-screen rules)
  body.html           all markup: views, dialogs, <template id="aiPrompt">
  core.js             engine: figure model, FK, placement, IK, transitions, props, surfaces (no DOM)
  thumb.js            static SVG thumbnail of an exercise; its limbs are filled capsules, not stroked lines: Chrome on
                      Android drew some thick round-capped lines (the lower legs of Barbell Curl and Barbell RDL) as
                      hairlines, live or as an image (tried and dropped), Sep 2026
  app/0-boot.js       globals the library fills (POSE_DB, LIBRARY_WORKOUTS)
  app/1-engine.js     app state S, import validation, figure SVG, drawing, playback loop, editor sliders
  app/2-explore.js    Exercises tab (collections incl. Saved, filters, search, cards)
  app/2-links.js      linked variations: easier/harder/other equipment, swapping a workout item (§8.1b)
  app/3-details.js    exercise page info, its tap-for-controls overlay, Edit, its sound, Settings, format reference
  app/4-workouts.js   workouts: storage, editor, plan builder, workout player, sound, history, sharing
  app/5-main.js       selection, import, routing, event wiring, boot() (defined here)
  app/5-ai.js          Create with AI: the prompt, AI apps and their links, reading the answer back
  app/5-share.js       share links: pack/unpack, share dialog with QR code, opening a link
  vendor/qrcode.js    QR code generator (qrcode-generator 2.0.4, MIT), vendored for offline use
  app/6-pwa.js        service worker registration, storage persistence, Export/Import everything; calls boot()
  sw.js               service worker template (the build fills in the version hash and the file list)
manifest.webmanifest  web app manifest (display: fullscreen)
icons/                app icons: icon-192/512 (any), maskable-192/512 (Android adaptive), apple-touch-icon, favicon
library/exercises/*.json   one exercise per file (source of truth)
library/workouts/*.json    one workout per file
library/index.json         generated bundle (committed or not — see note)
schema/*.schema.json
tools/build.mjs  tools/checks.cjs  tools/known-issues.json  tools/rom.cjs (range of motion)  tools/e2e/*.py
tools/format-json.cjs (how library files are laid out)  tools/viewer3d.html (any exercise from any camera)
tools/og-image.cjs (the link-preview image)
.github/workflows/build.yml
```

Scripts are classic `<script>` tags loaded in filename order and share one global scope (top-level `const`s in
one file are visible in the next). There's no bundler and no framework; keep it that way unless there's a
strong reason — the single-file build depends on simple concatenation.

`library/index.json` is regenerated by every build. Committing it is optional; CI regenerates it anyway.

```
npm install                          # once (ajv, for schema validation)
node tools/build.mjs                 # validate + animation checks + bundle + _site/
node tools/build.mjs --check-only    # what PRs run
node tools/build.mjs --no-checks     # fast rebuild while iterating on UI
python3 -m http.server 8000 -d _site # then open http://localhost:8000/ or /nstructr.html
NSTRUCTR_URL=http://127.0.0.1:8000/nstructr.html python3 tools/e2e/routine_full.py
```

`nstructr.html` (single file, library inlined) also works opened straight from disk. `index.html` needs HTTP
(it fetches `library/index.json`).

---

## 4. The figure model and conventions

All in `src/core.js`. Format v2 (Sep 2026): a 3D figure, jointed like an artist's mannequin, drawn as SVG
(`docs/3d-skeleton.md` has the design and the joint model).

- Stage: `W = 400`, `CX = 200`, `FLOOR = 360` (SVG units, y down on screen). **World** (3D): x = the figure's right
  (as it starts), y = up, z = forward; the floor is y = 0 and the stage centre x = z = 0.
- **Camera**: a keyframe's `camera` is a turn around the vertical, in degrees: `90` = side view (the figure faces
  screen-right), `0` = front view (the figure's right on screen left). Screen x = CX + z·sin(camera) − x·cos(camera),
  screen y = FLOOR − y. Between steps the camera turns; the body stays rigid.
  The camera never tilts, so a move made flat in the floor's plane (a knee bending while lying on your side) can't be
  seen from any angle: choose a position where it happens upright (the Towel Quad Stretch lies face down, not on its side).
- Segments (`DEFAULT_SEGMENTS`): torso 100 (two halves: lower back `torso`, upper back `chest`), neck 14,
  head radius 18, upper arm 55, forearm 50, thigh 80, shin 80, foot 22, shoulder half-width 22, hip half-width 12.
  The figure is ~310 units tall ≈ 170 cm (≈ 1.8 units/cm) — use this to size equipment.
- **Joints** (degrees, relative to the parent). Ball joints take `[forward, side, turn]`: `root` (whole body),
  `torso`, `chest`, `neck`, `shoulderL/R`, `hipL/R`. Hinges take one number: `elbowL/R`, `kneeL/R` (bend; 0 =
  straight, they only bend the way a body's do), `ankleL/R` (+ = toes pointed), `shrugL/R` (Oct 2026: the shoulder girdle; + lifts the shoulder, and so the arm,
  toward the ear about the top of the breastbone, a shrug; flexible range −15…45, `tools/rom.cjs`). At 0 the figure stands straight,
  arms hanging. **Signs follow the body, not the screen**, so a pose means the same from any camera:
  - hip / shoulder: forward + swings the limb forward (90 = straight ahead, 180 = overhead), side + lifts it out to
    its own side, turn + turns it out. Left and right use the same signs.
  - root / torso / chest / neck: forward + bends forward, side + leans to the figure's right, turn + turns left.
  - Order of the three: ball limbs turn forward, then out, then around their own axis (`ballM`); the whole body
    turns (yaw), then leans forward, then sideways (`rootM`); spine joints bend forward, sideways, then turn.
- Reference poses: standing = all 0. Arms forward `shoulders [90,0,0]`; overhead `[180,0,0]`; out to the sides
  `[0,90,0]`. Squat `torso [38,0,0], hips [88,0,0], knees 102, ankles -14`. Plank (side) `root [66,0,0],
  shoulders [66,0,0]`. Supine `root [-90,0,0], neck [34,0,0], anchor neckBase`. Seated: `anchor "pelvis"`.
- **Body points** (for `anchor`, `touch`, `reach`, `keep`, props): `pelvis spine neckBase head headTop headLow
  hipL/R kneeL/R ankleL/R toeL/R footL/R (ball of foot) shoulderL/R elbowL/R handL/R armpitL/R backL/R
  (across the shoulder blades)`. `headLow` is the lowest point of the head (Child's Pose rests on it).
- **Mirroring** (`mirrorKeyframe`, `mirrorProps`): the second side of a bilateral exercise is the mirror image:
  L/R swapped, the spine's and whole body's side and turn negated, sideways positions (`anchorX`, `reach.dx`,
  props' `x`) negated, `guide.direction` negated. Limbs keep their numbers (they already say "out", not left or
  right). The camera stays, so a side-view exercise looks the same on both sides. Words "left/right" in step names,
  cues and guide labels are swapped by `swapWords`. Write exercises for **one side only**.
- **Drawing**: every bone is its own SVG line in its own group; each frame they're projected and stacked far to
  near (`boneOrder`: by depth, holding the last order for bones within 1 px so nothing flickers). A leg crossing
  behind the other is behind because it is.

---

## 5. File formats

The schemas in `schema/` are authoritative for structure. This section is the meaning.

### 5.1 Exercise (`library/exercises/<id>.json`)

```jsonc
{
  "$schema": "../../schema/exercise.schema.json", "version": 2,
  "id": "bw-reverse-lunge",            // kebab-case, = file name; users' own start with "u-"
  "name": "Reverse Lunge",
  "otherNames": ["…"],                 // other names it's known by (Sanskrit, other languages); the first is shown under the name
                                       // naming (Sep 2026 review): "name" is the most common name (Plank, Downward Dog,
                                       // Chaturanga, Deadlift); the formal or older one is another name; yoga lists
                                       // its Sanskrit name first; no name belongs to two exercises
  "collections": ["Bodyweight"],       // library only: where the Exercises tab shows it (can be several); users' own have none
  "startPosition": "seated",           // optional, rarely needed: the position it starts / ends in when the one worked out
  "endPosition": "other",              // from the steps is wrong ("other": none fits); see §8.3b
  "category": "Strength", "focus": "Thighs and glutes",
  "equipment": ["Wall"],               // free text, used for filters and the "You'll need" list
  "description": "…", "setup": ["…"], "cues": ["…"],   // cues[0] is also spoken by Instructor
  "source": { "url": "…", "title": "…", "note": "…" },
  "prescription": { "reps": "8–12 each leg", "note": "…" },  // display text only ("3 rounds each leg" is fine)
  "measure": "reps" | "time",          // how a workout counts it
  "repName": "circle",                 // "3/10 circles"; default "rep"
  "holdStep": 1,                       // time-based: which step is the hold
  "defaults": { "reps": 8 } | { "seconds": 30 },     // used when added to a workout
  "bilateral": { "labels": { "L": "Right leg back", "R": "Left leg back" } },
  "direction": { "labels": { "A": "Forward", "B": "Backward" } },   // B = rep steps played in reverse
  "floorGuide": { "type": "star", "arms": 8 },   // top-down compass (Star Excursion, Hip Circles)
  "travel": true,                       // moves across the floor (Walking Lunge, band walk, Farmer's Carry): below
  "props": [ … ],
  "keyframes": [ … ]
}
```

**Travel** (`"travel": true`, Sep 2026): a rep ends further along than it starts and the next carries on from
there. Each step anchors the foot that stays (`resolveSequence` then chains the steps forward). How far a rep goes
is `travelOf(end, start)` (where the start step's pinned point is at the end of the rep, less where it is at the
start); the move from a rep's end into the next rep's start begins from the end moved back that far
(`travelStep`), so it's the step it is, not a slide back. The player adds the reps' distance so far (`S.off` on the
exercise page, `S.offs[i]` per step of a workout plan), keeps the pelvis centred on screen, and draws tick marks on
the floor every 60 px (`#floorTicks`) so moving over them reads as moving. The checks judge the loop move the same
way. Walking Lunge, Lateral Band Walk, Heel-to-Toe Walk, Farmer's Carry, Side Stepping (Oct 2026: it stepped out and back with the
same foot; now the other foot comes in to meet it, lifting on a quiet in-between step).

**Keyframe** (one pose the figure moves into):

| Field | Meaning |
|---|---|
| `name`, `cue` | Step name and one instruction. Instructor reads `cue` during the run-through. Keep cues short and speakable. |
| `camera` | Degrees around the vertical: `90` side view (default), `0` front view. The camera turns between steps. |
| `durationMs` | Time to move into this pose. Default 1000. **0 = instant** (used where two steps are the same position, e.g. 540° ≡ 180° in arm circles). |
| `holdMs` | Time held. Default 500. A hold ≥ 3000 ms makes an exercise timed (see `measure`). |
| `ease` | `"smooth"` (default, ease-in-out) or `"linear"` (constant speed — circles). |
| `phase` | `"setup"` (played once first), `"rep"` (one rep; for timed exercises the hold), `"finish"` (once at the end). No phases = the whole loop is one rep. |
| `quiet` | Instructor doesn't read this step (in-between points of a circle). |
| `anchor`, `anchorX`, `anchorZ` | Point pinned to the floor/surface at world (anchorX, anchorZ) (sideways, forward; default 0, 0). Without an anchor the pelvis is there and the lowest point rests on the floor. For an exercise whose camera turns, put the point where it looks the same from both (the Star Excursions pin the standing foot at x −40, z 40). |
| `lift` | Airborne (a jump): the whole figure that far above where it would rest, anchor or not; the move into and out of it rises and lands smoothly. The checks count it as meant, not floating. Short steps (300–400 ms): Jump Squat 45, Jumping Jacks 20, High Knees 6 (a hop as the standing foot swaps, with `anchorX` keeping the pelvis still). |
| `anchorY` | Hanging (Sep 2026): the anchor (a hand on a pull-up bar) is held at this height instead of on the floor; a move with a hanging step at either end is only kept out of the floor, not rested on it, and a hanging step isn't re-pinned to a contact it shares with the step before. The checks expect the anchor at anchorY. Pull-Up, Chin-Up, Dead Hang, Hanging Knee Raise (bar at 385: hands overhead reach 361 standing). Getting on and off (`withMount` in `tools/variants/batch-11-hanging.cjs`): stand, reach up with the arms as they'll hang, bend the knees (a crouch), jump to the bar (450 ms); let go and land deep with the arms still up (knees 85°), then stand and lower them. Between two hanging steps the hand that isn't the anchor is held where it grips (`frameAt`), so it doesn't slide along the bar. |
| `plant` | `["L","R"]`: feet kept flat (ankle computed). |
| `slide` | `["ankleL"]` (feet or hands): slide along the floor into this step instead of being lifted in a little step arc (`slideContacts`; Side Stepping's foot drawn in, Oct 2026). Mirrored with the side. |
| `touch` | `[{point, adjust, gap?}]`: turn joint `adjust` until `point` rests on the floor/surface (`gap` = height above it, e.g. barbell plates). `adjust` is a hinge, or a ball joint's number: `"hipR"` = its forward number, `"hipR.side"`, `"hipR.turn"`. `point` can also be a **segment** (Sep 2026, for the foam roller): `thighL/R`, `shinL/R`, `back` (pelvis to neck), `sideL/R` (the flank, hip to shoulder, lying on your side), which rests where it is lowest over what's under it (`SEGMENTS`, `clearance()`). |
| `reach` | `[{hand, to, dx?, dy?, dz?}]`: two-bone arm IK (3D) to put a hand on a body point (plus the offset: sideways, up, forward), `"wall"` or `"chair"` (the chair back, at the hand's own shoulder width). The elbow bends the way it can, in the plane the arm's turn gives it. |
| `keep` | Hands/feet that stay exactly where they were: `"ankleL"` = where it was in the previous step; `{"point":"ankleR","keyframe":0}` = where it was in step 0. Solved with two-bone IK after everything else. |
| `holds` | What holds the weight or ball in this step (Sep 2026): `["handR"]`, or `["handL", "handR"]` at a pass; the exercise's kettlebell is drawn there, and between steps the grip moves from one to the other (`gripAt`), so a bell passes from hand to hand (Kettlebell Around the World, `tools/variants/batch-18-around-the-world.cjs`). Passed behind the back, it's drawn behind the body. A ball: the ankles too, or a spot `{x, y, z}` it was thrown to; it is at the middle of what holds it, moving from one step's to the next (`heldAt`); handed over (the next step's holders a subset of this one's, or the other way round) it stays with the smaller group the whole move, so a ball the hands take from the feet doesn't drift through the body. Mirrored with the side (a spot's `x` negated). |
| `guide` | `{direction, label}` for the compass: 0 = forward, 90 = the figure's right (for the default side), clockwise from above. |
| `pose` | Joint angles (see §4): ball joints `[forward, side, turn]`, hinges a number. Joints not listed are 0. |

**Props:**

| type | fields | notes |
|---|---|---|
| `band` | `from`, `to` (body point or fixed spot `{x, y, z}` in the world), `via[]`, `restLength` | One band is one prop through every point it passes (under both feet, an end in each hand: `from: "handL", via: ["footL", "footR"], to: "handR"`; round the back: `via: ["armpitR", "backR", "backL", "armpitL"]`); two props for one band draw it in two pieces (fixed Oct 2026 in 11 exercises). Stretch (measured in 3D) shown by thickness/opacity. Rest length defaults to the shortest distance over the sequence. Drawn in front of or behind the body by its depth; a band through several points (under both feet), stretch by stretch (`bandSides`), so each side is placed as two separate bands were. A fixed end is drawn as a small anchor block (`bandAnchors`, `anchorSVG` in `src/core.js`): a door anchor is a `wall` plus a band from a spot on it (equipment "Door anchor", its own kind in `src/similar.js`). |
| `towel` | `from`, `to` | Rigid, doesn't stretch. |
| `strap` | `from`, `via[]`, `to`, `length` | A yoga strap: drawn like the towel, thinner, its own colour (`--strap`). Round a foot: `from: "handL", via: ["footL"], to: "handR"`. It doesn't stretch: its length (`strapLength`: the longest route in the exercise plus a grip, or `length`) stays the same, what isn't needed hanging from the ends, down to the floor and then along it (`strapPoints`). |
| `wall` | `at` + `keyframe` (+`offset`) **or** `z`; `beside` (then `x`) | A plane in front of or behind the figure (at that z), or with `beside: true` at its side (at that x). Stands where that body point is in that step, then stays. A line when seen edge-on; fades as the camera turns to face it. |
| `chair` | `z` (centre, forward of the stage centre), `width` 70 (front to back), `depth` 80 (side to side), `x`, `height` 80 (= shin, so seated thighs are level), `back` behind/ahead, `backHeight` 85 | A **surface** (a box): anything above it rests on it. |
| `bench` | `z`, `width` 200, `depth` 70, `height` 70 | Surface. |
| `step` | `z`, `width` 90, `depth` 140, `height` 30 | Surface. |
| `block` | `x`, `z`, `width` 27, `depth` 18, `height` 41 | A yoga block on end (23 × 15 × 10 cm), drawn in its own colour (`--block`). Surface: a hand over it rests on its top with `touch`. |
| `ball` | `x`, `z`, `r` 58 | A stability ball (65 cm), resting on the floor: a round surface, what's over it rests on its curve (`supportY`), drawn as a circle (`--ball`). Sit on it (`anchor: "pelvis"`), lie back on it (`anchor: "spine"`), heels on it (`touch`). **`rolls: true`** (Sep 2026): it rolls along the floor under what rests on it, as the foam roller does (`rolling()`, `rollerTravel`), but as far as that point moves, not half (the feet ride on its top); a line across it turns as it rolls (Stability Ball Hamstring Curl). **`hands`** (Sep 2026): carried, not a surface (`carried()`): drawn at the middle of what holds it, among the limbs by depth (the near hand and foot over it, the far ones behind: `#heldBall` inside `#figRoot`, moved each frame; thumbnails the same); each step's `holds` says what that is (`["ankleL", "ankleR"]`, the hands, or all four at a pass: Stability Ball Pass, `tools/variants/batch-19-moving-balls.cjs`). The player and thumbnails frame all of it. |
| `roller` | `z`, `x` 0, `r` 14, `length` 160 | A foam roller (15 × 90 cm), lying on the floor across the figure (side to side): a cylinder surface (`supportY`), drawn end-on as a circle, from the front as a bar, in between with a round near end (`--roller`). A leg or the back lies across it with a segment `touch` (`{point: "shinR", adjust: "hipR"}`); no segment sinks into a roller (`rollerSink`, in `place` and `groundY`). **Rolling**: the same touch at another spot along the segment in the next step; mid-move the engine holds it on the roller (§6.2). **The roller rolls** (Sep 2026): each step's roller is where the move left it, half as far along the floor as the spot of the segment that rests on it at the first step has moved (`rollerTravel`; the steps are resolved again with it there until it settles, starting from the steps as written without what rests on it: resting on an unmoved roller bends them); each step keeps its own surfaces (`r.supports`, `rolledSupports`, `dz`), a frame has its roller in between (`frameAt` returns `supports`; the player draws those), and a line across its near end turns `dz / r`. So a stroke moves the body about twice the length it rolls. Seven: Calf, Hamstring, Quad, Upper Back, IT Band, Lat, Glute Roll (`tools/variants/batch-17-foam-roller.cjs`). The side-lying ones (IT band, lats) and the glutes (sitting in a figure four, the seat, a point, on the roller) were fitted numerically (several contacts at once) and keep one live touch for the rolling. |
| `medball` | `hands` (default both) | A medicine ball held in both hands, at their middle (`--medball`). With `holds` it can be thrown: a spot `{x, y, z}` in a step's `holds` is where it flies to (Medicine Ball Chest Pass: to the wall and back; a quiet step keeps it in the hands until the arms are straight). |
| `ring` | `from`, `to` | A Pilates ring (magic circle) between two points, 68 across; pressed, it flattens (`ringSVG`: a circle across the press line and upright, drawn in 3D). |
| `dumbbell` | `hand`, `axis` `lr` (bar left–right) / `fb` (front–back) / `ud` (upright), relative to the body | Drawn end-on when the bar points at the camera; drawn with its arm (behind the body when the arm is). |
| `kettlebell` | `hand` or `hands[]` | In one hand it hangs in line with the forearm; held in both (by the horns) straight down, turning from one to the other as it's passed (`kettlebellAt`). Held in both behind the head or back, it's drawn behind the body there (Kettlebell Halo). A step's `holds` overrides which hands hold it (passing it hand to hand). |
| `barbell` | `from`, `to` (hands) | Projected in 3D: the end plate from the side, the full bar from the front. |
| `bar` | `y` (height), `z`, `width` 90 | A pull-up bar, drawn in front of the hands that hold it (end-on, a dot). Hang from it with `anchor` a hand, `anchorY` the bar's `y`, `anchorX` half the grip width. The exercise page's view grows upwards to show it (still square), as it does whenever the head would go above the top (standing on a bench; arms overhead may reach 20 px past it). Equipment "Pull-up bar" (its own kind). |

`equipment` must match the props (build check 2d): every listed towel, wall, door anchor, chair, bench, step, band,
dumbbell, barbell or kettlebell is drawn, every drawn one is listed, and each item is spelled one way across the
library. Optional aids ("a folded towel under your knee if you like") go in the setup text, not in `equipment`. The
app matches equipment without case (`equipKey`, `equipName` in `src/app/1-engine.js`): an import's "resistance band"
takes the library's spelling, and the Exercises filter merges spellings saved before. Every mat is "Yoga mat"
(`isMat` in `src/similar.js`): an import's "Mat" or "Pilates mat" becomes it, and the build fails on any other mat name
(Oct 2026: 39 Pilates and floor exercises said "Mat", a second filter chip).

Defaults written by the (retired) generator and still expected: `measure`, `holdStep`, `defaults`, `repName`,
phases. When adding exercises by hand, set them explicitly (the build doesn't infer them). Rule the generator
used: an exercise is `time` if its longest `holdMs` ≥ 3000, except where the hold is part of each rep (e.g.
`bw-leg-extension`); the hold step is the longest hold; steps before it are `setup`, after it `finish`.

### 5.2 Workout (`library/workouts/<id>.json`)

```jsonc
{ "$schema": "../../schema/workout.schema.json", "version": 2,
  "id": "beginner-yoga-20", "name": "…", "description": "…",
  // "restBetween" (seconds between exercises) is ignored since Sep 2026: it is a setting
  "blocks": [ { "name": "Warm-up", "rounds": 1, "roundRest": 30,   // rounds > 1 = circuit
      "items": [ { "ex": "wu-arm-circles", "reps": 10, "dir": "both" },
                 { "ex": "core-forearm-plank", "seconds": 30 },
                 { "ex": "bw-reverse-lunge", "reps": 8, "sets": 2, "rest": 20, "sides": "alternate", "tempo": 1 } ] } ] }
```

- `reps` for rep-based exercises, `seconds` for timed ones.
- `sides`: `L`, `R`, `both` (all reps on one side, then the other), `alternate` (L, R, L, R…). **Reps count per
  side** (so `alternate` with 8 reps = 16 lunges). `dir` is the same with `A`/`B`.
- `tempo` multiplies animation speed (a `seconds` hold is real seconds regardless).
- In the app, workouts gain runtime-only fields: block `id`, item `uid` (and item fields filled from the
  exercise's `defaults`). Don't write those to library files.

### 5.3 Import envelopes, exports, history

- Import accepts: `{format: "nstructr/exercise", exercises: [...]}`, a bare exercise object, `{format:
  "nstructr/workout", workouts: [...], exercises?: [...]}` (a workout file may carry its own custom exercises),
  a bare workout object, and the legacy `pose-player/*` equivalents. `format` strings aren't strictly checked.
- **Share links** (`src/app/5-share.js`): `<site>#/link/<kind>1<enc>.<data>` — kind `w` workout (a compact
  `nstructr/workout` file: no runtime ids, default values dropped, the sender's own exercises included), `e`
  exercise; enc `z` = deflate-raw (`CompressionStream`) + base64url, `j` = plain JSON + base64url (fallback).
  An unmodified library workout is `#/link/l1.<library id>` and a library exercise is just `#/play/<id>`.
  Opening a link shows what it holds; nothing is added until **Add** (workouts → My workouts, exercises →
  Saved). Ids from a link never overwrite a different exercise of the receiver's own (`LINK_IMPORT` in
  `claimIds` gives it `<id>-2`). Share dialog (✕ in the corner, Esc or Back to close): a QR code when the link
  is ≤ 900 characters (`src/vendor/qrcode.js`, qrcode-generator, MIT, vendored), then four equal buttons: **Share QR
  code** (filled = recommended; disabled without a QR code), **Share link** (tonal; filled when there's no QR code;
  the phone's share sheet, or copies the link where there's none), **Export workout/exercise** (a `.json` file),
  **Submit to library** (exercises that aren't the library's own; disabled for workouts, which can't be submitted
  yet; see §8.8). No link field or Copy link since Sep 2026. Share
  buttons: workout editor, each workout card, the exercise page's top bar and About. `<site>` is the page's own
  address, or `https://sanicki.github.io/nstructr/` when opened from a file. Typical sizes: library workout
  62 chars; the 24-item routine customised ≈ 770; a workout with one own exercise ≈ 1200 (no QR).
- **Backup** (`nstructr/backup`, Settings → Import & tools → Export everything): `{format, version, exported, workouts,
  exercises (saved), bookmarks, history, settings, resume?}`. `settings` has every setting and remembered choice
  (`sound`, `speechRate`, `encourage`, then `BACKUP_PREFS` in `src/app/6-pwa.js`: `restBetween`, `restSets`, `theme`,
  `fullscreen`, `autoplay`, `authoring`, `exerciseLoop`, `exerciseMute`, `groupCollections`, `aiApp`, `aiEquipment`,
  `libraryOrder?`; switches are true/false). Restoring sets only what the file has, so older backups (three settings,
  `fullscreen` as "on"/"off") still import. `resume` (`{wid, i}`) carries an unfinished workout over unless one is
  already waiting here. A new setting goes in `BACKUP_PREFS` too (Sep 2026: before, most weren't backed up). Importing it (any import path detects the format)
  asks first (`askRestore`, Sep 2026; `ask()` has an optional third button): **Merge** (the default, and the only way
  until then) by id: backup items replace same-id items, nothing is deleted, importing twice changes nothing; or
  **Replace** (`restoreBackup(data, 'replace')`): workouts, own exercises, bookmarks and history become the backup's,
  settings missing from an older backup go back to their defaults, and the workout to resume is the backup's or none.
- Export: exercise JSON from the exercise page; workout JSON / Share (Web Share with a `.json` file, falling back
  to a download) from the editor; "Export your exercises" in Settings (Advanced exercise editor). JSON views (workout
  editor "JSON", exercise "Show JSON", "Export your exercises") show only in **Advanced exercise editor** (class
  `authoring-only`, hidden unless `body.authoring`).
- History (`nstructr/log`): `{sessions: [{id, workout, library? (true for a library workout), name, start, end (ISO), seconds, completed,
  exercisesDone, exercisesTotal, exercises: [{ex, name, category, measure, sets, reps|seconds, sides, dir,
  block, round}]}]}`. Stopped-early sessions are logged with `completed: false`. It was designed for the owner's
  Health Connect logger, which was dropped, so the separate history export was removed (Sep 2026); history is
  still in **Export everything**.

### 5.4 Linked variations (`library/progressions.json`, Sep 2026)

Which library exercises are easier or harder versions of one another, and which are the same move with other
equipment. Checked against `schema/progressions.schema.json`; bundled into `library/index.json` as `links`.
```json
{ "progressions": [{ "name": "Push-up", "steps": ["bw-wall-pushup", "…", "bw-pushup", "bench-decline-pushup"] }],
  "equipment":    [{ "name": "Deadlift", "ids": ["fw-bb-deadlift", "fw-db-deadlift", "fw-kb-deadlift"] }],
  "notLinked":    [{ "ids": ["bar-dead-hang", "bar-hanging-knee-raise"], "why": "…" }] }
```
- **progressions**: steps easiest first; an exercise's easier and harder versions are the steps beside it (in every
  progression it's in). A wall, block, strap or chair that supports a pose makes it the easier step.
- **equipment**: the same move with other equipment, no order; each member uses other equipment (the build fails on
  two with the same kinds, `equipKinds` in `src/similar.js`). An exercise may be in several groups.
- **notLinked**: pairs the duplicate check calls variants (same motion, other equipment or measure) that aren't
  versions of each other. The build **warns** (doesn't fail) about any variant pair that is neither linked nor here,
  so a new exercise gets placed.
- The build fails on an unknown id, an id twice in one progression or group, or one with fewer than two members.
- A user's copy of a library exercise (`basedOn`) has its original's links; the user's own exercises have none.
- Research and sources: `docs/progressions.md`; placing a new exercise is step 4 of the `exercise-research` skill,
  and `node tools/research.cjs report <id>` shows its links or the likely ones.

### 5.5 Muscle groups (`muscles`, `stretches`, Sep 2026)

What an exercise works, in 11 groups: `shoulders`, `chest`, `upperBack` (lats, traps, rhomboids, neck), `lowerBack`,
`biceps` (and forearms, grip), `triceps`, `core`, `frontThigh` (quads, hip flexors, inner thigh), `glutes` (outer hip
too), `backThigh` (hamstrings), `lowerLegs` (calves, shins).
```json
"muscles": {"core": 1, "frontThigh": 3, "glutes": 2, "backThigh": 1, "lowerLegs": 2},
"stretches": ["frontThigh"]
```
- `muscles`: 3 primary (what it's for), 2 secondary (helps move the load), 1 stabilizer (holds you steady); a group it
  doesn't work is left out; `{}` for none (Corpse Pose). **Required on library exercises** (the build fails without);
  optional on a user's own. `stretches`: the groups it lengthens (a foam roller: the rolled group), in the same order.
- Library files get them from `tools/muscles.cjs` (movement patterns with their sources, plus each exercise's changes;
  `node tools/muscles.cjs` writes the fields, one line, after `equipment`, and `docs/muscles.md`; `check` only
  compares). Ratings follow ExRx's target / synergist / stabilizer; rules and judgment calls: `docs/muscles.md`.
- The build **warns** when most of an equipment group is for a muscle group (3) and one member doesn't work it.
- A user's copy (`basedOn`) carries its original's ratings (copied with it; one without shows its original's).
- The exercise page's About shows them (`src/app/2-muscles.js`): a front and back outline of the figure, each group
  filled by rating (`--mg-1`…`--mg-3` in `src/head.html`: lighter to darker in the light theme, darker to brighter in
  the dark one, so the order reads in greyscale), stretched groups outlined in dashed blue (`--mg-stretch`), a legend,
  and a list under seven headings (arms, shoulders, chest, back, core, upper legs and glutes, lower legs). Test:
  `tools/e2e/muscles.py`.
- **A workout's total** (`workoutMuscles`, `src/app/2-muscles.js`), per group in set-equivalents: each set counts
  toward a sweet spot (`sweetSpot`: the prescription's reps, the first "a–b" after any "3 sets of"; 12–15 when there
  are none; 30–60 s for a timed exercise): below it amount / low end, in it 1, above it `1 + ½(1 − e^(−0.916·(amount −
  high) / high))` (1.3 at twice the high end, at most 1½). Direction "both"/"alternate" doubles the amount (it does the
  reps both ways); × the block's rounds; × ½ for one side only (each side's muscles get their own sets, so "both" is
  × 1); × 1 primary, ½ secondary, ¼ stabilizer. Stretches don't count. Colours (`mgScale`): green to 2, amber 2–5, red
  above 5 (to 8), a gradient within each (`color-mix` of the `--mg-g0`…`--mg-r1` stops). The library's 20-minute
  workouts come out mostly amber, red for what each is for (Pilates core 11.9, kettlebell glutes 8.4) and yoga green.
  Shown on a workout card (a small map, the three groups worked most and what it stretches) and in the editor
  ("Muscles worked", collapsed, below the blocks: map, scale, each group's number). Every group one of its exercises stretches is
  outlined in dashed blue, as on an exercise's map, and marked "stretched" in the list (owner, Oct 2026).
- **Exercise cards** have no map (a small one in the corner came out with the owner's review, Sep 2026); the card's
  label adds "Works …" (its primary groups) for screen readers. `.results>.pose-card` use `content-visibility: auto`
  (added with that map, kept: the long list renders faster).
- The outline's head and neck are drawn like an unworked part (`--mg-empty`, `--mg-line`), not solid (owner, Sep 2026).
- **Muscle filter** (Exercises tab, `E.muscle`): the seven headings; an exercise matches when a group under it is
  primary or stretched (secondary too put a third of the library under Back). Search also matches primary and
  secondary group names (the Exercises tab and Add exercises).
- **Edit** (Name, description, instructions and muscles): a rating and a Stretched toggle per group (`muscleForm`).
- **Import** keeps only known groups rated 1–3 and known stretched groups (`cleanMuscles`; they go into SVG).
- **Create with AI**: the exercise format asks for `muscles` and `stretches` (ExRx's target / synergist / stabilizer);
  a plan's library lines say what each exercise mainly works (`planWorks`: up to two primary groups, or what it
  stretches; short, the prompt goes in a link) and **Muscles to work** chips (`AI_MUSCLES`, the seven headings) add
  "Work mainly my …" to the goal.

---

## 6. How playback works (engine pipeline)

### 6.1 Resolving a sequence (`resolveSequence` in core.js), in order

Everything is in world coordinates (3D); `fk(pose)` gives every body point relative to the pelvis, `place()` puts
the pelvis so the anchor is pinned (or the lowest point rests on the floor), `project()` is the camera.

1. `SUPPORTS = surfacesFrom(props)` — chairs/benches/steps as boxes. `supportY(x, z)` = the top of the highest
   surface under that point, else the floor (0). **Everything that means "the floor" means "whatever is under this
   point".**
2. Each keyframe: `resolveKeyframe` — plant (the ankle that makes the foot level, `flatAnkle`), `touch` solves
   (1-D root finding on the named joint number, nearest the written value), body-point `reach`.
3. **Anchor hand-off** between consecutive steps: a point resting at the same spot in both steps becomes the
   next step's pin (at that exact x, z), so feet/hands/seats don't slide. The next step's own anchor is tried first
   (so a foot placed on a step becomes the pin when you step up).
4. Steps whose pin changed re-solve their `touch`es (skipping the pinned point).
5. `keep` (3D two-bone IK to earlier positions).
6. Walls (positioned from their `at` point), then `reach` to wall/chair, and body-point reaches re-aimed after
   `keep` moved things.

**Two-bone IK** (`reachTip`): the knee (elbow) goes in the plane the limb's turn gives it: a knee always comes out
in front of the hip–ankle line, an elbow behind the shoulder–hand line, so they never bend the wrong way. The
answer is read back as joint angles (`limbAngles`), choosing among equivalent angles the one closest to the
current ones, so a limb never flips. A part-way correction (a slide fading in and out) aims part-way from where the
tip is and solves that exactly: blending angles toward an answer written a different (equivalent) way bends the limb
differently.

### 6.2 A frame between two steps (`frameAt`)

1. **`sharedPin`**: if either step's pin — or failing that, any point (ankles, hands, knees, pelvis…) — is
   resting at the same spot in both steps, pin that for the whole move. A pin with the same *name* but a
   different spot (the foot that was on the step is now on the floor) doesn't count. An airborne step's `lift`
   doesn't count either (the foot that pushed off lands where it was).
2. Interpolate every joint number as written (the values choose the way round) and the camera; blend placements
   (unless shared-pinned).
3. `slideContacts`: hands/feet on a surface at both ends move in an arc (higher when stepping up/down: clears
   the edge by `|Δheight| + 14`), unless pinned. Legs don't step while the camera turns. A **standing** foot on
   the floor at one end only (lifting to step back, setting down, a toe tap) **peels** (`peel`): it rises before
   it travels and arrives above its spot before lowering, the toes clearing the floor too; a long or high swing
   (Dancer, Warrior III) only lifts. Seated, kneeling and lying feet may slide (Bound Angle, Pigeon). (Sep 2026:
   Reverse Lunge's foot rode along the floor as it stepped back and in.)
4. `clampTips`: dipping hands/feet are held on the surface via IK; a knee below the surface turns the thigh up
   (legs swinging forward and back only).
   **Rolling** (Sep 2026): on a foam roller, every `touch` both steps share (same point, same joint: the segment on
   the roller, and a foot on the floor) is re-solved every frame while the pin holds (in the order written, four
   passes when there are several), with planted feet kept flat, so what rests on the roller stays on it the whole way
   (angles alone lifted it up to 4 px mid-move); and rolling, feet and hands slide along the floor instead of
   stepping (`slideContacts`/`clampTips` are skipped); a foot or hand resting on the same spot at both ends stays on
   it (IK back to it; a foot also keeps its toes there: `holdFoot` turns the hip, each try from the same leg; the
   target is lerped from where the step put it to where the next one does, so the move lands exactly on the next step:
   aimed at the first step's spot only, the IT band roll's leg snapped the last few px at each end). The
   IT band roll's top foot is planted: the second step `keep`s it where the first put it (it slid 53 px until Sep 2026). `worldOf` leaves the frame's surfaces as they were (it used to
   switch them to a step's, which put a rolling roller in the wrong place for the rest of the frame). A rolling
   stability ball is put under the point resting on it every frame (as far from it as at the two ends) and the touches
   solved again: the heels move on an arc, so an even roll left them 20 px off it mid-curl.
   **A hand planted on the same spot at both ends** of any move (not only rolling) stays on it: the arm reaches back
   each frame (Sep 2026, for the Turkish Get-Up's hand under the body; where the shoulder moves more than an arm's
   length from it, a quiet in-between step is needed, as the get-up has).
5. Toe fix: toes that would sink turn the ankle.
   Toes resting on the same spot of a raised surface at both ends (the back foot on a bench) stay on it: the leg
   reaches so the toe lands back where it was (Sep 2026: Bulgarian Split Squat's rear toe slid 21 px mid-move).
   (A thigh swinging straight under the hips needs the pelvis higher than a thigh's length or the knee goes
   through the floor: Mountain Climber raises the hips a little and brings the knee in a little wide; Burpee
   goes hips-up in between, on quiet steps.)
6. `groundY`: if anything still penetrates, lift the whole body.

### 6.3 Playback

- Exercise player (`S.mode === 'explore'`): setup plays once, then the **rep range loops** (`nextIndex`).
  Finish steps are only shown in workouts (and in the step list).
- Workout player (`S.mode === 'workout'`): `buildPlan` flattens an item into a straight list of resolved steps —
  setup, then reps (alternating versions for `alternate`), or setup + hold (with `holdMs` = seconds), then
  finish — with parallel `S.planMeta` (repNo, guided, say…). At the plan's end `onWorkEnd` decides: next side
  or direction segment, next set (rest), next item (rest), or done. Rep-based sets **advance by themselves**
  (owner's decision).
- `direction: B` = `reverseReps`: rep steps in reverse order, each move taking the time of the move it reverses,
  **and `keep` references remapped** to the steps' new positions (a bug when they weren't). Each reversed step
  takes the **pin** (`anchor`, `anchorX/Y/Z`) of the step that came after it: a step's pin is the foot that stays as
  the body moves into it, so a walk played backward keeps the other foot down and travels the other way
  (Heel-to-Toe Walk, Backward, Sep 2026). With one pin throughout (circles) nothing changes.
  Step names and cues are **not** changed: they name positions ("Forward.", "Across your body."), which stay the
  same whichever way the circle runs. (Until Sep 2026 "forward/backward/clockwise" were swapped, so Hip Circles
  counterclockwise said "Backward" at the front.) Write cues on direction exercises as positions, not as the motion.
- `S.canAdvance` gates advancing (used by Instructor's run-through).

---

## 7. Animation validation rules

`tools/checks.cjs`, run by the build on every exercise, **for every side and direction**, over **the moves the
app actually plays**: consecutive steps, the rep loop (last rep step → first), and the full loop when there are
no phases. Held poses are checked at the step itself.

| Check | Rule | Tolerance |
|---|---|---|
| rest | The pinned point and every `touch` point rest on the floor/surface (minus `gap`); every `reach` hand is on its target | 7 px |
| jump | No body segment's direction (in 3D) changes more than **20° in 1/60 of a move** | 20° |
| planted | Any of ankles, toes, hands, knees, elbows, pelvis, neckBase that is at the same spot (±2 px) before and after a move and resting on a surface (≤ 3 px) must not wander during it | 6 px |
| snap | No point moves more than 3 px in the first or last 1/60 of a move and twice as far as in the frame next to it (Sep 2026): a mid-move hold or fix that doesn't end exactly on the step, so the limb jumps into place (the Fish Pose arm; holds now aim from one end's spot to the other's, and a step's pose must be one the holds can reach: no bent-back elbow they'd bend forward) | 3 px |

Accepted exceptions (`tools/known-issues.json`, per exercise, per check, max px):

- `yoga-downward-dog` planted ≤ 21: the toes swing as the foot pivots from top-down to sole-down (not a slide).

All checks are in 3D. **Range of motion** (`tools/rom.cjs`, run by the build): the build **fails** on any resolved step
with a joint past what a flexible body can do (the table and how it's measured: `docs/3d-skeleton.md`, "Joint
model"); `node tools/rom.cjs` lists them and counts what's past normal range.

Other accepted behaviour (not checked, known): seated transitions in Half Lord of the Fishes / Marichyasana /
Head-to-Knee lift the pelvis ~4 px; when the camera turns, the figure moves across the screen if it isn't standing at
the stage centre — that's the view rotating, not a slide.

Earlier ad-hoc checks that aren't ported (superseded): "hop" (pinned point lifting mid-move — the planted check
covers it and hop wrongly flagged legitimate steps), "butt" (seated pelvis leaving the floor).

**Principles behind the checks** (use them when authoring): contacts must be real (nothing floats, nothing
sinks), planted things stay planted, nothing teleports or windmills, and stepping lifts the foot (the **skid**
check in `tools/checks.cjs`: a standing foot lifting off or setting down may not slide more than 12 px along the
floor). If an
exercise needs a deviation, prefer fixing the geometry (use `anchor`/`touch`/`keep`/`reach`, pick angle
representations that rotate the short, natural way) over adding a known issue; if you must add one, write why.

---

## 8. Design decisions (and why)

### 8.1 Product
- **Workouts are the focus**; Workouts is the first and default tab. Tabs: Workouts, Exercises, Settings
  (old links `#/explore`, `#/saved`, `#/create` redirect).
- Instructor counts reps "Begin", 2, 3 … "Last one" ("Begin" is never dropped for overlapping speech).
- One repo; library and app together. Contributions via **in-app Submit → GitHub issue form → bot PR**, plus
  **share links** (both roadmap).
- Content: exercises are written **in our own words**, citing sources (Yoga Journal, BHF, Mayo Clinic, NHS,
  Healthline, the owner's own routine). No copied text. **ExerciseDB was considered and not used** (its free
  data is non-commercial; field-name overlap alone isn't a concern, copying its records/media would be).
- Spoken and on-screen directions use **plain words** ("Forward", "Back left, crossing behind your standing
  leg"); clinical names (anterior, posteromedial…) only in About text. Star Excursion uses no tape and no
  "lines" — directions are imagined.
- Safety notes from sources are kept (BHF heart-condition note, Mayo osteoporosis warning for knee-to-chest,
  coach/spotter notes on barbell lifts) and shown on the workout card (when expanded) and in the workout editor.

### 8.1b Linked variations (Sep 2026, owner's decisions)
- **Exercise page**: a "Variations" section in About (Easier, Harder, Other equipment), each a button to that
  exercise. Only shown when there is one.
- **Workout editor**: the item dialog's "Swap for" (the same three rows) swaps the item there and then; Save keeps it,
  Cancel doesn't. A swap (`swapItem` in `src/app/2-links.js`) keeps sets; keeps reps or seconds when both exercises
  count the same way (else the new one's defaults); keeps sides and direction where the new one has them (their
  order only when both have the same); resets the pace (`tempo`) to the new exercise's own.
- **Workout player**: **Easier** and **Harder** buttons in the control overlay, under the play controls (never on
  the rest screen: you only know it's too easy or hard once you're doing it). Other equipment isn't offered there.
  - A swap restarts the current set from the first rep / 0:00, with Instructor's run-through when Instructor is on; nothing
    done carries over. The item, in every round still to come, is the new exercise.
  - **For that session only**: the workout isn't changed (`WP.swaps` item uid → exercise id, `WP.orig` the items
    before; saved with the session, so Resume keeps them). Leaving the player (finished or not) asks "Keep these
    changes in the workout?" (`offerKeepSwaps`); Keep saves them, in the user's own copy for a library workout.
  - History: sets finished before a swap count as the old exercise's (`logSets`, `entry.setBase`).
  - Cover screen: the row's bottom stays above the kept-empty bottom 22% at 360×398 (`tools/e2e/variations.py`).

### 8.2 Reps
- One loop of an exercise's rep steps is one rep. Nested reps (Wall Sit with Band Pull-Apart) are modelled with
  `phase`: setup once (slide down), rep = one pull-apart, finish once (stand up); the wall sit lasts as long as
  the pull-aparts take and never resets.
- Single-Leg Stretch: 1 rep = left + right. Arm Circles: 1 rep = one full circle; backward is generated.
- Circles use `ease: "linear"` and a 0-ms seam step so they flow like a clock hand.

### 8.3 Workout player on the cover screen (all measured on 360×398 CSS px, ≈ a flip phone's cover screen)
- Full screen, app bars hidden, **follows the theme** (`--wp-*` variables on `.fs`): dark = navy `#0b1422`, body
  `#eef3f1`, right side teal `#57d6c6`, left orange `#f2a65a`; light = `#f8f9ff`, body `#191c20`, teal `#00897b`,
  orange `#d2680f`.
- Pausing stops the voice immediately (`hush()`); resuming an Instructor run-through step reads its line again.
  Exiting (hold ✕, or finishing) always returns to the Workouts list.
- The camera frames each exercise tightly (`frameScene`: viewBox from head-top to floor over the whole plan).
- Stacked from the top: title band (name, up to 2 lines on short screens; block/set lines hidden when height
  ≤ 520 px) with the count at top right ("3/10 reps" inline on short screens) → caption line (room for 2 lines)
  → figure. Positions are **measured at runtime** (`layoutWp`) because the title height varies.
- **Nothing at the bottom**: bottom 22 vh kept empty on screens ≤ 520 px tall (10 vh otherwise); floor is ≥ 23%
  of screen height above the bottom edge for every exercise; progress bar is a thin strip at the **top**;
  captions, toasts, the compass and rest/finish content are all at the top.
- Limb thickness is kept equal to the torso at any zoom: bones use non-scaling strokes, so `syncLimbWidth()` sets
  `--limb-px` = 10 units × current scale. Call it after any viewBox/size change.
- **Gestures**: first tap only shows the controls; a control responds only to a touch that *started* after the
  controls were visible (`LAST_DOWN_AT < CTRL_SHOWN_AT` guard — prevents the revealing tap hitting a button
  that appears under the finger); tap empty space hides them; they auto-hide 4 s after the last tap unless
  paused. Swipe (only while controls are hidden, ≥ ⅓ screen width, mostly horizontal) = next/previous
  exercise. Exit = **hold ✕ for 0.8 s** (a tap only shows "Hold ✕ to exit"). Space = pause on keyboards.
- **Start goes straight into the workout** (no "Before you start" popup since Sep 2026): equipment and safety
  notes are on the expanded workout card and in the editor; sound and full screen are in Settings.
- Full screen: requested on start unless disabled (`nstructr-fullscreen-v1`) or already running as an installed
  app (then Chrome shows no notice). Chrome's own "exit full screen" notice can't be moved by the page.
- Screen Wake Lock while working out; re-acquired on visibility change. Session saved per exercise for Resume.

### 8.3b Between exercises: positions and at-rest poses (Oct 2026, owner's request)
- Before, the next exercise cut in: the figure, the camera angle and the frame all jumped (a deliberate `S.from = null`).
- **Positions** (`src/positions.js`, shared by the app and the build): standing, kneeling, all fours, seated, lying on the
  back (`supine`), face down (`prone`), on the side (`side-lying`), plank. Each exercise's start and end position is
  worked out from its first and last frames (what touches the floor, the trunk's angle, which way the chest faces, the
  thighs toward or away from the head); a last frame it can't place, with no finish step, counts as the start (the reps
  come back there: a bridge at the top, a forward fold). `startPosition` / `endPosition` override it (`"other"`: none
  fits, e.g. headstands, handstands, crow from a squat). The build checks the rest poses and prints the counts and any
  exercise it can't place (not on equipment) so it gets an override.
- **At-rest poses** (`REST`): one per position, copied from a library exercise's first step (Mountain, Camel, Cat-Cow
  tabletop, Staff, Corpse with knees bent, Superman with arms down, Clamshell, Push-Up plank), so they face the way the
  library does (every position's exercises turned out to face one way, Oct 2026 survey).
- **Workout player** (`stagePlan`): when one exercise ends in the position the next starts in, neither rests on equipment
  (`onEquipment`: a surface, wall or bar; hand-held weights and bands don't count) and it isn't side-lying (the side may
  differ), the plan starts with that rest pose (1 s, camera already the next exercise's) and the first step lasts at
  least 0.8 s; `S.trans` = 1, its meta `phase: 'transition'`. The frame glides (`glideView`) instead of being set: one
  ease from start to end along a curve through a halfway frame widened to fit the rest pose (two eased legs stopped in
  the middle and read as a bounce, fixed Oct 2026).
- **Whenever a plan carries on from the last pose** (the next exercise through a rest pose, the next set, the other
  side), the figure stays where it was on screen: `S.drawnX` (the pelvis on screen, set by `draw`) gives the starting
  `S.shiftX`, which then glides to the new one (a side switch over its first step, at least 0.6 s). Before, a side
  switch jumped (Neck Stretch left → right, 104 px: the other side is placed elsewhere) and so did leaving a travelling
  exercise (Side Stepping → Neck Stretch, 88 px: the distance walked was dropped). Into a travelling exercise, whose
  view follows the pelvis, `S.followOff` eases from where the figure was to the centre. Otherwise the old picture crossfades
  into the new one (0.35 s, a clone of the scene; `crossfadeScene`). Reduced motion: cuts, as before. The first exercise
  of a workout has nothing to come from (`S.mode = 'start'`).
- With a rest, the move plays during the rest and stops in the next exercise's first step (`S.canAdvance`); after the
  rest the same exercise is staged again with no transition. With no rest, a same-position change adds about 1–2 s (not
  in the time estimate); the next exercise's band or weights are drawn from the start of the move.
- Not done yet: position-change moves (ROADMAP).

### 8.4 Sound
- Modes (labels renamed Oct 2026: Voice → Coach, Coach → Instructor; stored values `voice`/`coach` unchanged): Silent, Beeps (3-2-1 before rests/holds end, chime on switching), Coach (exercise name, side/direction
  switches, rests, "next", then the counted reps below), **Instructor**.
- **Coach and Instructor** both count: counts, "Last one", "Halfway", "10 seconds" and words of encouragement are
  **dropped if something is already being said** (never talk over). (Oct 2026: before, only Instructor counted;
  Coach — then "Voice" — said names, switches and rests only. `say()` lost its `coachOnly` flag.)
- **Instructor** adds, before each exercise (and each side/direction), a **guided run-through** — one pass through every
  step, reading each step's cue; each step waits for **whichever takes longer, its line or its animation**
  (`S.canAdvance`). Then the counted reps. Timed exercises: setup steps, then the held step's cue and "Now hold for N seconds" as the hold starts; the countdown waits for that line (`S.holdWait`), and the time estimate counts it (~2.5 words a second at the speech rate). (Sep 2026: before, the held step's cue — how to get into the pose — was never read.)
- Speech is **queued, never cancelled**, except on skip/stop. Routing cancels speech only when *leaving* the exercise
  page (`exHush`) or the workout player: until Sep 2026 any route away from the exercise page's view hushed, which cut
  off every workout's first line as the player opened (`autoplay_first_speech.py`). Each line's promise resolves on `onend`, with a
  fallback timeout (1.5 s + 0.45 s/word) for voices that don't report back.
- Captions show every line (even in Silent). Uses the browser's built-in voices (offline once installed). May
  not work inside some in-app viewers; test in Chrome.

### 8.5 Engine choices worth knowing
- Two-segment spine (lower/upper back) so cat-cow, bridges and curls look right.
- A real 3D figure (format v2, Sep 2026), still drawn as SVG lines: no WebGL, no library, one file. Until then the
  figure was 2D with "depth" joints (foreshortening by cos) and a per-step `layers` setting for which leg was in
  front; `docs/3d-skeleton.md` says why that was replaced.
- Joint numbers are interpolated one by one, as written (like v1's angles), so authors keep control of the way
  round. Ball joints are three angles, not quaternions, for the same reason and because people and AI write them.
- Surfaces replace "the floor" everywhere via `supportY(x, z)`.

### 8.6 Retired generator (not in the repo)
The library was authored in a Python script with helpers (`stand()`, `kf()`, `sym()`, `mir()`…) and an
**optimizer** that, per keyframe, chose each joint's ±360° representation to minimise body lift and rotation
during transitions (cap: no joint turns > 160° between adjacent steps, checked on both sides). The files now
contain those chosen representations — **values like `shoulder: [540, 0, 0]` or `-235` are deliberate** (they make
the arm go the right way round; the conversion to v2 kept them, number by number). If you edit angles by hand, keep representation continuity with the neighbouring
steps or the joint will windmill; the jump check will catch it.

---

### 8.7 Installable app (step 2)
- Only the multi-file build (`index.html`) is the PWA: the build injects the manifest/icon links and writes
  `_site/sw.js`. The single-file `nstructr.html` doesn't register a service worker.
- `sw.js` precaches the app shell, `library/index.json`, the manifest and icons under `nstructr-<hash of those
  files>`; a deploy changes the hash, the new worker installs, calls `skipWaiting`, deletes old caches. The
  running page keeps its loaded code and shows "was updated, reopen it". Google Fonts are cached at runtime
  (`nstructr-fonts-v1`) the first time they load online.
- `display: fullscreen` (with `standalone` as fallback): no browser UI and no "exit full screen" notice; the
  app already skips `requestFullscreen` when installed (`installedApp()`).
- **Install tip** (Sep 2026, `src/app/6-pwa.js`): Chromium browsers fire `beforeinstallprompt` when the app is
  installable; we keep the event (`preventDefault`: no Chrome mini-bar; the menu's Install stays) and offer our own.
  Once, after the first workout that was started (`startWorkout` → `installDue()`: key `due`), when leaving the player
  (finished or left early) or on a later visit (`route` → `maybeInstallHint()`), never during a workout: a snackbar
  "Install NstructR?" (the why is on the Settings row) with **Install** (`e.prompt()`, usable once) and ✕ (`snack(msg, ms, {label, run})`). iPhone/iPad Safari (no event)
  get **How** (Share > Add to Home Screen). A browser that can't install gets nothing and the tip stays owed.
  Settings › Import & tools has an **Install app** row while installing is possible (`renderInstall`). A page in
  full screen for a workout also matches `display-mode: fullscreen`, so "installed" here is `runningInstalled()`
  (no `fullscreenElement`). Test: `tools/e2e/install_prompt.py` (a faked event).
- `navigator.storage.persist()` is requested when a workout starts, after a backup/restore, and at launch in
  the installed app. The Create page's backup card says whether storage is persistent.
- Colours: Material 3 tonal-spot scheme from seed `#216CAD` (the icon's blue bar), generated with
  `@material/material-color-utilities` (not a dependency; the values are pasted into `src/head.html`). The
  workout player's background is a dark navy `#0b1422`; the side colours (teal right, orange left) are
  functional and unchanged. Theme colour for the browser/splash: icon navy `#0e2648`.
- Maskable icons were made from the 1024 px artwork at 80% on the navy background (the supplied
  `adaptive-foreground.png` put a navy square on transparency, which shows as a square in a white circle).

### 8.8 Submissions (exercises)
Owner's requirements: submitting is a **deliberate action** on one thing the user picks, never automatic; the library
must not fill with **duplicates**, and a known exercise under another name should become **another name for it**
("other names"), not a new exercise. Checking that by hand doesn't scale, so it's automatic, twice:
- **Similarity** (`src/similar.js`, shared by the app, the build and the Action): each non-quiet step's resolved
  joint angles (first side, direction A), steps aligned by dynamic time warping, root-mean-square angle difference in
  degrees. Library pairs that move the same are ≤ 0.6° apart and the next closest ≥ 1.6° (Sep 2026): **same < 1°**,
  **similar < 2.5°**. Names are compared without case, accents, punctuation, plurals, word order and filler words
  ("pose", "the"…). Equipment (mat and floor don't count) and measure (reps / time) separate **variants** from
  **duplicates**: same motion + same equipment + same measure = duplicate. The build fails on a duplicate pair
  (today: none; 5 variant pairs such as Glute Bridge (reps) / Bridge Pose (held), band / barbell overhead press).
- **In the app** (Share → Submit to library, `src/app/5-submit.js`): a copy of a library exercise (`basedOn`) that
  only has a new name → "another name for X"; a changed copy → "changes to X" (or new, when it no longer duplicates
  X and has its own name); anything else is compared with the library: a duplicate can only be "another name for X"
  or "changes to X"; a name the library has must be changed first. It opens a prefilled issue form
  (`.github/ISSUE_TEMPLATE/exercise.yml`: kind, target, note, the exercise as a share link, and a required
  own-words + MIT checkbox); over 8000 characters the link is copied to paste in instead.
- **On GitHub** (`.github/workflows/submission.yml` → `tools/submission.mjs`): the issue is read only as data (a
  file, never the shell). `name` adds to the target's `otherNames`; `update` replaces the target but keeps its id,
  name (a new name becomes another name) and collections; `new` gets an id from its name and collections from the
  closest library exercise with the same equipment, else from its equipment. Then the build's gates (schema,
  animation checks, range of motion, duplicates, a name another exercise has) and `build.mjs --check-only` on the
  whole library. Result: a comment on the issue, and on success a pull request from `submission/issue-<n>`
  ("Closes #n"; editing the issue re-runs it and force-pushes that branch). The PR body includes the research
  checklist (`tools/research.cjs report --md`: names, equipment versions in the library, headings with none) to do
  before merging (`.claude/skills/exercise-research/SKILL.md`). A copy of a library exercise brings that exercise's
  other names: for a new exercise they're left out (with a note), not refused. A pull request opened with the workflow's
  token doesn't start other workflows, which is why the check runs inside it. One-time setup: Settings → Actions →
  General → "Allow GitHub Actions to create and approve pull requests".
- Not merged: Glute Bridge and Bridge Pose move the same, but one counts reps and the other is a hold, and an
  exercise has one `measure`. Merging them needs workouts to be able to hold a rep exercise (or the reverse).

**Bug reports**: Settings → Documentation → "report it" opens GitHub's bug form (`.github/ISSUE_TEMPLATE/bug.yml`:
what went wrong, where, and the phone and browser; label `bug`). Kept short for people who've never filed an issue;
the app fills in the `device` field (user agent, screen size, installed app or browser: `bugDevice()` in
`src/app/3-details.js`) through the form's query-string prefill.

## 9. Things not visible in the code

- **Flip phone cover screen** (reference: Galaxy Z Flip7): ~360×398 CSS px (948×1048 physical). Camera cutouts and flash along the **bottom**.
  Running Chrome/PWAs there may require Samsung **Good Lock → MultiStar** ("Launcher widget"). Unverified which
  apps are allowed by default — test on the device.
- The sandbox this was built in blocks Google Fonts, so Material Symbols render as their ligature text in
  screenshots ("pause", "skip_next"). Not a bug. Tests navigate with `wait_until='domcontentloaded'` for the
  same reason.
- Speech in automated tests is simulated (see `tools/e2e/coach_speech.py`: a fake `speechSynthesis` with a
  per-word duration and a queue). Real devices differ in voice speed.
- `durationMs: 0` must stay distinct from "unset" (a past bug treated 0 as the 1000 ms default and made arm
  circles spin backwards a full turn).
- In the exercise player, a stage `<div id="stageBox">` is **moved** into the workout player (`moveStage`) and
  back; the scene's viewBox is reset on leaving (`resetScene`).
- The time estimate counts movement and rests only (the owner's routine estimates 28 min vs. the routine's own
  35–40); Instructor adds ~2 s per run-through step.
- Pages from a **private** repo needs a paid GitHub plan (as far as known) — relevant if the owner goes private.

---

## 10. UI inventory (current)

- **Workouts**: Resume card, My Workouts (New workout; importing is in Settings), your workout cards (est. time, count, equipment, muscle map, its exercises by block (thumbnail and name; tap one to open it on the exercise page), Edit/Share, safety notes last; the editor has no safety notes), Library workouts (Start/Customize, the same details), History (delete, clear). Editor: name, blocks (rename, move, delete, repeat as circuit with rounds and
  rest), items (drag handle, the thumbnail opens the exercise page, the rest of the row the settings sheet with reps/seconds, sets, sides, direction, **seconds per rep** (0.1 s steps, typed or −/+, "Usual: n s" = the exercise's own pace; stored as `tempo` = usual ÷ chosen, clamped to ¼–4×; not for timed exercises); menu: move,
  duplicate, view, remove), Add exercises picker (search, multi-select), Test/Share/JSON/Duplicate/Delete. **Test** (Oct 2026;
  "Start" before) runs the workout as a trial (`startWorkout(…, test)`, `WP.test`): no Resume entry (`saveSession`),
  nothing in History (`WP.log` null), an existing Resume entry left alone, and leaving goes back to the editor
  (`afterWorkout`). Test: `tools/e2e/test_run.py`.
- **Exercises**: collection shelves (Saved first), filters (All, **Saved**, each collection; then type and equipment,
  each on its own row; the equipment choice is kept across collections, one without it shows all), search (covers the user's own exercises too). Saved = bookmarked library exercises + the user's
  own (imported/made), which exist only there.
- **Exercise player**: the figure with a **tap-for-controls overlay** (start again / play-pause / next step;
  same rules as the workout player: the first tap only shows them, they stay up while paused, fade while
  playing; mouse hover shows them), current step, then the selectors labelled **Side** and
  **Direction** (no Speed selector or collection name since Sep 2026: exercises play at 1×). ◀ / ← **start again**
  (`restartExercise()`: setup, rep 1, a travelling exercise back where it began; Sep 2026, owner's decision; it was
  "previous step"); ▶ / → is the next step. **Hidden, with no way for the user to show them** (owner's decision,
  Sep 2026): the rep/hold label on the figure (`#repChip` "Rep 3", `#holdChip` "Hold 0:20") and the progress bar under
  it (`.progress`, `#progressBar`); they're still built, and `EX_SHOW_COUNT` / `EX_SHOW_PROGRESS` in
  `src/app/1-engine.js` (and the bar's `hidden` in `src/body.html`) bring them back. The details are part of
  the page, below the controls (on screens ≥ 840 px a right-hand column): **About** (description, chips, **Muscles** map §5.5,
  Variations §5.4), **How to
  do it** (setup, form, then the time estimate "About N s per round, each side", the source link and note, and the
  prescription note),
  **Steps (n)** (collapsed), and the editor when open.
  - **Sound** follows the Sound setting: Silent / Beeps say nothing; Coach / Instructor read each step's cue on the
    first pass (the step waits for it: `S.canAdvance`), then count reps (not for timed exercises). Pausing,
    changing side/direction or leaving the page stops the voice (`exHush()`); a new side/direction starts the
    first pass again. Code: `XS`, `exStepSound()`, `exHush()` in `3-details.js`.
- **Short screens** (≤ 520 px tall, < 840 px wide): the three tabs sit in the top bar (icons only), the snackbar
  shows at the top, and pages end with 22 vh of empty space, all to keep clear of the cover screen's cutouts.
- **Edit** (pencil in the exercise page's top bar, for everyone) pauses playback and opens the editor at the
  end of the page with **Done** at its top; on phones the figure stays pinned at the top while editing
  (`body.ex-editing`). Everyone gets the words (step name and cue; name, description and instructions);
  **Advanced exercise editor** (the setting was "Authoring mode", and the exercise editor the "pose editor", until Sep 2026; key `nstructr-authoring-v1` kept) adds the pose tools (Side/Front, the camera in degrees, every joint's numbers: three rows for a
  ball joint (forward, side, turn), one for a hinge; JSON). The editor has its
  own previous/next step buttons, and the figure's overlay controls fade even while paused so they don't cover the
  pose. Each row has **− / +** (hold to repeat) in steps of 1°, 5° or 15°, and an **undo** shown once it differs
  from where editing started; plus **Revert this step** and **Discard all changes** (`POSE_ROWS` in `5-main.js`).
  - The **first change to a library exercise** (or a bookmarked copy of one) creates the user's own exercise
    `u-<id>-copy` named "<name> (copy)" with `basedOn: <library id>`, saved like an import (shows under Saved);
    the library exercise is untouched. The user's own exercises are edited in place. Everything saves as you go
    (`saveLib`, flushed on page hide).
  - "Discard all changes" goes back to where editing started (`ED.orig`, the whole exercise); if that session
    created the copy, it deletes the copy and returns to the library exercise.
  - Nothing is copied or saved unless a change actually changes something (`editExercise` compares first).
  - **Words**: the step's name and spoken cue are in the editor; "Name, description and instructions" edits the
    exercise's name, other name, focus, category, equipment, description, setup, form cues, suggested reps and
    note, rep name, side and direction labels, and source. The first real change to a library exercise makes the
    copy, as for poses (a typed name replaces "(copy)").
- **Create with AI** (`src/app/5-ai.js`; Workouts next to New workout, and My exercises): a full-screen
  dialog in three steps. 1: what you have (Sep 2026, in this order, equal-width buttons: Workout goal, picked at first;
  Workout routine; Missing exercise; Photo/Video; YouTube link. Earlier: the name of the exercise, a written routine, a video or web link, a photo or
  video; the last has no text box: it's attached in the AI app). 2: the AI app, chosen in **Settings › Create with AI › Choose
  AI provider** (since Sep 2026; it was a list in the dialog), listed "Provider (App)" A–Z by provider with "Unspecified"
  last (named "Other LLM" until Sep 2026) (Gemini until the user picks another; kept in `nstructr-ai-app-v1`; `setAiApp()`, `renderAiSetting()`):
  **Open** copies the instructions and opens the app; apps with a message parameter that takes a link this long (`?q=`: ChatGPT, Claude,
  Copilot) get them filled in when the link stays under `AI_Q_MAX` (15 000 characters; Cloudflare refuses
  URLs over 16 KB); Gemini and DeepSeek have none, and Grok and Vibe answer the long link with "header too large" (owner, Sep 2026), so
  those four are only copied; so are Qwen (Alibaba; `aiUrl()` opens the mainland app, qianwen.com, which needs a Chinese phone number, when `aiInChina()`: a language tagged -CN or a mainland time zone; else chat.qwen.ai), Doubao (ByteDance) and Kimi (Moonshot),
  added Sep 2026 because the Western apps are blocked in mainland China (untested for a filled-in link); "Unspecified" just copies. 3: paste
  the answer: `extractJson()` takes the JSON out of ``` fences or surrounding sentences; `{"inLibrary": "<id>"}`
  opens that library exercise; anything else goes through the normal import (exercise, or a workout file bringing
  its own `u-` exercises). The prompt's LIBRARY list is grouped under `[equipment]` headings (kinds from
  `SIMILAR_EX.equipKinds`: band, dumbbell, chair…; a mat doesn't count), and it says a match needs the same movement
  **and** equipment (models matched "band squat" to the plain squat when they only saw ids). It asks for
  `"calledInSource"` (the source's own name) and `"equipmentInSource"` on every workout item; the import takes both
  out of the workout and keeps them for the library check. **Accuracy comes first** (owner, Sep 2026): the prompt is
  never shortened at the cost of what the AI needs (the whole LIBRARY list, the formats, the sign conventions). The
  link-filled apps (ChatGPT, Claude, Copilot) get it in the link while it's under `AI_Q_MAX`; over it, they open with
  the instructions copied to paste, like every other app (automatic: nothing to change as the library grows). Each
  LIBRARY line has the exercise's names after its id (`yoga-bound-angle time: Bound Angle Pose / Baddha Konasana /
  Butterfly Pose`), so a source's name finds it: since Sep 2026 that makes the exercise prompt about 23.7k (234
  exercises), copied to paste in every app. Workout planning's prompt (below) lists only what the equipment allows,
  each with its name and focus, and fits a link for most picks (12.6k with a wall and dumbbells; everything picked, 17.1k, is copied). `aiLink` escapes less than
  `URLSearchParams` (`: , / ; @ $ ?` stay as they are, spaces are `+`: allowed in a query and read back
  identically). Base64 or other encodings don't help: non-ASCII is escaped in a link, and the AI has to read plain
  text.
  **Workout goal** (plan a workout, the first choice, `planPrompt`): a goal ("a 30-minute leg workout") and equipment chips (the kinds
  `SIMILAR_EX.equipKinds` finds in the library, remembered in `nstructr-ai-equipment-v1`, nothing at first). Its prompt
  is its own, and short: only the workout format (no exercise format: nothing new is written) and only the exercises
  whose every kind of equipment is picked (`aiCanDo`), each with its pace (`repSeconds`, or "time"), sides/direction,
  name and focus, plus the user's rests (`restGap`, `restSets`), and the progressions (`planProgressions`: each
  library/progressions.json line with only the steps the equipment allows, easiest first) with a rule to suit the level
  asked for (a beginner's if unsaid): as a ChatGPT link (Sep 2026, 354 exercises) 12.8k with no equipment, 16.4k with a
  wall and dumbbells, 28k with everything; the progressions add 0.7–1.8k. Over `AI_Q_MAX` (15k) it's copied instead.
  The import (`planCheck`) refuses a workout naming an exercise the app doesn't have, drops any "exercises" the AI
  wrote anyway, names the ones needing unpicked equipment, and shows the length (`workoutSeconds`).
- **Library check after an import** (`src/app/5-libcheck.js`; any import: AI answer, file, pasted JSON, link;
  not a backup): a new own exercise (not one the user had, not a `basedOn` copy) that is a **duplicate** of a
  library one (`src/similar.js`) gets "Use <library exercise> instead" (on by default: **Done** points the imported
  workouts at it and removes the new one unless another workout uses it; **Keep as imported** changes nothing); an
  item whose `equipmentInSource` kinds differ from the library exercise the AI chose gets the library's version with
  that equipment (same equipment kinds; a name word in common, else motion within 8°; the closest) or else the
  user's own copy with that equipment (`basedOn`, named from `calledInSource`), both on by default; and
  each name the library doesn't know (a duplicate's name, and `calledInSource` names of library exercises), unless
  another library exercise already has it, gets **Suggest it** (the Submit to library issue, kind `name`). No
  dialog when there's nothing to say.
  - One prompt (`aiPrompt()`): what the user gave, which file to answer with, the workout rules, the exercise format
    (`<template id="aiPrompt">`, alignment spaces squeezed out), and the library as ids with `time` / `sides` / `dir`
    flags. About 10 000 characters, 12 700 as a link. As the library grows, links will pass the limit and fall back
    to copying. **Not yet tried on each app from a phone**: check that each opens with the text filled in (the
    app, rather than the site, may ignore `q`).
- The **bookmark** is only a flag, on any exercise. The user's own exercises are always in **My exercises**;
  deleting one is its own action (About → Delete), asks first and names the workouts that use it. Backups carry
  `bookmarks` too.
- **Settings**, in order: Documentation (link to the user guide), Workouts (rest between exercises, rest between
  sets, sound, full screen), Exercises (autoplay), Display (theme System/Light/Dark), Create with AI (Choose AI provider), Import & tools (backup, import file/paste, export your exercises, **Advanced exercise editor**,
  JSON format reference, storage-persistence note).
- **Quiet steps** (`"quiet": true`, the in-between points of a circle: Hip Circles, Leg Circles) are part of the
  motion but not steps a person sees: the exercise page's step number, name, Steps list and ▶ / → skip them
  (`visibleSteps()`, `shownStep()`, `stepBy()`); the editor still reaches every keyframe. Leg Circles has 8 points on a
  true circle (hip −84 ± 16°, thigh depth ± 32°), 4 of them steps.
- **Order of sides and directions** in a workout item: `"order": ["LA", "RA", "LB", "RB"]` (L/R side, A/B direction),
  set in the item's settings (↑ ↓) whenever there are 2+ combinations; default is every direction on one side, then the
  other side. The player announces what actually changes ("Switch sides", "Switch direction", or both); until Sep 2026 it
  said "Switch sides" for a change of direction on the same side.
- **Exercise page overlay**: Loop and Mute toggles in the bottom-right corner (see storage keys).
- **Confirmations** use `ask(title, text, action, danger)` (a Material dialog, `#askDialog`; resolves true/false),
  never the browser's `confirm()`. Tests answer it with an init script (`ASK_JS` in the tests that need it).
- **Leaving a workout**: hold ✕ (a tap only reminds you); Enter on ✕, **Esc**, or a screen reader's click (no
  pointer press) leave straight away.
- **Touch targets**: buttons, chips, segmented and icon buttons carry a transparent 48 px `::after`; don't put
  `overflow:hidden` on their containers (it clips it). `tools/audit.py` checks this.
- **Rests**: between exercises and between sets are settings (`restGap()`, `restSets()`); between circuit rounds
  is per block.
- **User guide**: `wiki/*.md` (Home, Getting started, Exercises, Workouts, Working out, Create with AI, Editing
  exercises, Sharing and backups, Settings, Troubleshooting), linked from the README. Screenshots in `wiki/images/`
  come from `tools/wiki_screenshots.py` (Android Chrome on a typical phone, 412×839 like a Pixel 7, light theme, 2× then 128-colour PNG; the flip phone's cover screen, 360×398, only where the guide is about it: `cover-workouts`, `cover-player`; desktop Chrome at 1280×800 for the laptop/desktop section: `desktop-exercise`). It
  fetches Google Fonts itself (honouring `HTTPS_PROXY`/`SSL_CERT_FILE`) and serves them to the browser, so the icons
  render in sandboxes where the browser can't reach Google. The GitHub Wiki itself isn't used (it's a separate repo
  that can't be reviewed in pull requests); the pages would copy over as they are if that changes.
- Editing: opening the editor jumps the figure to the current step's own pose (it used to stay wherever the
  animation paused, while the steppers showed the step's values).
- Segmented buttons inside dialogs (`.form-row .segmented`) fill the width and wrap long labels (e.g. "Right leg
  back / Left leg back / Both / Alternate") instead of running off the edge.

---

- **Language groundwork** (Sep 2026, i18n audit phase 0): `src/app/0-i18n.js` holds what depends on the language:
  `LANG` (from `<html lang>`, "en"), `plural(n, {one, other…})` for counted phrases (whole phrases, `#` = the number, CLDR
  plural rules via `Intl.PluralRules`), `repWord(ex, n)` (the only place English adds an "s"), `fmtNum`. Spoken lines set
  `u.lang = LANG` (before, the phone's default voice read English cues: a Spanish phone read them in Spanish). Dates and
  A–Z sorting use `LANG`. The manifest says `lang`/`dir`. Write new counted text with `plural()`, never `=== 1 ?`.

## 11. Storage (localStorage) — do not rename without a migration

| Key | Contents |
|---|---|
| `pose-player-library-v1` | `{items: [...]}` **My exercises**: the user's own (imported, copied, made). Before bookmarks it also held copies of bookmarked library exercises; `migrateSaved()` moves those to bookmarks once. Exercises saved before format v2 (Sep 2026) are still 2D and aren't converted (owner's decision: no other users yet); they draw wrongly and are best deleted |
| `nstructr-bookmarks-v1` | ids of bookmarked exercises, library or own (a flag; library ones aren't copied, so library fixes reach them) |
| `motion-guide-workouts-v1` | `{list: [...]}` user workouts (runtime form with uids) |
| `motion-guide-session-v1` | `{wid, i, swaps?}` resume point; `swaps` = the session's Easier/Harder swaps (item uid → exercise id, Sep 2026) |
| `motion-guide-sound-v1` | sound mode: off / beeps / voice / coach (shown as **Instruction** since Sep 2026; the key keeps its old name; since Oct 2026 `voice` is shown as **Coach** (was "Voice") and `coach` as **Instructor** (was "Coach"), the values unchanged). Default **coach** (beeps until Sep 2026): the 20-minute workouts are timed with Instructor |
| `motion-guide-log-v1` | history sessions (capped at 500) |
| `nstructr-fullscreen-v1` | `"off"` to disable the full-screen request |
| `nstructr-theme-v1` | `system` / `light` / `dark` (applied by an inline script in `<head>` before first paint) |
| `nstructr-speed-v1` | no longer used (the exercise page's Speed selector was removed in Sep 2026; exercises play at 1×). Left in place; nothing reads it |
| `nstructr-authoring-v1` | `"on"` shows the exercise editor |
| `nstructr-libwk-order-v1` | the user's order of the library workouts (ids; new ones go at the end, in `library/workout-order.json` order) |
| `nstructr-ai-app-v1` | the AI app Create with AI opens (`gemini` until one is picked; `claude`, `chatgpt`…) |
| `nstructr-ai-equipment-v1` | Create with AI, Plan a workout: the equipment kinds picked, JSON list (`[]` until changed; `["wall"]` until Sep 2026) |
| `nstructr-loop-v1` | `"off"`: the exercise page plays once through (setup, one rep, finish), then stops (overlay Loop toggle) |
| `nstructr-exmute-v1` | the exercise page's spoken cues muted unless `"off"` (default muted since Sep 2026; overlay Mute toggle; the voice also needs Sound = Coach/Instructor) |
| `nstructr-group-collections-v1` | `"on"`: the Exercises tab groups All collections by collection; otherwise one A–Z list (default since Sep 2026; the tab's own switch) |
| `nstructr-speech-rate-v1` | text-to-speech speed, 0.5–3 (steps of 0.1; default 1): `SpeechSynthesisUtterance.rate` for Coach and Instructor (Settings > Workouts, under Instruction; in the backup's `settings.speechRate`) |
| `nstructr-encourage-v1` | Coach's and Instructor's words of encouragement, `on`/`off` (default on; Settings > Workouts, under Instruction, shown with Coach and Instructor (Instructor only until Oct 2026); `COACH_WORDS` in `src/app/4-workouts.js`: synonyms for Begin and Last one, a cheer for 20% of middle counts (10% for the rep after one that cheered, until one doesn't: `repCheer()`, `WP.cheered`) and 40% of a hold's 10-second marks, not near halfway or in the last 10 s; never the word picked last time for the same moment (`COACH_LAST`); the backup's `settings.encourage`) |
| `nstructr-autoplay-v1` | `"off"`: exercises wait for Play when opened (Settings > Exercises; reduced motion also stops autoplay) |
| `nstructr-rest-sets-v1` | seconds of rest between sets, in every workout (default 10, 0–300; Settings > Workouts; 20 until Sep 2026). Workout items' `rest` is ignored |
| `nstructr-install-hint-v1` | the install tip: `due` once a workout was started, `shown` once offered (or installed). Per device, not in backups |
| `nstructr-rest-between-v1` | seconds of rest between exercises, in every workout (default 5, 0–300 in 1 s steps; Settings > Workouts; 10 until Sep 2026). Workout files' `restBetween` is ignored |

The mixed prefixes are historical; renaming them would silently wipe users' data. If you consolidate, migrate
(read old → write new → keep old until confirmed).

---

## 12. Testing

- `node tools/build.mjs` — schema + references + animation checks (3D) + range of motion (≈ 25 s).
- `tools/viewer3d.html` (serve the repo root) plays any exercise with a camera you can turn.
- `tools/e2e/*.py` (Python Playwright; `pip install playwright && playwright install chromium`), against a
  served build via `NSTRUCTR_URL`:
  `routine_full` (all 24 items to completion), `reps_sets_sides` (sets, rests, alternate sides/directions,
  nested reps, holds), `editor` (create, picker, drag, menus, blocks, export/import, resume),
  `circuits_history_share`, `exercises_tab` (the move from Saved, chips/shelves order, bookmark vs own,
  delete asks and names workouts, imports), `workouts_tab` (sections, collapsed cards, drag order kept, touch swipe to
  delete), `quick_fixes` (Start goes straight in, no Workouts Import, safety note on the card, edit words vs poses, Duplicate, Authoring-only JSON views, collections
  order, QR picture, incline push-up head), `share_links` (library/own workouts and exercises through a link on a
  second device, Not now/Add, id clash, QR, damaged link, no-CompressionStream fallback, the dialog's four buttons), `editing_text_layers` (no copy without a change, editing words, delete asks; plays a full round of
  both Star Excursions on both sides: the shins are stacked by depth, a front-view reach across the body is behind), `exercise_editor_workout_fixes` (steppers, copy on first edit, undo/revert/discard,
  pause stops speech, exit to list, "(copy)" names), `tabs_settings_player` (tabs, old links, Saved filter, settings persist,
  player overlay, page order, labels, Edit with the figure pinned, Done), `direction_cues` (the other direction keeps each step's words, so cues match the compass), `circles_order_toggles` (Leg Circles' 8 points with 4 steps; quiet steps hidden from the step number, list and ◀ ▶; a workout item's order of sides/directions, saved, shared, and the switch announced; Loop off stops at the end, Play restarts; Mute), `autoplay_first_speech` (a workout's first line isn't cancelled; leaving an exercise page stops its voice; Autoplay setting; copy-only AI apps), `audit_fixes` (Material confirm dialog: Cancel/Esc keep, Delete deletes; leaving a workout by Esc or a screen reader's click; one `<main>`; 48 px targets), `security_imports` (HTML/script in every text field of a shared exercise and workout never runs; no `javascript:` source links), `triage_filters_pace` (rest setting in 1 s steps with hold-to-repeat, type/equipment rows, equipment kept across collections, seconds per rep, rest row only with 2+ sets), `create_with_ai` (kinds, input needed, link filled in vs copied, fenced/workout/in-library/not-JSON answers, AI app and rest settings, cover screen, Half Roll-Back band), `transitions` (same position: through the rest pose, frame glides, no jump; change of position: crossfade; with a rest: moves during it; Side Stepping → Neck Stretch both sides: no jump; reduced motion: cut), `exercise_sound` (Silent/Beeps quiet, Coach reads the first pass with steps waiting then counts, pause/side/leave stop it), `pwa_offline_backup` (against `/`, via `NSTRUCTR_SITE`: manifest, icons,
  offline reload, backup round trip), `library_and_ids` (library workouts, Customize, resume/exit, `u-` renames,
  newer-version files refused), `coach_speech` (guided steps wait for speech; nothing cancelled),
  `gestures_cover` (two-tap controls, swipes, hold-to-exit, Start goes straight in), `layout_overlap` (title /
  caption / figure never overlap on cover, phone, landscape), `floor_height_cover` (floor ≥ 23% above bottom),
  `arm_circles_continuity` (constant angular speed, never reverses), `star_excursion_coach`, `variations` (linked
  variations: exercise page, editor swaps, player swaps with Instructor, session and Resume, history, Keep these changes).
  They print results rather than assert; read the output. Install with a Playwright version matching the
  Chromium you have (Claude Code's cloud sandbox: `pip install playwright==1.56.0 pillow`, no `playwright install`). Turning them into asserting tests is worthwhile.

---

## 13. Roadmap: history and plans

What's still open, in order, is **[ROADMAP.md](ROADMAP.md)**: the one to-do list. This section keeps what was done
(✅) and the detailed plans behind open items.

1. ✅ **Finish the repo split** — the items in §2.
2. ✅ **Installable PWA + backup**: `manifest.webmanifest` (`display: fullscreen`, any orientation, theme colours,
   icons incl. maskable), service worker (cache the shell and `library/index.json`; update strategy for the
   library), `navigator.storage.persist()`, **Export everything / Import everything** (workouts, history, saved
   exercises, settings). Then test on a flip phone's cover screen as an installed app (Good Lock).
3. ✅ **Simplify the UI before going public**: three tabs — Workouts, **Exercises** (Explore + Saved merged, Saved
   as a filter), **Settings** (sound, theme, full screen, speed; "Import & tools" = AI prompts, format
   reference, export; an **Advanced exercise editor** toggle that reveals the exercise editor). Exercise player gets the same
   tap-for-controls overlay as the workout player, with its details on the page (a pull-up panel until Sep 2026) instead of four tabs.
4. ✅ **Share links**: workout/exercise compressed into the URL fragment (`CompressionStream` + base64url), no
   server; QR codes for short links (see §5.3).
5. **Owner decisions before contributions**: ✅ license: **MIT** for everything (Sep 2026; this replaces the earlier
   idea of non-commercial-only with a paid commercial licence: MIT allows commercial use, with the copyright
   notice kept). Submissions are accepted under MIT (the submission checkbox says so). (A trademark check was dropped: owner, Sep 2026.)
6. ✅ **3D skeleton, still drawn as SVG** — exercise format **v2** (Sep 2026): mannequin-style joints with real 3D
   angles, a real camera, bones drawn in depth order (no `layers`, no depth joints), contacts solved in 3D. The
   library was converted automatically (each step checked against the old picture), and format 1 is no longer
   read or written. See `docs/3d-skeleton.md`. **Follow-up done (Sep 2026): the problem poses** —
   the 34 exercises past what a flexible body can do after the conversion were fixed (see `docs/3d-skeleton.md`,
   "The range check"), and the build now rejects poses past "flexible".
7. **CI tests** — **deferred** (owner, Sep 2026: the build's checks on every pull request are enough for now). Today CI runs `node tools/build.mjs` (schemas, animation checks, range of motion) on
   every pull request, but the browser tests (`tools/e2e/*.py`) and `tools/audit.py` are only run by hand. Plan:
   - make each e2e test **assert**: today they print results for a person to read; give each an expected outcome and a
     non-zero exit code on failure (keep the printout for diagnosis);
   - a workflow job on pull requests: build, serve `_site/`, install Python Playwright with its Chromium, run every
     e2e test (in parallel where they don't share state) and `tools/audit.py` (axe, 48 px targets, text size, sideways
     scroll), uploading screenshots and output as artifacts on failure;
   - keep flaky, network-dependent checks (source links) manual; decide whether `tools/perf.py` gets a budget (CI
     machines vary) or stays informational;
   - when picked up again: ideally before submissions grow, so contributions are checked end to end.
8. **Submission pipeline** — **exercises done** (Sep 2026, §8.8); **workouts later** (owner: exercises first). For
   workouts: the same issue form with a workout link, each of its own exercises going through the exercise rules.
9. **Content**: ✅ **foam roller** (Sep 2026): a `roller` surface, segment touches and rolling (§5, §6.2); calves,
   hamstrings, quads and upper back (batch 17); then the roller rolling along the floor and turning, and glutes, IT
   band and lats. Still open: exercise machines (cable stations first — a fixed anchor + rigid cable, close to bands; then
   leg press, lat pulldown; then cardio machines). Two small open choices in §14.
10. **Experiments**: Flex mode layout (viewport segments; figure on the top half), voice commands (optional;
   browser speech recognition is flaky/online-only).

11. **Later / ideas**:
    - **AI with API keys**: the Create with AI screen calling the provider directly (the user's own key, kept on the
      device): Gemini for YouTube links and videos, the others with photos (videos as still frames); feed the
      animation checks' errors back to the model to fix its JSON. **Self-hosted models** (an OpenAI-compatible
      address) in the same mode; their server must allow browser requests (CORS). Provider list (researched Sep 2026):
      **models.dev** (github.com/anomalyco/models.dev, MIT, community-maintained; `https://models.dev/api.json`: each
      provider's id, name, API address, docs and its models with input types) is the best fit for this mode;
      LiteLLM's `model_prices_and_context_window.json` is bigger but model/price-centred. Neither lists the *chat apps*
      Create with AI opens (web address, whether a link can fill in the message): that list (`AI_APPS`) stays ours.
    - **The engine as its own package** (deferred, owner Sep 2026): `src/core.js` + the schema + `tools/checks.cjs`
      and `tools/rom.cjs`, split out with their history (`git subtree split`) when a second app needs it. Its value
      beyond exercise: a tiny (one file, no dependencies) MIT figure-posing engine with body-relative 3D angles,
      contacts (anchors, touch, reach, keep, surfaces, rolling), any camera, SVG output, mirroring, and range and
      animation checks: poses a person or an AI can write, checked. Strong uses: pose images for AI image generation
      (OpenPose keypoints for ControlNet: the best first demo), AI-written movement, pictograms and instruction
      diagrams, biomechanics teaching. **The owner's interest for a follow-up app: choreography and coaching
      diagrams** (dance, martial arts, sports drills), which needs more than one figure, a timeline, likely hands,
      and maybe paths on the floor. To split: ES module exports instead of the shared script scope, the stage size
      (`W`, `CX`, `FLOOR`) as options, the SVG drawing optional (the posing maths alone for a canvas/WebGL
      renderer), HANDOFF §4–6 and the schema as its README. CLAUDE.md's rule keeps `src/core.js` separable meanwhile.
    - ✅ **Linked variations** (Sep 2026, §5.4 and §8.1b; then the Marching Glute Bridge, the Band-Assisted Pull-Up and Create
      with AI's plan prompt listing the progressions): progressions and equipment groups in
      `library/progressions.json`, shown on the exercise page, swapped in the workout editor and, for a session, in
      the player. Knee Plank and Single-Leg Glute Bridge were added to fill gaps (`tools/variants/batch-24-links.cjs`).

### Muscle groups (agreed with the owner, Sep 2026; done, §5.5)

- **Ratings**: each exercise rates each group 0–3 (ExRx's classification): 3 primary (what it's for), 2 secondary (helps
  move the load), 1 stabilizer (holds you steady), 0 not worked. Stretched groups are listed separately. New fields,
  e.g. `"muscles": {"glutes": 3, "backThigh": 2, "core": 1}`, `"stretches": ["frontThigh"]`, with a source; the build
  requires them on library exercises. Equipment groups share ratings; `basedOn` copies inherit; Edit and the AI prompt
  get the fields. Uncertain ratings go to the owner. Sources: ExRx for strength moves; Yoga Journal anatomy and
  physiotherapy sites for yoga, Pilates and stretches.
- **11 groups**, each one side of one part of the figure: shoulders (front and back), chest, upper back (lats, traps;
  neck folded in), biceps (and forearms), triceps, core (abs, obliques), lower back, front of thigh (quads, hip flexors,
  inner thigh), glutes (outer hip too), back of thigh (hamstrings), lower legs (calves and shins). The owner's seven
  (arms, shoulders, chest, back, core, upper legs and glutes, lower legs) are headings in the text list. Why not seven:
  push/pull (biceps/triceps), upper/lower back and quads/hamstrings balance would be invisible, the back view would
  repeat the front, and coarse ratings can't be split later without redoing the research.
- **Map**: a separate front and back outline that resembles the stick figure as closely as possible (the thumbnails'
  capsule limbs and round head; the torso a rounded capsule, the one real addition). The owner approves a mockup first.
- **Colours**: unfilled → pale green → deep green → amber → deep red, each darker than the last (so the order reads in
  greyscale and for colour-blind viewers; a gradient within each band), checked for contrast in both themes; stretched
  groups outlined in blue; always a text list too. Legend: "Estimated work".
- **Workout total** per group, in set-equivalents: each set counts toward a sweet spot (the exercise's prescribed reps,
  12–15 when it gives none; 30–60 s for holds): below it in proportion, in it 1, above it with diminishing returns up to
  1½ (about 1.3 at twice the sweet spot); × sides; × 1 primary, ½ secondary, ¼ stabilizer; stretches don't count. So 60
  sets of 1 push-up count 5 (60 reps, as 5 sets of 12), one set of 60 about 1.4, 3 × 12 counts 3. Fixed thresholds:
  green below 2, amber 2–5, red above 5, to be tested on the library workouts before they're fixed. It's an estimate
  (the app can't know the weight or effort); the ACSM recommends 8–12 reps for most adults and 10–15 for beginners and
  older adults.
- **Phasing**: ✅ a mockup (approved: the figure, the dark theme's salmon, primary = red); ✅ the data for all 354
  exercises, the build check and the exercise page map (§5.5); ✅ workout totals (card, editor), an indicator on
  exercise cards, a muscle filter on the Exercises tab, Create with AI "a workout for my back", and the fields in Edit
  and the AI prompt. One change from the plan: "× sides" became "each side's muscles get their own sets" (both sides
  count once, one side only half), since 3 × 10 split squats a leg work each leg's thighs as much as 3 × 10 squats.

### Agreed next (Sep 2026, in this order)

1. ✅ Quick fixes (chair incline push-up head, QR picture, no sharing library items, start sheet without sound /
   full screen, Duplicate needs exercises, Bookmarked, Other names, speed remembered, Authoring-only JSON views,
   no history export, collections A–Z, `figure.segments` and `prescription.rounds/sides` removed).
2. ✅ **Workouts tab**: My Workouts heading with New workout under its message (Import moved to Settings only in 4); cards collapsed by default
   (Start + name) and expandable; drag to reorder My Workouts **and** Library workouts (per-user order,
   `nstructr-libwk-order-v1`); swipe left on a My Workouts card shows a trash can, tapping it deletes (no dialog,
   no undo). Filters say "All collections" / "All equipment".
3. ✅ **Exercises tab**: My Exercises collection (the user's own, bookmarked or not; removing a bookmark no longer
   deletes; delete is its own action) → order: Bookmarked, My Exercises, then collections A–Z. Storage change with
   migration.
4. ✅ **Exercise page**: drop the pull-up panel; the page scrolls: controls → About → time → How to do it → Steps
   (collapsible) → Edit. Labels **Side**, **Direction**, **Speed** on the selectors (Leg Circles would be a good
   exercise needing both Side and Direction: add it, from https://pilatesology.com/pilatesology-encyclopedia-leg-circles/
   described in our own words). The exercise player follows the Sound setting (Silent / Beeps: quiet;
   Coach / Instructor: read each step's cue on the first pass, then count reps). **Edit details** (words) for everyone
   on their own exercises and copies; Advanced exercise editor adds poses and camera. Also: Start goes straight into a workout
   (no popup; safety notes on the card and in the editor), Import only in Settings. Leg Circles added in the next PR (`pil-leg-circles`).
5. ✅ **Create with AI** (deep links, no keys): one screen: what it is (a name, a written routine, a YouTube link, a
   photo or video) → provider (default in Settings: Claude, ChatGPT, Gemini, Grok, DeepSeek…) → open it with the
   prompt filled in (copy where the provider can't take it in the link) → paste the JSON back. One prompt that can
   return an exercise or a workout. Built: see §10 "Create with AI". Also in that PR: MIT license, rest between
   exercises moved to Settings, Half Roll-Back without the band.
6. ✅ **Audits**: Material Design 3, UI consistency, accessibility, layout, security, performance, library
   content. Report and what was fixed: `docs/audit-2026-09.md`. Re-run with `tools/audit.py` (axe-core + touch
   targets + text size + sideways scroll) and `tools/perf.py`. Follow-ups: ~~Setup for the 52 yoga poses~~ (done), ~~source
   links for 52 exercises~~ (done: every exercise now links a reputable page; `tools/check-links.mjs`, or the manual
   "Check source links" workflow, reports any that stop answering), a TalkBack pass on a flip phone (skipped for now, Sep 2026: ask a user who relies on TalkBack to do it if it matters to them).

---

## 14. Questions for the owner (decided)

1. ~~**License**~~ Decided: MIT for the engine, the app code and the library content (`LICENSE`).
2. ~~**Trademark** check on "NstructR"~~ Dropped (owner, Sep 2026).
3. ~~**4-Point Star Excursion**: straight-left reach or a back-left diagonal?~~ Decided: keep it as it is (owner,
   Sep 2026).
5. ~~Is **22 vh** the right bottom margin on the real cover screen?~~ Confirmed on the owner's flip phone.
6. ~~Library workouts: copy on first run, or only a library section?~~ Decided: library section only;
   Customize makes a copy. Existing installs keep their first-run copy.
7. ~~Does the app run on the cover screen?~~ Installed as an app, it runs there (owner, Sep 2026).
9. ~~**3D skeleton**~~: go, as v2 (Sep 2026), and done; no v1 export, and v1 import stopped once everything was v2
   (owner: there are no other users yet).
10. ~~**Which languages first?**~~ Decided: Simplified Chinese (`zh-Hans`) first, with mainland China a target
   (owner, Sep 2026); what that adds to the plan is on [ROADMAP.md](ROADMAP.md). Qwen, Doubao and Kimi were added
   to Create with AI's providers at the same time.

Still open (seated band row X, which machines first, status bar flicker): see [ROADMAP.md](ROADMAP.md). The status
bar flicker (owner report, installed app on a flip phone) wasn't reproduced; likely Android's own behaviour in
`display: fullscreen` (an edge swipe briefly reveals the system bars). If it matters, the option is
`display: standalone` with full screen only during workouts.
