// Batch 23 (Sep 2026): the last of the collection research's smaller additions: Cow Face arms with a strap, the
// advanced classical Pilates mat exercises, the classical Bicycle, side stepping and the balance walk.
// node tools/research.cjs variants tools/variants/batch-23-more.cjs [id...]
const SRC = require('./batch-23-sources.cjs');
const reps = (r, n, note) => ({ measure: 'reps', holdStep: null, defaults: { reps: n }, repName: null, prescription: { reps: r, note } });
const K = (name, cue, pose, x = {}) => ({ name, cue, camera: 90, durationMs: 1400, holdMs: 200, phase: 'rep', ...x, pose });
const PIL = { category: 'Pilates', collections: ['Pilates'], equipment: ['Mat'], source: SRC.pilates };
const onAnkles = [{ hand: 'handR', to: 'ankleR', dx: 6 }, { hand: 'handL', to: 'ankleL', dx: -6 }];
// straight legs, a little apart
const V = (f, side = 16) => ({ hipL: [f, side, 0], hipR: [f, side, 0], kneeL: 0, kneeR: 0 });
module.exports = [
  // balanced on the tailbone, legs straight in a V, hands on the ankles: roll back to the shoulder blades and up again
  { id: 'pil-open-leg-rocker', base: 'pil-rolling-ball', name: 'Open Leg Rocker', ...PIL, focus: 'Core, spine and balance',
    // (fitted, Sep 2026: the figure's hands reach the lower shins, as many teach it; the whole shape then rolls as one)
    edit: ex => { const legs = { torso: [31.75, 0, 0], chest: [23, 0, 0], neck: [20, 0, 0], ...V(78, 18), shoulderL: [62.75, 17.25, 0], elbowL: 28.25, shoulderR: [62.75, 17.25, 0], elbowR: 28.25 };
      ex.keyframes = [
        K('Balance', 'Balance on your tailbone, legs straight in a V, holding your ankles or shins.', { root: [-40, 0, 0], ...legs }, { holdMs: 500 }),
        K('Roll back', 'Roll back to your shoulder blades, keeping the shape.', { root: [-118, 0, 0], ...legs }, { durationMs: 1000 }),
        K('Roll up', 'Roll up and balance again.', { root: [-40, 0, 0], ...legs }, { durationMs: 1000, holdMs: 500 })]; },
    over: { ...reps('6', 6, 'Roll only to your shoulder blades; use your stomach to stop at the top.') },
    description: 'Balanced on your tailbone with your legs straight in a V and your hands on your ankles (or shins), roll back to your shoulder blades and back up to balance, keeping the same shape.',
    setup: ['Sit, lift your legs straight into a V and hold your ankles, or your shins.', 'Balance just behind your sitting bones.'],
    cues: ['Keep the V the same the whole time.', 'Chin in, back rounded.', 'Stop and balance at the top.'] },
  // lying with the legs straight up together: circle them to one side, down, round and up (the hips stay down)
  { id: 'pil-corkscrew', base: 'pil-leg-circles', name: 'Corkscrew', otherNames: ['Pilates Corkscrew'], ...PIL, focus: 'Core and obliques',
    edit: ex => { const lie = { root: [-90, 0, 0], neck: [34, 0, 0], shoulderL: [8, 0, 0], shoulderR: [8, 0, 0] };
      const legs = (f, s) => ({ hipL: [f, -s, 0], hipR: [f, s, 0] });   // both legs together, swung to one side
      ex.keyframes = [
        K('Legs up', 'Lying down, legs straight up together, arms long by your sides.', { ...lie, ...legs(90, 0) }, { camera: 25, anchor: 'pelvis', phase: 'setup', durationMs: 1600 }),
        K('To the right', 'Swing both legs to the right.', { ...lie, ...legs(84, 22), torso: [0, 0, -8] }, { camera: 25, anchor: 'pelvis' }),
        K('Down', 'Circle them down.', { ...lie, ...legs(60, 0) }, { camera: 25, anchor: 'pelvis' }),
        K('To the left', 'Round to the left.', { ...lie, ...legs(84, -22), torso: [0, 0, 8] }, { camera: 25, anchor: 'pelvis' }),
        K('Up', 'And back up to the middle.', { ...lie, ...legs(90, 0) }, { camera: 25, anchor: 'pelvis', holdMs: 300 })]; },
    over: { bilateral: null, direction: { labels: { A: 'Right first', B: 'Left first' } }, ...reps('3 each way', 3, 'Small circles to start; the back stays on the mat.') },
    description: 'Lying on your back with your legs straight up together, circle both legs to one side, down, round to the other side and back up, keeping the upper back and arms still on the mat.',
    setup: ['Lie on your back, arms long by your sides.', 'Legs straight up together.'],
    cues: ['Legs glued together.', 'Shoulders and arms stay down.', 'Circle, then reverse.'] },
  // the rolling ball with the knees open and the soles together, hands through the legs round the ankles: clap the feet
  // at the top and at the back
  { id: 'pil-seal', base: 'pil-rolling-ball', name: 'Seal', otherNames: ['Seal Puppy'], ...PIL, focus: 'Core, spine and balance',
    edit: ex => { // (fitted, Sep 2026: the hands reach the ankles with the back still round)
      const ball = (s) => ({ chest: [24, 0, 0], neck: [34, 0, 0], hipL: [126.75, s, 30], kneeL: 155, ankleL: 20, hipR: [126.75, s, 30], kneeR: 155, ankleR: 20,
        shoulderL: [24, -10.25, 0], elbowL: 16, shoulderR: [24, -10.25, 0], elbowR: 16 });
      const hands = [{ hand: 'handR', to: 'ankleR' }, { hand: 'handL', to: 'ankleL' }];
      ex.keyframes = [
        K('Balance', 'Knees open, soles together, hands through your legs holding your ankles.', { root: [-38, 0, 0], ...ball(32) }, { camera: 60, reach: hands, holdMs: 300 }),
        K('Clap', 'Clap your feet together three times.', { root: [-38, 0, 0], ...ball(40) }, { camera: 60, reach: hands, durationMs: 300, holdMs: 0 }),
        K('Clap', 'And again.', { root: [-38, 0, 0], ...ball(32) }, { camera: 60, reach: hands, durationMs: 300, holdMs: 0 }),
        K('Roll back', 'Roll back to your shoulder blades.', { root: [-118, 0, 0], ...ball(32) }, { camera: 60, reach: hands, durationMs: 1000, holdMs: 100 }),
        K('Clap', 'Clap your feet again.', { root: [-118, 0, 0], ...ball(40) }, { camera: 60, reach: hands, durationMs: 300, holdMs: 0 }),
        K('Clap', 'And again.', { root: [-118, 0, 0], ...ball(32) }, { camera: 60, reach: hands, durationMs: 300, holdMs: 0 }),
        K('Roll up', 'Roll up and balance.', { root: [-38, 0, 0], ...ball(32) }, { camera: 60, reach: hands, durationMs: 1000, holdMs: 300 })]; },
    over: { ...reps('6', 6, 'Roll only to your shoulder blades; a playful, even rhythm.') },
    description: 'Balanced on your tailbone with your knees open, soles together and your hands through your legs holding your ankles, clap your feet together, roll back to your shoulder blades, clap again, and roll up to balance.',
    setup: ['Sit with the soles of your feet together, knees open.', 'Slide your hands between your legs and hold the outsides of your ankles; lift your feet and balance.'],
    cues: ['Round like a ball.', 'Clap the feet lightly, three times.', 'Stop at the top and balance.'] },
  // sitting back on the hands, legs straight up together: circle them to one side, down, the other side and up
  { id: 'pil-hip-twist', base: 'pil-teaser', name: 'Hip Twist', otherNames: ['Hip Twist with Stretched Arms', 'Hip Circles (Pilates)'], ...PIL, focus: 'Core and obliques',
    edit: ex => { const lean = { root: [-40, 0, 0], chest: [-8, 0, 0], shoulderL: [-45, 10, 0], shoulderR: [-45, 10, 0] }, hands = [{ point: 'handR', adjust: 'shoulderR' }, { point: 'handL', adjust: 'shoulderL' }];
      const legs = (f, s) => ({ hipL: [f, -s, 0], hipR: [f, s, 0] });
      ex.keyframes = [
        K('Lean back', 'Sit back on your hands, legs straight up together.', { ...lean, ...legs(95, 0) }, { camera: 25, anchor: 'pelvis', touch: hands, phase: 'setup', durationMs: 1600 }),
        K('To the right', 'Swing both legs to the right.', { ...lean, ...legs(88, 22) }, { camera: 25, anchor: 'pelvis', touch: hands }),
        K('Down', 'Circle them down.', { ...lean, ...legs(60, 0) }, { camera: 25, anchor: 'pelvis', touch: hands }),
        K('To the left', 'Round to the left.', { ...lean, ...legs(88, -22) }, { camera: 25, anchor: 'pelvis', touch: hands }),
        K('Up', 'And back up to the middle.', { ...lean, ...legs(95, 0) }, { camera: 25, anchor: 'pelvis', touch: hands, holdMs: 300 })]; },
    over: { bilateral: null, direction: { labels: { A: 'Right first', B: 'Left first' } }, ...reps('3 each way', 3, 'Chest lifted; small circles to start.') },
    description: 'Sitting back on your hands with your legs straight up together, circle both legs to one side, down, round to the other side and back up, keeping the chest lifted.',
    setup: ['Sit and lean back on your hands, arms straight, fingers pointing back.', 'Lift both legs straight up together.'],
    cues: ['Chest lifted, shoulders down.', 'Legs together.', 'Circle from the hips.'] },
  // the Roll-Over, then the legs shoot straight up to the ceiling before rolling down
  { id: 'pil-jackknife', base: 'pil-roll-over', name: 'Jackknife', otherNames: ['Pilates Jackknife'], ...PIL, focus: 'Core and spine',
    edit: ex => { const [up, over, down] = ex.keyframes;
      ex.keyframes = [up, over,
        K('Shoot up', 'Reach your legs straight up to the ceiling, weight on your shoulders.', { root: [-178, 0, 0], neck: [110, 0, 0], shoulderL: [-85, 0, 0], shoulderR: [-85, 0, 0], hipL: [0, 0, 0], hipR: [0, 0, 0] }, { anchor: 'neckBase', durationMs: 1400, holdMs: 400 }),
        { ...down, cue: 'Roll down one vertebra at a time, legs straight up.' , pose: { ...down.pose, hipL: [90, 0, 0], hipR: [90, 0, 0] } }]; },
    description: 'Lying on your back with your legs straight up, roll them over your head until parallel to the floor, reach them straight up to the ceiling with your weight on your shoulders, then roll down slowly.',
    setup: ['Lie on your back, arms long by your sides, palms down.', 'Legs straight up together.'],
    cues: ['Press the arms down.', 'Legs straight up, not over your face.', 'Roll down one vertebra at a time.'] },
  // in the Roll-Over, hands on one ankle over the head, the other leg straight up; switch legs
  { id: 'pil-control-balance', base: 'pil-roll-over', name: 'Control Balance', otherNames: ['Pilates Control Balance'], ...PIL, focus: 'Core, spine and hamstrings',
    edit: ex => { const [up, over] = ex.keyframes, base = { root: [-170, 0, 0], neck: [114, 0, 0] };
      // (fitted, Sep 2026: straight arms reach past the head to the lower leg; the figure's arms don't reach the ankle)
      const hold = { shoulderL: [100, 0, 0], elbowL: 5, shoulderR: [100, 0, 0], elbowR: 5 };
      ex.keyframes = [up, { ...over, cue: 'Roll your legs over your head, toes to the floor.' },
        K('Right leg up', 'Hold your left leg; lift the right leg straight up.', { ...base, hipL: [128.5, 0, 0], hipR: [10, 0, 0], ...hold },
          { anchor: 'neckBase', touch: [{ point: 'toeL', adjust: 'hipL' }], holdMs: 400 }),
        K('Left leg up', 'Switch: hold the right leg, lift the left leg.', { ...base, hipR: [128.5, 0, 0], hipL: [10, 0, 0], ...hold },
          { anchor: 'neckBase', touch: [{ point: 'toeR', adjust: 'hipR' }], holdMs: 400 }),
        { ...over, name: 'Both legs over', cue: 'Both feet down over your head, arms back down.' },
        { ...ex.keyframes[2], cue: 'Roll down one vertebra at a time.' }]; },
    over: { ...reps('3 each leg', 3, 'Weight on the shoulders, never the neck.') },
    description: 'From the Roll-Over with your toes on the floor behind your head, hold one leg (at the ankle if you can) with both hands and lift the other leg straight up to the ceiling, then switch legs, and roll down.',
    setup: ['Lie on your back, arms long, legs straight up.'],
    cues: ['Weight on the shoulders, not the neck.', 'Top leg reaches straight up.', 'Switch with control.'] },
  // the reverse plank: sitting, hands behind, lift the body in one line; kick one leg up and lower it
  { id: 'pil-leg-pull-back', base: 'pil-leg-pull-front', name: 'Leg Pull', otherNames: ['Leg Pull Back', 'Leg Pull Up', 'Reverse Plank Leg Kick'], ...PIL, focus: 'Glutes, hamstrings, shoulders and core',
    edit: ex => { const plank = { root: [-66, 0, 0], shoulderL: [-66, 0, 0], shoulderR: [-66, 0, 0], hipL: [0, 0, 0], ankleL: 30, hipR: [0, 0, 0], ankleR: 30 };
      const heels = [{ point: 'ankleR', adjust: 'hipR' }, { point: 'ankleL', adjust: 'hipL' }];
      ex.keyframes = [
        K('Reverse plank', 'Hands behind you, lift your hips: one straight line, face up.', plank, { anchor: 'handR', touch: heels, holdMs: 300 }),
        K('Kick up', 'Kick the right leg up, toes pointed.', { ...plank, hipR: [70, 0, 0] }, { anchor: 'handR', touch: [heels[1]], durationMs: 1000, holdMs: 200 }),
        K('Lower', 'Lower it with control.', plank, { anchor: 'handR', touch: heels, durationMs: 1200 })]; },
    over: { bilateral: { labels: { L: 'Right leg', R: 'Left leg' } }, ...reps('3 each leg', 3, 'Hips stay lifted when the leg moves.') },
    description: 'Sitting with your legs straight and your hands on the floor behind you, lift your hips until your body is in one straight line facing up, kick one leg up toward the ceiling, lower it, and switch.',
    setup: ['Sit with your legs straight, hands on the floor behind your hips, fingers pointing toward your feet.'],
    cues: ['Hips high, body straight.', 'Kick from the hip, toes pointed.', 'Shoulders down, chest open.'] },
  // the rolling ball with the legs crossed, hands holding the feet: roll back, switch the cross, roll forward onto the
  // knees with the top of the head lightly down
  { id: 'pil-crab', base: 'pil-rolling-ball', name: 'Crab', otherNames: ['Pilates Crab'], ...PIL, focus: 'Core, spine and balance',
    edit: ex => { const cross = (a, b) => ({ chest: [32, 0, 0], neck: [34, 0, 0], ['hip' + a]: [110, 18, 70], ['knee' + a]: 150, ['hip' + b]: [110, 18, 70], ['knee' + b]: 150,
        shoulderL: [24, -10, 0], elbowL: 30, shoulderR: [24, -10, 0], elbowR: 30 });
      ex.keyframes = [
        K('Balance', 'Legs crossed, hands holding your feet, balance on your tailbone.', { root: [-38, 0, 0], ...cross('R', 'L') }, { holdMs: 300 }),
        K('Roll back', 'Roll back to your shoulder blades.', { root: [-118, 0, 0], ...cross('R', 'L') }, { durationMs: 1000, holdMs: 0 }),
        K('Switch', 'Switch the cross of your legs.', { root: [-118, 0, 0], ...cross('L', 'R'), hipR: [110, 18, 60] }, { durationMs: 500, holdMs: 0 }),
        K('Roll forward', 'Roll up and over onto your knees, the top of your head touching down lightly.', { root: [84, 0, 0], chest: [22, 0, 0], neck: [25.5, 0, 0],   // (fitted, Sep 2026: knees and head down)
          hipL: [138, 18, 70], kneeL: 150, hipR: [138, 18, 60], kneeR: 150, shoulderL: [24, -10, 0], elbowL: 30, shoulderR: [24, -10, 0], elbowR: 30 }, { durationMs: 1400, holdMs: 300 }),
        K('Roll back up', 'Roll back to balance.', { root: [-38, 0, 0], ...cross('L', 'R') }, { durationMs: 1200, holdMs: 300 })]; },
    over: { ...reps('6', 6, 'Very little weight on the head; use your stomach to roll.') },
    description: 'Curled up with your legs crossed and your hands holding your feet, roll back to your shoulder blades, switch the cross of your legs, then roll forward onto your knees with the top of your head touching down lightly, and roll back to balance.',
    setup: ['Sit, cross your legs and hold your feet, right hand on the left foot and left hand on the right.', 'Lift your feet and balance on your tailbone.'],
    cues: ['Stay round.', 'Switch the legs quickly at the back.', 'Barely touch the head down.'] },
  // on the shoulders, hands under the hips: the legs pedal like riding a bicycle upside down
  { id: 'pil-bicycle', base: 'pil-roll-over', name: 'Pilates Bicycle', otherNames: ['Classical Bicycle', 'Shoulder Stand Bicycle'], ...PIL, focus: 'Core, hips and hamstrings',
    edit: ex => { const [up] = ex.keyframes, stand = { root: [-160, 0, 0], neck: [110, 0, 0], shoulderL: [-60, 0, 0], elbowL: 90, shoulderR: [-60, 0, 0], elbowR: 90 };
      ex.keyframes = [up,
        K('Up on your shoulders', 'Lift your hips, hands supporting your lower back.', { ...stand, hipL: [25, 0, 0], hipR: [25, 0, 0] }, { anchor: 'neckBase', durationMs: 2000, phase: 'setup' }),
        K('Right leg over', 'Right leg reaches over your head; left leg reaches away.', { ...stand, hipR: [80, 0, 0], hipL: [-25, 0, 0] }, { anchor: 'neckBase', durationMs: 1000 }),
        K('Pedal', 'Bend the left knee and bring it through.', { ...stand, hipR: [20, 0, 0], hipL: [40, 0, 0], kneeL: 110 }, { anchor: 'neckBase', durationMs: 800 }),
        K('Left leg over', 'Left leg reaches over; right leg reaches away.', { ...stand, hipL: [80, 0, 0], hipR: [-25, 0, 0] }, { anchor: 'neckBase', durationMs: 1000 }),
        K('Pedal', 'Bend the right knee and bring it through.', { ...stand, hipL: [20, 0, 0], hipR: [40, 0, 0], kneeR: 110 }, { anchor: 'neckBase', durationMs: 800 })]; },
    over: { ...reps('5 each way', 5, 'Weight on the shoulders and upper arms, never the neck.') },
    description: 'Up on your shoulders with your hands supporting your lower back, pedal your legs as if riding a bicycle upside down: one leg reaches over your head as the other reaches away, then bends and comes through.',
    setup: ['Lie on your back, legs up.', 'Roll up onto your shoulders and support your lower back with your hands, elbows on the mat.'],
    cues: ['Big, slow strides.', 'Hips lifted.', 'Weight on the shoulders, not the neck.'] },
  // from Swan, the arms release forward and the body rocks on the front, chest down and legs up, then back
  { id: 'pil-swan-dive', base: 'pil-swan', name: 'Swan Dive', otherNames: ['Pilates Swan Dive'], ...PIL, focus: 'Back and glutes',
    edit: ex => { const [lie, lift] = ex.keyframes;
      const arms = { shoulderL: [150, 10, 0], elbowL: 5, shoulderR: [150, 10, 0], elbowR: 5 };
      ex.keyframes = [{ ...lie, phase: 'setup' }, { ...lift, pose: { ...lift.pose, torso: [-26, 0, 0], chest: [-16, 0, 0] } },
        K('Rock forward', 'Let go and rock forward onto your chest, arms reaching forward, legs lifting.', { root: [104, 0, 0], torso: [-18, 0, 0], chest: [-10, 0, 0], neck: [-20, 0, 0], ...arms,
          hipL: [-22, 0, 0], hipR: [-22, 0, 0], ankleL: 60, ankleR: 60 }, { durationMs: 700, holdMs: 0 }),
        K('Rock back', 'Rock back, chest lifting, legs lowering.', { root: [78, 0, 0], torso: [-26, 0, 0], chest: [-16, 0, 0], neck: [-20, 0, 0], ...arms,
          ankleL: 60, ankleR: 60 }, { durationMs: 700, holdMs: 0 })]; },
    over: { ...reps('6 rocks', 6, 'Keep the long arched shape; rock, don\'t bend in the middle.') },
    description: 'Lying face down, press up into Swan, then let go of the floor and rock forward onto your chest with your arms reaching forward and your legs lifting, and back up again, keeping one long arched shape.',
    setup: ['Lie on your front, hands under your shoulders.', 'Legs long and together.'],
    cues: ['One long curve from head to toes.', 'Legs stay straight.', 'Rock like a rocking chair.'] },
  // lying face down holding the ankles (a bow): rock forward and back
  { id: 'pil-rocking', base: 'pil-swan', name: 'Rocking', otherNames: ['Pilates Rocking'], ...PIL, focus: 'Back, shoulders and front of the thighs',
    edit: ex => { const [lie] = ex.keyframes, bow = { torso: [-20, 0, 0], chest: [-12, 0, 0], neck: [-15, 0, 0], hipL: [-18, 8, 0], kneeL: 125.75, ankleL: 60, hipR: [-18, 8, 0], kneeR: 125.75, ankleR: 60,
        // (fitted, Sep 2026: straight arms reach back to the ankles)
        shoulderL: [-48, -6, 0], elbowL: 1, shoulderR: [-48, -6, 0], elbowR: 1 };
      const hands = [];
      ex.keyframes = [{ ...lie, phase: 'setup' },
        K('Hold your ankles', 'Bend your knees and hold your ankles; lift chest and thighs.', { root: [90, 0, 0], ...bow }, { anchor: 'pelvis', reach: hands, durationMs: 1800, holdMs: 300, phase: 'setup' }),
        K('Rock forward', 'Rock forward onto your chest.', { root: [104, 0, 0], ...bow }, { reach: hands, durationMs: 700, holdMs: 0 }),
        K('Rock back', 'Rock back onto your thighs.', { root: [78, 0, 0], ...bow }, { reach: hands, durationMs: 700, holdMs: 0 })]; },
    over: { ...reps('6 rocks', 6, 'Kick the feet into the hands to lift; keep the shape the same.') },
    description: 'Lying face down with your knees bent and your hands holding your ankles, press the feet into your hands to lift your chest and thighs, then rock forward and back like a rocking chair.',
    setup: ['Lie on your front.', 'Bend your knees and hold your ankles from the outside.'],
    cues: ['Press the feet into your hands.', 'Keep the bow shape.', 'Rock, don\'t bend.'] },
  // kneeling, leaning over onto one hand, the top leg lifted to hip height kicks forward and sweeps back
  { id: 'pil-kneeling-side-kick', base: 'pil-side-kick', name: 'Kneeling Side Kick', otherNames: ['Pilates Kneeling Side Kick'], ...PIL, focus: 'Hips, waist and balance',
    edit: ex => { // (fitted, Sep 2026: the kneeling thigh upright under the hip, the trunk leaning onto the straight arm)
      const side = { root: [0, 70, 0], neck: [0, -20, 0], hipR: [0, 60, 0], kneeR: 90, ankleR: 90, shoulderR: [0, 70, 0], shoulderL: [0, 150, 0], elbowL: 140 };
      const hand = [{ point: 'handR', adjust: 'shoulderR' }];
      ex.keyframes = [
        K('Lean over', 'Kneel, place one hand down under your shoulder, other hand behind your head; lift the top leg to hip height.', { ...side, hipL: [0, 20, 0] }, { camera: 30, anchor: 'kneeR', phase: 'setup', durationMs: 1800 }),
        K('Kick forward', 'Kick the top leg forward.', { ...side, hipL: [70, 20, 0] }, { camera: 30, anchor: 'kneeR', durationMs: 900, holdMs: 0 }),
        K('Sweep back', 'Sweep it back behind you.', { ...side, hipL: [-25, 20, 0] }, { camera: 30, anchor: 'kneeR', durationMs: 1100, holdMs: 0 })]; },
    over: { bilateral: { labels: { L: 'Left leg', R: 'Right leg' } }, ...reps('6 each side', 6, 'Keep the hips stacked; the kick comes from the hip, not the back.') },
    description: 'Kneeling, lean over onto one hand under your shoulder with the other hand behind your head, lift the top leg to hip height, then kick it forward and sweep it back behind you.',
    setup: ['Kneel up tall.', 'Lean to one side and put that hand down under your shoulder; other hand behind your head.', 'Lift the top leg straight out to hip height.'],
    cues: ['Hips stacked.', 'Leg level with the hip.', 'Waist lifted off the floor.'] },
  // ---------- yoga ----------
  // sitting cross-legged: one arm reaches down the back, the other over the shoulder, a strap between the hands
  { id: 'yoga-cow-face-arms-strap', base: 'yoga-easy', name: 'Cow Face Arms with a Strap', otherNames: ['Gomukhasana Arms with a Strap'],
    category: 'Flexibility', focus: 'Shoulders and chest', collections: ['Yoga', 'Stretches'], equipment: ['Yoga mat', 'Yoga strap'], props: [{ type: 'strap', from: 'handR', to: 'handL' }],
    edit: ex => { const [staff, easy] = ex.keyframes, arms = { shoulderL: [-30, 10, -80], elbowL: 100, shoulderR: [-180, 0, 0], elbowR: 118 };
      ex.keyframes = [{ ...easy, phase: 'setup', durationMs: 1800, holdMs: 300 },
        { ...easy, name: 'Cow Face Arms', cue: 'Top hand behind your head, bottom hand up your back; walk the hands along the strap toward each other.', camera: 90, reach: [{ hand: 'handL', to: 'handR', dx: -44, dy: -78 }], holdMs: 30000, pose: { ...easy.pose, ...arms } }]; },
    over: { bilateral: { labels: { L: 'Left arm up', R: 'Right arm up' } }, measure: 'time', holdStep: 1, defaults: { seconds: 30 }, repName: null, prescription: { seconds: '30', note: 'Sit tall; don\'t let the top elbow push the head forward.' } },
    description: 'Sitting cross-legged, reach one arm down and up the middle of your back and the other over your shoulder and down, holding a strap between the hands, and walk the hands toward each other.',
    setup: ['Sit cross-legged, tall.', 'Hold a strap in the top hand and let it hang down your back.'],
    cues: ['Top elbow points up.', 'Bottom hand slides up the back.', 'Sit tall; chest open.'], source: SRC.cowFaceStrap },
  // ---------- balance ----------
  { id: 'bal-side-stepping', base: 'band-lateral-walk', name: 'Side Stepping', otherNames: ['Sideways Walking', 'Side Steps'],
    category: 'Balance', focus: 'Balance and hips', collections: ['Balance', 'Warm-up'], equipment: [], props: [],
    edit: ex => { const tall = { shoulderL: [-27.5, 0, 0], elbowL: 69.4, shoulderR: [-27.5, 0, 0], elbowR: 69.4, kneeL: 6, kneeR: 6, ankleL: -3, ankleR: -3 };
      ex.keyframes = ex.keyframes.map((k, i) => ({ ...k, cue: i ? 'Step your right foot out to the side, then bring the left to meet it.' : 'Stand tall, feet together, hands on your hips.',
        name: i ? 'Step to the side' : 'Feet together', pose: { ...tall, hipL: [3, i ? 12 : 2, 0], hipR: [3, i ? 12 : 2, 0] } })); },
    over: { ...reps('10 each way', 10, 'Stand near a counter or wall to hold if you need it.') },
    description: 'Standing tall with your hands on your hips, step one foot out to the side and bring the other to meet it, pausing each time; go one way, then come back the other way.',
    setup: ['Stand tall, feet together, hands on your hips.', 'A counter or wall nearby if you need support.'],
    cues: ['Stand tall; hips level.', 'Step, meet, pause.', 'Look ahead, not down.'], source: SRC.sideStepping },
  { id: 'bal-balance-walk', base: 'bal-heel-to-toe-walk', name: 'Balance Walk', otherNames: ['Balance Walking'],
    category: 'Balance', focus: 'Balance', collections: ['Balance'], equipment: [],
    edit: ex => { const [r, l] = ex.keyframes, arms = { shoulderL: [0, 88, 0], shoulderR: [0, 88, 0] };
      ex.keyframes = [
        { ...r, name: 'Right foot in front', cue: 'Arms out to the sides; step the right foot in front.', pose: { ...r.pose, ...arms } },
        { ...r, name: 'Lift the back knee', cue: 'Lift the left knee and pause for a second.', anchor: 'ankleR', plant: ['R'], holdMs: 1000, pose: { ...arms, hipR: [0, 0, 0], hipL: [70, 0, 0], kneeL: 80 } },
        { ...l, name: 'Left foot in front', cue: 'Step the left foot forward.', pose: { ...l.pose, ...arms } },
        { ...l, name: 'Lift the back knee', cue: 'Lift the right knee and pause for a second.', anchor: 'ankleL', plant: ['L'], holdMs: 1000, pose: { ...arms, hipL: [0, 0, 0], hipR: [70, 0, 0], kneeR: 80 } }]; },
    over: { direction: null, ...reps('20 steps', 10, 'Pick a spot ahead to look at; hold a wall or counter if you need it.') },
    description: 'With your arms out to the sides at shoulder height, walk slowly in a straight line, one foot just in front of the other; as you step, lift the back knee and pause for a second before stepping forward.',
    setup: ['Stand tall, arms out to the sides at shoulder height.', 'Pick a spot ahead to look at.'],
    cues: ['Eyes on your spot.', 'Lift the knee and pause.', 'Slow and steady.'], source: SRC.balanceWalk },
  // sitting with the legs crossed: roll over, switch the cross, roll up to a Teaser with the arms reaching back, lower the
  // legs as the arms circle round, fold forward, sit up
  { id: 'pil-boomerang', base: 'pil-teaser', name: 'Boomerang', otherNames: ['Pilates Boomerang'], ...PIL, focus: 'Core, spine and hamstrings',
    edit: ex => { const legs = (a) => ({ hipL: [a, -3, 0], hipR: [a, 3, 0] });
      const sit = { shoulderL: [-24, 0, 0], shoulderR: [-24, 0, 0], ...legs(90) }, hands = [{ point: 'handR', adjust: 'shoulderR' }, { point: 'handL', adjust: 'shoulderL' }];
      ex.keyframes = [
        K('Sit tall', 'Sit tall, legs straight and crossed at the ankles, hands by your hips.', sit, { anchor: 'pelvis', touch: hands, phase: 'setup', durationMs: 1600 }),
        K('Roll over', 'Roll back and over, legs over your head, arms pressing down.', { root: [-170, 0, 0], neck: [114, 0, 0], shoulderL: [-75, 0, 0], shoulderR: [-75, 0, 0], ...legs(110) },
          { anchor: 'neckBase', durationMs: 2000, holdMs: 100 }),
        K('Switch', 'Open and switch the cross of the ankles.', { root: [-170, 0, 0], neck: [114, 0, 0], shoulderL: [-75, 0, 0], shoulderR: [-75, 0, 0], hipL: [110, 6, 0], hipR: [110, 6, 0] },
          { anchor: 'neckBase', durationMs: 500, holdMs: 0 }),
        K('Teaser', 'Roll up to balance in a V, arms reaching toward your feet.', { root: [-40, 0, 0], chest: [10, 0, 0], neck: [10, 0, 0], shoulderL: [70, 0, 0], shoulderR: [70, 0, 0], ...legs(95) },
          { anchor: 'pelvis', durationMs: 2200, holdMs: 400 }),
        K('Lower the legs', 'Lower the legs; the arms sweep down and behind your back.', { shoulderL: [-25, 8, 0], shoulderR: [-25, 8, 0], ...legs(90) }, { anchor: 'pelvis', durationMs: 1600 }),
        K('Fold forward', 'Fold forward over your legs, arms lifting behind you.', { torso: [55, 0, 0], chest: [20, 0, 0], neck: [15, 0, 0], shoulderL: [-60, 0, 0], shoulderR: [-60, 0, 0], ...legs(90) },
          { anchor: 'pelvis', durationMs: 1600, holdMs: 300 }),
        // (the arms circle out to the sides: straight from behind to the front they would pass through the legs)
        K('Circle round', 'Circle the arms out to the sides...', { torso: [55, 0, 0], chest: [20, 0, 0], neck: [15, 0, 0], shoulderL: [30, 95, 0], shoulderR: [30, 95, 0], ...legs(90) },
          { anchor: 'pelvis', durationMs: 900, holdMs: 0 }),
        K('Reach', '...and round to reach toward your feet.', { torso: [55, 0, 0], chest: [20, 0, 0], neck: [15, 0, 0], shoulderL: [150, 0, 0], shoulderR: [150, 0, 0], ...legs(90) },
          { anchor: 'pelvis', durationMs: 900 }),
        K('Sit up', 'Roll up to sit tall, hands by your hips.', sit, { anchor: 'pelvis', touch: hands, durationMs: 1600 })]; },
    over: { ...reps('4', 4, 'Advanced: learn the Roll-Over and the Teaser first. Switch the cross each time.') },
    description: 'Sitting with your legs straight and crossed at the ankles, roll back and over, switch the cross, roll up to balance in a Teaser, lower the legs as the arms sweep behind you, fold forward with the arms lifting behind, circle them round to your feet and sit up.',
    setup: ['Sit tall, legs straight and crossed at the ankles.', 'Hands on the mat by your hips.'],
    cues: ['One smooth, flowing movement.', 'Weight on the shoulders when over.', 'Balance at the top of the Teaser.'] },
];
