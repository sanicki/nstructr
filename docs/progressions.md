# Linked variations (Sep 2026)

`library/progressions.json` links library exercises two ways; the app shows them on the exercise page ("Easier",
"Harder", "Other equipment"), in the workout editor (swap an item) and in the workout player (swap to an easier or
harder version for the rest of that exercise). Create with AI's "Workout goal" prompt lists the progressions (the steps
the chosen equipment allows), so a planned workout suits the level asked for. Format and rules: HANDOFF §5.4.

- **Progressions**: easier and harder versions of one movement, easiest first. Each has a source below.
- **Equipment groups**: the same move with other equipment (from `docs/equipment-equivalents.md`, the ✅ rows).
- **notLinked**: pairs the duplicate check finds alike that aren't versions of each other, with why.

A new library exercise is placed (or said to have no place) as part of its research:
`.claude/skills/exercise-research/SKILL.md`, step 4; `node tools/research.cjs report <id>` suggests where.

## Progressions

Checked against reputable sources (Sep 2026; the owner decided where they're silent, marked ¹).

| Progression | Easiest → hardest | Source |
|---|---|---|
| Push-up | Wall Push-Up → Chair Incline Push-Up → Incline Push-Up → Knee Push-Up → Push-Up → Decline Push-Up | [NASM, push-up progressions](https://blog.nasm.org/nasm-guide-to-push-ups/push-up-progressions) (wall, incline, knees, floor, decline; the higher the surface, the lighter); [Ebben et al. 2011, body mass supported in push-up variants](https://pubmed.ncbi.nlm.nih.gov/20179649/) (a bench-height incline supports less than the knee push-up) |
| Squat | Mini-Squat with Chair → Sit-to-Stand → Squat → Jump Squat | [SilverSneakers, beginner's guide to the squat](https://www.silversneakers.com/blog/beginners-guide-squat/) (partial, chair, bodyweight); [ACE, squat jumps](https://www.acefitness.org/resources/everyone/exercise-library/116/squat-jumps/) (squat strength first) |
| Single-leg squat | Split Squat → Reverse Lunge → Walking Lunge → Bulgarian Split Squat → Pistol Squat | [SilverSneakers, split squat](https://www.silversneakers.com/blog/beginners-guide-split-squat/) (the stationary lunge as the easier lunge); [Cleveland Clinic, lunges](https://health.clevelandclinic.org/lunges-muscles-worked) (walking lunges harder than reverse); [NASM, Bulgarian split squat](https://www.nasm.org/resource-center/exercise-library/bulgarian-split-squat) (advanced); [ACE, pistol squat](https://www.acefitness.org/resources/everyone/exercise-library/308/pistol-squat/) |
| Plank | Knee Plank → Plank → Feet-Elevated Plank | [NASM, plank progressions and variations](https://www.nasm.org/resource-center/blog/training/the-plank-coaching-progressions-and-variations-for-every-client) (knees down to regress, feet raised to progress) |
| Glute bridge | Glute Bridge → Feet-Elevated Glute Bridge → Marching Glute Bridge → Single-Leg Glute Bridge ¹ | [Hinge Health, bridge exercise](https://www.hingehealth.com/resources/articles/bridge-exercise/) (a raised foot and one leg both make it harder); [ACE, single-leg progression](https://www.acefitness.org/resources/everyone/exercise-library/145/glute-bridge-single-leg-progression/). [Healthline, glute bridge variations](https://www.healthline.com/health/fitness-exercise/glute-bridge-variations) (the marching bridge: an intermediate step, one foot at a time). ¹ No source orders the feet-elevated and single-leg bridges; the owner kept this order. The marching bridge goes just before the single-leg one: each march is a moment on one leg. |
| Calf raise | Calf Raise → Step Calf Raise → Single-Leg Calf Raise | [Hinge Health, calf raises](https://www.hingehealth.com/resources/articles/calf-raises/) (double, off a step, single-leg). The Chair-Supported Calf Raise holds a chair where the Calf Raise holds a wall: other equipment, not easier. |
| Sit-up | Crunch → Sit-Up → V-Up ¹ | [Healthline, sit-ups vs crunches](https://www.healthline.com/health/fitness-exercise/sit-ups-vs-crunches) (the sit-up: more range and more muscles); [ACE, V-ups](https://www.acefitness.org/resources/everyone/exercise-library/242/v-ups/). ¹ Sources treat the sit-up as the crunch with more range rather than naming it the next step; the owner kept it. |
| Pull-up | Dead Hang → Band-Assisted Pull-Up → Chin-Up → Pull-Up | [NASM, band assisted pull-up](https://www.nasm.org/resource-center/exercise-library/band-assisted-pull-up) (a thinner band as you get stronger, then none); [NASM, chin-ups vs pull-ups](https://www.nasm.org/resource-center/blog/chin-ups-vs-pull-ups-the-difference-the-benefits-muscles-worked); [Cleveland Clinic, pull-ups](https://health.clevelandclinic.org/pull-ups) (hanging first) |
| Roll-Up | Half Roll-Back → Roll-Up with a Band → Roll-Up | [Merrithew (STOTT Pilates), Half Roll Back and Roll Up](https://www.merrithew.com/blog/post/2022-03-30/exercise-of-the-month-stott-pilates-half-roll-back-and-roll-up); [Breathe Education, the Roll Up](https://breathe-education.com/blog/pilates-teaching/helping-your-students-master-the-roll-up-pilates-exercise/) (a band to help) |
| Standing balance | Tandem Stance → Single-Leg Stand | [HSS, balance exercises](https://www.hss.edu/health-library/move-better/balance-exercises) (a narrower base: tandem, then one foot) |
| Balance walk | Heel-to-Toe Walk → Balance Walk ¹ | [NIA Go4Life, balance exercises](https://go4life.nia.nih.gov/sample_workout/3-balance-exercises-older-adults). ¹ NIA gives no order; the Balance Walk adds a pause on one leg each step, and one leg is harder than heel-to-toe (HSS). The owner kept it. |
| Handstand, Headstand, Forearm Stand | at the wall → free | [Yoga Journal, how to practice Handstand](https://www.yogajournal.com/practice/handstand-how-to/) (start at the wall); [Yoga International, move Handstand away from the wall](https://yogainternational.com/article/view/how-to-move-handstand-away-from-the-wall/); [Yoga International, 4 ways to practice Forearmstand](https://yogainternational.com/article/view/4-ways-to-forearmstand/) |
| Tree Pose, Warrior III, Downward Dog | at the wall → free | [Yoga Journal, 12 wall yoga poses](https://www.yogajournal.com/practice/yoga-wall-poses/); [YogaUOnline, Downward Dog for beginners](https://yogauonline.com/yoga-practice-teaching-tips/yoga-for-beginners/downward-facing-dog-for-beginners-5-ways-to-practice/) (the wall version first) |
| Triangle, Half Moon, Pyramid | with blocks → without | [Yoga Journal, ways to practice Half Moon](https://www.yogajournal.com/practice/ways-to-practice-half-moon-pose/); [Yoga Journal, ways to practice Pyramid](https://www.yogajournal.com/practice/5-ways-to-practice-pyramid-pose/); [DoYogaWithMe, how to use yoga blocks](https://www.doyogawithme.com/blog/how-use-blocks) |
| Seated Forward Bend; Bound Angle Forward Bend | with a strap / a block under the head → without | [Yoga Journal, Seated Forward Bend](https://www.yogajournal.com/poses/types/forward-bends/seated-forward-bend/) (a strap when you can't hold the feet); [Yoga Journal, Bound Angle Pose](https://www.yogajournal.com/poses/bound-angle-pose-2/) (a prop under the forehead) |
| Warrior I and II, Eagle, Pigeon, Cat-Cow, Mountain | on a chair → standing (or on the mat) | [Yoga Journal, chair yoga for seniors](https://www.yogajournal.com/practice/chair-yoga-for-seniors/) and [3 ways to modify Warrior I](https://www.yogajournal.com/poses/modify-warrior-i/) (the seated shape for anyone who struggles with balance or standing); [Yoga International, a chair in Warrior II](https://yogainternational.com/article/view/use-a-chair-to-get-more-out-of-warrior-ii/) |

## Not a progression (yet)

- **Side planks** (Forearm Side Plank, Side Plank Pose): sources disagree on which is harder.
- **Crow, Side Crow, Eight-Angle, Firefly**: arm balances, each its own skill, not steps of one.
- **Stretches**: no easier or harder versions, only other equipment (the equipment groups).
- The missing steps found were added (Sep 2026, `tools/variants/batch-25-links.cjs`): the Marching Glute Bridge and the
  Band-Assisted Pull-Up. A partial crunch is the library's Crunch already (it lifts only the head and shoulders): "Partial
  Crunch" and "Curl-Up" are its other names.
