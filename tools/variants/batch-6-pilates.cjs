// Collection research, batch 6: the classical Pilates mat exercises the library didn't have (docs/collection-research.md).
// node tools/research.cjs variants tools/variants/batch-6-pilates.cjs [id...]
const K = (name, cue, pose, x = {}) => ({ name, cue, camera: 90, durationMs: 1500, holdMs: 300, phase: 'rep', ...x, pose });
const reps = (r = '5–8', n = 6, note = 'Move with control and breathe steadily; quality before quantity.') => ({ measure: 'reps', holdStep: null, defaults: { reps: n }, repName: null, prescription: { reps: r, note } });
const OPC = { url: 'https://onlinepilatesclasses.com/blog/the-original-34-classical-pilates-mat-exercises/', title: 'Online Pilates Classes: Joseph Pilates\' 34 mat exercises' };
const MAT = ['Yoga mat'];
const x = (id, base, name, other, o) => ({ id, base, name, otherNames: other, equipment: MAT, collections: ['Pilates'], props: [], ...o });
const SUP = { root: [-90, 0, 0], neck: [34, 0, 0] };                          // lying on the back
const CURL = { root: [-90, 0, 0], chest: [32, 0, 0], neck: [44, 0, 0] };      // head and shoulders curled up
const PRONE_FA = { root: [90, 0, 0], torso: [-36, 0, 0], neck: [6, 0, 0], shoulderL: [54, 0, 0], elbowL: 90, shoulderR: [54, 0, 0], elbowR: 90, ankleL: 90, ankleR: 90 };   // on the forearms (Sphinx)
const SIT = { hipL: [90, 0, 0], hipR: [90, 0, 0] };                           // sitting, legs long
const TWIST = (t) => ({ ...SIT, torso: [0, 0, t], chest: [0, 0, t * 0.7], shoulderL: [0, 88, 0], shoulderR: [0, 88, 0] });
module.exports = [
  x('pil-roll-over', 'pil-roll-up', 'Roll-Over', ['Rollover'], { category: 'Core', focus: 'Abs and spine',
    edit: e => { e.keyframes = [
      K('Legs up', 'Lying down, lift your legs straight up.', { ...SUP, shoulderL: [8, 0, 0], shoulderR: [8, 0, 0], hipL: [90, 0, 0], hipR: [90, 0, 0] }, { anchor: 'neckBase' }),
      K('Roll over', 'Roll your legs over your head, toes toward the floor.', { root: [-170, 0, 0], neck: [114, 0, 0], shoulderL: [-75, 0, 0], shoulderR: [-75, 0, 0], hipL: [110, 0, 0], hipR: [110, 0, 0] }, { anchor: 'neckBase', durationMs: 2200 }),
      K('Roll down', 'Roll down one vertebra at a time, legs lowering.', { ...SUP, shoulderL: [8, 0, 0], shoulderR: [8, 0, 0], hipL: [60, 0, 0], hipR: [60, 0, 0] }, { anchor: 'neckBase', durationMs: 2200 })]; },
    over: reps('3–5', 4),
    description: 'Lying on your back, lift your straight legs and roll them over your head toward the floor behind you, then roll down slowly with control.',
    setup: ['Lie on your back, arms long by your sides, palms down.'],
    cues: ['Press your arms into the mat.', 'Roll over, don\'t swing.', 'Keep the weight off your neck.'], source: OPC }),
  x('pil-single-leg-kick', 'yoga-sphinx', 'Single-Leg Kick', ['Single Leg Kick'], { category: 'Core', focus: 'Hamstrings and back',
    edit: e => { e.keyframes = [
      K('Kick right', 'On your forearms, kick your right heel toward your seat.', { ...PRONE_FA, kneeR: 120 }, { anchor: 'pelvis', durationMs: 700, holdMs: 0 }),
      K('Switch', 'Straighten it and kick the left.', { ...PRONE_FA, kneeL: 120 }, { anchor: 'pelvis', durationMs: 700, holdMs: 0 })]; },
    over: { ...reps('5–8 each leg', 6), repName: 'pair' },
    description: 'Lying face down propped on your forearms, chest lifted, kick one heel toward your seat and then the other.',
    setup: ['Lie face down, propped on your forearms, elbows under your shoulders.'],
    cues: ['Chest lifted, belly drawn in.', 'Quick double pulse with each kick.', 'Legs together.'], source: OPC }),
  x('pil-double-leg-kick', 'yoga-locust', 'Double-Leg Kick', ['Double Leg Kick'], { category: 'Core', focus: 'Back, hamstrings and shoulders',
    edit: e => { const hands = [{ hand: 'handR', to: 'backR', dy: -40, dz: -6 }, { hand: 'handL', to: 'backL', dy: -40, dz: -6 }];
      e.keyframes = [
        K('Kick', 'Face down, hands clasped behind your back, kick both heels toward your seat.', { root: [90, 0, 0], neck: [-34, 0, 0], shoulderL: [-30, 20, 180], elbowL: 110, shoulderR: [-30, 20, 180], elbowR: 110, kneeL: 120, kneeR: 120, ankleL: 60, ankleR: 60 }, { anchor: 'pelvis', durationMs: 1200 }),
        K('Extend', 'Straighten your arms toward your feet and lift your chest.', { root: [90, 0, 0], torso: [-24, 0, 0], chest: [-10, 0, 0], neck: [-10, 0, 0], shoulderL: [-40, 0, 180], shoulderR: [-40, 0, 180], ankleL: 90, ankleR: 90 }, { anchor: 'pelvis', durationMs: 1800 })]; },
    over: reps('3–5 each side', 4),
    description: 'Lying face down with your hands clasped behind your back, kick both heels toward your seat, then straighten your legs and arms and lift your chest.',
    setup: ['Lie face down, head turned to one side, hands clasped high on your back.'],
    cues: ['Elbows toward the floor as you kick.', 'Reach your hands toward your feet to lift.', 'Legs stay on the mat as you lift.'], source: OPC }),
  x('pil-neck-pull', 'pil-roll-up', 'Neck Pull', ['Pilates Neck Pull'], { category: 'Core', focus: 'Abs and spine',
    edit: e => { const H = [{ hand: 'handR', to: 'head', dx: 28, dy: -10 }, { hand: 'handL', to: 'head', dx: -28, dy: -10 }], A = { shoulderL: [150, 60, 90], elbowL: 120, shoulderR: [150, 60, 90], elbowR: 120 };
      e.keyframes = [
        K('Lie long', 'Hands behind your head, legs long.', { ...SUP, ...A }, { anchor: 'pelvis', reach: H }),
        K('Roll up', 'Curl up to sitting.', { root: [-90, 0, 0], torso: [80, 0, 0], chest: [10, 0, 0], neck: [10, 0, 0], ...A }, { anchor: 'pelvis', reach: H, durationMs: 2000 }),
        K('Round forward', 'Curl over your legs.', { torso: [20, 0, 0], chest: [40, 0, 0], neck: [25, 0, 0], ...A, ...SIT }, { anchor: 'pelvis', reach: H }),
        K('Sit tall, roll back', 'Stack your spine, then roll back down slowly.', { root: [-90, 0, 0], torso: [60, 0, 0], ...A }, { anchor: 'pelvis', reach: H, durationMs: 2200 })]; },
    over: reps('3–5', 4),
    description: 'Lying down with your hands behind your head, curl up to sitting and over your legs, sit up tall, then roll back down one vertebra at a time.',
    setup: ['Lie on your back, legs long and together, hands behind your head, elbows wide.'],
    cues: ['Don\'t pull on your neck.', 'Heels stay on the mat.', 'Roll down slowly.'], source: OPC }),
  x('pil-scissors', 'pil-single-leg-stretch', 'Scissors', ['Single Straight-Leg Stretch', 'Pilates Scissors'], { category: 'Core', focus: 'Abs and hamstrings',
    edit: e => { e.keyframes = [
      K('Right leg up', 'Head up, right leg toward you, left leg low; hold the right ankle.', { ...CURL, hipR: [115, 0, 0], hipL: [20, 0, 0] }, { anchor: 'pelvis', reach: [{ hand: 'handR', to: 'kneeR', dz: 26 }, { hand: 'handL', to: 'kneeR', dz: 20 }], durationMs: 900, holdMs: 0 }),
      K('Switch', 'Switch legs.', { ...CURL, hipL: [115, 0, 0], hipR: [20, 0, 0] }, { anchor: 'pelvis', reach: [{ hand: 'handL', to: 'kneeL', dz: 26 }, { hand: 'handR', to: 'kneeL', dz: 20 }], durationMs: 900, holdMs: 0 })]; },
    over: { ...reps('8–10 each leg', 8), repName: 'pair' },
    description: 'Lying down with your head and shoulders curled up, scissor your straight legs, pulling the top one toward you with a double pulse, then switch.',
    setup: ['Lie on your back, curl your head and shoulders up, legs straight and lifted.'],
    cues: ['Shoulders stay lifted.', 'Double pulse on each leg.', 'Lower leg hovers.'], source: OPC }),
  x('pil-shoulder-bridge', 'bw-glute-bridge', 'Shoulder Bridge', ['Pilates Shoulder Bridge'], { category: 'Core', focus: 'Glutes, hamstrings and core', bilateral: { labels: { L: 'Left leg', R: 'Right leg' } },
    edit: e => { const top = e.keyframes[1];
      e.keyframes = [ { ...e.keyframes[0], name: 'Lie on your back', cue: 'Knees bent, feet flat.', phase: 'setup' },
        { ...top, name: 'Bridge up', cue: 'Lift your hips.', phase: 'setup' },
        { ...top, name: 'Kick up', cue: 'Keeping your hips high, lift your right leg straight up.', phase: 'rep', keep: ['ankleL', 'handL', 'handR'], pose: { ...top.pose, hipR: [60, 0, 0], kneeR: 0, ankleR: 30 } },
        { ...top, name: 'Lower it', cue: 'Lower it long toward the floor, hips still high.', phase: 'rep', keep: ['ankleL', 'handL', 'handR'], pose: { ...top.pose, hipR: [-20, 0, 0], kneeR: 0, ankleR: 30 } }]; },
    over: reps('3–5 each leg', 4),
    description: 'From a bridge with your hips lifted, kick one straight leg up to the ceiling and lower it long, keeping your hips high and level.',
    setup: ['Lie on your back, knees bent, feet flat, arms by your sides.'],
    cues: ['Hips stay high and level.', 'Kick up, lower with control.', 'Standing foot pressing down.'], source: OPC }),
  x('pil-spine-twist', 'yoga-staff', 'Spine Twist', ['Pilates Spine Twist'], { category: 'Core', focus: 'Spine and obliques',
    edit: e => { e.keyframes = [
      K('Sit tall', 'Legs together, arms out to the sides.', { ...TWIST(0) }, { anchor: 'pelvis', camera: 30 }),
      K('Twist right', 'Turn to the right, pulse twice.', { ...TWIST(-40) }, { anchor: 'pelvis', camera: 30 }),
      K('Center', 'Back to the middle.', { ...TWIST(0) }, { anchor: 'pelvis', camera: 30 }),
      K('Twist left', 'Turn to the left, pulse twice.', { ...TWIST(40) }, { anchor: 'pelvis', camera: 30 })]; },
    over: reps('3–5 each side', 4),
    description: 'Sitting tall with legs together and arms out wide, twist your upper body to one side with a double pulse, return to center, then twist to the other side.',
    setup: ['Sit tall, legs straight and together, feet flexed, arms out to the sides.'],
    cues: ['Grow taller as you twist.', 'Hips stay still.', 'Breathe out as you turn.'], source: OPC }),
  x('pil-saw', 'yoga-staff', 'Saw', ['Pilates Saw'], { category: 'Core', focus: 'Spine, hamstrings and obliques',
    edit: e => { const wide = { hipL: [90, 30, 0], hipR: [90, 30, 0] };
      e.keyframes = [
        K('Sit tall', 'Legs wide, arms out to the sides.', { ...wide, shoulderL: [0, 88, 0], shoulderR: [0, 88, 0] }, { anchor: 'pelvis', camera: 30 }),
        K('Saw to the right', 'Twist right and reach your left hand past your right little toe.', { ...wide, torso: [30, 0, -35], chest: [25, 0, -15], shoulderL: [120, 0, 0], shoulderR: [-30, 60, 0] }, { anchor: 'pelvis', camera: 30, durationMs: 1800 }),
        K('Sit tall', 'Roll up, arms wide.', { ...wide, shoulderL: [0, 88, 0], shoulderR: [0, 88, 0] }, { anchor: 'pelvis', camera: 30 }),
        K('Saw to the left', 'Twist left and reach your right hand past your left little toe.', { ...wide, torso: [30, 0, 35], chest: [25, 0, 15], shoulderR: [120, 0, 0], shoulderL: [-30, 60, 0] }, { anchor: 'pelvis', camera: 30, durationMs: 1800 })]; },
    over: reps('3–5 each side', 4),
    description: 'Sitting tall with legs wide and arms out, twist to one side and reach forward past the opposite foot as if sawing off the little toe, then sit up and switch.',
    setup: ['Sit tall, legs a little wider than your mat, arms out to the sides.'],
    cues: ['Twist first, then reach.', 'Opposite hip stays down.', 'Back arm reaches back.'], source: OPC }),
  x('pil-side-kick', 'side-clamshell', 'Side Kick', ['Side Kick Front and Back', 'Side-Lying Leg Kick'], { category: 'Core', focus: 'Hips and core', equipment: MAT, bilateral: { labels: { L: 'Lying on the left side', R: 'Lying on the right side' } },
    edit: e => { const base = { root: [0, -90, 0], neck: [0, 8, 0], shoulderL: [0, -180, 0], hipL: [20, 0, 0], hipR: [20, 5, 0] };
      e.keyframes = [
        K('Kick forward', 'Lying on your side, kick the top leg forward twice.', { ...base, hipR: [80, 5, 0] }, { camera: 40, durationMs: 900, holdMs: 0 }),
        K('Sweep back', 'Sweep it back behind you.', { ...base, hipR: [-25, 5, 0] }, { camera: 40, durationMs: 1100, holdMs: 0 })]; },
    over: reps('8–10 each leg', 8),
    description: 'Lying on your side with legs slightly forward, kick the top leg forward with a double pulse, then sweep it back behind you, body still.',
    setup: ['Lie on your side, head propped on your hand or arm, legs slightly forward of your hips.'],
    cues: ['Keep your body still.', 'Top leg at hip height.', 'Long through the leg.'], source: { url: 'https://onlinepilatesclasses.com/pilates-exercises/mat-exercises/mat-side-kicks/', title: 'Online Pilates Classes: Side Kicks on the Mat' } }),
  x('pil-side-bend', 'yoga-side-plank', 'Side Bend', ['Pilates Side Bend'], { category: 'Core', focus: 'Obliques and shoulders',
    edit: e => { const sp = e.keyframes[2];
      e.keyframes = [ { ...sp, name: 'Side plank', cue: 'Lift into a side plank on your left hand.', phase: 'rep' },
        { ...sp, name: 'Arc over', cue: 'Reach your top arm over your head, hips lifting higher.', phase: 'rep', pose: { ...sp.pose, shoulderR: [0, 180, 0], torso: [0, -10, 0] }, durationMs: 1800 }]; },
    over: { bilateral: { labels: { L: 'On the left hand', R: 'On the right hand' } }, ...reps('3–5 each side', 4) },
    description: 'From a side plank on one hand, reach the top arm up and over your head as the hips lift, making an arc, then return.',
    setup: ['Sit on one hip, legs straight and stacked, supporting hand on the mat under your shoulder.'],
    cues: ['Press the floor away.', 'Reach long through the top arm.', 'Hips lift, don\'t sag.'], source: { url: 'https://onlinepilatesclasses.com/pilates-exercises/mat-exercises/mat-side-bend/', title: 'Online Pilates Classes: Side Bend on the Mat' } }),
  x('pil-push-up', 'bw-pushup', 'Pilates Push-Up', ['Push-Up (Pilates)'], { category: 'Core', focus: 'Chest, arms and core',
    edit: e => { const pl = e.keyframes[0], lo = e.keyframes[1], fold = { torso: [140, 0, 0], neck: [10, 0, 0], shoulderL: [185, 0, 0], shoulderR: [185, 0, 0], kneeL: 12, kneeR: 12 }, hands = [{ point: 'handR', adjust: 'shoulderR' }, { point: 'handL', adjust: 'shoulderL' }];
      e.keyframes = [
        K('Stand tall', 'Arms by your sides.', {}, { anchor: 'ankleL', plant: ['L', 'R'] }),
        K('Roll down', 'Roll down until your hands reach the floor.', fold, { anchor: 'ankleL', plant: ['L', 'R'], touch: hands, durationMs: 2200 }),
        { ...pl, name: 'Walk out', cue: 'Walk your hands out to a plank.', anchor: 'toeL', touch: [{ point: 'handR', adjust: 'root' }], durationMs: 2500 },
        { ...lo, name: 'Push-up', cue: 'Elbows by your sides, lower and press up.' },
        { ...pl, name: 'Plank', cue: 'Press back up.' },
        K('Walk back', 'Walk your hands back and roll up to standing.', fold, { anchor: 'ankleL', plant: ['L', 'R'], touch: hands, durationMs: 2500 })]; },
    over: reps('2–3 rounds', 2),
    description: 'From standing, roll down to put your hands on the floor, walk out to a plank, do a push-up with elbows by your sides, walk back and roll up.',
    setup: ['Stand tall, feet together.'],
    cues: ['Roll down one vertebra at a time.', 'Elbows hug your sides.', 'Walk back and roll up slowly.'], source: OPC }),
];
