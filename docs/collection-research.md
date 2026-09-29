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
| Supported versions of standing poses (Triangle, Half Moon, Pyramid with hands on blocks) | new equipment: **yoga block** |
| Strap versions (Reclined Hand-to-Big-Toe Pose with a strap, Cow Face arms) | new equipment: **yoga strap** (drawn like the towel) |

## Bodyweight (18)
([BarBend, 15 best bodyweight exercises](https://barbend.com/best-bodyweight-exercises/), [ACE Exercise Library](https://www.acefitness.org/resources/everyone/exercise-library/))

| Exercise | Status |
|---|---|
| Lateral Lunge, Split Squat | ✅ |
| Bulgarian Split Squat (rear foot on a bench) | engine: resting the top of the foot on a raised surface |
| Pike Push-Up | ✅ |
| Diamond Push-Up | would count as a duplicate of Push-Up (hand placement doesn't change the joint angles enough) |
| Walking Lunge | ✅ (`tools/variants/batch-10-travel.cjs`: `"travel": true`) |
| Jump Squat | ✅ (`tools/variants/batch-9-jumping.cjs`: the engine's `lift`) |
| Burpee | jumping works now; a later batch (squat → plank → squat → jump: many contacts) |
| Pull-Up, Chin-Up | new equipment: **pull-up bar**; engine: hanging |
| Inverted Row | new equipment: **pull-up bar** (low) or a sturdy table |

## Resistance band (20)
([door anchor exercises](https://www.litmethod.com/en-ca/blogs/boltcut-blog/resistance-band-door-anchor-workouts), [WorkoutLabs band exercises](https://workoutlabs.com/exercise-guide/resistance-band-bent-over-rows/))

| Exercise | Status |
|---|---|
| Band Front Raise, Band Upright Row, Band Chest Fly (band behind the back) | ready |
| Lateral Band Walk | ✅ (batch 10, travelling) |
| Monster Walk | travelling works now; a later batch |
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
| Weighted versions with a medicine ball (Russian Twist, slams) | new equipment: **medicine ball** (drawn like the kettlebell) |

## Stretches (12)
([Mayo Clinic, a guide to basic stretches](https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20546848))

| Exercise | Status |
|---|---|
| Doorway Chest Stretch | ✅ (two wall edges) |
| Overhead Triceps Stretch, Figure-Four Stretch | ✅ |
| Butterfly Stretch, Lying Spinal Twist, Cobra Stretch | the same as Bound Angle Pose, Supine Twist and Cobra Pose: other names, not new exercises |
| Wrist flexor and extensor stretches | ready (the figure has no wrists: hands only; would need a hand joint) |
| Foam rolling (calves, quads, upper back) | new equipment: **foam roller** |

## Pilates (12, now 23)
Joseph Pilates's 34 mat exercises ([Pilates Anytime](https://www.pilatesanytime.com/blog/mat/the-34-pilates-mat-exercises-)); the library had 12:

| Exercise | Status |
|---|---|
| Roll-Over, Single-Leg Kick, Double-Leg Kick, Neck Pull, Scissors, Shoulder Bridge, Spine Twist, Saw, Side Kick, Side Bend, Pilates Push-Up | ✅ (`tools/variants/batch-6-pilates.cjs`) |
| Bicycle | done lying down it would duplicate Scissors; the classical version is on the shoulders (like Roll-Over): a later batch |
| Open-Leg Rocker, Corkscrew, Jackknife, Swan Dive, Hip Twist, Seal, Crab, Rocking, Control Balance, Boomerang, Kneeling Side Kick, Leg Pull (back) | ready (advanced) |
| Magic circle versions (inner-thigh squeeze, arm presses) | new equipment: **Pilates ring** |

## Core (7)
([Hinge Health](https://www.hingehealth.com/resources/articles/how-to-engage-your-core/), [Cleveland Clinic, best core exercises](https://health.clevelandclinic.org/best-core-exercises))

| Exercise | Status |
|---|---|
| Bicycle Crunch, Russian Twist, Hollow Hold, Heel Taps, Flutter Kicks, V-Up, Sit-Up | ✅ |
| Mountain Climber | engine: the fast leg swap (the driving knee passes the floor at plank height) |
| Pallof Press, Band Woodchop | ✅ (door anchor) |
| Stability-ball crunch, ball pass | new equipment: **stability ball** |

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
| **Yoga block** | supported standing and seated poses | a small box prop the hand rests on (like a step, hand-sized) |
| **Yoga strap** | reclined hamstring stretch, cow-face arms | drawn like the towel |
| **Pull-up bar** | pull-up, chin-up, inverted row, hanging knee raise | a bar prop overhead, and the engine holding the figure up by the hands (feet off the floor) |
| **Stability ball** | ball crunch, wall squat with a ball, hamstring curl | a round surface to lie or sit on |
| **Medicine ball** | Russian twist, slams, chest pass | drawn like the kettlebell (a ball) |
| **Foam roller** | rolling the calves, quads, upper back | a cylinder surface under the body |
| **Pilates ring** | ring presses and squeezes | a ring between the hands or knees |

## Engine work this would need
- **Jumping** ✅ (Sep 2026): a step's `lift` raises the whole figure, anchor or not, and the checks count it as meant.
  Jump Squat, Jumping Jacks, High Knees; Burpee next.
- **Travelling** ✅ (Sep 2026): `"travel": true`, each rep carries on from where the last ended; the view follows the
  figure over a floor marked every 60 px. Walking Lunge, Lateral Band Walk, Heel-to-Toe Walk, Farmer's Carry.
- **Hanging** from a bar: pull-ups, chin-ups.

Done so far: most **ready** rows (batches 3–6), the **door anchor** (batch 7), jumping (batch 9) and travelling
(batch 10). Next: hanging, then yoga block and strap and the other equipment. The Create with AI prompt lists every
exercise and isn't trimmed to fit a link (accuracy first, HANDOFF §10, "Create with AI"): past about 250 exercises,
ChatGPT, Claude and Copilot open with it copied to paste instead of filled in.
