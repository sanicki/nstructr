# Roadmap

What's still to do, and what's waiting on a decision. Only open items are listed: when something is done or decided it
comes off this list. How things work, and why past decisions were made, is in [HANDOFF.md](HANDOFF.md).

## Exercises and equipment

- **Muscle groups** (plan in HANDOFF §13; ratings and the exercise page map done, §5.5): a workout's total on its card
  and editor (thresholds tested on the library workouts first), an indicator on exercise cards, a muscle filter,
  Create with AI by muscle, and the fields in Edit and the AI prompt.

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
    where speech length is estimated; fix `repWord()` (no "s" outside English); rely on the phone's Chinese font
    (`:lang(zh)`); bundle Roboto Flex and Material Symbols instead of loading them from Google Fonts (blocked there).
  - When other languages ship, **Unspecified** becomes the default AI provider (not Gemini).
  - Right-to-left layout (Arabic, Hebrew, Persian, Urdu) only if one of those is chosen.

## Deferred

- **Exercise machines** (deferred by the owner, Sep 2026): cable stations first, then leg press and lat pulldown, then
  cardio machines.
- **Browser tests in CI**: today the build's checks run on every pull request, but the browser tests only print their
  results and are run by hand. Plan in HANDOFF §13.
- **The engine as its own package** (MIT, browser 3D figure posing): split out when a second app needs it. The owner's
  interest for a follow-up app: **choreography and coaching diagrams**. A first demo could be pose export for AI
  image generation. Plan in HANDOFF §13.

## Questions for the owner

- **Seated band row**: draw the band crossed in an X, as the routine describes?
- **Machines**: which ones matter first?
- **Status bar flicker** on the back gesture (installed app): not reproduced; nothing to do unless it comes back.
