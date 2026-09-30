// Sources for batch 21: each exercise's own description, in our own words.
const note = 'Described in our own words. Stick-figure approximation.';
const S = (url, title) => ({ url, title, note });
const known = {
  bbReverseLunge: S('https://www.acefitness.org/resources/everyone/exercise-library/319/reverse-lunge/', 'ACE Exercise Library: Reverse Lunge'),
  slCalf: S('https://exrx.net/WeightExercises/Gastrocnemius/DBSingleLegCalfRaise', 'ExRx: Dumbbell Single Leg Calf Raise'),
  uprightRow: S('https://www.onepeloton.com/blog/upright-rows', 'Peloton: How to do upright rows'),
  birdDog: S('https://www.healthline.com/health/bird-dog-exercise', 'Healthline: Bird dog exercise and its variations'),
  getUp: S('https://www.garagegymreviews.com/turkish-get-up', 'Garage Gym Reviews: How to do a Turkish get-up'),
  declinePushup: S('https://www.nasm.org/resource-center/exercise-library/decline-push-up', 'NASM Exercise Library: Decline Push-Up'),
  reverseFly: S('https://www.muscleandstrength.com/exercises/bent-over-dumbbell-reverse-fly.html', 'Muscle & Strength: Bent Over Dumbbell Reverse Fly'),
  bandDeadBug: S('https://au.physitrack.com/home-exercise-video/resisted-dead-bugs', 'Physitrack: Resisted dead bugs'),
  externalRotation: S('https://exrx.net/WeightExercises/Infraspinatus/DBLyingExternalRotation', 'ExRx: Dumbbell Lying Shoulder External Rotation'),
  weightedCrunch: S('https://www.muscleandstrength.com/exercises/weighted-crunch.html', 'Muscle & Strength: Weighted Crunch'),
  benchLegRaise: S('https://repfitness.com/blogs/training/ab-exercises-on-bench', 'Rep Fitness: Bench ab exercises'),
  towelCurl: S('https://gymnation.com/exercise-library/reverse-sliding-leg-curl-on-floor-with-towel', 'GymNation: Reverse Sliding Leg Curl on Floor with Towel'),
  mbVup: S('https://shiftmovementscience.com/video-quick-tip-medball-v-up-passes/', 'Shift Movement Science: Medball V-up passes'),
  woodchop: S('https://www.coachweb.com/core-exercises/212/how-to-do-the-dumbbell-woodchop', 'Coach: How to do the dumbbell woodchop'),
  mbWoodchop: S('https://www.acefitness.org/resources/everyone/exercise-library/108/standing-wood-chop/', 'ACE Exercise Library: Standing Wood Chop'),
  dbSwing: S('https://spotebi.com/exercise-guide/dumbbell-swing/', 'Spotebi: Dumbbell Swing'),
  dbDeadlift: S('https://www.muscleandstrength.com/exercises/dumbbell-deadlift.html', 'Muscle & Strength: Dumbbell Deadlift'),
  dbClean: S('https://www.builtlean.com/single-arm-dumbbell-clean/', 'BuiltLean: Single-arm dumbbell clean'),
  dbBridge: S('https://www.puregym.com/exercises/glutes/glute-bridge/dumbbell-glute-bridges/', 'PureGym: How to do dumbbell glute bridges'),
  hipThrust: S('https://www.muscleandstrength.com/exercises/bodyweight-hip-thrust', 'Muscle & Strength: Bodyweight Hip Thrust'),
  benchStepUp: S('https://www.acefitness.org/resources/everyone/exercise-library/28/step-up/', 'ACE Exercise Library: Step-Up'),
  stepCalf: S('https://us.physitrack.com/home-exercise-video/calf-raise-on-step', 'Physitrack: Calf raise on a step'),
  feetUpPlank: S('https://www.muscleandstrength.com/exercises/plank-with-feet-on-bench.html', 'Muscle & Strength: Feet Elevated Plank'),
  kneelingPallof: S('https://fitbod.me/exercises/full-kneeling-pallof-press', 'Fitbod: Full Kneeling Pallof Press'),
  mbAtw: S('https://us.physitrack.com/home-exercise-video/around-the-world', 'Physitrack: Medicine ball around the world'),
  wallSit: S('https://www.trainwell.net/exercises/weighted-wall-sit', 'Trainwell: Weighted Wall Sit'),
  deadBug: S('https://www.strengthlog.com/dead-bugs-with-dumbbells/', 'StrengthLog: Dead bugs with dumbbells'),
  dbSitStand: S('https://sweat.com/exercises/goblet-sit-squat', 'Sweat: Goblet Sit Squat (chair)'),
};
module.exports = new Proxy(known, { get: (o, k) => { if (!o[k]) throw new Error('no source for ' + String(k)); return o[k]; } });
