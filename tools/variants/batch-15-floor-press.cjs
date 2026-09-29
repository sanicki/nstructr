// Batch 15 (Sep 2026): a dumbbell chest press with no bench, for the 20-minute beginner's free-weights workout.
// node tools/research.cjs variants tools/variants/batch-15-floor-press.cjs
const LEGS = { hipL: [58, 0, 0], kneeL: 116, ankleL: 32, hipR: [58, 0, 0], kneeR: 116, ankleR: 32 };   // knees bent, feet flat
const K = (name, cue, pose) => ({ name, cue, camera: 90, durationMs: 2000, holdMs: 300, phase: 'rep', anchor: 'neckBase', plant: ['L', 'R'],
  touch: [{ point: 'ankleR', adjust: 'kneeR' }, { point: 'ankleL', adjust: 'kneeL' }], pose: { root: [-90, 0, 0], neck: [34, 0, 0], ...LEGS, ...pose } });
module.exports = [
  // lying on the floor: the upper arms stop on it, about 45° out from the body, so the press starts higher than on a bench
  { id: 'fw-db-floor-press', base: 'fw-db-bench-press', name: 'Dumbbell Floor Press', otherNames: ['Floor Press', 'Dumbbell Floor Chest Press'], collections: ['Free weights'],
    equipment: ['Dumbbells'], props: [{ type: 'dumbbell', hand: 'handL', axis: 'lr' }, { type: 'dumbbell', hand: 'handR', axis: 'lr' }],
    edit: ex => { ex.keyframes = [
      K('Elbows on the floor', 'Upper arms on the floor, forearms upright.', { shoulderL: [0, 45, 0], elbowL: 90, shoulderR: [0, 45, 0], elbowR: 90 }),
      K('Press', 'Press the weights straight up over your chest.', { shoulderL: [90, 0, 0], shoulderR: [90, 0, 0] })]; },
    description: 'Lying on your back with knees bent, press the dumbbells from elbows-on-the-floor to straight above your chest, then lower until your upper arms touch the floor again.',
    setup: ['Lie on your back, knees bent and feet flat.', 'Hold the dumbbells above your chest, then lower until your upper arms rest on the floor, about 45° out from your sides.'],
    cues: ['Upper arms touch the floor lightly; no bouncing.', 'Press up over your chest.', 'Lower slowly to the start.'],
    source: { url: 'https://www.acefitness.org/resources/everyone/exercise-library/19/chest-press/', title: 'Chest Press with dumbbells (ACE Exercise Library)', note: 'The same press lying on the floor instead of a bench; described in our own words. Stick-figure approximation.' } },
];
