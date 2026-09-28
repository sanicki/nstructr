# Editing exercises

[← User guide](Home.md)

Tap the **pencil** at the top of an exercise page to edit it. The figure stays at the top of the screen while
you edit, and **Done** closes the editor.

<img src="images/edit-words.png" width="300" alt="Editing the words: step name and spoken cue">

## Changing the words (everyone)

- **Name, description and instructions**: the name, other name, focus, category, equipment, description,
  setup, form cues, suggested reps, note, what a rep is called, side and direction names, and source.
- **Each step**: its name and the **spoken cue** (the line read out in Voice and Coach modes). Use ‹ › to move
  between steps.
- Write steps for the first side only; the other side swaps left and right for you.

**Library exercises stay as they are.** Your first real change makes your own copy, "Name (copy)", in
**My exercises**, and you edit that. Your own exercises are edited in place. Everything saves as you go.

- **Revert this step** undoes your changes to the current step.
- **Discard all changes** goes back to how the exercise was when you started editing (and removes the copy if
  this edit made it).

## Changing the poses (Authoring mode)

Turn on **Authoring mode** in [Settings](Settings.md#authoring-mode) to also get the pose editor: the camera
(**Side** or **Front**, or any angle in between), every joint with − / + buttons (hold to repeat; steps of 1°, 5° or
15°), and the exercise's JSON.

The figure is 3D, jointed like an artist's mannequin. Hips, shoulders, the back, the head and the whole body have
three numbers each: **forward**, **side** (out to the side for an arm or leg; leaning right for the body) and
**turn**. Knees and elbows **bend**, and ankles **point** the toes. The numbers mean the same from any camera, so you
can turn the camera to check a pose from the other angle.

<img src="images/edit-poses.png" width="300" alt="The pose editor in Authoring mode">

- Each joint has an undo that appears once it differs from where you started.
- Joints marked *auto* are placed for you (feet kept flat on the floor, hands reaching a point).
- Angles are relative to the parent limb; the figure updates as you go.
- A leg that's behind the other is drawn behind it; there's nothing to set.

Authoring mode also shows JSON views elsewhere (workouts, your exercises) for people making exercises by hand.
