// Batch 21 (Sep 2026): equipment versions of library exercises (the ⏳ rows of docs/equipment-equivalents.md) that use
// equipment the library already has. Most keep the base exercise's moves and change what's held or stood on.
// node tools/research.cjs variants tools/variants/batch-21-versions.cjs [id...]
const SRC = require('./batch-21-sources.cjs');
const map = (ex, f) => { ex.keyframes = ex.keyframes.map(f); };
const DB2 = (axis = 'lr') => [{ type: 'dumbbell', hand: 'handL', axis }, { type: 'dumbbell', hand: 'handR', axis }];
const reps = (r, n, note) => ({ measure: 'reps', holdStep: null, defaults: { reps: n }, repName: null, prescription: { reps: r, note } });
// the back-squat bar across the upper back, hands on it
const BAR_BACK = { reach: [{ hand: 'handR', to: 'backR', dx: 8.8, dy: 2, dz: -4 }, { hand: 'handL', to: 'backL', dx: -8.8, dy: 2, dz: -4 }], arms: { shoulderL: [0, 80, 90], elbowL: 140, shoulderR: [0, 80, 90], elbowR: 140 } };
const noArms = p => { const q = { ...p }; for (const k of ['shoulderL', 'shoulderR', 'elbowL', 'elbowR']) delete q[k]; return q; };
module.exports = [
  { id: 'fw-bb-reverse-lunge', base: 'bw-reverse-lunge', name: 'Barbell Reverse Lunge', otherNames: ['Back Rack Reverse Lunge'],
    category: 'Strength', focus: 'Thighs and glutes', collections: ['Free weights'], equipment: ['Barbell'], props: [{ type: 'barbell', from: 'handL', to: 'handR' }],
    edit: ex => map(ex, k => ({ ...k, reach: BAR_BACK.reach, pose: { ...noArms(k.pose), ...BAR_BACK.arms } })),
    description: 'With a barbell across your upper back, step one foot back and lower until both knees are bent, then push through the front foot to stand.',
    setup: ['Set the bar across your upper back, hands just wider than your shoulders.', 'Stand tall, feet hip-width apart.'],
    cues: ['Step back, not out to the side.', 'Front knee over the ankle.', 'Chest up; push through the front heel.'], source: SRC.bbReverseLunge },
  { id: 'fw-db-calf-raise-single', base: 'calf-raise-single', name: 'Single-Leg Dumbbell Calf Raise', otherNames: ['One-Leg Dumbbell Calf Raise'],
    category: 'Strength', focus: 'Calves and balance', collections: ['Free weights'], equipment: ['Dumbbells', 'Wall'],
    props: [{ type: 'wall', at: 'handL', keyframe: 0 }, { type: 'dumbbell', hand: 'handR', axis: 'fb' }],
    // one hand on the wall for balance, the other holding a dumbbell by the side
    edit: ex => map(ex, k => ({ ...k, ...(k.keep ? { keep: ['handL'] } : {}), pose: { ...k.pose, shoulderR: [0, 4, 0], elbowR: 6 } })),
    description: 'Standing on one leg with a dumbbell in the other hand and a hand on a wall for balance, rise onto the ball of the foot, then lower slowly.',
    setup: ['Stand on one leg beside a wall, a hand on it for balance.', 'Hold a dumbbell in the other hand by your side.'],
    cues: ['Rise as high as you can.', 'Lower slowly.', 'Stand tall; don\'t lean on the wall.'], source: SRC.slCalf },
  { id: 'fw-db-deadlift', base: 'fw-bb-deadlift', name: 'Dumbbell Deadlift', otherNames: ['DB Deadlift'],
    category: 'Strength', focus: 'Glutes, hamstrings and back', collections: ['Free weights'], equipment: ['Dumbbells'], props: DB2('lr'),
    description: 'With a dumbbell on the floor beside each foot, hinge and bend your knees to grip them, then stand up tall by driving your hips forward, and lower them back down.',
    setup: ['Stand with a dumbbell just outside each foot.', 'Feet hip-width apart.'],
    cues: ['Back flat, chest up.', 'Push the floor away.', 'Weights stay close to your legs.'], source: SRC.dbDeadlift },
  { id: 'fw-db-swing', base: 'fw-kb-swing', name: 'Dumbbell Swing', otherNames: ['DB Swing'],
    category: 'Strength', focus: 'Glutes, hamstrings and core (power)', collections: ['Free weights'], equipment: ['Dumbbells'],
    props: [{ type: 'dumbbell', hand: 'handR', axis: 'ud' }],
    description: 'Holding one dumbbell by one end in both hands, hinge and let it swing back between your legs, then drive your hips forward to swing it up to chest height.',
    setup: ['Hold one dumbbell by one end in both hands, arms long.', 'Feet a little wider than your hips.'],
    cues: ['Hinge, don\'t squat.', 'Snap your hips forward.', 'Arms just guide the weight.'], source: SRC.dbSwing },
  { id: 'fw-db-sit-to-stand', base: 'chair-sit-to-stand', name: 'Dumbbell Sit-to-Stand', otherNames: ['Goblet Sit-to-Stand', 'Dumbbell Chair Squat'],
    category: 'Strength', focus: 'Thighs and glutes', collections: ['Free weights', 'Chair-based'], equipment: ['Dumbbells', 'Chair'],
    props: p => [...p, { type: 'dumbbell', hand: 'handR', axis: 'ud' }],
    // one dumbbell held upright at the chest in both hands (the base reaches the arms forward)
    edit: ex => map(ex, k => ({ ...k, reach: [{ hand: 'handR', to: 'neckBase', dx: 6, dy: -38, dz: 22 }, { hand: 'handL', to: 'neckBase', dx: -6, dy: -38, dz: 22 }],
      pose: { ...k.pose, shoulderL: [30, -10, 0], elbowL: 120, shoulderR: [30, -10, 0], elbowR: 120 } })),
    description: 'Sitting on a chair holding a dumbbell upright at your chest, lean forward and stand up, then slowly sit back down.',
    setup: ['Sit near the front of a sturdy chair, feet flat.', 'Hold one dumbbell upright at your chest with both hands.'],
    cues: ['Lean forward, then stand.', 'Push through your heels.', 'Sit down slowly, under control.'], source: SRC.dbSitStand },
  { id: 'fw-db-upright-row', base: 'band-upright-row', name: 'Dumbbell Upright Row', otherNames: ['DB Upright Row'],
    category: 'Strength', focus: 'Shoulders and upper back', collections: ['Free weights'], equipment: ['Dumbbells'], props: DB2('lr'),
    description: 'Holding a dumbbell in each hand in front of your thighs, pull them straight up to your chest, elbows leading high and out, then lower.',
    setup: ['Stand tall, a dumbbell in each hand in front of your thighs.'],
    cues: ['Elbows lead, higher than your hands.', 'Stop at shoulder height.', 'Shoulders down, away from your ears.'], source: SRC.uprightRow },
  { id: 'fw-bb-upright-row', base: 'band-upright-row', name: 'Barbell Upright Row', otherNames: ['BB Upright Row'],
    category: 'Strength', focus: 'Shoulders and upper back', collections: ['Free weights'], equipment: ['Barbell'], props: [{ type: 'barbell', from: 'handL', to: 'handR' }],
    description: 'Holding a barbell in front of your thighs, hands about shoulder-width apart, pull it straight up to your chest, elbows leading high and out, then lower.',
    setup: ['Stand tall, the bar in front of your thighs, hands about shoulder-width apart.'],
    cues: ['Elbows lead, higher than your hands.', 'Stop at shoulder height.', 'Bar close to your body.'], source: SRC.uprightRow },
  { id: 'fw-db-dead-bug', base: 'core-dead-bug', name: 'Dumbbell Dead Bug', otherNames: ['Weighted Dead Bug'],
    category: 'Core', focus: 'Deep core', collections: ['Free weights', 'Core'], equipment: ['Dumbbells'], props: DB2('lr'),
    description: 'Lying on your back holding light dumbbells straight up over your shoulders, knees bent over your hips, lower one arm overhead and the opposite leg toward the floor, then return and switch.',
    setup: ['Lie on your back, a light dumbbell in each hand, arms straight up.', 'Knees bent over your hips.'],
    cues: ['Low back stays on the floor.', 'Move slowly.', 'Breathe out as you reach.'], source: SRC.deadBug },
  { id: 'band-bird-dog', base: 'core-bird-dog', name: 'Banded Bird Dog', otherNames: ['Resistance Band Bird Dog'],
    category: 'Core', focus: 'Core, glutes and back', collections: ['Resistance band', 'Core'], equipment: ['Resistance band'],
    // the band loops round the reaching foot and is held in the reaching hand, so it stretches as both extend
    props: [{ type: 'band', from: 'handR', to: 'footL' }],
    description: 'On hands and knees with a band looped round one foot and held in the opposite hand, reach that arm forward and that leg back against the band, then return.',
    setup: ['On hands and knees, wrists under shoulders.', 'Loop a band round one foot and hold the other end in the opposite hand.'],
    cues: ['Reach long, don\'t lift high.', 'Hips level.', 'Slow back in.'], source: SRC.birdDog },
  { id: 'fw-db-turkish-get-up', base: 'kb-turkish-get-up', name: 'Dumbbell Turkish Get-Up', otherNames: ['Dumbbell Get-Up'],
    category: 'Core', focus: 'Whole body, shoulders and core', collections: ['Free weights', 'Core'], equipment: ['Dumbbells'], props: [{ type: 'dumbbell', hand: 'handR', axis: 'lr' }],
    description: 'The Turkish get-up with a dumbbell held straight up: from lying on your back, rise step by step to standing with the weight overhead, then reverse back down.',
    setup: ['Lie on your back, a dumbbell held straight up over your shoulder.', 'Bend the knee on the same side, foot flat.'],
    cues: ['Eyes on the weight.', 'Arm straight and locked.', 'Slow and steady.'], source: SRC.getUp },
  { id: 'bw-get-up', base: 'kb-turkish-get-up', name: 'Bodyweight Get-Up', otherNames: ['Bodyweight Turkish Get-Up', 'Naked Get-Up'],
    category: 'Core', focus: 'Whole body, shoulders and core', collections: ['Bodyweight', 'Core'], equipment: [], props: [],
    description: 'The Turkish get-up with no weight, a fist held straight up: from lying on your back, rise step by step to standing, then reverse back down. The way to learn it before adding a weight.',
    setup: ['Lie on your back, one arm straight up, hand in a fist.', 'Bend the knee on the same side, foot flat.'],
    cues: ['Eyes on your fist.', 'Arm straight the whole way.', 'Slow and steady.'], source: SRC.getUp },
  { id: 'fw-db-clean', base: 'kb-clean', name: 'Dumbbell Clean', otherNames: ['Single-Arm Dumbbell Clean', 'Dumbbell Hang Clean'],
    category: 'Strength', focus: 'Hips, shoulders and grip (power)', collections: ['Free weights'], equipment: ['Dumbbells'], props: [{ type: 'dumbbell', hand: 'handR', axis: 'lr' }],
    description: 'Holding a dumbbell in one hand, hinge to bring it between your knees, then drive your hips forward and pull it up close to your body, catching it at your shoulder.',
    setup: ['Stand with a dumbbell in one hand, arm long.', 'Feet hip-width apart.'],
    cues: ['Power comes from your hips.', 'Keep it close as it rises.', 'Catch it softly at your shoulder.'], source: SRC.dbClean },
  { id: 'mb-around-the-world', base: 'kb-around-the-world', name: 'Medicine Ball Around the World', otherNames: ['Medicine Ball Pass Around', 'Around the World with a Ball'],
    category: 'Core', focus: 'Core, grip and shoulders', collections: ['Free weights', 'Warm-up'], equipment: ['Medicine ball'], props: [{ type: 'medball' }],
    description: 'Standing tall, pass a medicine ball from hand to hand around your waist, in front and behind, then go the other way.',
    setup: ['Stand tall, feet hip-width apart.', 'Hold a light medicine ball in front of you.'],
    cues: ['Hips and shoulders stay square.', 'Pass it close to your body.', 'Change direction halfway.'], source: SRC.mbAtw },
  { id: 'fw-db-wall-sit', base: 'bw-wall-sit', name: 'Wall Sit with Dumbbells', otherNames: ['Weighted Wall Sit', 'Dumbbell Wall Sit'],
    category: 'Strength', focus: 'Thighs', collections: ['Free weights'], equipment: ['Dumbbells', 'Wall'], props: p => [...p, ...DB2('fb')],
    edit: ex => map(ex, k => ({ ...k, pose: { ...k.pose, shoulderL: [2, 4, 0], shoulderR: [2, 4, 0] } })),
    description: 'Back against a wall and a dumbbell in each hand by your sides, slide down until your knees are bent to about a right angle, and hold.',
    setup: ['Back flat against a wall, feet a step out from it.', 'A dumbbell in each hand, arms by your sides.'],
    cues: ['Knees over ankles.', 'Back flat on the wall.', 'Breathe steadily.'], source: SRC.wallSit },
  { id: 'fw-db-glute-bridge', base: 'bw-glute-bridge', name: 'Dumbbell Glute Bridge', otherNames: ['Weighted Glute Bridge'],
    category: 'Strength', focus: 'Glutes and hamstrings', collections: ['Free weights'], equipment: ['Dumbbells'], props: [{ type: 'dumbbell', hand: 'handR', axis: 'lr' }],
    // a dumbbell held across the hips with both hands (arm angles fitted per step: hands just above the hip bones)
    edit: ex => { const arms = [{ sh: [-0.5, 16.75, -62.75], el: 48 }, { sh: [11.5, 0, -9], el: 49 }];
      ex.keyframes = ex.keyframes.map((k, i) => ({ ...k, keep: (k.keep || []).filter(p => !/^hand/.test(p)), reach: [],
        pose: { ...noArms(k.pose), shoulderL: arms[i].sh, elbowL: arms[i].el, shoulderR: arms[i].sh, elbowR: arms[i].el } })); },
    description: 'Lying on your back, knees bent, a dumbbell held across your hips, press through your heels to lift your hips, then lower.',
    setup: ['Lie on your back, knees bent, feet flat.', 'Rest a dumbbell across your hips, holding it with both hands.'],
    cues: ['Squeeze your glutes at the top.', 'Ribs down.', 'Lower slowly.'], source: SRC.dbBridge },
  { id: 'bench-hip-thrust', base: 'fw-bb-hip-thrust', name: 'Bodyweight Hip Thrust', otherNames: ['Bench Hip Thrust'],
    category: 'Strength', focus: 'Glutes and hamstrings', collections: ['Bodyweight'], equipment: ['Bench'], props: p => p.filter(k => k.type === 'bench'),
    description: 'Upper back against a bench, knees bent and feet flat, drive through your heels to lift your hips until your body is flat from shoulders to knees, then lower.',
    setup: ['Sit with your upper back against the side of a bench.', 'Knees bent, feet flat, hands on your hips.'],
    cues: ['Chin tucked, ribs down.', 'Squeeze your glutes at the top.', 'Knees over ankles.'], source: SRC.hipThrust },
  // ---- part 2: new poses ----
  // a bench (70 high) instead of a step (30): the leading leg lifts higher
  { id: 'bench-step-up', base: 'step-up', name: 'Bench Step-Up', otherNames: ['High Step-Up', 'Box Step-Up'],
    category: 'Strength', focus: 'Thighs and glutes', collections: ['Bodyweight'], equipment: ['Bench'], props: [{ type: 'bench', z: 75, width: 90, depth: 140, height: 70 }],
    edit: ex => { const k = ex.keyframes; k[1].pose = { ...k[1].pose, hipR: [95, 0, 0], kneeR: 110, ankleR: -20 };
      // (the right foot steps back down to where it started, the left still on the bench, its knee bent deep)
      k[3].pose = { ...k[3].pose, torso: [18, 0, 0], hipL: [78, 0, 0], kneeL: 105, ankleL: -30, hipR: [4.2, 0, 0], kneeR: 1.3, ankleR: 2.9 };
      k[2].durationMs = 2200; },
    description: 'Step one foot up onto a sturdy bench, drive through it to stand tall on the bench, then step back down one foot at a time.',
    setup: ['Stand facing a sturdy bench, about knee height.'],
    cues: ['Whole foot on the bench.', 'Push through the top foot, not the one below.', 'Step down with control.'], source: SRC.benchStepUp },
  // the balls of the feet on the front edge of a step, heels hanging: drop the heels below the step, then rise high
  { id: 'step-calf-raise', base: 'calf-raise', name: 'Step Calf Raise', otherNames: ['Calf Raise on a Step', 'Deficit Calf Raise'],
    category: 'Strength', focus: 'Calves', collections: ['Bodyweight'], equipment: ['Step', 'Wall'],
    props: [{ type: 'step', z: 60, width: 60 }, { type: 'wall', z: 120 }],
    edit: ex => { const st = { anchor: 'toeL', anchorZ: 38, plant: [] };
      ex.keyframes = [
        { ...ex.keyframes[0], ...st, name: 'Heels down', cue: 'Balls of your feet on the step edge; let your heels drop.', reach: [{ hand: 'handL', to: 'wall' }, { hand: 'handR', to: 'wall' }], pose: { ...ex.keyframes[0].pose, ankleL: -22, ankleR: -22 } },
        { ...ex.keyframes[1], ...st, name: 'Rise', cue: 'Rise onto your toes, as high as you can.', keep: [], reach: [{ hand: 'handL', to: 'wall' }, { hand: 'handR', to: 'wall' }], pose: { ...ex.keyframes[1].pose, ankleL: 38, ankleR: 38 } }]; },
    description: 'Standing with the balls of your feet on the edge of a step and your heels hanging off, lower your heels below the step, then rise up as high as you can, a hand on a wall for balance.',
    setup: ['Stand on a step with the balls of your feet on the edge, heels off.', 'A hand on a wall or rail for balance.'],
    cues: ['All the way down, all the way up.', 'Slow on the way down.', 'Knees straight but soft.'], source: SRC.stepCalf },
  // feet up on a bench, hands on the floor
  { id: 'bench-decline-pushup', base: 'bw-pushup', name: 'Decline Push-Up', otherNames: ['Feet-Elevated Push-Up'],
    category: 'Strength', focus: 'Chest, shoulders and triceps', collections: ['Bodyweight'], equipment: ['Bench'], props: [{ type: 'bench', z: -235, width: 80, height: 60 }],
    // body straight (hips 0) with the toes on the same spot of the bench top in both (fitted, Sep 2026)
    edit: ex => { const k = ex.keyframes, st = p => ({ ...p, hipL: [0, 0, 0], hipR: [0, 0, 0] });
      k[0] = { ...k[0], touch: [], pose: { ...st(k[0].pose), root: [86.25, 0, 0], ankleL: -7, ankleR: -7 } };
      k[1] = { ...k[1], touch: [], pose: { ...st(k[1].pose), root: [98.75, 0, 0], ankleL: 48.75, ankleR: 48.75 } }; },
    description: 'A push-up with your feet up on a bench: body straight from head to heels, lower your chest toward the floor, then press back up.',
    setup: ['Hands on the floor under your shoulders, feet up on a bench behind you.'],
    cues: ['Body in one straight line.', 'Elbows about 45° from your body.', 'Chest to the floor, then press.'], source: SRC.declinePushup },
  { id: 'bench-feet-up-plank', base: 'core-forearm-plank', name: 'Feet-Elevated Plank', otherNames: ['Decline Plank'],
    category: 'Core', focus: 'Core and shoulders', collections: ['Core'], equipment: ['Bench'], props: [{ type: 'bench', z: -265, width: 80, height: 60 }],
    // set up with the feet already on the bench and the hips a little high, then lower into a straight line
    edit: ex => { const p = ex.keyframes[1], toes = [{ point: 'toeR', adjust: 'hipR' }, { point: 'toeL', adjust: 'hipL' }];
      ex.keyframes = [{ ...p, name: 'Feet up', cue: 'Forearms down, feet up on the bench, hips a little high.', phase: 'setup', holdMs: 600, touch: toes,
          pose: { ...p.pose, root: [100, 0, 0], shoulderL: [100, 0, 0], shoulderR: [100, 0, 0] } },
        { ...p, touch: toes, pose: { ...p.pose, root: [95, 0, 0], shoulderL: [95, 0, 0], shoulderR: [95, 0, 0] } }]; },
    description: 'A forearm plank with your feet up on a bench: body straight from head to heels, hold.',
    setup: ['Forearms on the floor under your shoulders.', 'Step your feet back onto a bench behind you.'],
    cues: ['Body in one straight line.', 'Squeeze your glutes.', 'Breathe steadily.'], source: SRC.feetUpPlank },
  // bent over as in the row, the arms open out to the sides to shoulder height
  { id: 'fw-db-reverse-fly', base: 'fw-db-row', name: 'Dumbbell Reverse Fly', otherNames: ['Bent-Over Reverse Fly', 'Rear Delt Fly'],
    category: 'Strength', focus: 'Upper back and back of the shoulders', collections: ['Free weights'], equipment: ['Dumbbells'], props: DB2('fb'),
    edit: ex => { const k = ex.keyframes; k[1].pose = { ...k[0].pose, shoulderL: [58, 80, 0], elbowL: 14, shoulderR: [58, 80, 0], elbowR: 14 };
      k[0].pose = { ...k[0].pose, elbowL: 14, elbowR: 14 }; for (const x of k) x.camera = 40; },
    description: 'Bent forward from the hips with a dumbbell in each hand, arms hanging, open your arms out to the sides to shoulder height, squeezing your shoulder blades, then lower.',
    setup: ['Hinge forward with a flat back, knees soft.', 'A dumbbell in each hand, arms hanging.'],
    cues: ['Lead with your elbows, a soft bend in them.', 'Squeeze your shoulder blades.', 'Lower slowly.'], source: SRC.reverseFly },
  { id: 'band-dead-bug', base: 'core-dead-bug', name: 'Band Dead Bug', otherNames: ['Banded Dead Bug', 'Resisted Dead Bug'],
    category: 'Core', focus: 'Deep core', collections: ['Resistance band', 'Core'], equipment: ['Resistance band'],
    // a small loop round both feet: the leg that stays holds against it
    props: [{ type: 'band', from: 'footL', to: 'footR' }],
    description: 'Lying on your back with a band looped round both feet, knees bent over your hips and arms up, straighten one leg and reach the opposite arm overhead against the band, then return and switch.',
    setup: ['Lie on your back, a small band looped round both feet.', 'Knees bent over your hips, arms straight up.'],
    cues: ['Low back stays on the floor.', 'The other leg holds still against the band.', 'Move slowly.'], source: SRC.bandDeadBug },
  // lying on the left side, head on the lower arm, knees bent: the top elbow stays at the side and the forearm turns up
  { id: 'fw-db-external-rotation', base: 'band-clamshell', name: 'Side-Lying Dumbbell External Rotation', otherNames: ['Side-Lying External Rotation', 'Side-Lying Shoulder External Rotation'],
    category: 'Strength', focus: 'Rotator cuff', collections: ['Free weights'], equipment: ['Dumbbells'], props: [{ type: 'dumbbell', hand: 'handR', axis: 'lr' }],
    edit: ex => { const k0 = ex.keyframes[0], legs = { hipL: k0.pose.hipL, ankleL: k0.pose.ankleL, hipR: [45, 0, 0], ankleR: k0.pose.ankleR, kneeL: 90, kneeR: 90 };
      const base = { root: k0.pose.root, neck: k0.pose.neck, shoulderL: k0.pose.shoulderL, ...legs };
      ex.keyframes = [
        { ...k0, name: 'Forearm across', cue: 'Top elbow bent at your side, the weight in front of your belly.', camera: 0, holdMs: 300, pose: { ...base, shoulderR: [0, 0, -70], elbowR: 90 } },
        { ...k0, name: 'Rotate up', cue: 'Turn the forearm up; the elbow stays at your side.', camera: 0, holdMs: 500, pose: { ...base, shoulderR: [0, 0, 25], elbowR: 90 } }]; },
    over: { bilateral: { labels: { L: 'Right arm', R: 'Left arm' } }, ...reps('10–15 each arm', 12, 'A light weight; a folded towel between elbow and side helps.') },
    description: 'Lying on your side with the top elbow bent at your side and a light dumbbell in front of your belly, rotate the forearm up toward the ceiling, keeping the elbow at your side, then lower.',
    setup: ['Lie on one side, head resting on the lower arm, knees bent.', 'Top elbow bent to a right angle and tucked at your side, a light dumbbell in that hand.'],
    cues: ['Elbow stays glued to your side.', 'Turn only as far as is comfortable.', 'Lower slowly.'], source: SRC.externalRotation },
  // arms crossed holding a dumbbell on the chest instead of hands behind the head
  { id: 'fw-db-weighted-crunch', base: 'core-crunch', name: 'Weighted Crunch', otherNames: ['Dumbbell Crunch'],
    category: 'Core', focus: 'Abdominals', collections: ['Free weights', 'Core'], equipment: ['Dumbbells'], props: [{ type: 'dumbbell', hand: 'handR', axis: 'lr' }],
    // (arms folded, the hands just over the breastbone: angles fitted, Sep 2026; reaching there pushed the elbows into the floor)
    edit: ex => map(ex, k => ({ ...k, reach: [], pose: { ...k.pose, shoulderL: [-7.75, -55.75, 0], elbowL: 141.75, shoulderR: [-7.75, -55.75, 0], elbowR: 141.75 } })),
    description: 'Lying on your back, knees bent, holding a dumbbell on your chest with both hands, curl your head and shoulders up off the floor, then lower.',
    setup: ['Lie on your back, knees bent, feet flat.', 'Hold a dumbbell on your chest with both hands.'],
    cues: ['Curl up from your ribs.', 'Chin slightly tucked.', 'Lower slowly.'], source: SRC.weightedCrunch },
  // lying on a bench with the hips at its end, holding it behind the head: the straight legs lower below the bench, then lift
  { id: 'bench-leg-raise', base: 'core-leg-raise', name: 'Bench Leg Raise', otherNames: ['Flat Bench Leg Raise', 'Lying Bench Leg Raise'],
    category: 'Core', focus: 'Lower abdominals and hip flexors', collections: ['Core'], equipment: ['Bench'], props: [{ type: 'bench', z: -100, width: 200, height: 70 }],
    edit: ex => map(ex, (k, i) => ({ ...k, anchor: 'pelvis', anchorZ: -10, reach: [{ hand: 'handR', to: 'head', dx: 22, dy: -6, dz: -22 }, { hand: 'handL', to: 'head', dx: -22, dy: -6, dz: -22 }],
      pose: { ...k.pose, shoulderL: [160, 20, 0], elbowL: 90, shoulderR: [160, 20, 0], elbowR: 90, hipL: [i ? 85 : -8, 0, 0], hipR: [i ? 85 : -8, 0, 0] } })),
    description: 'Lying on a bench with your hips at its end and holding it behind your head, lower your straight legs to about bench level, then lift them until they point to the ceiling.',
    setup: ['Lie on a bench, hips at one end, legs straight out.', 'Hold the bench behind your head.'],
    cues: ['Low back stays on the bench.', 'Lower slowly.', 'No swinging.'], source: SRC.benchLegRaise },
  // the stability ball hamstring curl done with the heels on a towel sliding along a smooth floor
  { id: 'towel-hamstring-curl', base: 'ball-hamstring-curl', name: 'Towel Hamstring Curl', otherNames: ['Slider Hamstring Curl', 'Sliding Leg Curl'],
    category: 'Strength', focus: 'Hamstrings, glutes and core', collections: ['Bodyweight', 'Core'], equipment: ['Towel'], props: [{ type: 'towel', from: 'ankleL', to: 'ankleR' }],
    edit: ex => { const arms = { shoulderL: [0, 45, 0], shoulderR: [0, 45, 0] }, touch = [{ point: 'ankleL', adjust: 'hipL' }, { point: 'ankleR', adjust: 'hipR' }, { point: 'handL', adjust: 'shoulderL' }, { point: 'handR', adjust: 'shoulderR' }];
      const lie = { root: [-90, 0, 0], neck: [34, 0, 0], ...arms, hipL: [8, 0, 0], hipR: [8, 0, 0], ankleL: -20, ankleR: -20 };
      const up = { root: [-100, 0, 0], neck: [44, 0, 0], ...arms, hipL: [-8, 0, 0], hipR: [-8, 0, 0], ankleL: -20, ankleR: -20 };
      const curl = { root: [-150, 0, 0], chest: [50, 0, 0], neck: [50, 0, 0], ...arms, hipL: [-44.9, 0, 0], kneeL: 80.5, ankleL: 24.6, hipR: [-44.9, 0, 0], kneeR: 80.5, ankleR: 24.6 };   // (the glute bridge's top)
      const K = (name, cue, pose, x) => ({ name, cue, camera: 90, durationMs: 1400, holdMs: 300, phase: 'rep', anchor: 'neckBase', touch, ...x, pose });
      ex.keyframes = [
        K('Heels on the towel', 'Lie on your back, legs straight, heels on a towel.', lie, { phase: 'setup' }),
        K('Lift your hips', 'Press your heels down and lift your hips.', up, { phase: 'setup' }),
        K('Curl in', 'Slide your heels toward you, hips up.', curl, { durationMs: 1400 }),
        K('Slide out', 'Slowly slide your heels away, hips still up.', up, { durationMs: 1700 }),
        K('Lower', 'Lower your hips to the floor.', lie, { phase: 'finish' })]; },
    description: 'Lying on your back with your heels on a towel on a smooth floor, lift your hips, then slide your heels in toward you and back out, hips up throughout.',
    setup: ['On a smooth floor, lie on your back with your heels on a folded towel.', 'Arms out to the sides, palms down.'],
    cues: ['Hips stay up as you slide.', 'Pull with your hamstrings.', 'Slide out slowly.'], source: SRC.towelCurl },
  // the stability ball pass with a medicine ball: the feet and hands close together round a smaller ball
  { id: 'mb-v-up-pass', base: 'ball-pass', name: 'Medicine Ball V-Up Pass', otherNames: ['Medicine Ball Hand-to-Foot Pass', 'Med Ball V-Up Pass'],
    category: 'Core', focus: 'Abdominals and hip flexors', collections: ['Free weights', 'Core'], equipment: ['Medicine ball'], props: [{ type: 'medball' }],
    edit: ex => { const feet = { hipL: [7.25, 3.5, 0], hipR: [7.25, 3.5, 0] }, over = { shoulderL: [169, 0, 0], elbowL: 0, shoulderR: [169, 0, 0], elbowR: 0 };
      const V = { root: [-30, 0, 0], neck: [10, 0, 0], hipL: [150, 3.5, 0], kneeL: 20, hipR: [150, 3.5, 0], kneeR: 20, shoulderL: [115, 0, 0], elbowL: 10, shoulderR: [115, 0, 0], elbowR: 10 };
      const k = ex.keyframes, lie = { root: [-90, 0, 0], neck: [34, 0, 0] };
      k[0].pose = { ...lie, ...feet, shoulderL: [175, 0, 0], shoulderR: [175, 0, 0] }; k[4].pose = { ...k[0].pose };
      k[1].pose = { ...V }; k[3].pose = { ...V }; k[2].pose = { ...lie, neck: [40, 0, 0], ...over }; },
    description: 'Lying on your back with a medicine ball between your feet, fold up into a V to pass it to your hands, lower with it overhead, then fold up again and pass it back to your feet.',
    setup: ['Lie on your back, arms overhead.', 'Squeeze a light medicine ball between your feet.'],
    cues: ['Fold up from your middle.', 'Hand the ball over at the top.', 'Lower slowly; low back stays down.'], source: SRC.mbVup },
  // the band woodchop's high-to-low chop with a weight instead of the band (no anchor)
  { id: 'fw-db-woodchop', base: 'band-woodchop', name: 'Dumbbell Woodchop', otherNames: ['Dumbbell Wood Chop', 'High-to-Low Dumbbell Chop'],
    category: 'Core', focus: 'Obliques and core', collections: ['Free weights', 'Core'], equipment: ['Dumbbells'], props: [{ type: 'dumbbell', hand: 'handR', axis: 'ud' }],
    over: { bilateral: { labels: { L: 'High on your right', R: 'High on your left' } } },
    description: 'Holding one dumbbell in both hands above one shoulder, chop it diagonally down across your body to the outside of the opposite knee, turning and bending your knees, then lift it back.',
    setup: ['Stand with feet a little wider than your hips.', 'Hold one dumbbell by both ends above one shoulder.'],
    cues: ['Turn from your chest and hips.', 'Pivot the back foot.', 'Control it back up.'], source: SRC.woodchop },
  { id: 'mb-woodchop', base: 'band-woodchop', name: 'Medicine Ball Woodchop', otherNames: ['Med Ball Wood Chop', 'Medicine Ball Chop'],
    category: 'Core', focus: 'Obliques and core', collections: ['Free weights', 'Core'], equipment: ['Medicine ball'], props: [{ type: 'medball' }],
    over: { bilateral: { labels: { L: 'High on your right', R: 'High on your left' } } },
    description: 'Holding a medicine ball in both hands above one shoulder, chop it diagonally down across your body to the outside of the opposite knee, turning and bending your knees, then lift it back.',
    setup: ['Stand with feet a little wider than your hips.', 'Hold a medicine ball above one shoulder.'],
    cues: ['Turn from your chest and hips.', 'Pivot the back foot.', 'Control it back up.'], source: SRC.mbWoodchop },
  // the pallof press done kneeling tall (the anchor lower, at chest height)
  { id: 'band-kneeling-pallof-press', base: 'band-pallof-press', name: 'Kneeling Pallof Press', otherNames: ['Tall-Kneeling Pallof Press', 'Half-Kneeling Pallof Press'],
    category: 'Core', focus: 'Core (anti-rotation)', collections: ['Resistance band', 'Core'], equipment: ['Resistance band', 'Door anchor'],
    props: [{ type: 'wall', beside: true, x: 170 }, { type: 'band', from: { x: 170, y: 160, z: 0 }, to: 'handR' }],
    edit: ex => map(ex, k => ({ ...k, anchor: 'kneeL', plant: [], pose: { ...k.pose, hipL: [0, 8, 0], hipR: [0, 8, 0], kneeL: 90, kneeR: 90, ankleL: 90, ankleR: 90 } })),
    description: 'Kneeling tall side-on to a door anchor with the band held at your chest, press your hands straight out in front and hold, resisting the pull, then bring them back.',
    setup: ['Anchor the band at chest height when kneeling.', 'Kneel tall side-on to the door, band held at your chest.'],
    cues: ['Hips and ribs stay square.', 'Squeeze your glutes.', 'Press out slowly and hold.'], source: SRC.kneelingPallof },
];
