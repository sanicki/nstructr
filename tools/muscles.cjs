/* Muscle ratings for the library (HANDOFF §13, docs/muscles.md): which of the 11 groups each exercise works, 0–3, and
   which it stretches. The research record behind the "muscles" and "stretches" fields of library/exercises/*.json.
     node tools/muscles.cjs            write the fields into every library exercise and docs/muscles.md
     node tools/muscles.cjs check      only report exercises with no rating here, or ratings that differ from the files
   A new library exercise: add it to EX below (a movement pattern, plus changes), run this, then look at its page.
   Ratings follow ExRx's classification: 3 target (what it's for), 2 synergist (helps move the load), 1 stabilizer
   (dynamic, antagonist or plain: holds you steady), 0 not worked; a group takes its highest-rated muscle. Stretches:
   the groups a pose or stretch lengthens (the rolled group, for a foam roller). */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), DIR = path.join(ROOT, 'library/exercises');
const { formatJson } = require('./format-json.cjs');

/* short names used below -> the groups (the order the app lists them in) */
const G = { sh: 'shoulders', ch: 'chest', ub: 'upperBack', lb: 'lowerBack', bi: 'biceps', tr: 'triceps', co: 'core',
  ft: 'frontThigh', gl: 'glutes', bt: 'backThigh', ll: 'lowerLegs' };
const X = 'https://exrx.net/WeightExercises/';
/* sources: ExRx pages for strength moves (target / synergists / stabilizers); "own" = rated from the exercise's own
   source (its description of what the move works) and the joints it moves, where ExRx has no page */
const SRC = {
  squat: [X + 'Quadriceps/BWSquat', 'ExRx: Squat'],
  lunge: [X + 'Quadriceps/BWLunge', 'ExRx: Lunge'],
  stepUp: [X + 'Quadriceps/DBStepUp', 'ExRx: Dumbbell Step-up'],
  pistol: [X + 'Quadriceps/BWSingleLegSquat', 'ExRx: Single Leg Squat'],
  deadlift: [X + 'ErectorSpinae/BBDeadlift', 'ExRx: Barbell Deadlift'],
  rdl: [X + 'Hamstrings/BBStraightLegDeadlift', 'ExRx: Barbell Straight Leg Deadlift'],
  goodMorning: [X + 'Hamstrings/BBGoodMorning', 'ExRx: Barbell Good-morning'],
  hipThrust: [X + 'GluteusMaximus/BBHipThrust', 'ExRx: Barbell Hip Thrust'],
  bridge: [X + 'GluteusMaximus/BWLyingHipExtension', 'ExRx: Lying Hip Extension (single-leg bridge)'],
  abduction: [X + 'HipAbductor/DBLyingHipAbduction', 'ExRx: Lying Hip Abduction'],
  calf: [X + 'Gastrocnemius/BWStandingCalfRaise', 'ExRx: Standing Calf Raise'],
  swing: [X + 'Kettlebell/KBTwoArmSwing', 'ExRx: Kettlebell Two Arm Swing'],
  pushup: [X + 'PectoralSternal/BWPushup', 'ExRx: Push-up'],
  bench: [X + 'PectoralSternal/DBBenchPress', 'ExRx: Dumbbell Bench Press'],
  fly: [X + 'PectoralSternal/DBFly', 'ExRx: Dumbbell Fly'],
  dip: [X + 'Triceps/BWBenchDipFloor', 'ExRx: Bench Dip'],
  triExt: [X + 'Triceps/DBTriExt', 'ExRx: Dumbbell Triceps Extension'],
  kickback: [X + 'Triceps/DBKickback', 'ExRx: Dumbbell Kickback'],
  curl: [X + 'Biceps/DBCurl', 'ExRx: Dumbbell Curl'],
  press: [X + 'DeltoidAnterior/DBShoulderPress', 'ExRx: Dumbbell Shoulder Press'],
  lateral: [X + 'DeltoidLateral/DBLateralRaise', 'ExRx: Dumbbell Lateral Raise'],
  front: [X + 'Supraspinatus/DBFrontLateralRaise', 'ExRx: Dumbbell Front Raise'],
  upright: [X + 'DeltoidLateral/DBUprightRow', 'ExRx: Dumbbell Upright Row'],
  rearFly: [X + 'DeltoidPosterior/CBRearDeltRow', 'ExRx: Cable Rear Delt Row (and the reverse flies beside it)'],
  row: [X + 'BackGeneral/DBBentOverRow', 'ExRx: Dumbbell Bent-over Row'],
  pullUp: [X + 'LatissimusDorsi/BWPullup', 'ExRx: Pull-up'],
  pulldown: [X + 'LatissimusDorsi/CBFrontPulldown', 'ExRx: Cable Pulldown'],
  crunch: [X + 'RectusAbdominis/BWCrunch', 'ExRx: Crunch'],
  sitUp: [X + 'RectusAbdominis/BWSitUp', 'ExRx: Sit-up'],
  vUp: [X + 'RectusAbdominis/WtVUp', 'ExRx: V-up'],
  legRaise: [X + 'HipFlexors/BWLyingLegRaiseFloor', 'ExRx: Lying Leg Raise'],
  plank: [X + 'RectusAbdominis/BWFrontPlank', 'ExRx: Front Plank'],
  sidePlank: [X + 'Obliques/BWSidePlank', 'ExRx: Side Plank'],
  twist: [X + 'Obliques/WTRussianTwistBall', 'ExRx: Weighted Russian Twist'],
  superman: [X + 'ErectorSpinae/Superman', 'ExRx: Superman'],
  own: null,
};

