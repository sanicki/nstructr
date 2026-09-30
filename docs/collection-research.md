# Common exercises per collection (Sep 2026)

For each collection: common exercises that reputable sources list for it and the library didn't have (checked
against every name and other name). **Added** (Sep 2026, `tools/variants/batch-3-yoga.cjs`, `batch-4-strength.cjs`,
`batch-5-gentle.cjs`, `batch-6-pilates.cjs`, `batch-7-door-anchor.cjs`) are marked ✅; the rest are still a proposal.

- **ready**: uses equipment the library already tracks (none, band, door anchor, dumbbell, barbell, kettlebell, chair,
  bench, wall, step, towel, mat) and the figure can do it in place
- **new equipment**: needs equipment the library doesn't track yet (proposed below)
- **engine**: needs something the figure doesn't do yet: jumping (both feet off the floor), travelling across the
  floor, or hanging from a bar

## Yoga (60)
Beginner and all-levels pose lists ([Yoga Journal, beginner poses](https://www.yogajournal.com/poses/poses-by-level/beginners-poses),
[Yoga Journal, 8 best poses for beginners](https://www.yogajournal.com/practice/beginners/yoga-poses-for-beginners/)):

| Exercise | Status |
|---|---|
| Cobra Pose (Bhujangasana), Sphinx Pose | ✅ |
| Low Lunge (Anjaneyasana), Crescent Lunge, Lizard Pose | ✅ |
| Reverse Warrior, Humble Warrior, Goddess Pose | ✅ |
| Happy Baby Pose, Garland Pose (Malasana), Puppy Pose | ✅ |
| Thread the Needle | ready (the arm threads under the body: a twist that needs more work) |
| Fish Pose (Matsyasana), Reclined Bound Angle Pose, Supine Twist | ✅ |
| Supported versions of standing poses (Triangle, Half Moon, Pyramid with hands on blocks) | ✅ with the new **yoga block** (`tools/variants/batch-12-yoga-props.cjs`) |
| Strap versions: Reclining Hand-to-Big-Toe Pose, Seated Forward Bend with a strap | ✅ with the new **yoga strap** (batch 12) |
| Cow Face arms with a strap | a later batch (hands behind the back, one up, one down) |

## Bodyweight (18)
([BarBend, 15 best bodyweight exercises](https://barbend.com/best-bodyweight-exercises/), [ACE Exercise Library](https://www.acefitness.org/resources/everyone/exercise-library/))

| Exercise | Status |
|---|---|
| Lateral Lunge, Split Squat | ✅ |
| Bulgarian Split Squat (rear foot on a bench) | ✅ batch 14 (a toe resting on a raised surface stays there) |
| Pike Push-Up | ✅ |
| Diamond Push-Up | would count as a duplicate of Push-Up (hand placement doesn't change the joint angles enough) |
| Walking Lunge | ✅ (`tools/variants/batch-10-travel.cjs`: `"travel": true`) |
| Jump Squat | ✅ (`tools/variants/batch-9-jumping.cjs`: the engine's `lift`) |
| Burpee | ✅ batch 14 |
| Pull-Up, Chin-Up | ✅ with the new **pull-up bar** (`tools/variants/batch-11-hanging.cjs`), plus Dead Hang and Hanging Knee Raise |
| Inverted Row | removed after batch 14 (owner's decision, Sep 2026) |

## Resistance band (20)
([door anchor exercises](https://www.litmethod.com/en-ca/blogs/boltcut-blog/resistance-band-door-anchor-workouts), [WorkoutLabs band exercises](https://workoutlabs.com/exercise-guide/resistance-band-bent-over-rows/))

| Exercise | Status |
|---|---|
| Band Front Raise, Band Upright Row, Band Chest Fly (band behind the back) | ready |
| Lateral Band Walk | ✅ (batch 10, travelling) |
| Monster Walk | ✅ batch 14 |
| Face Pull, Pallof Press, Band Woodchop, Standing Band Row, Standing Band Chest Press, Band Triceps Pushdown | ✅ with the new **door anchor** (`tools/variants/batch-7-door-anchor.cjs`) |

## Free weights (23)
([Breaking Muscle, best kettlebell exercises](https://breakingmuscle.com/best-kettlebell-exercises/), [StrengthLog, dumbbell exercises for beginners](https://www.strengthlog.com/dumbbell-exercises-for-beginners/))

| Exercise | Status |
|---|---|
| Front Raise, Dumbbell Chest Fly (bench), Skull Crusher (bench) | ✅ |
| Hammer Curl, Arnold Press | the figure has no forearm rotation: a Hammer Curl would be a duplicate of Dumbbell Curl |
| Shrug | the figure has no shoulder blades |
| Front Squat (barbell), Hip Thrust (bench + barbell) | ✅ |
| Renegade Row, Single-Leg Romanian Deadlift | ✅ |
| Turkish Get-Up | ready (many steps; a big one to animate) |
| Farmer's Carry | ✅ (batch 10, travelling) |
| Weighted versions with a medicine ball (Russian Twist, slams) | ✅ with the new **medicine ball** (`tools/variants/batch-13-balls-ring.cjs`) |

## Stretches (12)
([Mayo Clinic, a guide to basic stretches](https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20546848))

| Exercise | Status |
|---|---|
| Doorway Chest Stretch | ✅ (two wall edges) |
| Overhead Triceps Stretch, Figure-Four Stretch | ✅ |
| Butterfly Stretch, Lying Spinal Twist, Cobra Stretch | the same as Bound Angle Pose, Supine Twist and Cobra Pose: other names, not new exercises |
| Wrist flexor and extensor stretches | ready (the figure has no wrists: hands only; would need a hand joint) |
| Foam rolling (calves, quads, upper back) | ✅ with the new **foam roller**, plus hamstrings, glutes, IT band and lats (`tools/variants/batch-17-foam-roller.cjs`) |

## Pilates (12, now 23)
Joseph Pilates's 34 mat exercises ([Pilates Anytime](https://www.pilatesanytime.com/blog/mat/the-34-pilates-mat-exercises-)); the library had 12:

| Exercise | Status |
|---|---|
| Roll-Over, Single-Leg Kick, Double-Leg Kick, Neck Pull, Scissors, Shoulder Bridge, Spine Twist, Saw, Side Kick, Side Bend, Pilates Push-Up | ✅ (`tools/variants/batch-6-pilates.cjs`) |
| Bicycle | done lying down it would duplicate Scissors; the classical version is on the shoulders (like Roll-Over): a later batch |
| Open-Leg Rocker, Corkscrew, Jackknife, Swan Dive, Hip Twist, Seal, Crab, Rocking, Control Balance, Boomerang, Kneeling Side Kick, Leg Pull (back) | ready (advanced) |
| Magic circle versions (inner-thigh squeeze, arm presses) | ✅ with the new **Pilates ring** (batch 13) |

## Core (7)
([Hinge Health](https://www.hingehealth.com/resources/articles/how-to-engage-your-core/), [Cleveland Clinic, best core exercises](https://health.clevelandclinic.org/best-core-exercises))

| Exercise | Status |
|---|---|
| Bicycle Crunch, Russian Twist, Hollow Hold, Heel Taps, Flutter Kicks, V-Up, Sit-Up | ✅ |
| Mountain Climber | ✅ batch 14 (the hips rise a little and the knee comes in a little wide, so it clears the floor) |
| Pallof Press, Band Woodchop | ✅ (door anchor) |
| Stability-ball crunch, bridge, seated march | ✅ with the new **stability ball** (batch 13) |
| Ball pass, ball hamstring curl | ✅ batch 19 (`tools/variants/batch-19-moving-balls.cjs`): the ball is carried, or rolls under the heels |

## Chair-based (13)
([NHS sitting exercises](https://www.nhs.uk/live-well/exercise/sitting-exercises/), [BHF chair exercises](https://www.bhf.org.uk/informationsupport/heart-matters-magazine/activity/chair-based-exercises))

| Exercise | Status |
|---|---|
| Seated Chest Stretch, Seated Upper-Body Twist, Seated Arm Raises, Seated Neck Rotation | ✅ |
| Seated Knee Extension, Seated Leg Raise, Seated Punches | ready |

## Warm-up (2)
([dynamic warm-up exercises](https://www.garagegymreviews.com/best-warm-up-exercises))

| Exercise | Status |
|---|---|
| Leg Swings (holding a wall), Inchworm, Standing Torso Twists, Butt Kicks (in place) | ✅ |
| Jumping Jacks, High Knees | ✅ (batch 9, jumping) |
| Butt Kicks (running) | jumping works now; the in-place version is in the library |
| Walking Lunge | ✅ (batch 10) |

## Balance (4)
([NIA Go4Life](https://go4life.nia.nih.gov/sample_workout/3-balance-exercises-older-adults), [Mayo Clinic, balance exercises](https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/balance-exercises/art-20546836))

| Exercise | Status |
|---|---|
| Single-Leg Stand, Tandem Stance, Clock Reach (arm version; the leg version is the Star Excursion) | ✅ |
| Single-Leg Deadlift | ✅ as Single-Leg Romanian Deadlift (dumbbells), also in Balance |
| Heel-to-Toe Walk | ✅ (batch 10; Tandem Stance's feet now in line too) |
| Side Stepping, Balance Walk | travelling works now; a later batch |

## Proposed equipment

| Equipment | For | What it takes |
|---|---|---|
| **Door anchor** ✅ | band: face pull, Pallof press, woodchop, standing row and chest press, pushdown | done: "Door anchor" is an equipment kind (`src/similar.js`, `tools/research.cjs`) and a line in the prompt's EQUIPMENT; a band's fixed end is drawn as a small anchor block on the door (a wall) |
| **Yoga block** ✅ | supported standing and seated poses | done: a `block` surface, 41 high on end; a hand rests on it with `touch` |
| **Yoga strap** ✅ | reclined hamstring stretch, seated forward bend (cow-face arms later) | done: a `strap` prop drawn like the towel |
| **Pull-up bar** ✅ | pull-up, chin-up, dead hang, hanging knee raise | done: a `bar` prop, `anchorY` holds a hand at the bar |
| **Stability ball** ✅ | ball crunch, bridge, seated march, hamstring curl (rolls), ball pass (carried) (wall squat with a ball later) | done: a round surface (`ball`) |
| **Medicine ball** ✅ | Russian twist, slam, chest pass (thrown to a wall: batch 19) | done: `medball`, held in both hands |
| **Foam roller** ✅ | rolling the calves, hamstrings, quads, upper back, glutes, IT band, lats | done: a `roller` surface (a cylinder across the body); a leg or the back rests on it with a segment `touch`, and stays on it while rolling |
| **Pilates ring** ✅ | chest press, inner thigh squeeze | done: `ring` between two points, flattening as they press |

## Engine work this would need
- **Jumping** ✅ (Sep 2026): a step's `lift` raises the whole figure, anchor or not, and the checks count it as meant.
  Jump Squat, Jumping Jacks, High Knees, Burpee.
- **Travelling** ✅ (Sep 2026): `"travel": true`, each rep carries on from where the last ended; the view follows the
  figure over a floor marked every 60 px. Walking Lunge, Lateral Band Walk, Heel-to-Toe Walk, Farmer's Carry.
- **Hanging** ✅ (Sep 2026): a hand anchored at a height (`anchorY`) on a `bar` prop. Pull-Up, Chin-Up, Dead Hang, Hanging Knee Raise.

Done so far: most **ready** rows (batches 3–6), the **door anchor** (batch 7), jumping (batch 9) and travelling
(batch 10), hanging (batch 11), the yoga block and strap (batch 12), the medicine ball, Pilates ring and stability ball (batch 13), and the deferred exercises (batch 14: Bulgarian Split Squat, Monster Walk, Mountain Climber, Burpee). The foam roller followed (batch 17: rolling calves, hamstrings, quads, upper back). The Create with AI prompt lists every
exercise and isn't trimmed to fit a link (accuracy first, HANDOFF §10, "Create with AI"): past about 250 exercises,
ChatGPT, Claude and Copilot open with it copied to paste instead of filled in.

## 20-minute beginner's workouts (Sep 2026)
Library workouts built from what's here, timed at the default rests (5 s between exercises, 10 s between sets)
with Coach on (about 15–17 minutes without): **Yoga** (a mat, `beginner-yoga-20`), **Pilates** (a mat; the classical beginner opening, then beginner basics such as glute bridge,
dead bug, bird dog, clamshell and side kick, `beginner-pilates-20`), **Free weights** (dumbbells only; a new Dumbbell Floor Press for the chest,
`beginner-free-weights-20`), **Resistance band** (one band, no door anchor, `beginner-resistance-band-20`),
**Kettlebell** (one bell, `beginner-kettlebell-20`). For it, batch 16
(`tools/variants/batch-16-kettlebell.cjs`) added ✅ Halo, Single-Arm Row, Overhead Press, Goblet Reverse Lunge, Sumo
Squat, Romanian Deadlift, Suitcase Carry and Russian Twist; ✅ Around the World followed (batch 18: a step's `holds`
passes the bell from hand to hand). ✅ Clean and ✅ Turkish Get-Up followed too (batch 18; the get-up's positions fitted numerically, with quiet in-between steps).
The order the app lists them in: `library/workout-order.json`.
