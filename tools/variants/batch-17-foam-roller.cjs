// Batch 17 (new equipment: foam roller, Sep 2026). A roller is a cylinder lying across the figure ({type: "roller", z});
// a leg or the back rests on it with a "touch" on a segment (shinR, thighR, back), and rolling is the same touch at
// another spot along the segment in the next step: the engine keeps it on the roller the whole way (src/core.js).
// Each rolls back and forth for a time (no held step), like Mountain Climber.
// node tools/research.cjs variants tools/variants/batch-17-foam-roller.cjs [id...]
const K = (name, cue, pose, x = {}) => ({ name, cue, camera: 90, durationMs: 2200, holdMs: 200, phase: 'rep', ...x, pose });
const timed = (note) => ({ measure: 'time', holdStep: null, defaults: { seconds: 45 }, repName: null, bilateral: null, direction: null, prescription: { time: '30–60 seconds', note } });
const HEALTHLINE = { url: 'https://www.healthline.com/health/fitness-exercise/foam-rolling-how-to', title: 'Healthline: Foam rolling, how to' };
const NASM = { url: 'https://www.nasm.org/resource-center/exercise-library/foam-roll-calves', title: 'NASM Exercise Library: Foam Roll Calves' };
const NOTE = 'Roll slowly, about 2 seconds each way. Pause on a tender spot for a few breaths; skip anything sharp or painful, and avoid rolling right over a joint.';
const EQ = { category: 'Mobility', collections: ['Stretches', 'Warm-up'], equipment: ['Foam roller'] };
// sitting with the hands behind, hips lifted: the arms move the body over the roller
const seated = (s, hip, what) => ({ root: [s.root, 0, 0], shoulderL: [s.arm, 0, 0], shoulderR: [s.arm, 0, 0], hipL: [hip, 0, 0], hipR: [hip, 0, 0], ankleL: 20, ankleR: 20 });
const onHands = seg => [{ point: seg + 'R', adjust: 'hipR' }, { point: seg + 'L', adjust: 'hipL' }, { point: 'handL', adjust: 'shoulderL' }];
module.exports = [
  { id: 'roller-calves', base: 'bw-mountain-climber', name: 'Foam Roller Calf Roll', otherNames: ['Foam Roll Calves', 'Calf Foam Roll'], ...EQ, focus: 'Calves',
    props: [{ type: 'roller', z: 170 }],
    edit: ex => { ex.keyframes = [
      K('Roller above your ankles', 'Hands behind you, lift your hips, the roller just above your ankles.', seated({ root: -35, arm: -18 }, 70), { anchor: 'handR', touch: onHands('shin') }),
      K('Roll to below your knees', 'Push with your hands to roll up to just below your knees, then back.', seated({ root: -35, arm: -48 }, 70), { anchor: 'handR', touch: onHands('shin') })]; },
    over: timed(NOTE),
    description: 'Sitting with a foam roller under your calves and your hands on the floor behind you, lift your hips and roll slowly from just above the ankles to just below the knees and back.',
    setup: ['Sit with your legs straight, a foam roller under your lower calves.', 'Hands on the floor behind you, fingers pointing forward.'],
    cues: ['Lift your hips and move with your arms.', 'Slow, even rolls.', 'Cross one leg over the other for more pressure.'], source: NASM },
  { id: 'roller-hamstrings', base: 'bw-mountain-climber', name: 'Foam Roller Hamstring Roll', otherNames: ['Foam Roll Hamstrings', 'Hamstring Foam Roll'], ...EQ, focus: 'Hamstrings (back of the thighs)',
    props: [{ type: 'roller', z: 95 }],
    edit: ex => { ex.keyframes = [
      K('Roller above your knees', 'Hands behind you, lift your hips, the roller just above the backs of your knees.', seated({ root: -41, arm: -20 }, 50), { anchor: 'handR', touch: onHands('thigh') }),
      K('Roll toward your hips', 'Push with your hands to roll up toward your hips, then back.', seated({ root: -41, arm: -45 }, 50), { anchor: 'handR', touch: onHands('thigh') })]; },
    over: timed(NOTE),
    description: 'Sitting with a foam roller under the backs of your thighs and your hands behind you, lift your hips and roll slowly from just above the knees toward the hips and back.',
    setup: ['Sit with your legs straight, a foam roller under the backs of your thighs.', 'Hands on the floor behind you; heels off the floor.'],
    cues: ['Move with your arms; legs relaxed.', 'Slow, even rolls.', 'Stop short of the back of the knee.'], source: HEALTHLINE },
  // face down on the forearms: the elbows stay put and the body slides back and forth over them
  { id: 'roller-quads', base: 'bw-mountain-climber', name: 'Foam Roller Quad Roll', otherNames: ['Foam Roll Quadriceps', 'Quad Foam Roll'], ...EQ, focus: 'Quadriceps (front of the thighs)',
    props: [{ type: 'roller', z: -135 }],
    edit: ex => { const prone = arm => ({ root: [80, 0, 0], shoulderL: [arm, 0, 0], shoulderR: [arm, 0, 0], elbowL: 90, elbowR: 90, hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: 50, kneeR: 50, ankleL: 30, ankleR: 30 });
      const touch = [{ point: 'thighR', adjust: 'hipR' }, { point: 'thighL', adjust: 'hipL' }, { point: 'handR', adjust: 'elbowR' }, { point: 'handL', adjust: 'elbowL' }];
      ex.keyframes = [
        K('Roller above your knees', 'Face down on your forearms, the roller just above your knees.', prone(52), { anchor: 'elbowR', touch }),
        K('Roll toward your hips', 'Pull with your forearms to roll up toward your hips, then back.', prone(108), { anchor: 'elbowR', touch })]; },
    over: timed(NOTE),
    description: 'Face down on your forearms with a foam roller under the fronts of your thighs, roll slowly from just above the knees toward the hips and back, moving with your arms.',
    setup: ['Lie face down on your forearms, elbows under your shoulders.', 'A foam roller under the fronts of your thighs, just above the knees; feet off the floor.'],
    cues: ['Brace your stomach; hips don\'t sag.', 'Move with your arms.', 'Slow, even rolls.'], source: HEALTHLINE },
  // lying back on it, feet flat, hands behind the head: the legs push the body over the roller
  { id: 'roller-upper-back', base: 'bw-mountain-climber', name: 'Foam Roller Upper Back Roll', otherNames: ['Thoracic Spine Foam Roll', 'Foam Roll Upper Back', 'Upper Back Foam Roll'], ...EQ, focus: 'Upper back',
    props: [{ type: 'roller', z: -185 }],
    edit: ex => { const lie = knee => ({ root: [-85, 0, 0], neck: [20, 0, 0], shoulderL: [150, 60, 90], elbowL: 120, shoulderR: [150, 60, 90], elbowR: 120, hipL: [30, 0, 0], hipR: [30, 0, 0], kneeL: knee, kneeR: knee, ankleL: 20, ankleR: 20 });
      const x = { anchor: 'ankleR', plant: ['L', 'R'], touch: [{ point: 'back', adjust: 'hipR' }, { point: 'ankleL', adjust: 'hipL' }],
        reach: [{ hand: 'handR', to: 'head', dx: 28, dy: -10 }, { hand: 'handL', to: 'head', dx: -28, dy: -10 }] };
      ex.keyframes = [
        K('Roller under your shoulder blades', 'Lie back on the roller, hands behind your head, feet flat, hips lifted a little.', lie(100), x),
        K('Roll to your mid-back', 'Push with your legs to roll down to your mid-back, then back up.', lie(70), x)]; },
    over: timed('Roll slowly, about 2 seconds each way. Keep the roller on your upper and middle back, never your lower back or neck.'),
    description: 'Lying back on a foam roller under your shoulder blades with your feet flat and your hands behind your head, lift your hips a little and push with your legs to roll between your shoulder blades and mid-back.',
    setup: ['Sit in front of a foam roller, then lie back so it\'s under your shoulder blades.', 'Knees bent, feet flat; hands behind your head, elbows wide.'],
    cues: ['Support your head; don\'t pull on it.', 'Stay on your upper back, not your lower back.', 'Slow, even rolls.'], source: HEALTHLINE },
];