/* movement patterns: m = ratings ("ft3 gl2" = frontThigh 3, glutes 2), s = stretched groups, src = a key of SRC */
const P = {
  // legs and hips
  squat: { m: 'ft3 gl2 ll2 bt1 lb1 co1', src: 'squat' },
  frontSquat: { m: 'ft3 gl2 ll2 bt1 lb1 co2 ub1', src: 'squat' },
  sumoSquat: { m: 'ft3 gl2 ll1 bt1 lb1 co1', s: '', src: 'own' },
  jumpSquat: { m: 'ft3 gl2 ll3 bt1 co1', src: 'own' },
  lunge: { m: 'ft3 gl2 ll2 bt1 lb1 co1', src: 'lunge' },
  pistol: { m: 'ft3 gl2 ll2 bt1 lb1 co2', src: 'pistol' },
  stepUp: { m: 'ft3 gl2 ll2 bt1 lb1 co1', src: 'stepUp' },
  lateralLunge: { m: 'ft3 gl2 ll1 bt1 co1', s: '', src: 'own' },
  wallSit: { m: 'ft3 gl2 ll1 co1', src: 'own' },
  legPress: { m: 'ft3 gl2 bt1 ll1 co1', src: 'own' },
  deadlift: { m: 'gl3 ft2 bt2 ll2 lb1 ub1 co1', src: 'deadlift' },
  rdl: { m: 'gl3 bt2 lb2 ft1 ub1 co1', src: 'rdl' },
  singleRdl: { m: 'gl3 bt2 lb2 ll2 ft1 ub1 co2', src: 'rdl' },
  goodMorning: { m: 'bt3 gl2 lb1 ft1 co1', src: 'goodMorning' },
  hipThrust: { m: 'gl3 ft2 bt1 lb1 co1', src: 'hipThrust' },
  bridge: { m: 'gl3 bt2 lb1 co1', src: 'bridge' },
  singleBridge: { m: 'gl3 bt2 lb1 co2 ft1', src: 'bridge' },
  hamCurl: { m: 'bt3 gl2 lb1 co1 ll1', src: 'own' },
  hipExtension: { m: 'gl3 bt2 lb1 co1', src: 'own' },
  abduction: { m: 'gl3 co1', src: 'abduction' },
  bandWalk: { m: 'gl3 ft2 ll1 co1', src: 'own' },
  adduction: { m: 'ft3 co1', src: 'own' },
  calf: { m: 'll3', src: 'calf' },
  singleCalf: { m: 'll3 gl1 co1', src: 'calf' },
  squatCalf: { m: 'ft3 ll3 gl2 bt1 co1', src: 'squat' },
  tibialis: { m: 'll3', src: 'own' },
  kneeExt: { m: 'ft3', src: 'own' },
  hipFlex: { m: 'ft3 co1', src: 'own' },
  // pushing
  pushup: { m: 'ch3 sh2 tr2 bi1 co1 ft1 lb1', src: 'pushup' },
  declinePushup: { m: 'ch3 sh3 tr2 bi1 co1 ft1 lb1', src: 'pushup' },
  pikePushup: { m: 'sh3 tr2 ch1 ub1 co1', s: 'bt', src: 'own' },
  bench: { m: 'ch3 sh2 tr2 bi1', src: 'bench' },
  standPress: { m: 'ch3 sh2 tr2 bi1 co1', src: 'bench' },
  fly: { m: 'ch3 sh2 bi1 tr1', src: 'fly' },
  dip: { m: 'tr3 sh2 ch2 ub1', src: 'dip' },
  triExt: { m: 'tr3 sh1 co1', src: 'triExt' },
  kickback: { m: 'tr3 sh1 ub1', src: 'kickback' },
  press: { m: 'sh3 tr2 ub2 ch2 bi1 co1', src: 'press' },
  lateral: { m: 'sh3 ub2', src: 'lateral' },
  front: { m: 'sh3 ub2 ch2', src: 'front' },
  upright: { m: 'sh3 ub2 bi2 ch2', src: 'upright' },
  chestPass: { m: 'ch3 sh2 tr2 co1', src: 'bench' },
  punches: { m: 'sh3 tr2 ch2 co1', src: 'own' },
  // pulling
  row: { m: 'ub3 sh2 bi2 ch2 tr1 lb1 co1', src: 'row' },
  seatedRow: { m: 'ub3 sh2 bi2 tr1 lb1 co1', src: 'row' },
  renegade: { m: 'ub3 sh2 bi2 ch2 co2 tr1 gl1', src: 'row' },
  pullUp: { m: 'ub3 bi2 sh2 ch2 tr1 co1', src: 'pullUp' },
  pulldown: { m: 'ub3 bi2 sh2 ch1', src: 'pulldown' },
  rearFly: { m: 'sh3 ub2', src: 'rearFly' },
  facePull: { m: 'sh3 ub2 bi1', src: 'rearFly' },
  extRot: { m: 'sh3 ub1', src: 'own' },
  curl: { m: 'bi3 sh1 ub1', src: 'curl' },
  deadHang: { m: 'bi3 ub1 sh1 co1', s: 'ub sh', src: 'own' },
  farmer: { m: 'bi3 ub3 co2 sh1 gl1 ft1 ll1', src: 'own' },
  suitcase: { m: 'co3 bi3 ub2 sh1 gl1 ft1 ll1', src: 'own' },
  // core
  crunch: { m: 'co3', src: 'crunch' },
  sitUp: { m: 'co3 ft2 ll1', src: 'sitUp' },
  vUp: { m: 'co3 ft2', src: 'vUp' },
  legRaise: { m: 'ft3 co2', src: 'legRaise' },
  hangingRaise: { m: 'ft3 co2 bi2 ub1 sh1', src: 'legRaise' },
  plank: { m: 'co3 sh1 gl1 ft1', src: 'plank' },
  sidePlank: { m: 'co3 gl1 lb1 ft1 ub1 ch1', src: 'sidePlank' },
  deadBug: { m: 'co3 ft1', src: 'own' },
  birdDog: { m: 'co3 lb3 gl2 sh1', src: 'own' },
  hollow: { m: 'co3 ft2', src: 'own' },
  twist: { m: 'co3 ft1', src: 'twist' },
  weightedTwist: { m: 'co3 ft1 sh1', src: 'twist' },
  bicycle: { m: 'co3 ft2', src: 'own' },
  heelTaps: { m: 'co3', src: 'own' },
  woodchop: { m: 'co3 sh2 gl1 ft1 lb1', src: 'twist' },
  pallof: { m: 'co3 sh1 ch1 gl1', src: 'own' },
  superman: { m: 'lb3 gl2 bt2 sh1 ub1', src: 'superman' },
  ballPass: { m: 'co3 ft2 sh1', src: 'vUp' },
  // whole body and power
  swing: { m: 'gl3 bt2 lb2 ft2 sh2 ub2 ll1 co1', src: 'swing' },
  clean: { m: 'gl3 bt2 ft2 lb2 ub2 sh2 ll2 bi1 co1', src: 'deadlift' },
  getUp: { m: 'sh3 co3 gl2 ft2 tr2 ub1 lb1', src: 'own' },
  bwGetUp: { m: 'co3 gl2 ft2 sh1 tr1', src: 'own' },
  slam: { m: 'co3 ub3 sh2 tr2 gl1 ft1', src: 'own' },
  aroundWorld: { m: 'co3 sh2 bi2 ub1', src: 'own' },
  halo: { m: 'sh3 ub2 co2 tr1', src: 'own' },
  burpee: { m: 'ft3 gl2 ll2 ch2 sh2 tr2 co2', src: 'own' },
  mountain: { m: 'co3 ft2 sh2 ch1 tr1', src: 'own' },
  jacks: { m: 'll3 sh2 gl2 ft2 co1', src: 'own' },
  highKnees: { m: 'ft3 ll2 co2 gl1', src: 'own' },
  buttKicks: { m: 'bt3 ll2 ft1 co1', src: 'own' },
  march: { m: 'ft3 gl1 ll1 co1', src: 'own' },
  // balance
  balance: { m: 'll2 gl2 co1', src: 'own' },
  walkBalance: { m: 'll2 gl1 ft1 co1', src: 'own' },
  reach: { m: 'ft2 gl2 ll2 bt1 co1', src: 'own' },
  clockReach: { m: 'gl2 ll2 co2 ft1', src: 'own' },
  sideStep: { m: 'gl2 ft1 ll1', src: 'own' },
  seatedMarch: { m: 'co2 ft3 gl1', src: 'own' },
  // mobility and stretches
  none: { m: '', src: 'own' },
  armCircles: { m: 'sh2 ub1', src: 'own' },
  hipCircles: { m: 'gl1 ft1 co1', src: 'own' },
  legSwings: { m: 'ft1 bt1 gl1', s: 'ft bt', src: 'own' },
  inchworm: { m: 'sh2 co2 ch1 tr1', s: 'bt ll', src: 'own' },
  stretch: { m: '', src: 'own' },
  roll: { m: 'sh1 tr1 co1', src: 'own' },
};

