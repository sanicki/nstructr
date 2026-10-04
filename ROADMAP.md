# Roadmap

What's still to do, and what's waiting on a decision. Only open items are listed: when something is done or decided it
comes off this list. How things work, and why past decisions were made, is in [HANDOFF.md](HANDOFF.md).

## App

- **Workout submissions**: exercises can be submitted to the library; workouts can't yet.
- **AI with your own API key**: Create with AI calls the provider directly instead of copy and paste; self-hosted models
  too. The provider list could come from [models.dev](https://models.dev).
- **Other languages** (audit Sep 2026; the groundwork is done: `src/app/0-i18n.js`):
  - The app's own text moves into a catalogue per language, with a Language setting (System, then the languages
    offered). We translate the app.
  - Exercises and workouts are translated by the people who add them: a submission in another language must include
    the English too (the library stays English first). The AI prompts ask for both.
  - Library text gets a translation file per language; cues say `{side}` / `{other}` instead of swapping the words
    left and right; equipment and collections become keys with translated names.
  - **Simplified Chinese first**, and mainland China is a target (owner, Sep 2026). So: count characters, not words,
    in `speechSeconds` (the one speech-length estimate); fix `repWord()` (no "s" outside English); rely on the phone's Chinese font
    (`:lang(zh)`); bundle Roboto Flex and Material Symbols instead of loading them from Google Fonts (blocked there).
  - When other languages ship, **Unspecified** becomes the default AI provider (not Gemini).
  - Right-to-left layout (Arabic, Hebrew, Persian, Urdu) only if one of those is chosen.
- **Planted points lifting mid-move** (found Oct 2026): a move blends two poses joint by joint, which doesn't keep a point
  that's on the floor at both ends. Plank and Knee Plank are fixed (a quiet in-between step); still lifting: out of Knee
  Plank to tabletop (a knee 6 px); into Side Plank (a hand 36 px), Kneeling Side Kick (a hand 34 px, a toe 24 px out)
  and Knee Push-Up (a toe 26 px); out of Child's Pose (a toe), Puppy (a toe 27 px), Thread the Needle (a hand 23 px) and
  Lizard (a toe 18 px). Better in the engine (hold such points during a move, as it holds a planted hand) than step by
  step; the build's move checks should catch it (they check the ends only).
- **Exercises tab speed**: opening it draws all 358 thumbnails: 4.6 s on a slow phone (CPU 4×; 17 ms each, every
  thumbnail resolves its whole exercise). Draw them as they scroll into view, and/or cache each one. Startup itself is
  fine (1.3–1.9 s at 4–6× on a repeat visit), so no lazy-loading of the library (`tools/perf.py`, Oct 2026).

## Library

- **Found but not added** (standing item, owner Oct 2026: stays here even when empty): the ⏳ versions in
  [docs/equipment-equivalents.md](docs/equipment-equivalents.md), for the owner to pick from. Today:
  - Shoulder Shrug: seated in a chair; dumbbell and barbell shrugs.
  - Standing Biceps Stretch: Wall Biceps Stretch.
  - Wrist Flexor Stretch: against a wall.

## Deferred

- **Exercise machines** (deferred by the owner, Sep 2026): cable stations first, then leg press and lat pulldown, then
  cardio machines.
- **The engine as its own package** (MIT, browser 3D figure posing): split out when a second app needs it. The owner's
  interest for a follow-up app: **choreography and coaching diagrams**. A first demo could be pose export for AI
  image generation. Plan in HANDOFF §13.

## Questions for the owner

- **Seated band row**: draw the band crossed in an X, as the routine describes?
- **Machines**: which ones matter first?
- **Status bar flicker** on the back gesture (installed app): not reproduced; nothing to do unless it comes back.
