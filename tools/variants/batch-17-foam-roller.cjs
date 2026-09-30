// Batch 17 (new equipment: foam roller, Sep 2026). A roller is a cylinder lying across the figure ({type: "roller", z});
// a leg or the back rests on it with a "touch" on a segment (shinR, thighR, back), and rolling is the same touch at
// another spot along the segment in the next step: the engine keeps it on the roller the whole way, and the roller
// rolls along the floor half as far as the body moves over it, so a stroke moves the body about twice the length it
// rolls (src/core.js).
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
    props: [{ type: 'roller', z: 160 }],
    edit: ex => { ex.keyframes = [
      K('Roller above your ankles', 'Hands behind you, lift your hips, the roller just above your ankles.', seated({ root: -36, arm: -8 }, 70), { anchor: 'handR', touch: onHands('shin') }),
      K('Roll to below your knees', 'Push with your hands to roll up to just below your knees, then back.', seated({ root: -44, arm: -78 }, 70), { anchor: 'handR', touch: onHands('shin') })]; },
    over: timed(NOTE),
    description: 'Sitting with a foam roller under your calves and your hands on the floor behind you, lift your hips and roll slowly from just above the ankles to just below the knees and back.',
    setup: ['Sit with your legs straight, a foam roller under your lower calves.', 'Hands on the floor behind you, fingers pointing forward.'],
    cues: ['Lift your hips and move with your arms.', 'Slow, even rolls.', 'Cross one leg over the other for more pressure.'], source: NASM },
  { id: 'roller-hamstrings', base: 'bw-mountain-climber', name: 'Foam Roller Hamstring Roll', otherNames: ['Foam Roll Hamstrings'], ...EQ, focus: 'Hamstrings (back of the thighs)',
    props: [{ type: 'roller', z: 100 }],
    edit: ex => { ex.keyframes = [
      K('Roller above your knees', 'Hands behind you, lift your hips, the roller just above the backs of your knees.', seated({ root: -41, arm: -25 }, 50), { anchor: 'handR', touch: onHands('thigh') }),
      K('Roll toward your hips', 'Push with your hands to roll up toward your hips, then back.', seated({ root: -44, arm: -72 }, 50), { anchor: 'handR', touch: onHands('thigh') })]; },
    over: timed(NOTE),
    description: 'Sitting with a foam roller under the backs of your thighs and your hands behind you, lift your hips and roll slowly from just above the knees toward the hips and back.',
    setup: ['Sit with your legs straight, a foam roller under the backs of your thighs.', 'Hands on the floor behind you; heels off the floor.'],
    cues: ['Move with your arms; legs relaxed.', 'Slow, even rolls.', 'Stop short of the back of the knee.'], source: HEALTHLINE },
  // face down on the forearms: the elbows stay put and the body slides back and forth over them
  { id: 'roller-quads', base: 'bw-mountain-climber', name: 'Foam Roller Quad Roll', otherNames: ['Foam Roll Quadriceps', 'Quad Foam Roll'], ...EQ, focus: 'Quadriceps (front of the thighs)',
    props: [{ type: 'roller', z: -120 }],
    edit: ex => { const prone = (arm, root = 80) => ({ root: [root, 0, 0], shoulderL: [arm, 0, 0], shoulderR: [arm, 0, 0], elbowL: 90, elbowR: 90, hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: 50, kneeR: 50, ankleL: 30, ankleR: 30 });
      const touch = [{ point: 'thighR', adjust: 'hipR' }, { point: 'thighL', adjust: 'hipL' }, { point: 'handR', adjust: 'elbowR' }, { point: 'handL', adjust: 'elbowL' }];
      ex.keyframes = [
        K('Roller above your knees', 'Face down on your forearms, the roller just above your knees.', prone(40), { anchor: 'elbowR', touch }),
        K('Roll toward your hips', 'Pull with your forearms to roll up toward your hips, then back.', prone(128, 82), { anchor: 'elbowR', touch })]; },
    over: timed(NOTE),
    description: 'Face down on your forearms with a foam roller under the fronts of your thighs, roll slowly from just above the knees toward the hips and back, moving with your arms.',
    setup: ['Lie face down on your forearms, elbows under your shoulders.', 'A foam roller under the fronts of your thighs, just above the knees; feet off the floor.'],
    cues: ['Brace your stomach; hips don\'t sag.', 'Move with your arms.', 'Slow, even rolls.'], source: HEALTHLINE },
  // lying back on it, feet flat, hands behind the head: the legs push the body over the roller
  { id: 'roller-upper-back', base: 'bw-mountain-climber', name: 'Foam Roller Upper Back Roll', otherNames: ['Thoracic Spine Foam Roll', 'Foam Roll Upper Back'], ...EQ, focus: 'Upper back',
    props: [{ type: 'roller', z: -175 }],
    edit: ex => { const lie = knee => ({ root: [-85, 0, 0], neck: [20, 0, 0], shoulderL: [150, 60, 90], elbowL: 120, shoulderR: [150, 60, 90], elbowR: 120, hipL: [30, 0, 0], hipR: [30, 0, 0], kneeL: knee, kneeR: knee, ankleL: 20, ankleR: 20 });
      const x = { anchor: 'ankleR', plant: ['L', 'R'], touch: [{ point: 'back', adjust: 'hipR' }, { point: 'ankleL', adjust: 'hipL' }],
        reach: [{ hand: 'handR', to: 'head', dx: 28, dy: -10 }, { hand: 'handL', to: 'head', dx: -28, dy: -10 }] };
      ex.keyframes = [
        K('Roller under your shoulder blades', 'Lie back on the roller, hands behind your head, feet flat, hips lifted a little.', lie(110), x),
        K('Roll to your mid-back', 'Push with your legs to roll down to your mid-back, then back up.', lie(42), x)]; },
    over: timed('Roll slowly, about 2 seconds each way. Keep the roller on your upper and middle back, never your lower back or neck.'),
    description: 'Lying back on a foam roller under your shoulder blades with your feet flat and your hands behind your head, lift your hips a little and push with your legs to roll between your shoulder blades and mid-back.',
    setup: ['Sit in front of a foam roller, then lie back so it\'s under your shoulder blades.', 'Knees bent, feet flat; hands behind your head, elbows wide.'],
    cues: ['Support your head; don\'t pull on it.', 'Stay on your upper back, not your lower back.', 'Slow, even rolls.'], source: HEALTHLINE },
  // lying on the left side on the forearm, the top foot planted in front: the arm moves the body along the roller
  // (the elbow stays put); the bottom foot rests on the floor. Poses fitted so the thigh rests on the roller and both
  // feet and the forearm on the floor at both ends; the engine holds them there in between.
  { id: 'roller-it-band', base: 'core-side-plank', name: 'Foam Roller IT Band Roll', otherNames: ['Foam Roll IT Band', 'Iliotibial Band Foam Roll'], ...EQ, focus: 'Outer thighs (IT band)',
    props: [{ type: 'roller', z: -110 }],
    edit: ex => { const side = (arm, s, hipL, hipR, kneeR) => ({ root: [0, s, -90], shoulderL: [0, arm, 0], elbowL: 90, shoulderR: [0, 0, 0], elbowR: 10, hipL: [0, hipL, 0], kneeL: 5, hipR, kneeR, ankleR: 10 });
      // the top foot stays where it's planted: in the second step the leg reaches back to it (keep)
      const x = { camera: 80, anchor: 'elbowL', plant: ['L', 'R'], touch: [{ point: 'ankleL', adjust: 'hipL.side' }, { point: 'thighL', adjust: 'root.side' }] };
      ex.keyframes = [
        K('Roller above your knee', 'On your side on your forearm, the roller just above your knee, top foot planted in front.', side(50, -78, 2, [36.8, -16, 0], 56), { ...x, touch: [...x.touch, { point: 'ankleR', adjust: 'kneeR' }] }),
        K('Roll toward your hip', 'Push with your arm and top foot to roll up toward your hip, then back.', side(120, -78, -1, [28.5, -16, 0], 72), { ...x, keep: [{ point: 'ankleR', keyframe: 0 }] })]; },
    over: { ...timed('Roll slowly along the outside of your thigh, between the hip and just above the knee. It can be tender: take weight through your top foot to ease the pressure.'), bilateral: { labels: { L: 'Left side down', R: 'Right side down' } } },
    description: 'Lying on your side on your forearm with a foam roller under the outside of your bottom thigh and your top foot planted in front, roll slowly between just above the knee and the hip.',
    setup: ['Lie on your side on your forearm, a foam roller under the outside of your bottom thigh, just above the knee.', 'Cross your top leg in front and plant that foot on the floor.'],
    cues: ['Elbow under your shoulder.', 'Use your top foot to take some weight off.', 'Slow, even rolls.'], source: HEALTHLINE },
  // lying on the left side, the bottom arm overhead, the roller under the armpit (the flank: sideL); the top foot,
  // planted in front, pushes the body along it, from the armpit to the middle of the ribs. Fitted like the IT band.
  { id: 'roller-lats', base: 'core-side-plank', name: 'Foam Roller Lat Roll', otherNames: ['Foam Roll Latissimus Dorsi', 'Foam Roll Lats'], ...EQ, focus: 'Lats (sides of the back)',
    props: [{ type: 'roller', z: 160 }],
    edit: ex => { const side = (s, hipL, kneeL, hipR, kneeR) => ({ root: [0, s, -90], neck: [0, 10, 0], shoulderL: [0, 170, 0], elbowL: 10, shoulderR: [0, 0, 0], elbowR: 10, hipL, kneeL, hipR, kneeR, ankleR: 10 });
      const x = { camera: 80, anchor: 'ankleR', plant: ['R'], touch: [{ point: 'sideL', adjust: 'root.side' }] };
      ex.keyframes = [
        K('Roller under your armpit', 'On your side, bottom arm overhead, the roller just under your armpit, top foot planted in front.', side(-71, [2, -16, 0], 68, [95, -6.5, 0], 100), x),
        K('Roll to your mid-back', 'Push with your top foot to roll down your side to the middle of your ribs, then back.', side(-78.8, [2, -8, 0], 60, [40, -7.8, 0], 40), x)]; },
    over: { ...timed('Roll slowly between your armpit and the middle of your ribs; stay on the side of your back, not your ribs or lower back.'), bilateral: { labels: { L: 'Left side down', R: 'Right side down' } } },
    description: 'Lying on your side with a foam roller under your armpit and your bottom arm stretched overhead, push with your top foot to roll slowly down the side of your back and up again.',
    setup: ['Lie on your side, the foam roller just under your armpit, bottom arm stretched overhead.', 'Bend your top leg and plant that foot on the floor in front.'],
    cues: ['Thumb of the bottom hand turned up.', 'Move with your top leg.', 'Slow, even rolls.'], source: { url: 'https://www.nasm.org/resource-center/exercise-library/foam-roll-latissimus-dorsi', title: 'NASM Exercise Library: Foam Roll Latissimus Dorsi' } },
  // sitting on the roller, the left foot planted, the right ankle crossed over the left knee (figure four), hands behind:
  // straightening the planted leg rocks the seat back over the roller and bending it rocks it forward. The seat (the
  // pelvis, a point) rests on the roller; the roller rolls half as far.
  { id: 'roller-glutes', base: 'bw-mountain-climber', name: 'Foam Roller Glute Roll', otherNames: ['Foam Roll Glutes', 'Foam Roll Piriformis', 'Figure-Four Foam Roll'], ...EQ, focus: 'Glutes and outer hips',
    props: [{ type: 'roller', z: -100 }],
    edit: ex => { const sit = (kneeL, hipR, kneeR) => ({ root: [-19, 0, 0], torso: [-25, 0, 0], shoulderL: [-66.5, 10, 0], shoulderR: [-66.5, 10, 0], hipL: [108, 5, 0], kneeL, hipR, kneeR, ankleR: 10 });
      const x = { camera: 60, anchor: 'ankleL', plant: ['L'], touch: [{ point: 'pelvis', adjust: 'hipL' }, { point: 'handL', adjust: 'shoulderL' }, { point: 'handR', adjust: 'shoulderR' }] };
      ex.keyframes = [
        K('Sit on the roller', 'Sit on the roller, right ankle crossed over your left knee, hands behind you; lean a little to the right.', sit(105.8, [116, 31, 78.3], 118), x),
        K('Roll back', 'Straighten your left leg a little to roll back over your right glute, then forward again.', sit(80, [113, 31, 78.3], 118), x)]; },
    over: { ...timed('Small, slow rolls over the buttock of the crossed leg; lean toward it to find the tender spot. Then change sides.'), bilateral: { labels: { L: 'Left glute', R: 'Right glute' } } },
    description: 'Sitting on a foam roller with one ankle crossed over the other knee and your hands behind you, lean toward the crossed leg and rock slowly back and forth over that buttock.',
    setup: ['Sit on a foam roller, hands on the floor behind you, feet flat.', 'Cross your right ankle over your left knee and lean a little to the right.'],
    cues: ['Lean into the crossed-leg side.', 'Small rolls; the planted foot does the work.', 'Breathe out on tender spots.'], source: HEALTHLINE },
];