/* each library exercise: [pattern, changes]; changes: "gl3 co0" sets ratings, s: stretched groups (replaces the
   pattern's) */
const EX = {
  // balance
  'bal-balance-walk': ['walkBalance'], 'bal-heel-to-toe-walk': ['walkBalance'], 'bal-tandem-stance': ['balance', 'gl1'],
  'bal-clock-reach': ['clockReach'], 'bal-side-stepping': ['sideStep'], 'bal-single-leg-stand': ['balance'],
  'star-excursion-4-point': ['reach'], 'star-excursion-balance': ['reach'], 'ball-seated-march': ['seatedMarch'],
  'standing-march': ['march'],
  // stability ball
  'ball-bridge': ['bridge', 'co2 bt2'], 'ball-crunch': ['crunch'], 'ball-hamstring-curl': ['hamCurl', 'co2'],
  'ball-pass': ['ballPass'],
  // bands
  'band-bent-over-row': ['row'], 'band-bird-dog': ['birdDog'], 'band-chest-fly': ['fly'], 'band-clamshell': ['abduction'],
  'band-dead-bug': ['deadBug', 'sh1'], 'band-face-pull': ['facePull'], 'band-front-raise': ['front'],
  'band-glute-bridge': ['bridge'], 'band-hundred': ['vUp', 'sh1'], 'band-kneeling-pallof-press': ['pallof'],
  'band-lateral-walk': ['bandWalk'], 'band-leg-circles': ['hipFlex', 'co2 gl1', { s: 'bt' }], 'band-monster-walk': ['bandWalk'],
  'band-overhead-press': ['press'], 'band-overhead-triceps': ['triExt'], 'band-pallof-press': ['pallof'],
  'band-rdl': ['rdl'], 'band-roll-up': ['vUp', { s: 'lb bt' }], 'band-seated-row': ['seatedRow'],
  'band-standing-chest-press': ['standPress'], 'band-standing-kickback': ['hipExtension'], 'band-standing-row': ['seatedRow'],
  'band-triceps-kickback': ['kickback'], 'band-triceps-pushdown': ['kickback'], 'band-upright-row': ['upright'],
  'band-wall-sit-pull-apart': ['wallSit', 'sh3 ub2'], 'band-woodchop': ['woodchop'],
  'bhf-abduction': ['abduction'], 'bhf-bicep-curl': ['curl'], 'bhf-chest-press': ['bench'], 'bhf-dumb-waiter': ['extRot'],
  'bhf-lat-pull-down': ['pulldown'], 'bhf-lateral-raise': ['lateral'], 'bhf-leg-press': ['legPress'],
  'bhf-pull-apart': ['rearFly'], 'bhf-squat': ['squat'], 'bhf-triceps-extension': ['triExt'],
  // pull-up bar
  'bar-band-assisted-pull-up': ['pullUp'], 'bar-chin-up': ['pullUp'], 'bar-pull-up': ['pullUp'],
  'bar-dead-hang': ['deadHang'], 'bar-hanging-knee-raise': ['hangingRaise'],
  // bench
  'bench-bulgarian-split-squat': ['lunge', { s: 'ft' }], 'bench-decline-pushup': ['declinePushup'], 'bench-dip': ['dip'],
  'bench-feet-up-plank': ['plank', 'sh2'], 'bench-hip-thrust': ['hipThrust'], 'bench-incline-pushup': ['pushup'],
  'bench-leg-raise': ['legRaise'], 'bench-step-up': ['stepUp'],
  // bodyweight
  'bw-burpee': ['burpee'], 'bw-get-up': ['bwGetUp'], 'bw-glute-bridge': ['bridge'], 'bw-good-morning': ['goodMorning'],
  'bw-jump-squat': ['jumpSquat'], 'bw-jumping-jacks': ['jacks'], 'bw-knee-pushup': ['pushup'],
  'bw-lateral-lunge': ['lateralLunge', { s: 'ft' }], 'bw-leg-extension': ['hipExtension'],
  'bw-marching-glute-bridge': ['singleBridge'], 'bw-mountain-climber': ['mountain'], 'bw-pike-pushup': ['pikePushup'],
  'bw-pistol-squat': ['pistol'], 'bw-pushup': ['pushup'], 'bw-reverse-lunge': ['lunge'], 'bw-side-leg-lift': ['abduction'],
  'bw-single-leg-glute-bridge': ['singleBridge'], 'bw-split-squat': ['lunge'], 'bw-squat-calf-raise': ['squatCalf'],
  'bw-squat': ['squat'], 'bw-walking-lunge': ['lunge'], 'bw-wall-pushup': ['pushup'], 'bw-wall-sit': ['wallSit'],
  'calf-raise-single': ['singleCalf'], 'calf-raise': ['calf'], 'chair-calf-raise': ['calf'],
  'step-calf-raise': ['calf', { s: 'll' }], 'wall-tibialis-raise': ['tibialis'], 'step-up': ['stepUp'],
  'side-clamshell': ['abduction'],
  // chair
  'chair-ankle-stretch': ['stretch', 'll1', { s: 'll' }], 'chair-arm-raises': ['armCircles'],
  'chair-chest-stretch': ['stretch', { s: 'ch sh' }], 'chair-dip': ['dip'], 'chair-hamstring-stretch': ['stretch', { s: 'bt' }],
  'chair-heel-bridge': ['bridge', 'bt3'], 'chair-hip-circles': ['hipCircles'], 'chair-hip-flexor-stretch': ['stretch', { s: 'ft' }],
  'chair-hip-marching': ['hipFlex'], 'chair-incline-pushup': ['pushup'], 'chair-knee-extension': ['kneeExt'],
  'chair-leg-raise': ['hipFlex'], 'chair-mini-squat': ['squat'], 'chair-neck-rotation': ['stretch', { s: 'ub' }],
  'chair-punches': ['punches'], 'chair-quad-stretch': ['stretch', 'gl1 ll1', { s: 'ft' }], 'chair-sit-to-stand': ['squat'],
  'chair-upper-body-twist': ['stretch', { s: 'co lb' }], 'chair-yoga-cat-cow': ['stretch', { s: 'lb co' }],
  'chair-yoga-eagle': ['stretch', { s: 'ub sh gl' }], 'chair-yoga-forward-bend': ['stretch', { s: 'lb bt' }],
  'chair-yoga-mountain': ['stretch', 'co1 lb1'], 'chair-yoga-pigeon': ['stretch', { s: 'gl' }],
  'chair-yoga-side-bend': ['stretch', { s: 'co' }], 'chair-yoga-twist': ['stretch', { s: 'co lb' }],
  'chair-yoga-warrior-1': ['stretch', 'ft2 gl1 sh1', { s: 'ft' }], 'chair-yoga-warrior-2': ['stretch', 'ft2 gl1 sh2', { s: 'ft' }],
  // core
  'core-bicycle-crunch': ['bicycle'], 'core-bird-dog': ['birdDog'], 'core-crunch': ['crunch'], 'core-dead-bug': ['deadBug'],
  'core-flutter-kicks': ['legRaise'], 'core-forearm-plank': ['plank'], 'core-heel-taps': ['heelTaps'],
  'core-hollow-hold': ['hollow'], 'core-knee-plank': ['plank'], 'core-leg-raise': ['legRaise'],
  'core-russian-twist': ['twist'], 'core-side-plank': ['sidePlank'], 'core-sit-up': ['sitUp'],
  'core-superman': ['superman'], 'core-v-up': ['vUp'],
  // free weights
  'fw-bb-bench-press': ['bench'], 'fw-bb-curl': ['curl'], 'fw-bb-deadlift': ['deadlift'], 'fw-bb-front-squat': ['frontSquat'],
  'fw-bb-hip-thrust': ['hipThrust'], 'fw-bb-press': ['press'], 'fw-bb-rdl': ['rdl'], 'fw-bb-reverse-lunge': ['lunge'],
  'fw-bb-row': ['row'], 'fw-bb-squat': ['squat'], 'fw-bb-upright-row': ['upright'],
  'fw-db-bench-press': ['bench'], 'fw-db-calf-raise-single': ['singleCalf'], 'fw-db-calf-raise': ['calf'],
  'fw-db-chest-fly': ['fly'], 'fw-db-clean': ['clean'], 'fw-db-curl': ['curl'], 'fw-db-dead-bug': ['deadBug', 'sh1'],
  'fw-db-deadlift': ['deadlift'], 'fw-db-external-rotation': ['extRot'], 'fw-db-floor-press': ['bench'],
  'fw-db-front-raise': ['front'], 'fw-db-glute-bridge': ['bridge'], 'fw-db-kickback': ['kickback'],
  'fw-db-lateral': ['lateral'], 'fw-db-overhead-triceps': ['triExt'], 'fw-db-press': ['press'], 'fw-db-rdl': ['rdl'],
  'fw-db-renegade-row': ['renegade'], 'fw-db-reverse-fly': ['rearFly'], 'fw-db-reverse-lunge': ['lunge'],
  'fw-db-row': ['row'], 'fw-db-single-leg-rdl': ['singleRdl'], 'fw-db-sit-to-stand': ['squat'],
  'fw-db-skull-crusher': ['triExt'], 'fw-db-squat': ['squat'], 'fw-db-step-up': ['stepUp'], 'fw-db-swing': ['swing'],
  'fw-db-turkish-get-up': ['getUp'], 'fw-db-upright-row': ['upright'], 'fw-db-wall-sit': ['wallSit'],
  'fw-db-weighted-crunch': ['crunch'], 'fw-db-woodchop': ['woodchop'], 'fw-farmers-carry': ['farmer'],
  'fw-goblet-squat': ['squat'], 'fw-kb-deadlift': ['deadlift'], 'fw-kb-goblet-squat': ['squat'], 'fw-kb-swing': ['swing'],
  'kb-around-the-world': ['aroundWorld'], 'kb-clean': ['clean'], 'kb-goblet-reverse-lunge': ['lunge'], 'kb-halo': ['halo'],
  'kb-overhead-press': ['press'], 'kb-romanian-deadlift': ['rdl'], 'kb-russian-twist': ['weightedTwist'],
  'kb-single-arm-row': ['row'], 'kb-suitcase-carry': ['suitcase'], 'kb-sumo-squat': ['sumoSquat'],
  'kb-turkish-get-up': ['getUp'],
  // stretches (Mayo Clinic and others)
  'mayo-calf': ['stretch', { s: 'll' }], 'mayo-hamstring': ['stretch', { s: 'bt' }], 'mayo-hip-flexor': ['stretch', { s: 'ft' }],
  'mayo-it-band': ['stretch', { s: 'gl' }], 'mayo-knee-to-chest': ['stretch', { s: 'lb gl' }], 'mayo-neck': ['stretch', { s: 'ub' }],
  'mayo-quadriceps': ['stretch', { s: 'ft' }], 'mayo-shoulder-towel': ['stretch', { s: 'sh tr' }],
  'mayo-shoulder': ['stretch', { s: 'sh ub' }], 'seated-hamstring-stretch': ['stretch', { s: 'bt ll' }],
  'step-calf-stretch': ['stretch', { s: 'll' }], 'str-doorway-chest-stretch': ['stretch', { s: 'ch sh' }],
  'str-figure-four': ['stretch', { s: 'gl' }], 'str-triceps-stretch': ['stretch', { s: 'tr sh' }],
  'str-biceps-stretch': ['stretch', { s: 'bi ch sh' }], 'str-wrist-flexor-stretch': ['stretch', { s: 'bi' }],
  'towel-calf-stretch': ['stretch', { s: 'll' }], 'towel-chest-stretch': ['stretch', { s: 'ch sh' }],
  'towel-hamstring-curl': ['hamCurl'], 'towel-hamstring-stretch': ['stretch', { s: 'bt' }],
  'towel-quad-stretch': ['stretch', { s: 'ft' }], 'wall-chest-stretch': ['stretch', { s: 'ch sh' }],
  'wall-downward-dog': ['stretch', 'sh1', { s: 'ub sh bt ll' }],
  // medicine ball
  'mb-around-the-world': ['aroundWorld'], 'mb-chest-pass': ['chestPass'], 'mb-russian-twist': ['weightedTwist'],
  'mb-slam': ['slam'], 'mb-v-up-pass': ['ballPass'], 'mb-woodchop': ['woodchop'],
  // Pilates
  'pil-bicycle': ['bicycle', 'gl1 lb1', { s: 'ft bt' }], 'pil-boomerang': ['vUp', 'tr1 lb1', { s: 'bt lb ub' }],
  'pil-control-balance': ['vUp', 'ft1 gl2 bt1 ub1 lb1', { s: 'bt lb' }], 'pil-corkscrew': ['vUp', 'ft1'],
  'pil-crab': ['stretch', 'co2', { s: 'lb' }], 'pil-double-leg-kick': ['superman', 'lb3 bt2 gl2 ub2 sh1', { s: 'ch sh' }],
  'pil-double-leg-stretch': ['vUp'], 'pil-half-roll-back': ['vUp', 'ft1', { s: 'lb' }], 'pil-hip-twist': ['vUp', 'tr1 sh1'],
  'pil-hundred': ['vUp', 'sh1'], 'pil-jackknife': ['vUp', 'ft1 tr1 lb1', { s: 'lb ub' }],
  'pil-kneeling-side-kick': ['abduction', 'co2 sh1 ft1'], 'pil-leg-circles': ['hipFlex', 'co2 gl1', { s: 'bt' }],
  'pil-leg-pull-back': ['hipExtension', 'gl2 bt2 tr2 sh2 co2 lb1', { s: 'ch sh' }],
  'pil-leg-pull-front': ['plank', 'sh2 gl2 tr1 bt1'], 'pil-neck-pull': ['vUp', 'ft1', { s: 'bt lb' }],
  'pil-open-leg-rocker': ['vUp', 'ft1', { s: 'bt lb' }], 'pil-push-up': ['pushup', 'tr2 co2', { s: 'bt' }],
  'pil-rocking': ['superman', 'lb3 gl2 bt1 ub1 sh0', { s: 'ft ch sh' }], 'pil-roll-over': ['vUp', 'ft1', { s: 'lb ub bt' }],
  'pil-roll-up': ['vUp', { s: 'lb bt' }], 'pil-rolling-ball': ['stretch', 'co2', { s: 'lb' }],
  'pil-saw': ['stretch', 'co1', { s: 'bt lb co ub' }], 'pil-scissors': ['vUp', { s: 'bt' }],
  'pil-seal': ['stretch', 'co2', { s: 'lb' }], 'pil-shoulder-bridge': ['singleBridge', { s: 'ft' }],
  'pil-side-bend': ['sidePlank', 'sh2 tr1'], 'pil-side-kick': ['abduction', 'gl2 ft2 bt1 co2', { s: 'bt' }],
  'pil-single-leg-kick': ['superman', 'bt3 lb2 gl1 co1 ub0 sh0', { s: 'ft' }], 'pil-single-leg-stretch': ['vUp'],
  'pil-spine-stretch': ['stretch', 'co1', { s: 'lb bt' }], 'pil-spine-twist': ['stretch', 'co1 lb1', { s: 'co lb' }],
  'pil-swan-dive': ['superman', 'lb3 gl2 bt1 ub1 sh0', { s: 'co ch ft' }],
  'pil-swan': ['superman', 'lb3 ub2 gl1 tr1 bt0 sh0', { s: 'co ch' }], 'pil-swimming': ['superman', 'sh2 co1'],
  'pil-teaser': ['vUp', 'lb1'],
  // Pilates ring
  'ring-chest-press': ['stretch', 'ch3 sh2 tr1 bi1'], 'ring-inner-thigh-squeeze': ['adduction'],
  // foam roller: the rolled group listed as stretched; the arms and core hold you up
  'roller-calves': ['roll', { s: 'll' }], 'roller-glutes': ['roll', { s: 'gl' }], 'roller-hamstrings': ['roll', { s: 'bt' }],
  'roller-it-band': ['roll', 'co2', { s: 'gl' }], 'roller-lats': ['roll', 'sh0 tr0', { s: 'ub' }],
  'roller-quads': ['roll', 'sh2', { s: 'ft' }], 'roller-upper-back': ['roll', 'sh0 tr0 gl1', { s: 'ub' }],
  // wall
  'wall-forearm-stand': ['stretch', 'sh3 ub2 co2 tr1', { s: 'ch' }], 'wall-handstand': ['stretch', 'sh3 tr2 ub2 co2 ch1'],
  'wall-headstand': ['stretch', 'sh3 co2 ub2 tr1'], 'wall-tree': ['balance', 'ft1', { s: 'ft' }],
  'wall-warrior-3': ['singleRdl', 'sh1', { s: 'bt' }],
  // warm-ups
  'wu-arm-circles': ['armCircles'], 'wu-butt-kicks': ['buttKicks'], 'wu-high-knees': ['highKnees'],
  'wu-hip-circles': ['hipCircles'], 'wu-inchworm': ['inchworm'], 'wu-leg-swings': ['legSwings'],
  'wu-torso-twists': ['stretch', 'co1', { s: 'co lb' }],
  // yoga (rated from each pose's source and what it holds; Yoga Journal's pose pages name what a pose strengthens and
  // stretches)
  'yoga-boat': ['vUp', 'lb1'], 'yoga-bound-angle-forward-bend-block': ['stretch', { s: 'ft gl lb' }],
  'yoga-bound-angle-forward-bend': ['stretch', { s: 'ft gl lb' }], 'yoga-bound-angle': ['stretch', 'lb1', { s: 'ft gl' }],
  'yoga-bow': ['stretch', 'lb3 gl2 bt2 sh1', { s: 'ch ft co sh' }], 'yoga-bridge': ['bridge', 'lb2', { s: 'ch ft' }],
  'yoga-camel': ['stretch', 'lb2 gl2 ft1', { s: 'ft co ch sh' }], 'yoga-cat-cow': ['stretch', 'co1', { s: 'lb co' }],
  'yoga-chair': ['squat', 'sh2 co1 lb1', {}], 'yoga-chaturanga': ['pushup', 'tr3 co2 sh2'],
  'yoga-child': ['stretch', { s: 'lb gl ub' }], 'yoga-cobra': ['stretch', 'lb2 tr1', { s: 'co ch' }],
  'yoga-corpse': ['none'], 'yoga-cow-face-arms-strap': ['stretch', { s: 'sh tr ch' }],
  'yoga-crescent-lunge': ['lunge', 'sh1 lb1', { s: 'ft' }],
  'yoga-crow': ['stretch', 'co3 tr2 sh2 ch2 bi1 ft1'], 'yoga-dancer': ['balance', 'gl2 bt2 ll2 co1', { s: 'ft ch sh' }],
  'yoga-downward-dog': ['stretch', 'sh2 tr1 co1', { s: 'bt ll ub' }], 'yoga-eagle': ['balance', 'ft2 gl2', { s: 'ub sh gl' }],
  'yoga-easy': ['stretch', 'lb1', { s: 'gl' }], 'yoga-eight-angle': ['stretch', 'tr3 co3 ch2 sh2 ft1', { s: 'bt' }],
  'yoga-extended-side-angle': ['lunge', 'bt0 ll1 lb0', { s: 'co ft' }],
  'yoga-firefly': ['stretch', 'tr3 co3 sh2 ch2 ft2', { s: 'bt' }], 'yoga-fish': ['stretch', 'lb1', { s: 'ch co' }],
  'yoga-forearm-balance': ['stretch', 'sh3 ub2 co2 tr1', { s: 'ch' }], 'yoga-garland': ['stretch', 'ft1', { s: 'gl lb ll ft' }],
  'yoga-gate': ['stretch', 'ft1', { s: 'co' }], 'yoga-goddess': ['sumoSquat', 'sh1', { s: 'ft' }],
  'yoga-half-lord-fishes': ['stretch', { s: 'lb co gl' }],
  'yoga-half-moon-block': ['balance', 'gl3 ft2 co2 ll2', { s: 'bt ft' }], 'yoga-half-moon': ['balance', 'gl3 ft2 co2 ll2', { s: 'bt ft' }],
  'yoga-handstand': ['stretch', 'sh3 tr2 ub2 co2 ch1'], 'yoga-happy-baby': ['stretch', { s: 'gl ft lb bt' }],
  'yoga-head-to-knee': ['stretch', { s: 'bt lb' }], 'yoga-headstand': ['stretch', 'sh3 co2 ub2 tr1'],
  'yoga-humble-warrior': ['lunge', 'bt0 ll1', { s: 'ch sh ft' }], 'yoga-legs-up-wall': ['stretch', { s: 'bt' }],
  'yoga-lizard': ['stretch', 'ft1 gl1', { s: 'ft gl bt' }], 'yoga-locust': ['superman'],
  'yoga-lotus': ['stretch', 'lb1', { s: 'gl ft ll' }], 'yoga-low-lunge': ['stretch', 'ft1 gl1', { s: 'ft' }],
  'yoga-marichi-1': ['stretch', { s: 'bt lb sh' }], 'yoga-marichi-3': ['stretch', { s: 'lb co gl' }],
  'yoga-mountain': ['stretch', 'ft1 co1 ll1'], 'yoga-pigeon': ['stretch', { s: 'gl ft' }],
  'yoga-plow': ['stretch', { s: 'lb ub bt' }], 'yoga-puppy': ['stretch', { s: 'ub sh ch' }],
  'yoga-pyramid-blocks': ['stretch', 'ft1 gl1', { s: 'bt ll' }], 'yoga-pyramid': ['stretch', 'ft1 gl1', { s: 'bt ll' }],
  'yoga-reclined-bound-angle': ['stretch', { s: 'ft' }], 'yoga-reclining-hand-to-big-toe': ['stretch', { s: 'bt ll' }],
  'yoga-reverse-plank': ['stretch', 'gl3 bt2 tr2 sh2 lb2 co1', { s: 'ch sh' }],
  'yoga-reverse-warrior': ['lunge', 'bt0 lb0', { s: 'co ft' }], 'yoga-revolved-head-to-knee': ['stretch', { s: 'co bt lb ft' }],
  'yoga-revolved-side-angle': ['lunge', 'co2 bt0', { s: 'co lb' }],
  'yoga-revolved-triangle': ['stretch', 'ft2 co2 gl1', { s: 'bt co lb' }],
  'yoga-seated-forward-bend-strap': ['stretch', { s: 'bt lb ll' }], 'yoga-seated-forward-bend': ['stretch', { s: 'bt lb ll' }],
  'yoga-side-crow': ['stretch', 'co3 tr2 sh2 ch2'], 'yoga-side-plank': ['sidePlank', 'sh2 tr1'],
  'yoga-sphinx': ['stretch', 'lb1', { s: 'co ch' }], 'yoga-staff': ['stretch', 'co1 ft1', { s: 'bt' }],
  'yoga-standing-forward-bend': ['stretch', { s: 'bt lb ll' }], 'yoga-supine-twist': ['stretch', { s: 'lb gl co' }],
  'yoga-thread-the-needle': ['stretch', { s: 'sh ub' }], 'yoga-tree': ['balance', 'ft1', { s: 'ft' }],
  'yoga-triangle-block': ['stretch', 'ft2 co2 gl1', { s: 'bt co ft' }], 'yoga-triangle': ['stretch', 'ft2 co2 gl1', { s: 'bt co ft' }],
  'yoga-upward-dog': ['stretch', 'tr2 sh2 lb2 gl1', { s: 'co ch ft' }],
  'yoga-warrior-1': ['lunge', 'sh1 bt0', { s: 'ft ll' }], 'yoga-warrior-2': ['lunge', 'sh2 bt0 lb0', { s: 'ft' }],
  'yoga-warrior-3': ['singleRdl', 'sh1', { s: 'bt' }], 'yoga-wheel': ['stretch', 'tr3 sh2 gl2 bt2 lb2 ft1', { s: 'ch sh co ft' }],
  'yoga-wide-seated-forward-bend': ['stretch', { s: 'ft bt lb' }],
  'yoga-wide-standing-forward-bend': ['stretch', { s: 'bt ft lb' }],
};

