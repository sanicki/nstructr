---
name: exercise-research
description: After an exercise is added to library/exercises (by hand, from Create with AI, or a submission PR), check its names, its equipment versions and its linked variations the way the Sep 2026 library research did - the most common name, other common names, established versions with the library's other equipment, and where it goes in library/progressions.json (easier/harder steps, equipment groups). Use when an exercise is added or the user asks to research names, equipment versions or progressions.
---

# Exercise research (names, equipment versions, linked variations)

The checks the whole library had in Sep 2026 (`docs/equipment-equivalents.md`, `docs/progressions.md`), for one exercise or a few.
The mechanical half is `tools/research.cjs`; the judgment half is a web search. Library rules still apply
(`CLAUDE.md`): our own words, a cited source, every pose within the checks.

## 1. Report
```sh
node tools/research.cjs report <id...>        # --md for Markdown (a PR description)
```
It lists the exercise's names, any name another exercise also has, a duplicate if there is one, the library's
versions of it with other equipment, and the equipment headings with no version yet (the AI prompt's headings:
no equipment, band, door anchor, dumbbell, barbell, kettlebell, chair, bench, wall, step, towel; a mat doesn't count).
It also says where the exercise is linked (easier, harder, other equipment) or, when it isn't, the progressions and
equipment groups it's likely to belong to (step 4).

## 2. Names
Search the web (WebSearch; reputable sources: ACE, NASM, NHS, Mayo Clinic, Cleveland Clinic, Yoga Journal,
physiotherapy sites). Decide:
- **name**: the name most people use for it (Plank, not Forearm Plank; Deadlift, not Barbell Deadlift; Downward Dog).
  Keep an equipment word when it tells versions apart (Dumbbell Squat, Band Squat).
- **other names**: other names in common use (Hip Raise, Press-Up, Military Press). Yoga: Sanskrit first.
- A name another library exercise has is never added (the tool refuses it; "Bridge" is Bridge Pose's).

Write `{"<id>": ["<new name or null>", ["<other name>", ...]]}` to a scratch file and apply it:
```sh
node tools/research.cjs names <file.json>     # a renamed exercise keeps its old name as another name
```

## 3. Equipment versions
For each heading the report says has no version: search for an **established** version (described under that name
by a reputable source, not invented). Record every finding in `docs/equipment-equivalents.md` (✅ added,
⏳ found but not added yet, — none), with the source.

To add one, write a definition (see `tools/variants/batch-1.cjs` and `batch-2.cjs`): `base` = the library exercise
with the same movement, `edit` = what changes (arms hanging with dumbbells: shoulder forward = the torso's lean),
`props`, `equipment`, `collections`, our own `description`, `setup`, `cues`, step words (`steps`, so nothing inherited
mentions the old equipment), `prescription`, `source`. Then:
```sh
node tools/research.cjs variants tools/variants/<batch>.cjs [id...]   # writes and checks each (✓/✗)
node tools/build.mjs --no-checks && python3 -m http.server 8000 -d _site &
python3 tools/research_sheet.py /tmp/sheet.png <id...>              # look at every step
```
A version must be a *variant* (other equipment or measure), never a *duplicate*; the build fails otherwise.

## 4. Linked variations (`library/progressions.json`)
The app shows each exercise's **easier** and **harder** versions (and lets a workout swap to them), and its versions with
**other equipment**. Place every new library exercise, or say in the PR why it has none:
- **Progression** (`progressions`: steps easiest first): is it an easier or harder version of a library exercise
  (Knee Push-Up → Push-Up → Decline Push-Up; a wall, block, strap or chair that supports a pose makes it easier)?
  Search for an established progression (ACE, NASM, physiotherapy sites) and put it in its place; start a new
  progression only with a source. Record the source in `docs/progressions.md`.
- **Equipment group** (`equipment`): the same move with other equipment (Dumbbell/Kettlebell/Barbell Deadlift). Each
  member uses other equipment (the build fails otherwise); an exercise may be in more than one group.
- The build warns about two exercises that move the same with other equipment but aren't linked: link them, or add
  them to `notLinked` with why.

## 5. Before the pull request
- `node tools/build.mjs --check-only` passes.
- The Create with AI prompt lists every exercise: check it still fits in a link (HANDOFF §10, "Create with AI":
  under `AI_Q_MAX` as a ChatGPT link).
- HANDOFF's library counts, `docs/equipment-equivalents.md`, `docs/progressions.md`, and the wiki if collections changed.
- No link warnings from the build (`⚠ ... aren't linked`).
