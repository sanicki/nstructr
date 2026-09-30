// Batch 16 (Sep 2026): kettlebell exercises for the 20-minute beginner's kettlebell workout.
// node tools/research.cjs variants tools/variants/batch-16-kettlebell.cjs [id...]
const KB2 = [{ type: 'kettlebell', hands: ['handL', 'handR'] }];                  // one bell, both hands
const KBR = [{ type: 'kettlebell', hand: 'handR' }];                               // one bell, the right hand (mirrored for the left)
const EQ = { collections: ['Free weights'], equipment: ['Kettlebell'] };
const GOBLET = [{ hand: 'handR', to: 'neckBase', dx: 22, dy: -24, dz: 22 }, { hand: 'handL', to: 'neckBase', dx: -22, dy: -24, dz: 22 }];
const reps = (r, n, note) => ({ prescription: { reps: r, note }, defaults: { reps: n } });
const SLOW = 'Move slowly: about 2 seconds to lift or push and 2 seconds to lower. Start with a light bell.';
module.exports = [
  // one arm rows while the other hand rests on the hip
  { id: 'kb-single-arm-row', base: 'fw-db-row', name: 'Kettlebell Single-Arm Row', otherNames: ['One-Arm Kettlebell Row', 'Kettlebell Bent-Over Row'], ...EQ,
    focus: 'Upper back and biceps', props: KBR,
    edit: ex => { for (const k of ex.keyframes) { k.pose.shoulderL = [-27.5, 0, 0]; k.pose.elbowL = 69.4; } },
    steps: [['Arm hanging', 'Hinge forward, the bell hanging below your shoulder, your other hand on your hip.'], ['Row', 'Pull the bell to your hip, elbow close to your side.']],
    over: { bilateral: { labels: { L: 'Right arm', R: 'Left arm' } }, ...reps('8–12 each arm', 8, SLOW) },
    description: 'Hinged forward with your free hand on your hip, row the kettlebell from below your shoulder up to your hip, then lower it.',
    setup: ['Feet hip-width apart, knees soft.', 'Hinge forward with a flat back; free hand on your hip (or on a bench or your thigh for support).'],
    cues: ['Back flat, neck long.', 'Lead with the elbow, close to your side.', 'Lower all the way.'],
    source: { url: 'https://www.acefitness.org/resources/everyone/exercise-library/12/bent-over-row/', title: 'Bent-Over Row (ACE Exercise Library)', note: 'The one-arm kettlebell version, described in our own words. Stick-figure approximation.' } },
  // one arm presses the bell from the rack (at the shoulder) to straight overhead
  { id: 'kb-overhead-press', base: 'fw-db-press', name: 'Kettlebell Overhead Press', otherNames: ['Single-Arm Kettlebell Press', 'Kettlebell Military Press'], ...EQ,
    focus: 'Shoulders and arms', props: KBR,
    edit: ex => { const [rack, top] = ex.keyframes;
      Object.assign(rack, { camera: 40 }); rack.pose = { shoulderR: [20, 10, 0], elbowR: 150, shoulderL: [0, 8, 0] };   // the rack: elbow down, in front
      Object.assign(top, { camera: 40 }); top.pose = { shoulderR: [170, 10, 0], elbowR: 0, shoulderL: [0, 8, 0] }; },
    steps: [['Bell at your shoulder', 'Bell resting at your shoulder, elbow tucked in front.'], ['Press', 'Press the bell straight up until your arm is straight.']],
    over: { bilateral: { labels: { L: 'Right arm', R: 'Left arm' } }, ...reps('6–10 each arm', 8, SLOW) },
    description: 'Standing, press the kettlebell from your shoulder to straight overhead, then lower it back to your shoulder.',
    setup: ['Stand tall, feet hip-width apart.', 'Hold the bell at your shoulder, handle in your palm, the bell against your forearm.'],
    cues: ['Squeeze your glutes and stomach; no leaning back.', 'Press straight up, biceps by your ear.', 'Lower slowly to your shoulder.'],
    source: { url: 'https://www.acefitness.org/resources/everyone/exercise-library/45/seated-overhead-press/', title: 'Overhead Press (ACE Exercise Library)', note: 'The standing single-arm kettlebell version, described in our own words. Stick-figure approximation.' } },
  // the dumbbell reverse lunge with the bell held at the chest
  { id: 'kb-goblet-reverse-lunge', base: 'fw-db-reverse-lunge', name: 'Kettlebell Goblet Reverse Lunge', otherNames: ['Goblet Reverse Lunge', 'Kettlebell Reverse Lunge'], ...EQ,
    props: KB2,
    edit: ex => { for (const k of ex.keyframes) { delete k.pose.shoulderL; delete k.pose.shoulderR; k.pose.shoulderL = [-16.8, 0, 0]; k.pose.elbowL = 147.5; k.pose.shoulderR = [-16.8, 0, 0]; k.pose.elbowR = 147.5; k.reach = GOBLET; } },
    over: reps('8–12 each leg', 8, SLOW),
    description: 'Holding a kettlebell at your chest, step one foot back and lower until both knees are bent, then push back up to standing.',
    setup: ['Stand tall, holding the bell by its handle close to your chest.'],
    cues: ['Chest up, the bell close.', 'Step back far enough that the front knee stays over the ankle.', 'Push through the front heel.'],
    source: { url: 'https://www.muscleandstrength.com/exercises/kettlebell-goblet-squat', title: 'Kettlebell goblet hold (Muscle & Strength)', note: 'The goblet hold with a reverse lunge, described in our own words. Stick-figure approximation.' } },
  // the kettlebell deadlift with the knees nearly straight: the hips go back
  { id: 'kb-romanian-deadlift', base: 'fw-db-rdl', name: 'Kettlebell Romanian Deadlift', otherNames: ['Kettlebell RDL'], ...EQ, props: KB2,
    edit: ex => { ex.keyframes[0].pose.shoulderL = ex.keyframes[0].pose.shoulderR = [4, -12, 0]; ex.keyframes[1].pose.shoulderL = ex.keyframes[1].pose.shoulderR = [76, -12, 0]; },
    over: reps('8–12', 10, SLOW),
    description: 'Holding a kettlebell in both hands, push your hips back with soft knees until you feel the backs of your legs stretch, then stand tall.',
    setup: ['Feet hip-width apart, the bell hanging in both hands in front of your thighs.'],
    cues: ['Hips back, not down; knees soft.', 'Back flat, the bell close to your legs.', 'Squeeze your glutes to stand.'],
    source: { url: 'https://www.acefitness.org/resources/everyone/exercise-library/317/romanian-deadlift/', title: 'Romanian Deadlift (ACE Exercise Library)', note: 'The kettlebell version, described in our own words. Stick-figure approximation.' } },
  // carrying one bell at the side, walking tall
  { id: 'kb-suitcase-carry', base: 'fw-farmers-carry', name: 'Kettlebell Suitcase Carry', otherNames: ['Suitcase Carry', 'Single-Arm Farmer\'s Carry'], ...EQ,
    focus: 'Grip, core and shoulders', props: KBR,
    edit: ex => { for (const k of ex.keyframes) k.pose.shoulderL = [0, 20, 0]; },
    over: { bilateral: { labels: { L: 'Right hand', R: 'Left hand' } }, prescription: { reps: '20–40 steps each hand', note: 'Stand tall; don\'t lean towards the bell. Put it down and change hands.' } },
    description: 'Holding one kettlebell at your side like a suitcase, walk tall without leaning, then change hands.',
    setup: ['Stand tall with the bell in one hand at your side.', 'A clear stretch of floor to walk on.'],
    cues: ['Shoulders level; don\'t lean.', 'Tight stomach.', 'Small, steady steps.'],
    source: { url: 'https://www.acefitness.org/resources/everyone/exercise-library/359/farmer-s-carry/', title: 'Farmer\'s Carry (ACE Exercise Library)', note: 'The one-handed (suitcase) version, described in our own words. Stick-figure approximation.' } },
  // seated, leaning back, the bell held in both hands and turned side to side
  { id: 'kb-russian-twist', base: 'mb-russian-twist', name: 'Kettlebell Russian Twist', otherNames: [], collections: ['Free weights', 'Core'], equipment: ['Kettlebell'],
    props: KB2,
    over: reps('10–20 (both sides = 2)', 12, 'Keep it slow; feet on the floor to make it easier.'),
    description: 'Seated and leaning back with your feet down, hold a kettlebell at your chest and turn it from side to side.',
    setup: ['Sit with knees bent, feet on the floor, leaning back a little.', 'Hold the bell by the horns in front of your chest.'],
    cues: ['Turn your chest, not just your arms.', 'Back long; don\'t slump.', 'Breathe out as you turn.'],
    source: { url: 'https://www.nasm.org/resource-center/exercise-library/russian-twist', title: 'NASM Exercise Library: Russian Twist', note: 'With a kettlebell, described in our own words. Stick-figure approximation.' } },
  // feet wide and turned out, the bell hanging between the legs; the knees bend out over the toes
  // the squat's hips fitted (Sep 2026) so both feet stay exactly where they stood: knees out over the toes, hips back
  { id: 'kb-sumo-squat', base: 'fw-kb-deadlift', name: 'Kettlebell Sumo Squat', otherNames: ['Kettlebell Plié Squat'], ...EQ,
    focus: 'Inner thighs, thighs and glutes', props: KB2,
    edit: ex => { const k = (name, cue, pose) => ({ name, cue, camera: 20, durationMs: 2000, holdMs: 300, phase: 'rep', anchor: 'ankleR', plant: ['L', 'R'],
      pose: { shoulderL: [0, -10, 0], shoulderR: [0, -10, 0], ...pose } });
      ex.keyframes = [
        k('Stand wide', 'Feet wide, toes turned out, the bell hanging in both hands.', { hipL: [0, 22, 35], hipR: [0, 22, 35] }),
        k('Squat', 'Bend your knees out over your toes and lower, chest up.', { torso: [12, 0, 0], shoulderL: [12, -10, 0], shoulderR: [12, -10, 0], hipL: [56, 47.5, 5], kneeL: 85, hipR: [56, 47, 4], kneeR: 85 })]; },
    over: reps('8–12', 10, SLOW),
    description: 'With your feet wide and toes turned out, hold a kettlebell hanging between your legs and squat down, knees out over your toes, then stand back up.',
    setup: ['Feet wider than your shoulders, toes turned out.', 'Hold the bell by the handle in both hands, arms long.'],
    cues: ['Knees follow your toes.', 'Chest up, back long.', 'Push the floor away to stand.'],
    source: { url: 'https://www.physitrack.com/exercise-library/how-to-perform-the-kettlebell-sumo-squat-exercise', title: 'Physitrack: Kettlebell sumo squat', note: 'Described in our own words. Stick-figure approximation.' } },
  // the bell held by the horns, circled around the head: in front of the chest, beside the right ear, behind
  // the head, beside the left ear (arm angles fitted to hand points around the neck; direction B runs it the other way)
  { id: 'kb-halo', base: 'fw-kb-goblet-squat', name: 'Kettlebell Halo', otherNames: ['Halo'], ...EQ,
    category: 'Mobility', focus: 'Shoulders, upper back and core', props: KB2,
    // the hands go round an oval about the head (34 to the sides, 44 front and back, at head height), so the bell stays clear of the
    // head and neck all the way (Sep 2026: angles alone took it through them); quiet points between the four named
    edit: ex => { const A = (f, s, t, e) => [[f, s, t], e];
      const arms = ([sr, er], [sl, el]) => ({ shoulderR: sr, elbowR: er, shoulderL: sl, elbowL: el });
      const FRONT = A(110, -20, -20, 110), BEHIND = A(160, -10, -30, 150), NEAR = A(100, 20, 0, 150), CROSS = A(90, -30, -45, 130);
      const MID = (x, y) => [[0, 1, 2].map(i => (x[0][i] + y[0][i]) / 2), (x[1] + y[1]) / 2];
      const at = deg => { const t = deg * Math.PI / 180, x = 34 * Math.sin(t), z = 44 * Math.cos(t), tx = Math.cos(t) * 5, tz = -Math.sin(t) * 5;
        return [{ hand: 'handR', to: 'head', dx: x - tx, dy: 6, dz: z - tz }, { hand: 'handL', to: 'head', dx: x + tx, dy: 6, dz: z + tz }]; };
      const k = (name, cue, pose, deg, quiet) => ({ name, cue, camera: 0, durationMs: 450, holdMs: 0, phase: 'rep', ease: 'linear', anchor: 'ankleL', plant: ['L', 'R'], reach: at(deg), ...(quiet ? { quiet: true } : {}), pose });
      ex.keyframes = [
        k('In front', 'The bell in front of your face.', arms(FRONT, FRONT), 0),
        k('', '', arms(MID(FRONT, NEAR), MID(FRONT, CROSS)), 45, true),
        k('Right side', 'Past your right ear.', arms(NEAR, CROSS), 90),
        k('', '', arms(MID(NEAR, BEHIND), MID(CROSS, BEHIND)), 135, true),
        k('Behind', 'Behind your head.', arms(BEHIND, BEHIND), 180),
        k('', '', arms(MID(BEHIND, CROSS), MID(BEHIND, NEAR)), 225, true),
        k('Left side', 'Past your left ear.', arms(CROSS, NEAR), 270),
        k('', '', arms(MID(CROSS, FRONT), MID(NEAR, FRONT)), 315, true)]; },
    over: { direction: { labels: { A: 'To the right first', B: 'To the left first' } }, repName: 'circle', ...reps('5–8 each way', 5, 'A light bell. Keep it close to your head and your ribs down.') },
    description: 'Holding a kettlebell by the horns in front of your chest, circle it slowly around your head, close to it, then the other way.',
    setup: ['Stand tall, feet hip-width apart.', 'Hold the bell by the horns in front of your chest.'],
    cues: ['Keep the bell close to your head.', 'Ribs down; don\'t arch your back.', 'Slow and smooth.'],
    source: { url: 'https://www.acefitness.org/resources/everyone/exercise-library/394/halo/', title: 'Halo (ACE Exercise Library)', note: 'Described in our own words. Stick-figure approximation.' } },
];