const ORDER = Object.values(G);
const parse = str => Object.fromEntries((str || '').split(/\s+/).filter(Boolean).map(t => { const k = G[t.slice(0, 2)]; if (!k || !/^[0-3]$/.test(t.slice(2))) throw new Error('bad rating ' + t); return [k, +t.slice(2)]; }));
const groups = str => (str || '').split(/\s+/).filter(Boolean).map(t => { if (!G[t]) throw new Error('bad group ' + t); return G[t]; });
/* id -> { muscles, stretches, pattern, src } */
function rate(id) {
  const [name, ...rest] = EX[id], p = P[name];
  if (!p) throw new Error(id + ': no pattern ' + name);
  const m = parse(p.m); let s = groups(p.s);
  for (const r of rest) { if (typeof r === 'string') Object.assign(m, parse(r)); else if (r && r.s !== undefined) s = groups(r.s); }
  const muscles = {}; for (const g of ORDER) if (m[g]) muscles[g] = m[g];
  return { muscles, stretches: ORDER.filter(g => s.includes(g)), pattern: name, src: p.src };
}
/* the fields in a library file: "muscles" (one line), then "stretches" when there are any, after "equipment" (or the
   last of the fields before it) */
function place(ex, r) {
  const keys = Object.keys(ex).filter(k => k !== 'muscles' && k !== 'stretches'), out = {};
  const after = ['equipment', 'collections', 'focus', 'category', 'name'].find(k => keys.includes(k));
  for (const k of keys) {
    out[k] = ex[k];
    if (k === after) { out.muscles = r.muscles; if (r.stretches.length) out.stretches = r.stretches; }
  }
  return out;
}
const oneLine = txt => txt.replace(/"muscles": \{\s*\n([^{}]*?)\n\s*\}/, (m, inner) => '"muscles": {' + inner.trim().split(/,\s*\n\s*/).join(', ') + '}');

