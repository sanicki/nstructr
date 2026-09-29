// Batch 14 (Sep 2026): exercises deferred from the collection research, now that the engine can do them.
// node tools/research.cjs variants tools/variants/batch-14-deferred.cjs [id...]
const K = (name, cue, pose, x = {}) => ({ name, cue, camera: 90, durationMs: 1400, holdMs: 300, phase: 'rep', ...x, pose });
const reps = (r, n, note) => ({ measure: 'reps', holdStep: null, defaults: { reps: n }, repName: null, prescription: { reps: r, note } });
const HIPS = { shoulderL: [-27.5, 0, 0], elbowL: 69.4, shoulderR: [-27.5, 0, 0], elbowR: 69.4 };        // hands on hips
module.exports = [
  // the rear foot's top on a bench behind (60 high; its front edge just behind the ankle, so the shin clears it)
  { id: 'bench-bulgarian-split-squat', base: 'bw-split-squat', name: 'Bulgarian Split Squat', otherNames: ['Rear-Foot-Elevated Split Squat', 'Bulgarian Squat'],
    collections: ['Bodyweight'], equipment: ['Bench'], props: [{ type: 'bench', z: -198, width: 120, height: 60 }],
    edit: ex => { const rear = [{ point: 'toeL', adjust: 'hipL' }];
      ex.keyframes = [
        K('Rear foot on the bench', 'Front foot forward, the top of your back foot on the bench.', { ...HIPS, hipR: [15, 0, 0], kneeR: 10, hipL: [-20, 0, 0], kneeL: 65, ankleL: 50 }, { anchor: 'ankleR', plant: ['R'], touch: rear }),
        K('Lower', 'Lower straight down until your front thigh is level.', { ...HIPS, torso: [10, 0, 0], hipR: [85, 0, 0], kneeR: 95, ankleR: -8, hipL: [-2.5, 0, 0], kneeL: 130, ankleL: 50 }, { anchor: 'ankleR', plant: ['R'], touch: rear, durationMs: 1800 })]; },
    over: { ...reps('6–12 each leg', 8, 'Start with a lower step or chair seat if the bench is too high. Most of your weight stays on the front foot.') },
    description: 'With the top of your back foot resting on a bench behind you, lower straight down on the front leg until the thigh is level, then push back up.',
    setup: ['Stand about a stride in front of a bench, facing away from it.', 'Rest the top of one foot on the bench behind you; hands on your hips.'],
    cues: ['Front knee over the ankle.', 'Chest up, lower straight down.', 'Push through the front heel.'],
    source: { url: 'https://www.acefitness.org/education-and-resources/lifestyle/exercise-library/366/bulgarian-split-squat/', title: 'ACE Exercise Library: Bulgarian Split Squat' } },
  // forward and out against a band, a half squat the whole way, travelling forward
  { id: 'band-monster-walk', base: 'band-lateral-walk', name: 'Monster Walk', otherNames: ['Band Monster Walk', 'Banded Monster Walk'],
    collections: ['Resistance band'], equipment: ['Resistance band'],
    edit: ex => { const half = (fr, fs, br, bs) => ({ shoulderL: [-27.5, 0, 0], elbowL: 69.4, shoulderR: [-27.5, 0, 0], elbowR: 69.4, torso: [20, 0, 0] });
      const legs = (f, b) => ({ [`hip${f}`]: [30, 12, 0], [`knee${f}`]: 35, [`ankle${f}`]: -12, [`hip${b}`]: [0, 12, 0], [`knee${b}`]: 30, [`ankle${b}`]: -12 });
      ex.keyframes = [
        K('Right foot forward and out', 'Step your right foot forward and out, staying low.', { ...half(), ...legs('R', 'L') }, { camera: 60, anchor: 'ankleL', plant: ['L', 'R'], touch: [{ point: 'ankleR', adjust: 'kneeR' }], durationMs: 900, holdMs: 150 }),
        K('Left foot forward and out', 'Now the left foot, forward and out.', { ...half(), ...legs('L', 'R') }, { camera: 60, anchor: 'ankleR', plant: ['L', 'R'], touch: [{ point: 'ankleL', adjust: 'kneeL' }], durationMs: 900, holdMs: 150 })]; },
    over: { travel: true, bilateral: null, ...reps('10–20 steps', 12, 'Keep the band taut; small steps. Walk forward, then backward to come back.'), repName: 'step pair' },
    description: 'In a half squat with a band round your ankles or knees, walk forward in small steps, each foot going forward and out against the band.',
    setup: ['Loop a band round your ankles (or just above your knees).', 'Feet wider than hip-width, half squat, hands on your hips.'],
    cues: ['Stay low the whole way.', 'Knees out, in line with your toes.', 'Keep the band taut.'],
    source: { url: 'https://www.physitrack.com/exercise-library/how-to-perform-the-monster-walk-with-band-exercise', title: 'Physitrack: Monster walk with band' } },
  // under a waist-high bar, body straight from heels to head, pulling the chest to the bar
  { id: 'bar-inverted-row', base: 'bar-pull-up', name: 'Inverted Row', otherNames: ['Bodyweight Row', 'Australian Pull-Up', 'Body Row'],
    collections: ['Bodyweight'], equipment: ['Low bar'], props: [{ type: 'bar', y: 170, z: 0, width: 190 }], focus: 'Upper back and biceps',
    edit: ex => { const grip = { anchor: 'handR', anchorY: 170, anchorZ: 0, anchorX: 22, touch: [{ point: 'ankleR', adjust: 'root' }] };
      const legs = { ankleL: 30, ankleR: 30, neck: [20, 0, 0] };
      ex.keyframes = [
        K('Hang', 'Hang under the bar, arms straight, body in one line from heels to head.', { ...legs, root: [-75, 0, 0], shoulderL: [87.5, 0, 0], shoulderR: [87.5, 0, 0] }, { ...grip, durationMs: 1600 }),
        K('Row', 'Pull your chest up to the bar, squeezing your shoulder blades together.', { ...legs, root: [-50, 0, 0], shoulderL: [-10, 0, 0], elbowL: 120, shoulderR: [-10, 0, 0], elbowR: 120 }, { ...grip, durationMs: 1600 })]; },
    over: { ...reps('6–12', 8, 'Easier with your knees bent and feet flat, or with a higher bar; harder with a lower bar.') },
    description: 'Lying under a bar set about waist height, hold it with straight arms and your heels on the floor, then pull your chest up to the bar, keeping your body straight, and lower back down.',
    setup: ['Set a sturdy bar about waist height (a rack or Smith machine bar).', 'Lie under it and grip it a little wider than your shoulders; heels on the floor, body straight.'],
    cues: ['Body stays in one line; don\'t let your hips sag.', 'Lead with your chest.', 'Lower slowly until your arms are straight.'],
    source: { url: 'https://www.acefitness.org/continuing-education/certified/december-2018/7138/ace-sponsored-research-what-is-the-best-back-exercise/', title: 'ACE-sponsored research: What is the best back exercise? (inverted row)' } },
  // from a straight-arm plank, one knee then the other driven in towards the chest, at a run (the hips rise a little and
  // the knee comes in a little wide: a thigh passing straight under a plank-height pelvis would go through the floor)
  { id: 'bw-mountain-climber', base: 'bw-pushup', name: 'Mountain Climber', otherNames: ['Running Plank'],
    collections: ['Bodyweight', 'Warm-up'], category: 'Cardio', focus: 'Core, shoulders and hip flexors (cardio)',
    edit: ex => { const plank = { root: [66, 0, 0], shoulderL: [66, 0, 0], shoulderR: [66, 0, 0], hipL: [-8, 0, 0], ankleL: 24, hipR: [-8, 0, 0], ankleR: 24 };
      const toes = s => [{ point: 'toe' + s, adjust: 'hip' + s }];
      const both = [...toes('L'), ...toes('R')];
      const knee = s => ({ ...plank, root: [85, 0, 0], shoulderL: [47, 0, 0], shoulderR: [47, 0, 0], [`hip${s}`]: [120, 25, 0], [`knee${s}`]: 145, [`ankle${s}`]: 30 });
      const q = { durationMs: 350, holdMs: 0, quiet: true };
      ex.keyframes = [
        K('Plank', 'Hands under your shoulders, arms straight, body in one line.', plank, { phase: 'setup', anchor: 'handR', touch: both, durationMs: 1200 }),
        K('Right knee in', 'Drive your right knee in towards your chest.', knee('R'), { anchor: 'handR', touch: toes('L'), ...q }),
        K('Back', 'Step it back.', plank, { anchor: 'handR', touch: both, ...q }),
        K('Left knee in', 'Now the left knee.', knee('L'), { anchor: 'handR', touch: toes('R'), ...q }),
        K('Back', 'Step it back.', plank, { anchor: 'handR', touch: both, ...q })]; },
    over: { bilateral: null, holdStep: null, measure: 'time', defaults: { seconds: 30 }, repName: null, prescription: { time: '20–45 seconds', note: 'Start slowly with a step in and out; speed up once your hips stay level.' } },
    description: 'From a straight-arm plank, drive one knee in towards your chest and back, then the other, keeping your hips level, at a steady run.',
    setup: ['Start in a straight-arm plank: hands under your shoulders, on your toes, body in one line.'],
    cues: ['Hips stay low and level.', 'Shoulders over your hands.', 'Breathe steadily.'],
    source: { url: 'https://www.acefitness.org/resources/everyone/exercise-library/258/mountain-climbers/', title: 'ACE Exercise Library: Mountain Climbers' } },
  // squat with the hands down, jump the feet back to a plank and in again, then jump up (the hands stay where they
  // were put down, the feet land where they took off)
  { id: 'bw-burpee', base: 'bw-jump-squat', name: 'Burpee', otherNames: ['Squat Thrust Jump'],
    collections: ['Bodyweight', 'Warm-up'], category: 'Cardio', focus: 'Whole body (cardio)',
    edit: ex => { const feet = { anchor: 'ankleL', plant: ['L', 'R'] };
      const hands = [{ point: 'handR', adjust: 'shoulderR' }, { point: 'handL', adjust: 'shoulderL' }];
      const squat = { torso: [70, 0, 0], neck: [-10, 0, 0], shoulderL: [80, 0, 0], shoulderR: [80, 0, 0], hipL: [100, 0, 0], kneeL: 110, ankleL: -20, hipR: [100, 0, 0], kneeR: 110, ankleR: -20 };
      const plank = { root: [66, 0, 0], shoulderL: [66, 0, 0], shoulderR: [66, 0, 0], hipL: [-8, 0, 0], ankleL: 24, hipR: [-8, 0, 0], ankleR: 24 };
      // (in between, hips up with the legs in the air: a thigh swinging straight under a squat- or plank-height pelvis would go
      // through the floor)
      const kick = { root: [85, 0, 0], shoulderL: [85, 0, 0], shoulderR: [85, 0, 0], hipL: [60, 0, 0], kneeL: 80, hipR: [60, 0, 0], kneeR: 80 };
      const q = { holdMs: 0, quiet: true };
      ex.keyframes = [
        K('Stand tall', 'Feet shoulder-width apart, arms by your sides.', {}, { ...feet, phase: 'setup', durationMs: 1000, holdMs: 500 }),
        K('Squat, hands down', 'Squat down and put your hands on the floor.', squat, { ...feet, touch: hands, durationMs: 700, holdMs: 0 }),
        K('Kick back', 'Hips up, feet off the floor.', kick, { anchor: 'handR', durationMs: 250, ...q }),
        K('Jump back', 'Jump your feet back to a plank.', plank, { anchor: 'handR', touch: [{ point: 'toeR', adjust: 'hipR' }, { point: 'toeL', adjust: 'hipL' }], durationMs: 250, holdMs: 150 }),
        K('Hips up', 'Hips up, feet off the floor.', kick, { anchor: 'handR', durationMs: 250, ...q }),
        K('Jump in', 'Jump your feet back in.', squat, { ...feet, touch: hands, durationMs: 300, ...q }),
        K('Jump up', 'Jump up, arms overhead.', { torso: [5, 0, 0], shoulderL: [165, 0, 0], shoulderR: [165, 0, 0], ankleL: 35, ankleR: 35 }, { ...feet, lift: 45, durationMs: 400, holdMs: 0 }),
        K('Land softly', 'Land softly, knees bent.', { torso: [18, 0, 0], shoulderL: [40, 0, 0], shoulderR: [40, 0, 0], hipL: [40, 0, 0], kneeL: 50, ankleL: -10, hipR: [40, 0, 0], kneeR: 50, ankleR: -10 }, { ...feet, durationMs: 350, holdMs: 100, quiet: true }),
        K('Stand tall', 'Stand up and breathe.', {}, { ...feet, phase: 'finish', durationMs: 1000, holdMs: 500 })]; },
    over: { ...reps('5–15', 8, 'For less impact, step back and in one foot at a time and rise onto your toes instead of jumping. Some versions add a push-up in the plank.') },
    description: 'Squat and put your hands on the floor, jump your feet back to a plank, jump them back in, then jump up with your arms overhead and land softly.',
    setup: ['Stand with your feet shoulder-width apart, with room in front of and behind you.'],
    cues: ['Hands under your shoulders in the plank; hips level.', 'Land softly, knees bent.', 'Keep a steady rhythm.'],
    source: { url: 'https://www.nasm.org/resource-center/exercise-library/squat-thrust-burpees', title: 'NASM Exercise Library: Squat Thrust Burpees' } },
];
