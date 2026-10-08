# Settings

[← User guide](Home.md)

<img src="images/settings.png" width="300" alt="The Settings tab">

## Documentation

A link to this guide, and **report it** to tell us about a bug: it opens a short form on GitHub (you need a free
GitHub account) with your phone and browser already filled in. Say what went wrong in a sentence or two; a
screenshot helps.

And a link to make a **donation**, if you'd like to support the work.

## Workouts

### Rest between exercises
Seconds of rest between one exercise and the next, in every workout. Tap − / + (1 s at a time; hold to keep
going) or type a number, from 0 to 300. Default 5.

### Rest between sets
Seconds of rest between the sets of an exercise done in more than one set, in every workout. Same controls.
Default 10. (Rest between circuit rounds is set on each block.)

### Instruction
**Silent**, **Beeps**, **NstructR** or **NstructR+** (the default): see [Working out → Instruction](Working-out.md#instruction). Also used
by the exercise page (NstructR and NstructR+ read each step's cue once, then count).

### Words of encouragement
Shown with **NstructR** and **NstructR+** (on at first). They vary what they say:

| When | Words |
|---|---|
| The last rep | Last one · One more · Last rep · Final rep |
| Now and then in place of a count (about 1 in 5, never the first or the last; 1 in 10 right after one; the "and" of an alternating rep too) | Good · Keep going · Breathe · Doing great · Nice · Steady · That's it · Nice work · Looking good |
| Every 10 seconds of a hold, 4 times in 10 (never at halfway or in the last 10 seconds) | the words above, and Stay with it · Hold it there · Breathe easy · Relax your shoulders |
| Halfway through a hold of 30 seconds or more | Halfway · Halfway there · Halfway. Keep it up |
| 10 seconds before a hold of 20 seconds or more ends | 10 seconds · 10 seconds left · Last 10 seconds |
| As each set (and each side) ends, once its last move is done and before anything else | Great job! · Fantastic! · Finished! · Well done! · Nice work! · Excellent! · Way to go! · Nailed it! |
| The end of the workout | Workout complete. Well done. · Workout complete. Great work today. · That's the workout. Well done! |

The same words are never picked twice in a row for the same moment ("Good. Breathe. Good.", not "Good. Good."). Off:
the first words of each row ("Last one", "Halfway", "10 seconds", "Workout complete. Well done."), the plain numbers,
and nothing as an exercise ends. Either way the count starts with "Ready… Begin." and "1".

### Pause at equipment changes

Off at first. When the next exercise needs other equipment (and at the title card of a workout with
equipment), the workout waits until you tap **Ready** instead of carrying on once it has said what to do (not for a
change of position alone). See
[Working out → Equipment](Working-out.md#equipment).

### Text-to-speech speed
How fast NstructR and NstructR+ speak, from **0.5×** to **3.0×** in steps of 0.1 (**1.0×** is the voice's normal speed).
Tap − or +, or hold one to keep going; you hear a short sample at the new speed.

### Full screen
Whether a workout in the browser goes full screen. The installed app is always full screen.

## Exercises

### Autoplay exercise videos
On (the default): an exercise starts moving as soon as you open it. Off: it waits until you tap Play. (If your
phone is set to reduce motion, exercises wait for Play either way.)

## Display

### Theme
**System** (follows your phone), **Light** or **Dark**.

## Create with AI

**Choose AI provider**: the AI app that [Create with AI](Create-with-AI.md) opens, listed by company and app, e.g.
**Google (Gemini)** (Gemini at first). Create with AI itself is on **Workouts** and **My exercises**.

## Import & tools

- **Install app** (only while your browser can install it, and not in the installed app): **Install** puts NstructR
  on your home screen. On an iPhone it says how (Share, then Add to Home Screen).
- **Backup**: Export everything. See [Backups](Sharing-and-backups.md#back-up-everything).
- **Import**: Choose file: restore a backup (you choose to **Merge** it with what's here or **Replace** what's here), or add workouts or exercises.
- **Export your exercises** (Advanced exercise editor): the JSON of everything in My exercises.
- **Advanced exercise editor**: shows the exercise editor on each exercise, for precise modifications: the poses, the camera and JSON views. See
  [Editing exercises](Editing-exercises.md#changing-the-poses-advanced-exercise-editor).
- **JSON format reference** (Advanced exercise editor): the file formats, for people writing exercises by hand.
