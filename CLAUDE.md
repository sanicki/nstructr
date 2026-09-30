# NstructR — working notes for Claude Code

Read `HANDOFF.md` first: formats, engine pipeline, validation rules, design decisions.
`ROADMAP.md` is the one to-do list: only open items, short plain lines. Any PR that finishes, adds, defers or decides a
roadmap item updates it in the same PR (a done item comes off; its history goes in HANDOFF). "Next PR" = its top item
unless the owner says otherwise.
The user guide is `wiki/*.md` (screenshots: `tools/wiki_screenshots.py` → `wiki/images/`); update it with user-visible changes.

## Commands
- `npm install` (once) · `node tools/build.mjs` (validate + animation checks + bundle + `_site/`)
- `node tools/build.mjs --check-only` (what CI runs on PRs) · `--no-checks` (fast UI iteration)
- Serve: `python3 -m http.server 8000 -d _site` → `/` (fetches `library/index.json`) or `/nstructr.html` (single file)
- Browser tests: `NSTRUCTR_URL=http://127.0.0.1:8000/nstructr.html python3 tools/e2e/<test>.py` (they print, read the output)

## Rules
- `library/exercises/*.json` and `library/workouts/*.json` are the source of truth. File name = `id`. Library ids never start with `u-` (reserved for users).
- Every exercise must pass `tools/checks.cjs` for all sides/directions, and every pose must be within a flexible body's range of motion (`tools/rom.cjs`; the build fails otherwise). Fix geometry rather than adding to `tools/known-issues.json`; if you add an exception, write why.
- Poses are 3D joint angles (format v2): ball joints `[forward, side, turn]`, hinges one number; signs follow the body, not the screen (HANDOFF §4). Angle values like `540` or `-235` are deliberate (they choose the direction a joint turns). Keep continuity with neighbouring steps.
- Only format v2 is read and written; `tools/format-json.cjs` lays library files out (one line per joint).
- `durationMs: 0` means instant, not "unset".
- No duplicates: the build fails on two exercises that move the same with the same equipment and measure; another name for a known exercise goes in its `otherNames`. `collections` (library only) can list several.
- After adding a library exercise: the `exercise-research` skill (`.claude/skills/exercise-research/SKILL.md`): most common name, other names, equipment versions (`node tools/research.cjs report <id>`).
- Write bilateral exercises for one side; the other is mirrored (names/cues/guide labels have left/right swapped automatically).
- Exercise text: our own words, cite the source, never copy. Spoken cues: short, plain directions.
- Workout player works on the **cover screen of foldable flip phones, on the floor** (an important feature, not the app's focus: keep it working): nothing important at the bottom (camera cutouts), first tap only shows controls, hold ✕ to exit, test at 360×398.
- Don't rename localStorage keys without a migration (see HANDOFF §11).
- UI changes: run `tools/audit.py` (axe, 48 px targets, sideways scroll); confirmations use `ask()`, never `confirm()`.
- User-visible changes: update the README / `wiki/` and retake screenshots (`tools/wiki_screenshots.py`).
- No framework, no bundler: `src/app/*.js` are classic scripts concatenated in filename order into one global scope.
- The engine stays separable (it may become its own package): `src/core.js` uses no browser APIs (`document`, `window`, `localStorage`, `navigator`), no app globals and nothing from `src/app/`; it works on plain data (poses, keyframes, props) and returns data or SVG strings, and must keep running under Node (`tools/checks.cjs`, `tools/rom.cjs` load it). App behaviour goes in `src/app/`; the engine gets options, not app knowledge.
- A build deletes and recreates `_site/`, so restart a server started with `-d _site` after each build.
- Don't run `pkill -f http.server` from a shell whose command line contains that text (it kills itself).

## Where things are
Engine (3D, format v2): `src/core.js` · Range of motion: `tools/rom.cjs` · Similarity / duplicates: `src/similar.js` · Names and equipment versions: `tools/research.cjs`, `tools/variants/`, `docs/equipment-equivalents.md` · Submissions (GitHub side): `tools/submission.mjs`, `.github/workflows/submission.yml`, `.github/ISSUE_TEMPLATE/exercise.yml` · Any exercise from any camera: `tools/viewer3d.html` · App: `src/app/0-i18n.js` (language: `plural()`, `fmtNum()`, spoken-line language) · `1-engine.js` (state, drawing, playback) · `2-explore.js` (Exercises tab) · `3-details.js` (exercise page info, overlay, Edit, its sound, Settings) · `5-main.js` (routing, boot) · `5-ai.js` (Create with AI) · `5-share.js` (share links, QR) · `5-submit.js` (Submit to library) · `5-libcheck.js` (after an import: already in the library?) · `6-pwa.js` (service worker, backup; calls `boot()`) · PWA: `manifest.webmanifest`, `icons/`, `src/sw.js` (template; the build writes `_site/sw.js`) · Workouts & player: `src/app/4-workouts.js` · CSS: `src/head.html` · Markup: `src/body.html`
