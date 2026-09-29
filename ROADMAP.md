# Roadmap

What's still to do, and what's waiting on a decision. Only open items are listed: when something is done or decided it
comes off this list. How things work, and why past decisions were made, is in [HANDOFF.md](HANDOFF.md).

## Exercises and equipment

- **More foam rolling**: glutes, IT band (lying on your side), lats; the roller turning and travelling under the body.
- **Kettlebell Around the World**: the bell passes from hand to hand, and a held weight can't change hands yet.
- **Turkish Get-Up** and **Kettlebell Clean**: many steps to animate.
- **Moving props**: stability-ball pass and hamstring curl, medicine-ball chest pass (the ball has to move).
- **Smaller additions** found in the research, still to add: Cow Face arms with a strap, Thread the Needle, band front
  raise / upright row / chest fly, seated knee extension and leg raise, advanced Pilates (Open-Leg Rocker, Corkscrew,
  Jackknife and others), side stepping and balance walk. List:
  [collection research](docs/collection-research.md).
- **Equipment versions** of existing exercises (about 30, marked ⏳), e.g. decline push-up, dumbbell deadlift, dumbbell
  swing, towel stretches: [equipment equivalents](docs/equipment-equivalents.md).
- **Exercise machines**: cable stations first, then leg press and lat pulldown, then cardio machines.

## App

- **Workout submissions**: exercises can be submitted to the library; workouts can't yet.
- **Linked variations**: an exercise names its easier and harder versions (knee push-up ↔ push-up ↔ decline push-up), so a
  workout can swap one for another.
- **AI with your own API key**: Create with AI calls the provider directly instead of copy and paste; self-hosted models
  too. The provider list could come from [models.dev](https://models.dev).
- **Experiments**: a flex-mode layout for folding phones; optional voice commands.
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

- **Browser tests in CI**: today the build's checks run on every pull request, but the browser tests only print their
  results and are run by hand. Plan in HANDOFF §13.
- **The engine as its own package** (MIT, browser 3D figure posing): split out when a second app needs it. The owner's
  interest for a follow-up app: **choreography and coaching diagrams**. A first demo could be pose export for AI
  image generation. Plan in HANDOFF §13.

## Questions for the owner

- **Seated band row**: draw the band crossed in an X, as the routine describes?
- **Machines**: which ones matter first?
- **Status bar flicker** on the back gesture (installed app): not reproduced; nothing to do unless it comes back.
