# NstructR — working notes for Claude Code

Read `HANDOFF.md` first: formats, engine pipeline, validation rules, design decisions, roadmap, open questions.
The user guide is `wiki/*.md` (screenshots: `tools/wiki_screenshots.py` → `wiki/images/`); update it with user-visible changes.

## Commands
- `npm install` (once) · `node tools/build.mjs` (validate + animation checks + bundle + `_site/`)
- `node tools/build.mjs --check-only` (what CI runs on PRs) · `--no-checks` (fast UI iteration)
- Serve: `python3 -m http.server 8000 -d _site` → `/` (fetches `library/index.json`) or `/nstructr.html` (single file)
- Browser tests: `NSTRUCTR_URL=http://127.0.0.1:8000/nstructr.html python3 tools/e2e/<test>.py` (they print, read the output)

## Rules
- `library/exercises/*.json` and `library/workouts/*.json` are the source of truth. File name = `id`. Library ids never start with `u-` (reserved for users).
- Every exercise must pass `tools/checks.cjs` for all sides/directions. Fix geometry rather than adding to `tools/known-issues.json`; if you add an exception, write why.
- Poses are 3D joint angles (format v2): ball joints `[forward, side, turn]`, hinges one number; signs follow the body, not the screen (HANDOFF §4). Angle values like `540` or `-235` are deliberate (they choose the direction a joint turns). Keep continuity with neighbouring steps.
- Only format v2 is read and written; `tools/format-json.cjs` lays library files out (one line per joint).
- `durationMs: 0` means instant, not "unset".
- Write bilateral exercises for one side; the other is mirrored (names/cues/guide labels have left/right swapped automatically).
- Exercise text: our own words, cite the source, never copy. Spoken cues: short, plain directions.
- Workout player targets the **cover screen of foldable flip phones, on the floor**: nothing important at the bottom (camera cutouts), first tap only shows controls, hold ✕ to exit, test at 360×398.
- Don't rename localStorage keys without a migration (see HANDOFF §11).
- UI changes: run `tools/audit.py` (axe, 48 px targets, sideways scroll); confirmations use `ask()`, never `confirm()`.
- User-visible changes: update the README / `wiki/` and retake screenshots (`tools/wiki_screenshots.py`).
- No framework, no bundler: `src/app/*.js` are classic scripts concatenated in filename order into one global scope.
- A build deletes and recreates `_site/`, so restart a server started with `-d _site` after each build.
- Don't run `pkill -f http.server` from a shell whose command line contains that text (it kills itself).

## Where things are
Engine (3D, format v2): `src/core.js` · Range of motion: `tools/rom.cjs` · Any exercise from any camera: `tools/viewer3d.html` · App: `src/app/1-engine.js` (state, drawing, playback) · `2-explore.js` (Exercises tab) · `3-details.js` (exercise page info, overlay, Edit, its sound, Settings) · `5-main.js` (routing, boot) · `5-ai.js` (Create with AI) · `5-share.js` (share links, QR) · `6-pwa.js` (service worker, backup; calls `boot()`) · PWA: `manifest.webmanifest`, `icons/`, `src/sw.js` (template; the build writes `_site/sw.js`) · Workouts & player: `src/app/4-workouts.js` · CSS: `src/head.html` · Markup: `src/body.html`