if (require.main === module) {
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort(), lib = files.map(f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
  const missing = lib.filter(e => !EX[e.id]).map(e => e.id), extra = Object.keys(EX).filter(id => !lib.some(e => e.id === id));
  if (missing.length) console.log('no rating for: ' + missing.join(', '));
  if (extra.length) console.log('rated but not in the library: ' + extra.join(', '));
  const check = process.argv[2] === 'check'; let changed = 0;
  for (const ex of lib) {
    if (!EX[ex.id]) continue;
    const r = rate(ex.id), txt = oneLine(formatJson(place(ex, r))), file = path.join(DIR, ex.id + '.json');
    if (txt === fs.readFileSync(file, 'utf8')) continue;
    changed++; if (check) console.log('differs: ' + ex.id); else fs.writeFileSync(file, txt);
  }
  if (!check) fs.writeFileSync(path.join(ROOT, 'docs/muscles.md'), doc(lib));
  console.log(`${check ? 'differ' : 'written'}: ${changed}${check ? '' : ' (and docs/muscles.md)'}`);
  if (missing.length || extra.length || (check && changed)) process.exitCode = 1;
}

/* docs/muscles.md: each pattern with its source and exercises */
function doc(lib) {
  const name = id => (lib.find(e => e.id === id) || { name: id }).name, abbr = Object.fromEntries(Object.entries(G).map(([a, g]) => [g, a]));
  const fmt = m => Object.entries(m).sort((a, b) => b[1] - a[1]).map(([g, v]) => `${g} ${v}`).join(', ') || '–';
  const L = ['# Muscle groups: ratings and sources', '',
    'Generated by `node tools/muscles.cjs` from its tables (edit those, not this page). What the ratings mean and how the app',
    'shows them: HANDOFF §13 and §5.5.', '',
    '**Ratings** follow [ExRx](https://exrx.net/Lists/Directory)\'s classification of each muscle in a move: **3** target (what',
    'the exercise is for), **2** synergist (helps move the load), **1** stabilizer (dynamic, antagonist or plain stabilizers:',
    'hold you steady), **0** not worked. A group takes its highest-rated muscle. **Stretched** groups are the ones a pose or',
    'stretch lengthens (for a foam roller, the rolled group).', '',
    '**The 11 groups** (short names used in `tools/muscles.cjs` in brackets): shoulders (sh: all three deltoid heads and',
    'the rotator cuff), chest (ch: pectorals, serratus), upperBack (ub: lats, trapezius, rhomboids, teres, neck), lowerBack',
    '(lb: erector spinae, quadratus lumborum), biceps (bi: biceps, brachialis, brachioradialis, forearms and grip), triceps',
    '(tr), core (co: rectus abdominis, obliques, transverse abdominis), frontThigh (ft: quadriceps, hip flexors, sartorius,',
    'adductors), glutes (gl: gluteus maximus, medius and minimus, TFL, outer hip), backThigh (bt: hamstrings), lowerLegs',
    '(ll: calves, soleus, tibialis anterior).', '',
    '**Sources.** Strength moves use the ExRx page named with each pattern (target, synergists, stabilizers, mapped to the',
    'groups above). Patterns marked *own* have no ExRx page: they are rated from the exercise\'s own source (every library',
    'exercise links one) and the joints it moves and holds, the same way. Yoga poses, Pilates and stretches are all rated',
    'like this; Yoga Journal\'s pose pages and the Mayo Clinic stretches name what each strengthens and stretches.', '',
    '**Judgment calls** (worth a second look):',
    '- Leg raises: ExRx calls the hip flexors the target and the abs stabilizers; the abs are rated 2 here because they',
    '  work hard to hold the pelvis down (and people do leg raises for the abs).',
    '- V-ups and the Pilates rolling moves rate the hip flexors 2 (they lift the legs).',
    '- Foam rolling lists the rolled group as stretched: not a stretch as such, but it is what the roll is for.',
    '- Balance work rates the lower legs (ankle muscles) and glutes (gluteus medius holds the pelvis level) 2.',
    '- Grip counts toward biceps (forearms), so hangs and carries rate it 3.', ''];
  const byPattern = {};
  for (const id of Object.keys(EX).sort()) (byPattern[EX[id][0]] = byPattern[EX[id][0]] || []).push(id);
  L.push('## Patterns', '', '| Pattern | Ratings | Stretched | Source | Exercises (changes) |', '|---|---|---|---|---|');
  for (const [pn, p] of Object.entries(P)) {
    const ids = byPattern[pn] || []; if (!ids.length) continue;
    const src = SRC[p.src] ? `[${SRC[p.src][1]}](${SRC[p.src][0]})` : '*own*';
    const items = ids.map(id => { const r = rate(id), base = parse(p.m), diff = ORDER.filter(g => (r.muscles[g] || 0) !== (base[g] || 0)).map(g => abbr[g] + (r.muscles[g] || 0));
      const s = r.stretches.join(' ') !== groups(p.s).join(' ') ? ['stretches ' + (r.stretches.map(g => abbr[g]).join(' ') || 'none')] : [];
      const ch = [...diff, ...s]; return name(id) + (ch.length ? ` (${ch.join(', ')})` : ''); });
    L.push(`| ${pn} | ${fmt(parse(p.m))} | ${groups(p.s).join(', ') || '–'} | ${src} | ${items.join('; ')} |`);
  }
  return L.join('\n') + '\n';
}
module.exports = { G, rate, EX };
