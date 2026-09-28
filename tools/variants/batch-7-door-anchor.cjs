// Collection research, batch 7: band exercises with a door anchor (docs/collection-research.md). A door anchor is a
// band tied to a fixed spot on a door: the door is a wall, the band starts at {x, y, z} on it (y = height; standing,
// the chest is about 235, the face 290). node tools/research.cjs variants tools/variants/batch-7-door-anchor.cjs [id...]
const K = (name, cue, pose, x = {}) => ({ name, cue, camera: 90, durationMs: 1500, holdMs: 300, phase: 'rep', anchor: 'ankleL', plant: ['L', 'R'], ...x, pose });
const reps = (r = '10–15', n = 12, note = 'Pick a band you can control for every rep; about 2 seconds each way.') => ({ measure: 'reps', holdStep: null, defaults: { reps: n }, repName: null, prescription: { reps: r, note } });
const EQ = ['Resistance band', 'Door anchor'];
const ahead = (y, z = 170) => [{ type: 'wall', z }, { type: 'band', from: { z, y }, to: 'handL' }, { type: 'band', from: { z, y }, to: 'handR' }];
const x = (id, name, other, o) => ({ id, base: 'bhf-chest-press', name, otherNames: other, equipment: EQ, collections: ['Resistance band'], category: 'Strength', ...o });
const STANCE = { hipL: [0, 8, 0], hipR: [0, 8, 0] };
module.exports = [
  x('band-face-pull', 'Band Face Pull', ['Face Pull', 'Resistance Band Face Pull'], { focus: 'Upper back and rear shoulders', props: ahead(290),
    edit: e => { e.keyframes = [
      K('Arms forward', 'Facing the door, arms straight toward the anchor.', { ...STANCE, shoulderL: [100, 0, 0], shoulderR: [100, 0, 0] }),
      K('Pull to your face', 'Pull toward your face, elbows high and wide, hands by your ears.', { ...STANCE, shoulderL: [0, 90, 90], elbowL: 100, shoulderR: [0, 90, 90], elbowR: 100 }, { durationMs: 1800 })]; },
    over: { bilateral: null, ...reps('12–15', 12) },
    description: 'With a band anchored at face height on a door, pull it toward your face with elbows high and wide, squeezing your shoulder blades, then return.',
    setup: ['Anchor the band at eye to forehead height on a closed door.', 'Face the door, holding an end in each hand, arms straight.'],
    cues: ['Elbows high and wide.', 'Squeeze your shoulder blades.', 'Don\'t shrug.'], source: { url: 'https://aerobis.com/blogs/fitness/face-pulls-with-resistance-bands', title: 'Aerobis: Face pulls with a resistance band' } }),
  x('band-standing-row', 'Standing Band Row', ['Standing Resistance Band Row', 'Band Row (Door Anchor)'], { focus: 'Upper back', props: ahead(235),
    edit: e => { e.keyframes = [
      K('Arms forward', 'Facing the door, arms straight at chest height.', { ...STANCE, shoulderL: [90, 0, 0], shoulderR: [90, 0, 0] }),
      K('Row', 'Pull your elbows back past your ribs.', { ...STANCE, shoulderL: [-20, 8, 0], elbowL: 100, shoulderR: [-20, 8, 0], elbowR: 100 }, { durationMs: 1800 })]; },
    over: { bilateral: null, ...reps() },
    description: 'With a band anchored at chest height on a door, pull your elbows straight back past your ribs, squeezing your shoulder blades, then return.',
    setup: ['Anchor the band at chest height on a closed door.', 'Face the door, an end in each hand, arms straight; step back until the band is taut.'],
    cues: ['Chest tall.', 'Elbows close to your sides.', 'Squeeze, then return slowly.'], source: { url: 'https://tribelifting.com/blogs/news/how-door-straps-enhance-your-upper-body-training', title: 'Tribe Lifting: Door anchor exercises' } }),
  x('band-standing-chest-press', 'Standing Band Chest Press', ['Band Chest Press (Door Anchor)'], { focus: 'Chest and front of the shoulders',
    props: [{ type: 'wall', z: -150 }, { type: 'band', from: { z: -150, y: 240 }, to: 'handL', via: ['armpitL'] }, { type: 'band', from: { z: -150, y: 240 }, to: 'handR', via: ['armpitR'] }],
    edit: e => { e.keyframes = [
      K('Hands at your chest', 'Back to the door, hands by your chest, elbows back.', { hipR: [18, 0, 0], hipL: [-8, 0, 0], shoulderL: [-15, 45, 0], elbowL: 110, shoulderR: [-15, 45, 0], elbowR: 110 }),
      K('Press', 'Press both hands straight forward.', { hipR: [18, 0, 0], hipL: [-8, 0, 0], shoulderL: [85, 5, 0], shoulderR: [85, 5, 0] }, { durationMs: 1800 })]; },
    over: { bilateral: null, ...reps() },
    description: 'With a band anchored behind you at chest height, press both hands forward from your chest until your arms are nearly straight, then return.',
    setup: ['Anchor the band at chest height on a closed door behind you.', 'Face away, one foot in front, hands at your chest.'],
    cues: ['Staggered stance.', 'Press straight ahead.', 'Return slowly.'], source: { url: 'https://tribelifting.com/blogs/news/how-door-straps-enhance-your-upper-body-training', title: 'Tribe Lifting: Door anchor exercises' } }),
  x('band-triceps-pushdown', 'Band Triceps Pushdown', ['Resistance Band Triceps Pushdown', 'Band Pushdown'], { focus: 'Triceps', props: ahead(330, 110),
    edit: e => { e.keyframes = [
      K('Elbows bent', 'Elbows by your sides, forearms level.', { torso: [8, 0, 0], shoulderL: [0, 5, 0], elbowL: 90, shoulderR: [0, 5, 0], elbowR: 90 }),
      K('Push down', 'Straighten your arms down.', { torso: [8, 0, 0], shoulderL: [0, 5, 0], elbowL: 5, shoulderR: [0, 5, 0], elbowR: 5 })]; },
    over: { bilateral: null, ...reps() },
    description: 'With a band anchored high on a door, keep your elbows by your sides and push your hands down until your arms are straight, then let them come back up.',
    setup: ['Anchor the band high on a closed door.', 'Face the door, elbows tucked in, forearms level.'],
    cues: ['Elbows stay pinned to your sides.', 'Squeeze at the bottom.', 'Control it back up.'], source: { url: 'https://www.fitbudd.com/academy/resistance-band-tricep-pushdown', title: 'FitBudd: Resistance band tricep pushdown' } }),
  x('band-pallof-press', 'Pallof Press', ['Standing Anti-Rotation Press', 'Band Pallof Press'], { category: 'Core', focus: 'Core (anti-rotation)', collections: ['Resistance band', 'Core'],
    props: [{ type: 'wall', beside: true, x: 170 }, { type: 'band', from: { x: 170, y: 235, z: 0 }, to: 'handR' }],
    edit: e => { e.keyframes = [
        K('Hands at your chest', 'Side-on to the door, hands clasped at your chest.', { hipL: [0, 10, 0], hipR: [0, 10, 0], kneeL: 12, kneeR: 12, shoulderL: [30, -10, 0], elbowL: 110, shoulderR: [30, -10, 0], elbowR: 110 }, { camera: 0 }),
        K('Press out', 'Press straight forward; don\'t let the band turn you.', { hipL: [0, 10, 0], hipR: [0, 10, 0], kneeL: 12, kneeR: 12, shoulderL: [88, -14, 0], elbowL: 4, shoulderR: [88, -14, 0], elbowR: 4 }, { camera: 0, durationMs: 1800, holdMs: 1000 })]; },
    over: { bilateral: { labels: { L: 'Door on your right', R: 'Door on your left' } }, ...reps('8–12 each side', 10, 'Hold the press for a breath or two; keep your chest facing forward.') },
    description: 'Standing side-on to a band anchored at chest height, press your clasped hands straight out from your chest and hold, without letting the band twist you.',
    setup: ['Anchor the band at chest height on a closed door.', 'Stand side-on, feet hip-width, knees soft, band in both hands at your chest.'],
    cues: ['Chest and hips face forward.', 'Brace before you press.', 'Slow return.'], source: { url: 'https://www.acefitness.org/resources/everyone/exercise-library/332/standing-anti-rotation-press/', title: 'ACE Exercise Library: Standing Anti-Rotation Press' } }),
  x('band-woodchop', 'Band Woodchop', ['High-to-Low Woodchop', 'Resistance Band Wood Chop'], { category: 'Core', focus: 'Obliques and core', collections: ['Resistance band', 'Core'],
    props: [{ type: 'wall', beside: true, x: 170 }, { type: 'band', from: { x: 170, y: 320, z: 0 }, to: 'handR' }],
    edit: e => { e.keyframes = [
        K('Reach up', 'Side-on to the door, arms up toward the anchor.', { hipL: [0, 14, 0], hipR: [0, 14, 0], torso: [0, 0, -30], shoulderL: [140, -20, 0], shoulderR: [140, -5, 0] }, { camera: 0 }),
        K('Chop down', 'Rotate and pull the band down across to your left knee.', { hipL: [30, 14, 0], kneeL: 35, hipR: [30, 14, 0], kneeR: 35, torso: [25, 0, 30], shoulderL: [60, -10, 0], shoulderR: [60, -15, 0] }, { camera: 0, durationMs: 1800 })]; },
    over: { bilateral: { labels: { L: 'Door on your right', R: 'Door on your left' } }, ...reps('8–12 each side', 10) },
    description: 'Standing side-on to a band anchored high, pull it diagonally down across your body toward the opposite knee, turning through your torso, then return with control.',
    setup: ['Anchor the band high on a closed door.', 'Stand side-on, feet shoulder-width, both hands on the band above your near shoulder.'],
    cues: ['Turn from your core, arms long.', 'Pivot the back foot.', 'Control the way back up.'], source: { url: 'https://www.strengthlog.com/high-to-low-wood-chop-with-band/', title: 'StrengthLog: Banded wood chop (high to low)' } }),
];
