# Create with AI

[← User guide](Home.md)

Have a routine from a class, a physio's sheet, or a video? **Create with AI** gets an AI app (ChatGPT, Claude,
Copilot, DeepSeek, Gemini, Grok, Vibe or any other LLM) to turn it into an exercise or workout for NstructR. You need an
account with that AI app. NstructR doesn't send anything itself: you see everything in the AI app.

Open it from **Workouts → Create with AI**, or **Settings → Create with AI → Create**.

<img src="images/create-with-ai.png" width="300" alt="Create with AI: what you have, the AI app, Open">

## 1. What do you have?

| Choice | Type or paste |
|---|---|
| **The name of the exercise** | e.g. *Pilates leg circles* |
| **Written routine** | The whole routine: exercises, reps, sets, rests |
| **Video or web link** | A YouTube or web address. Gemini can watch YouTube videos; most others read the page. |
| **Photo or video** | Nothing here: attach it in the AI app after it opens (pick an app that accepts pictures or video) |
| **A goal: plan a workout** | What you want, e.g. *a 30-minute leg workout*, and the equipment you have (see below) |

The instructions ask the AI to use what it knows **and to check it with a web search** where it can (how the
exercise is done, its steps, typical reps and safety notes), and to name the page it relied on as the source.

### Plan a workout

<img src="images/create-with-ai-plan.png" width="300" alt="Plan a workout: what you want and the equipment you have">

Tap the equipment you have (a wall is picked at first; your choice is remembered). The AI may use **only exercises
already in the app**, from the library or your own, that need nothing more than that equipment. It is told how long
each rep takes and what each exercise works, so it can fit the length you ask for.

When you add its answer:
- an exercise that isn't in the app is refused (ask the AI again);
- an exercise that needs equipment you didn't pick is added anyway, and named, so you can swap it in the workout;
- you see the workout's length as NstructR times it (rests from your settings included).

## 2. Ask the AI

Pick the AI app (Gemini at first; the app remembers the one you pick) and tap **Open**:

- **ChatGPT, Claude, Copilot**: open with NstructR's instructions already typed in. Check it, then send it.
- **DeepSeek, Gemini, Grok, Vibe**: can't be opened with a message this long, so the instructions are **copied**. Paste them into the
  chat (long-press → Paste), add your photo or video if you have one, and send.
- **Other LLM**: copies the instructions for you to paste into any AI chat.

The instructions are always copied too, in case the message doesn't show up. **Copy instructions** copies them
again.

## 3. Paste its answer

<img src="images/create-with-ai-answer.png" width="300" alt="Paste the AI's answer, then Add">

When the AI has answered, copy its whole reply, come back, tap **Paste** (or long-press the box), then **Add**.

- **One exercise** is added to **My exercises** and opens so you can watch it.
- **A routine** becomes a workout in **My workouts**, using library exercises where they match and new ones
  where they don't, and opens in the editor.
- If the exercise **is already in the library**, that exercise opens instead.
- **Already in the library under another name?** If a new exercise moves the same as a library one (same
  equipment, reps or hold), you're asked whether to use the library's instead (it's ticked; **Done** swaps it in
  the workout, **Keep as imported** keeps yours).
- **Different equipment?** If the AI picked a library exercise but the source uses other equipment (a band squat
  matched to the plain squat), you're offered the library's version with that equipment (Band Squat), or, when
  the library has none, your own copy with that equipment in My exercises. Names the library doesn't know yet, such as what the video
  calls an exercise, can be sent as suggestions with **Suggest it**
  (see [Submit to library](Sharing-and-backups.md#submit-an-exercise-to-the-library)).

<img src="images/import-check.png" width="300" alt="Check against the library: use Glute Bridge instead of your new Hip Raise; use Band Squat for a resistance band squat; names the library doesn't know yet, each with Suggest it">
- If the answer isn't usable, you're told why; ask the AI to try again or to "answer with only the JSON".

AI apps make mistakes. Watch a new exercise before you use it, and fix the words or poses if needed (see
[Editing exercises](Editing-exercises.md)).
