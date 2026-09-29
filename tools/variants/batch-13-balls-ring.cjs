// Batch 13 (new equipment: medicine ball, Pilates ring, stability ball, Sep 2026).
// medball: a weight in both hands ({type: "medball"}); ring: a Pilates ring between two points, flattening as they
// press ({type: "ring", from, to}); ball: a stability ball, a round surface ({type: "ball", x, z, r}).
// node tools/research.cjs variants tools/variants/batch-13-balls-ring.cjs [id...]
const K = (name, cue, pose, x = {}) => ({ name, cue, camera: 90, durationMs: 1400, holdMs: 300, phase: 'rep', ...x, pose });
const reps = (r, n, note) => ({ measure: 'reps', holdStep: null, defaults: { reps: n }, repName: null, prescription: { reps: r, note } });
const ACE = (n, slug, title) => ({ url: `https://www.acefitness.org/resources/everyone/exercise-library/${n}/${slug}/`, title: `ACE Exercise Library: ${title}` });
const PELOTON = { url: 'https://www.onepeloton.com/blog/pilates-ring-exercises', title: 'Peloton: Pilates ring exercises' };
module.exports = [
  { id: 'mb-russian-twist', base: 'core-russian-twist', name: 'Medicine Ball Russian Twist', otherNames: ['Weighted Russian Twist'], collections: ['Core', 'Free weights'],
    equipment: ['Medicine ball'], props: [{ type: 'medball' }],
    steps: [['Twist right', 'Turn the ball to your right side.'], ['Twist left', 'Turn the ball to your left side.']],
    description: 'Sitting leaned back with your knees bent, hold a medicine ball in both hands and turn it from side to side by rotating your trunk.',
    setup: ['Sit with knees bent, heels on the floor (or lifted, harder).', 'Hold a light medicine ball in both hands, lean back a little with a long spine.'],
    cues: ['Turn from your ribs, not just your arms.', 'Keep your chest lifted.', 'Breathe out as you turn.'], source: { url: 'https://www.acefitness.org/continuing-education/certified/august-2026/9179/throw-catch-slam-smarter-medicine-ball-training/', title: 'ACE: Smarter medicine-ball training' } },
  { id: 'ring-chest-press', base: 'bw-squat', name: 'Pilates Ring Chest Press', otherNames: ['Magic Circle Chest Press', 'Pilates Ring Arm Squeeze'], category: 'Strength', focus: 'Chest, arms and upper back',
    collections: ['Pilates'], equipment: ['Pilates ring'], props: [{ type: 'ring', from: 'handL', to: 'handR' }],
    edit: ex => { ex.keyframes = [
      K('Hold the ring', 'Arms straight in front at chest height, the ring between your palms.', { shoulderL: [85, 6.5, 0], shoulderR: [85, 6.5, 0] }, { camera: 0, anchor: 'ankleL', plant: ['L', 'R'], durationMs: 1200, holdMs: 300 }),
      K('Squeeze', 'Press your palms together to squeeze the ring; arms stay straight.', { shoulderL: [85, 0, 0], shoulderR: [85, 0, 0] }, { camera: 0, anchor: 'ankleL', plant: ['L', 'R'], durationMs: 1200, holdMs: 800 })]; },
    over: { bilateral: null, ...reps('10–15', 12, 'Squeeze for a breath, then release slowly without letting the ring spring back.') },
    description: 'Standing tall with the ring between your palms and your arms straight out at chest height, squeeze the ring, hold, and release slowly.',
    setup: ['Stand tall, feet hip-width apart.', 'Hold the ring between your palms, arms straight in front at chest height.'],
    cues: ['Shoulders down, away from your ears.', 'Squeeze from your chest.', 'Release slowly.'], source: PELOTON },
  { id: 'ring-inner-thigh-squeeze', base: 'bw-glute-bridge', name: 'Pilates Ring Inner Thigh Squeeze', otherNames: ['Magic Circle Inner Thigh Squeeze', 'Supine Adductor Squeeze'], category: 'Strength', focus: 'Inner thighs and core',
    collections: ['Pilates'], equipment: ['Pilates ring'], props: [{ type: 'ring', from: 'kneeL', to: 'kneeR' }],
    edit: ex => { const lie = ex.keyframes[0], legs = w => ({ hipL: [58, w, 0], kneeL: 116, ankleL: 32, hipR: [58, w, 0], kneeR: 116, ankleR: 32 });
      const touch = [{ point: 'ankleR', adjust: 'kneeR' }, { point: 'ankleL', adjust: 'kneeL' }];
      ex.keyframes = [
        K('Ring between your knees', 'Lie on your back, knees bent, the ring just above your knees.', { root: [-90, 0, 0], neck: [34, 0, 0], ...legs(16) }, { camera: 20, anchor: 'neckBase', touch, durationMs: 1200, holdMs: 300 }),
        K('Squeeze', 'Press your knees in to squeeze the ring; back stays down.', { root: [-90, 0, 0], neck: [34, 0, 0], ...legs(8) }, { camera: 20, anchor: 'neckBase', touch, durationMs: 1200, holdMs: 800 })]; },
    over: { bilateral: null, ...reps('15–20', 15, 'Hold each squeeze for a breath; release slowly.') },
    description: 'Lying on your back with your knees bent and a Pilates ring between your thighs, squeeze the ring with your inner thighs, hold, and release slowly.',
    setup: ['Lie on your back, knees bent, feet flat and hip-width apart.', 'Place the ring between your thighs, just above your knees.'],
    cues: ['Lower back stays gently on the mat.', 'Squeeze with the inner thighs.', 'Release with control.'], source: { url: 'https://blog.alomoves.com/movement/12-pilates-ring-exercises-for-beginners', title: 'Alo Moves: Pilates ring exercises for beginners' } },
  { id: 'ball-seated-march', base: 'chair-hip-marching', name: 'Stability Ball Seated March', otherNames: ['Swiss Ball Seated March'], category: 'Balance', focus: 'Core and hips (balance)',
    collections: ['Core', 'Balance'], equipment: ['Stability ball'], props: [{ type: 'ball', x: 0, z: -6, r: 48 }],
    // higher than a chair: the thighs slope down to the feet (the hip reaches, not the knee)
    edit: ex => { for (const k of ex.keyframes) k.touch = (k.touch || []).map(t => ({ ...t, adjust: t.adjust.replace('knee', 'hip') })); return ex; },
    steps: [['Sit tall', 'Sit tall on the ball, feet flat, knees over your ankles.'], ['Lift your left knee', 'Lift one foot a little off the floor, staying tall.']],
    description: 'Sitting tall on a stability ball with your feet flat, lift one foot a little off the floor and set it down, then the other, keeping the ball still.',
    setup: ['Sit on the middle of the ball, feet flat and hip-width apart.', 'Knees over your ankles, hands on your hips or by your sides.'],
    cues: ['Stay tall; don\'t lean.', 'Keep the ball still.', 'Small, slow lifts.'], source: { url: 'https://us.physitrack.com/home-exercise-video/seated-marching-on-stability-ball', title: 'Physitrack: Seated marching on a stability ball' } },
  { id: 'ball-crunch', base: 'core-crunch', name: 'Stability Ball Crunch', otherNames: ['Swiss Ball Crunch', 'Exercise Ball Crunch'], collections: ['Core'],
    equipment: ['Stability ball'], props: [{ type: 'ball', x: 0, z: 0, r: 58 }],
    edit: ex => { const legs = { hipL: [20, 0, 0], kneeL: 90, hipR: [20, 0, 0], kneeR: 90 }, touch = [{ point: 'ankleL', adjust: 'kneeL' }, { point: 'ankleR', adjust: 'kneeR' }];
      for (const k of ex.keyframes) { Object.assign(k, { anchor: 'spine', anchorX: 0, anchorZ: 0, touch }); k.pose = { ...k.pose, ...legs, root: [-75, 0, 0] }; }
      ex.keyframes[0].name = 'Lie back on the ball'; ex.keyframes[0].cue = 'Mid-back on the ball, feet flat, thighs level, hands behind your head.';
      return ex; },
    description: 'Lying back over a stability ball with your feet flat and thighs level, curl your chest up toward your thighs, then lower back over the ball.',
    setup: ['Sit on the ball, then walk your feet out and lean back until your mid-back rests on it.', 'Feet flat and hip-width apart, knees over ankles, hands lightly behind your head.'],
    cues: ['Curl up from your ribs; chin slightly tucked.', 'Keep the ball still.', 'Lower slowly over the ball.'], source: ACE(68, 'stability-ball-sit-ups-crunches', 'Stability Ball Sit-Ups & Crunches') },
  { id: 'ball-bridge', base: 'bw-glute-bridge', name: 'Stability Ball Bridge', otherNames: ['Swiss Ball Bridge', 'Straight-Leg Bridge on a Ball'], collections: ['Core', 'Bodyweight'],
    equipment: ['Stability ball'], props: [{ type: 'ball', x: 0, z: 230, r: 58 }],
    edit: ex => { const arms = { shoulderL: [0, 0, 0], shoulderR: [0, 0, 0] }, hands = [{ point: 'handL', adjust: 'shoulderL' }, { point: 'handR', adjust: 'shoulderR' }];
      ex.keyframes = [
        K('Heels on the ball', 'Lie on your back, heels on the ball, legs straight, arms by your sides.', { root: [-90, 0, 0], neck: [34, 0, 0], ...arms, hipL: [35, 0, 0], hipR: [35, 0, 0] }, { anchor: 'neckBase', touch: [{ point: 'ankleL', adjust: 'hipL' }, { point: 'ankleR', adjust: 'hipR' }, ...hands] }),
        K('Lift your hips', 'Press your heels into the ball and lift your hips until your body is straight.', { root: [-107.5, 0, 0], neck: [51.5, 0, 0], ...arms, hipL: [5, 0, 0], hipR: [5, 0, 0] }, { anchor: 'neckBase', touch: [{ point: 'ankleL', adjust: 'hipL' }, { point: 'ankleR', adjust: 'hipR' }, ...hands], holdMs: 800 })]; },
    over: { ...reps('10–12', 10, 'Keep the ball still; hold at the top for a breath.') },
    description: 'Lying on your back with straight legs and your heels on a stability ball, press into the ball to lift your hips until your body is straight, then lower.',
    setup: ['Lie on your back, arms by your sides, palms down.', 'Rest your heels on the top of the ball, legs straight.'],
    cues: ['Squeeze your glutes to lift.', 'Hands press the floor for balance.', 'Lower slowly.'], source: { url: 'https://www.bodbot.com/Exercises/797/Straight-Leg-Supine-Bridge-on-Stability-Ball', title: 'BodBot: Straight-leg supine bridge on a stability ball' } },
  { id: 'mb-slam', base: 'bw-squat', name: 'Medicine Ball Slam', otherNames: ['Med Ball Slam', 'Overhead Slam'], category: 'Strength', focus: 'Core, shoulders and legs (power)',
    collections: ['Free weights', 'Core'], equipment: ['Medicine ball'], props: [{ type: 'medball' }],
    edit: ex => { const st = { anchor: 'ankleL', plant: ['L', 'R'] };
      ex.keyframes = [
        K('Ball at your chest', 'Feet shoulder-width, the ball at your chest.', { shoulderL: [30, 0, 0], elbowL: 110, shoulderR: [30, 0, 0], elbowR: 110 }, { ...st, phase: 'setup', holdMs: 400 }),
        K('Ball overhead', 'Reach the ball up overhead, arms long.', { shoulderL: [170, 0, 0], shoulderR: [170, 0, 0] }, { ...st, durationMs: 900, holdMs: 200 }),
        K('Slam', 'Slam it down in front of your feet, bending hips and knees.', { torso: [55, 0, 0], shoulderL: [80, 0, 0], shoulderR: [80, 0, 0], hipL: [70, 0, 0], kneeL: 70, ankleL: -15, hipR: [70, 0, 0], kneeR: 70, ankleR: -15 },
          { ...st, durationMs: 450, holdMs: 300, touch: [{ point: 'handR', adjust: 'torso', gap: 20 }] }),
        K('Stand tall', 'Stand up with the ball.', { shoulderL: [30, 0, 0], elbowL: 110, shoulderR: [30, 0, 0], elbowR: 110 }, { ...st, phase: 'finish', holdMs: 400 })]; },
    over: { bilateral: null, ...reps('8–12', 10, 'Use a slam ball or a medicine ball made to be thrown, on a floor that can take it. Pick it up with a squat.') },
    description: 'Reach a medicine ball overhead, then slam it down in front of your feet as hard as you can, bending your hips and knees; pick it up and repeat.',
    setup: ['Feet shoulder-width apart, the ball at your chest.', 'A clear, sturdy floor in front of you.'],
    cues: ['Reach tall, then slam down hard.', 'Hinge and bend your knees as you throw.', 'Brace your core.'], source: { url: 'https://www.acefitness.org/continuing-education/certified/august-2026/9179/throw-catch-slam-smarter-medicine-ball-training/', title: 'ACE: Throw, catch, slam, smarter medicine-ball training' } },
];
