// Collection research, batch 4: common core, bodyweight and free-weight exercises the library didn't have
// (docs/collection-research.md). node tools/research.cjs variants tools/variants/batch-4-strength.cjs [id...]
const K = (name, cue, pose, x = {}) => ({ name, cue, camera: 90, durationMs: 1500, holdMs: 300, phase: 'rep', ...x, pose });
const reps = (r = '8–12', n = 10, note = 'Move with control: about 2 seconds each way, resting between sets as needed.') =>
  ({ measure: 'reps', holdStep: null, defaults: { reps: n }, repName: null, prescription: { reps: r, note } });
const holdT = (s = 30) => ({ measure: 'time', holdStep: 1, defaults: { seconds: s }, repName: null, prescription: { reps: `hold ${s} seconds`, note: 'Stop if your lower back lifts or hurts; build the time up gradually.' } });
const sides = { bilateral: { labels: { L: 'Left leg', R: 'Right leg' } } };
const ACE = (n, slug, t) => ({ url: `https://www.acefitness.org/resources/everyone/exercise-library/${n}/${slug}/`, title: `ACE Exercise Library: ${t}` });
const DB2 = axis => [{ type: 'dumbbell', hand: 'handL', axis }, { type: 'dumbbell', hand: 'handR', axis }];
// lying on the back with knees bent, feet flat (the crunch's start)
const FEET = [{ point: 'ankleR', adjust: 'kneeR' }, { point: 'ankleL', adjust: 'kneeL' }];
const KNEES = { hipL: [58, 0, 0], kneeL: 116, ankleL: 32, hipR: [58, 0, 0], kneeR: 116, ankleR: 32 };
const HEAD_HANDS = [{ hand: 'handR', to: 'head', dx: 28, dy: -10 }, { hand: 'handL', to: 'head', dx: -28, dy: -10 }];
const ARMS_HEAD = { shoulderL: [150, 60, 90], elbowL: 120, shoulderR: [150, 60, 90], elbowR: 120 };
const PLANK = { root: [66, 0, 0], shoulderL: [66, 0, 0], shoulderR: [66, 0, 0], hipL: [-8, 0, 0], ankleL: 24, hipR: [-8, 0, 0], ankleR: 24 };
const TOES = [{ point: 'toeR', adjust: 'hipR' }, { point: 'toeL', adjust: 'hipL' }];
const ex = (id, base, name, other, x) => ({ id, base, name, otherNames: other, ...x });
module.exports = [
  // ---------- core ----------
  ex('core-bicycle-crunch', 'core-crunch', 'Bicycle Crunch', ['Bicycle Crunches', 'Supine Bicycle Crunch'], { equipment: [], collections: ['Core'], category: 'Core', focus: 'Abs and obliques',
    edit: e => { e.keyframes = [
      K('Right elbow to left knee', 'Twist and bring your right elbow toward your left knee.', { root: [-90, 0, 0], chest: [30, 0, 25], neck: [40, 0, 0], ...ARMS_HEAD, hipL: [100, 0, 0], kneeL: 90, hipR: [25, 0, 0], kneeR: 10 }, { anchor: 'pelvis', reach: HEAD_HANDS }),
      K('Left elbow to right knee', 'Switch: left elbow toward your right knee.', { root: [-90, 0, 0], chest: [30, 0, -25], neck: [40, 0, 0], ...ARMS_HEAD, hipR: [100, 0, 0], kneeR: 90, hipL: [25, 0, 0], kneeL: 10 }, { anchor: 'pelvis', reach: HEAD_HANDS })]; },
    over: { ...reps('10–20 (both sides = 2)', 16), repName: 'twist' },
    description: 'Lying on your back with hands behind your head, pedal your legs while you twist each elbow toward the opposite knee.',
    setup: ['Lie on your back, hands lightly behind your head.', 'Lift your shoulders and both feet off the floor.'],
    cues: ['Twist from your ribs, not your elbows.', 'Straighten the other leg low.', 'Don\'t pull on your neck.'], source: ACE(241, 'supine-bicycle-crunches', 'Supine Bicycle Crunches') }),
  ex('core-russian-twist', 'core-crunch', 'Russian Twist', ['Seated Russian Twist'], { equipment: [], collections: ['Core'], category: 'Core', focus: 'Obliques',
    edit: e => { e.keyframes = [
      K('Twist right', 'Leaning back, turn your chest and hands to the right.', { root: [-40, 0, 0], torso: [0, 0, -30], chest: [0, 0, -20], shoulderL: [70, 0, 0], elbowL: 20, shoulderR: [70, 0, 0], elbowR: 20, hipL: [120, 0, 0], kneeL: 100, hipR: [120, 0, 0], kneeR: 100 }, { anchor: 'pelvis' }),
      K('Twist left', 'Now turn to the left.', { root: [-40, 0, 0], torso: [0, 0, 30], chest: [0, 0, 20], shoulderL: [70, 0, 0], elbowL: 20, shoulderR: [70, 0, 0], elbowR: 20, hipL: [120, 0, 0], kneeL: 100, hipR: [120, 0, 0], kneeR: 100 }, { anchor: 'pelvis' })]; },
    over: { ...reps('10–16 (both sides = 2)', 12), repName: 'twist' },
    description: 'Sitting leaned back in a V with feet lifted, turn your chest and clasped hands from side to side.',
    setup: ['Sit with knees bent, lean back to about 45°.', 'Lift your feet (keep them down to make it easier) and clasp your hands in front.'],
    cues: ['Chest tall, back long.', 'Turn from your ribs.', 'Slow and controlled.'], source: { url: 'https://www.nasm.org/resource-center/exercise-library/russian-twist', title: 'NASM Exercise Library: Russian Twist' } }),
  ex('core-hollow-hold', 'core-crunch', 'Hollow Hold', ['Hollow Body Hold'], { equipment: [], collections: ['Core'], category: 'Core', focus: 'Deep abs',
    edit: e => { e.keyframes = [
      K('Lie on your back', 'Legs long, arms overhead.', { root: [-90, 0, 0], neck: [34, 0, 0], shoulderL: [175, 0, 0], shoulderR: [175, 0, 0] }, { anchor: 'pelvis', phase: 'setup', holdMs: 800 }),
      K('Hollow Hold', 'Lower back down, lift your shoulders and legs.', { root: [-90, 0, 0], chest: [22, 0, 0], neck: [30, 0, 0], shoulderL: [160, 0, 0], shoulderR: [160, 0, 0], hipL: [22, 0, 0], hipR: [22, 0, 0] }, { anchor: 'pelvis', holdMs: 5000, durationMs: 2000 })]; },
    over: holdT(20),
    description: 'Lying on your back, press your lower back into the floor and lift your shoulders, arms and straight legs a little way off it; hold.',
    setup: ['Lie on your back, arms overhead, legs long.'],
    cues: ['Lower back stays pressed down.', 'Bend your knees or bring your arms forward to make it easier.', 'Breathe.'], source: { url: 'https://www.hingehealth.com/resources/articles/hollow-body-hold/', title: 'Hinge Health: How to do a hollow body hold' } }),
  ex('core-heel-taps', 'core-crunch', 'Heel Taps', ['Alternate Heel Touches', 'Lying Oblique Reach'], { equipment: [], collections: ['Core'], category: 'Core', focus: 'Obliques',
    edit: e => { e.keyframes = [
      K('Reach right', 'Shoulders up, reach your right hand to your right heel.', { root: [-90, 0, 0], torso: [0, 16, 0], chest: [28, 0, 0], neck: [34, 0, 0], shoulderL: [30, 0, 0], shoulderR: [30, 0, 0], ...KNEES }, { anchor: 'pelvis', plant: ['L', 'R'], touch: FEET }),
      K('Reach left', 'Now reach your left hand to your left heel.', { root: [-90, 0, 0], torso: [0, -16, 0], chest: [28, 0, 0], neck: [34, 0, 0], shoulderL: [30, 0, 0], shoulderR: [30, 0, 0], ...KNEES }, { anchor: 'pelvis', plant: ['L', 'R'], touch: FEET })]; },
    over: { ...reps('10–20 (both sides = 2)', 16), repName: 'tap' },
    description: 'Lying on your back with knees bent and shoulders lifted, crunch to each side in turn to reach a hand toward the same-side heel.',
    setup: ['Lie on your back, knees bent, feet flat.', 'Lift your head and shoulders a little off the floor, arms long by your sides.'],
    cues: ['Short side crunch, not a swing.', 'Shoulders stay up the whole time.', 'Chin slightly tucked.'], source: { url: 'https://workoutlabs.com/exercise-guide/alternate-heel-touchers/', title: 'WorkoutLabs: Alternate Heel Touches' } }),
  ex('core-flutter-kicks', 'core-crunch', 'Flutter Kicks', ['Flutter Kick'], { equipment: [], collections: ['Core'], category: 'Core', focus: 'Lower abs and hip flexors',
    edit: e => { e.keyframes = [
      K('Right leg up', 'Small kicks: right leg up, left leg down.', { root: [-90, 0, 0], neck: [40, 0, 0], shoulderL: [8, 0, 0], shoulderR: [8, 0, 0], hipR: [30, 0, 0], hipL: [12, 0, 0] }, { anchor: 'pelvis', durationMs: 600, holdMs: 0 }),
      K('Left leg up', 'Switch.', { root: [-90, 0, 0], neck: [40, 0, 0], shoulderL: [8, 0, 0], shoulderR: [8, 0, 0], hipL: [30, 0, 0], hipR: [12, 0, 0] }, { anchor: 'pelvis', durationMs: 600, holdMs: 0 })]; },
    over: { ...reps('20–30 (both legs = 2)', 20), repName: 'kick' },
    description: 'Lying on your back with legs straight and low, kick them up and down in small alternating movements.',
    setup: ['Lie on your back, legs long, hands by your sides or under your hips.'],
    cues: ['Lower back pressed down.', 'Small, quick kicks.', 'Legs higher makes it easier.'], source: { url: 'https://www.bodi.com/blog/flutter-kicks', title: 'BODi: Flutter kicks' } }),
  ex('core-v-up', 'core-crunch', 'V-Up', ['V-Ups', 'Jackknife Sit-Up'], { equipment: [], collections: ['Core'], category: 'Core', focus: 'Abs',
    edit: e => { e.keyframes = [
      K('Lie long', 'Arms overhead, legs straight.', { root: [-90, 0, 0], neck: [34, 0, 0], shoulderL: [175, 0, 0], shoulderR: [175, 0, 0] }, { anchor: 'pelvis' }),
      K('Fold into a V', 'Lift your chest and legs, reach for your toes.', { root: [-90, 0, 0], torso: [55, 0, 0], chest: [15, 0, 0], neck: [15, 0, 0], shoulderL: [100, 0, 0], shoulderR: [100, 0, 0], hipL: [60, 0, 0], hipR: [60, 0, 0] }, { anchor: 'pelvis', durationMs: 1200 })]; },
    over: reps('6–12', 8),
    description: 'Lying flat with arms overhead, lift your chest and straight legs at the same time to meet in a V, balanced on your sit bones, then lower.',
    setup: ['Lie on your back, arms overhead, legs straight and together.'],
    cues: ['Reach for your toes.', 'Lower slowly.', 'Bend your knees to make it easier.'], source: ACE(242, 'v-ups', 'V-Ups') }),
  ex('core-sit-up', 'core-crunch', 'Sit-Up', ['Sit-Ups', 'Full Sit-Up'], { equipment: [], collections: ['Core'], category: 'Core', focus: 'Abs and hip flexors',
    edit: e => { e.keyframes = [
      K('Lie on your back', 'Knees bent, hands behind your head.', { root: [-90, 0, 0], neck: [34, 0, 0], ...ARMS_HEAD, ...KNEES }, { anchor: 'pelvis', plant: ['L', 'R'], touch: FEET, reach: HEAD_HANDS }),
      K('Sit up', 'Curl all the way up until you\'re sitting.', { root: [-90, 0, 0], torso: [70, 0, 0], chest: [10, 0, 0], neck: [10, 0, 0], ...ARMS_HEAD, ...KNEES }, { anchor: 'pelvis', plant: ['L', 'R'], touch: FEET, reach: HEAD_HANDS, durationMs: 1800 })]; },
    over: reps('8–15', 10),
    description: 'Lying on your back with knees bent and feet flat, curl your head, shoulders and back up until you\'re sitting, then lower with control.',
    setup: ['Lie on your back, knees bent, feet flat (hooked under something if you like).', 'Hands lightly behind your head or crossed on your chest.'],
    cues: ['Curl up one vertebra at a time.', 'Don\'t pull on your neck.', 'Lower slowly.'], source: { url: 'https://www.healthline.com/health/sit-ups-benefits', title: 'Healthline: Sit-ups: benefits and how to' } }),
  // ---------- bodyweight ----------
  ex('bw-lateral-lunge', 'bw-squat', 'Lateral Lunge', ['Side Lunge'], { equipment: [], collections: ['Bodyweight'], category: 'Strength', focus: 'Thighs and inner legs',
    edit: e => { e.keyframes = [
      K('Stand wide', 'Feet wide, toes forward.', { hipL: [0, 22, 0], hipR: [0, 22, 0] }, { camera: 0, anchor: 'ankleR', plant: ['L', 'R'], touch: [{ point: 'ankleL', adjust: 'hipL.side' }] }),
      K('Lunge to the right', 'Sit back into your right hip, left leg straight.', { torso: [30, 0, 0], shoulderL: [60, 0, 0], shoulderR: [60, 0, 0], hipR: [70, 25, 0], kneeR: 90, ankleR: -20, hipL: [0, 40, 0] }, { camera: 0, anchor: 'ankleR', plant: ['L', 'R'], touch: [{ point: 'ankleL', adjust: 'hipL.side' }] })]; },
    over: { ...sides, ...reps('8–12 each side', 10) },
    description: 'From a wide stance, bend one knee and sit your hips back over that foot while the other leg stays straight, then push back up.',
    setup: ['Stand with your feet wide apart, toes pointing forward.'],
    cues: ['Sit back, as if into a chair.', 'Bent knee over your toes.', 'Other leg straight, foot flat.'], source: ACE(50, 'side-lunge', 'Side Lunge') }),
  ex('bw-split-squat', 'bw-reverse-lunge', 'Split Squat', ['Static Lunge'], { equipment: [], collections: ['Bodyweight'], category: 'Strength', focus: 'Thighs and glutes',
    edit: e => { e.keyframes = [
      K('Staggered stance', 'Right foot forward, left foot back on its ball.', { hipR: [25, 0, 0], hipL: [-25, 0, 0], kneeL: 10, ankleL: 20, shoulderL: [-27.5, 0, 0], elbowL: 69.4, shoulderR: [-27.5, 0, 0], elbowR: 69.4 }, { anchor: 'ankleR', plant: ['R'], touch: [{ point: 'toeL', adjust: 'hipL' }] }),
      K('Lower', 'Bend both knees, back knee toward the floor.', { hipR: [85, 0, 0], kneeR: 90, ankleR: -5, hipL: [-5, 0, 0], kneeL: 95, ankleL: 40, shoulderL: [-27.5, 0, 0], elbowL: 69.4, shoulderR: [-27.5, 0, 0], elbowR: 69.4 }, { anchor: 'ankleR', plant: ['R'], touch: [{ point: 'toeL', adjust: 'hipL' }] })]; },
    over: { ...sides, ...reps('8–12 each leg', 10) },
    description: 'A lunge with both feet staying put: in a staggered stance, bend both knees to lower straight down, then stand back up.',
    setup: ['Step one foot forward and the other back, both feet hip-width apart.', 'Hands on your hips.'],
    cues: ['Lower straight down, not forward.', 'Front knee over the ankle.', 'Chest tall.'], source: { url: 'https://barbend.com/lunge-vs-split-squat/', title: 'BarBend: Lunge vs. split squat' } }),
  ex('bw-pike-pushup', 'yoga-downward-dog', 'Pike Push-Up', ['Pike Press'], { equipment: [], collections: ['Bodyweight'], category: 'Strength', focus: 'Shoulders and triceps',
    edit: e => { const dog = JSON.parse(JSON.stringify(e.keyframes[1])); e.keyframes = [
      { ...dog, name: 'Pike', cue: 'Hips high, arms straight, like Downward Dog.', phase: 'rep', durationMs: 1500, holdMs: 300, pose: { ...dog.pose, shoulderL: [180, 0, 180], shoulderR: [180, 0, 180] } },
      { ...dog, name: 'Lower', cue: 'Bend your elbows, head toward the floor in front of your hands.', phase: 'rep', durationMs: 1500, holdMs: 300, pose: { ...dog.pose, shoulderL: [150, 0, 180], elbowL: 90, shoulderR: [150, 0, 180], elbowR: 90 } }]; },
    over: reps('5–10', 8),
    description: 'From a Downward Dog shape with hips high, bend your elbows to lower the top of your head toward the floor, then press back up.',
    setup: ['Start in Downward Dog, hands a little wider than your shoulders.', 'Walk your feet in to bring your hips higher.'],
    cues: ['Hips stay high.', 'Elbows back, not out wide.', 'Head just in front of your hands.'], source: { url: 'https://www.nasm.org/resource-center/exercise-library/pike-push-up', title: 'NASM Exercise Library: Pike Push-Up' } }),
  // ---------- free weights ----------
  ex('fw-db-front-raise', 'fw-db-lateral', 'Dumbbell Front Raise', ['Front Raise', 'Front Deltoid Raise'], { equipment: ['Dumbbells'], collections: ['Free weights'], category: 'Strength', focus: 'Front of the shoulders',
    props: DB2('lr'),
    edit: e => { e.keyframes = [
      K('Arms down', 'Weights in front of your thighs.', { shoulderL: [8, 0, 0], shoulderR: [8, 0, 0] }, { anchor: 'ankleL', plant: ['L', 'R'] }),
      K('Raise', 'Lift the weights straight forward to shoulder height.', { shoulderL: [88, 0, 0], shoulderR: [88, 0, 0] }, { anchor: 'ankleL', plant: ['L', 'R'] })]; },
    over: reps('8–12', 10),
    description: 'Standing tall, lift a dumbbell in each hand straight forward to shoulder height, arms almost straight, then lower slowly.',
    setup: ['Stand tall, a dumbbell in each hand in front of your thighs.'],
    cues: ['Arms nearly straight.', 'Stop at shoulder height.', 'No swinging.'], source: { url: 'https://www.endomondo.com/exercise/dumbbell-front-raise', title: 'Endomondo: Dumbbell Front Raise' } }),
  ex('fw-db-chest-fly', 'fw-db-bench-press', 'Dumbbell Chest Fly', ['Dumbbell Fly', 'Chest Fly'], { equipment: ['Dumbbells', 'Bench'], collections: ['Free weights'], category: 'Strength', focus: 'Chest',
    props: p => p,
    edit: e => { const p0 = e.keyframes[1].pose; e.keyframes = [
      K('Arms up', 'Weights above your chest, palms facing.', { ...p0, elbowL: 10, elbowR: 10 }, { anchor: 'pelvis', plant: ['L', 'R'], touch: e.keyframes[1].touch }),
      K('Open', 'Lower the weights out to the sides in a wide arc.', { ...p0, shoulderL: [15, 80, -90], elbowL: 20, shoulderR: [15, 80, -90], elbowR: 20 }, { anchor: 'pelvis', plant: ['L', 'R'], touch: e.keyframes[1].touch })]; },
    over: reps('8–12', 10),
    description: 'Lying on a bench with dumbbells above your chest, open your arms out wide in an arc with a slight elbow bend, then bring them back together.',
    setup: ['Lie on a flat bench, feet on the floor.', 'Hold the dumbbells above your chest, palms facing each other.'],
    cues: ['Soft elbows, fixed bend.', 'Open until you feel a chest stretch.', 'Hug the weights back up.'], source: { url: 'https://www.strengthlog.com/best-dumbbell-exercises-muscle-strength/', title: 'StrengthLog: The best dumbbell exercises' } }),
  ex('fw-db-skull-crusher', 'fw-db-bench-press', 'Dumbbell Skull Crusher', ['Lying Triceps Extension', 'Skull Crusher'], { equipment: ['Dumbbells', 'Bench'], collections: ['Free weights'], category: 'Strength', focus: 'Triceps',
    props: p => p,
    edit: e => { const p0 = e.keyframes[1].pose; e.keyframes = [
      K('Arms up', 'Weights above your shoulders.', { ...p0 }, { anchor: 'pelvis', plant: ['L', 'R'], touch: e.keyframes[1].touch }),
      K('Lower', 'Bend your elbows to bring the weights beside your head.', { ...p0, shoulderL: [110, 0, -90], elbowL: 110, shoulderR: [110, 0, -90], elbowR: 110 }, { anchor: 'pelvis', plant: ['L', 'R'], touch: e.keyframes[1].touch })]; },
    over: reps('8–12', 10),
    description: 'Lying on a bench with the weights above your shoulders, bend only your elbows to lower them beside your head, then straighten your arms.',
    setup: ['Lie on a flat bench, feet on the floor.', 'Hold the dumbbells above your shoulders, palms facing each other.'],
    cues: ['Upper arms stay still.', 'Lower slowly beside your head.', 'Straighten without locking hard.'], source: { url: 'https://www.strengthlog.com/best-dumbbell-exercises-muscle-strength/', title: 'StrengthLog: The best dumbbell exercises' } }),
  ex('fw-bb-front-squat', 'fw-bb-squat', 'Front Squat', ['Barbell Front Squat'], { equipment: ['Barbell'], collections: ['Free weights'], category: 'Strength', focus: 'Thighs and core',
    props: p => p,
    edit: e => { for (const k of e.keyframes) { k.reach = [{ hand: 'handR', to: 'shoulderR', dz: 14, dy: 4 }, { hand: 'handL', to: 'shoulderL', dz: 14, dy: 4 }]; Object.assign(k.pose, { shoulderL: [95, 10, 0], elbowL: 150, shoulderR: [95, 10, 0], elbowR: 150 }); }
      e.keyframes[1].pose.torso = [22, 0, 0]; e.keyframes[0].name = 'Bar on your shoulders'; e.keyframes[0].cue = 'Bar resting on the front of your shoulders, elbows high.'; e.keyframes[1].cue = 'Squat down with your chest up and elbows high.'; },
    over: reps('5–8', 6, 'Warm up with lighter sets first. Move with control: about 2 seconds down, then drive up.'),
    description: 'A squat with the barbell resting across the front of your shoulders: elbows high and chest up, sit down between your heels and stand back up.',
    setup: ['Rest the bar on the front of your shoulders, fingertips under it, elbows high.', 'Feet about shoulder-width apart.'],
    cues: ['Elbows high the whole time.', 'Chest up.', 'Drive up through your whole foot.'], source: ACE(22, 'front-squat', 'Front Squat') }),
  ex('fw-bb-hip-thrust', 'bw-glute-bridge', 'Barbell Hip Thrust', ['Hip Thrust'], { equipment: ['Barbell', 'Bench'], collections: ['Free weights'], category: 'Strength', focus: 'Glutes',
    props: [{ type: 'bench', z: -10, width: 40, depth: 140, height: 70 }, { type: 'barbell', from: 'handL', to: 'handR' }],
    edit: e => { e.keyframes = [
      K('Hips down', 'Upper back on the bench, bar across your hips.', { root: [-40, 0, 0], neck: [30, 0, 0], shoulderL: [30, 40, 0], elbowL: 40, shoulderR: [30, 40, 0], elbowR: 40, hipL: [70, 0, 0], kneeL: 100, ankleL: 10, hipR: [70, 0, 0], kneeR: 100, ankleR: 10 }, { anchor: 'backL', plant: ['L', 'R'], reach: [{ hand: 'handR', to: 'hipR', dx: 12, dy: 8 }, { hand: 'handL', to: 'hipL', dx: -12, dy: 8 }], touch: FEET }),
      K('Thrust', 'Drive through your heels until your body is level from shoulders to knees.', { root: [-90, 0, 0], neck: [45, 0, 0], shoulderL: [30, 40, 0], elbowL: 40, shoulderR: [30, 40, 0], elbowR: 40, hipL: [0, 0, 0], kneeL: 90, hipR: [0, 0, 0], kneeR: 90 }, { anchor: 'backL', plant: ['L', 'R'], reach: [{ hand: 'handR', to: 'hipR', dx: 12, dy: 8 }, { hand: 'handL', to: 'hipL', dx: -12, dy: 8 }], touch: FEET })]; },
    over: reps('8–12', 10),
    description: 'With your upper back on a bench and a barbell across your hips, drive through your heels to lift your hips until your body is level from shoulders to knees.',
    setup: ['Sit with your upper back against the edge of a bench, a padded barbell across your hips.', 'Feet flat, about hip-width apart.'],
    cues: ['Chin tucked, ribs down.', 'Squeeze your glutes at the top.', 'Shins vertical at the top.'], source: { url: 'https://www.muscleandstrength.com/exercises/barbell-hip-thrust', title: 'Muscle & Strength: Barbell Hip Thrust' } }),
  ex('fw-db-renegade-row', 'bw-pushup', 'Renegade Row', ['Dumbbell Renegade Row', 'Plank Row'], { equipment: ['Dumbbells'], collections: ['Free weights'], category: 'Strength', focus: 'Back and core',
    props: DB2('lr'),
    edit: e => { e.keyframes = [
      K('Plank', 'High plank, hands on the dumbbells.', { ...PLANK }, { anchor: 'handL', touch: TOES }),
      K('Row right', 'Pull the right dumbbell to your hip.', { ...PLANK, shoulderR: [-10, 0, 0], elbowR: 95 }, { anchor: 'handL', touch: TOES }),
      K('Plank', 'Lower it back down.', { ...PLANK }, { anchor: 'handR', touch: TOES }),
      K('Row left', 'Now pull the left dumbbell to your hip.', { ...PLANK, shoulderL: [-10, 0, 0], elbowL: 95 }, { anchor: 'handR', touch: TOES })]; },
    over: { ...reps('6–10 each arm', 8), repName: 'pair' },
    description: 'In a high plank with your hands on two dumbbells, row one to your hip, lower it, then the other, keeping your hips still.',
    setup: ['Start in a high plank with your hands on two dumbbells, feet a little wide.'],
    cues: ['Hips square to the floor.', 'Elbow close to your side.', 'Press the other dumbbell into the floor.'], source: { url: 'https://www.lyfta.app/exercise/dumbbell-renegade-row--842', title: 'Lyfta: Dumbbell Renegade Row' } }),
  ex('fw-db-single-leg-rdl', 'fw-db-rdl', 'Single-Leg Romanian Deadlift', ['Single-Leg Deadlift', 'Single-Leg RDL'], { equipment: ['Dumbbells'], collections: ['Free weights', 'Balance'], category: 'Strength', focus: 'Hamstrings, glutes and balance',
    props: p => p,
    edit: e => { e.keyframes = [
      K('Stand on your left leg', 'Right foot just off the floor, weights at your thighs.', { shoulderL: [8, 0, 0], shoulderR: [8, 0, 0], hipR: [-5, 0, 0], kneeR: 30 }, { anchor: 'ankleL', plant: ['L'] }),
      K('Hinge', 'Tip forward from your hip, right leg reaching back.', { root: [70, 0, 0], shoulderL: [70, 0, 0], shoulderR: [70, 0, 0], hipL: [70, 0, 0], kneeL: 15, ankleL: -12, hipR: [0, 0, 0] }, { anchor: 'ankleL', plant: ['L'], durationMs: 2000 })]; },
    over: { bilateral: { labels: { L: 'Standing on the left leg', R: 'Standing on the right leg' } }, ...reps('6–10 each leg', 8) },
    description: 'Standing on one leg with a dumbbell in each hand, hinge forward from the hip while the other leg reaches straight back, then stand up tall.',
    setup: ['Stand on one leg, knee soft, a dumbbell in each hand.'],
    cues: ['Hips level: point the back toes down.', 'Back flat, weights close to your leg.', 'Squeeze your glute to stand.'], source: { url: 'https://www.strengthlog.com/best-dumbbell-exercises-muscle-strength/', title: 'StrengthLog: The best dumbbell exercises' } }),
];
