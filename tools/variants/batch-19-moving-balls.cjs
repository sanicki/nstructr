// Batch 19 (Sep 2026): balls that move. The stability ball rolls under the heels ({type: "ball", rolls: true}: it goes
// where the point resting on it goes, like the foam roller, see rollerTravel in src/core.js); a ball with "hands" is carried,
// and each step's "holds" says what holds it (hands, ankles, or a spot it was thrown to: heldAt).
// node tools/research.cjs variants tools/variants/batch-19-moving-balls.cjs [id...]
const K = (name, cue, pose, x = {}) => ({ name, cue, camera: 90, durationMs: 1400, holdMs: 300, phase: 'rep', ...x, pose });
const reps = (r, n, note) => ({ measure: 'reps', holdStep: null, defaults: { reps: n }, repName: null, prescription: { reps: r, note } });
module.exports = [
  // lying with the heels on a 55 cm ball (the usual size for it: on a 65 cm one the hips would have to go very high),
  // hips up, then the heels pull the ball in; every step rests the heels on it by the hips' angle, so mid-move they stay on it
  { id: 'ball-hamstring-curl', base: 'ball-bridge', name: 'Stability Ball Hamstring Curl', otherNames: ['Swiss Ball Leg Curl', 'Exercise Ball Leg Curl', 'Stability Ball Leg Curl'],
    category: 'Strength', focus: 'Hamstrings, glutes and core', collections: ['Core', 'Bodyweight'],
    equipment: ['Stability ball'], props: [{ type: 'ball', x: 0, z: 225, r: 49, rolls: true }],
    edit: ex => {
      const arms = { shoulderL: [0, 45, 0], shoulderR: [0, 45, 0] }, touch = [{ point: 'ankleL', adjust: 'hipL' }, { point: 'ankleR', adjust: 'hipR' }, { point: 'handL', adjust: 'shoulderL' }, { point: 'handR', adjust: 'shoulderR' }];
      const lie = { root: [-90, 0, 0], neck: [34, 0, 0], ...arms, hipL: [35, 0, 0], hipR: [35, 0, 0] };
      const up = { root: [-107.5, 0, 0], neck: [51.5, 0, 0], ...arms, hipL: [12, 0, 0], hipR: [12, 0, 0] };
      const curl = { root: [-128, 0, 0], neck: [72, 0, 0], ...arms, hipL: [30, 0, 0], kneeL: 95, ankleL: 70, hipR: [30, 0, 0], kneeR: 95, ankleR: 70 };
      const st = { anchor: 'neckBase', touch };
      ex.keyframes = [
        K('Heels on the ball', 'Lie on your back, heels on the ball, arms out to the sides.', lie, { ...st, phase: 'setup' }),
        K('Lift your hips', 'Press your heels into the ball and lift your hips.', up, { ...st, phase: 'setup' }),
        K('Curl in', 'Pull your heels in, rolling the ball toward you; hips stay up.', curl, { ...st, durationMs: 1300 }),
        K('Roll out', 'Slowly straighten your legs, hips still up.', up, { ...st, durationMs: 1600 }),
        K('Lower', 'Lower your hips to the floor.', lie, { ...st, phase: 'finish' })]; },
    over: { ...reps('8–12', 10, 'Keep your hips up the whole set; lower them only at the end.') },
    description: 'Lying on your back with your heels on a stability ball, lift your hips, then pull your heels in to roll the ball toward you and straighten your legs to roll it back, hips up throughout.',
    setup: ['Lie on your back, arms out to the sides, palms down.', 'Rest your heels and lower legs on top of the ball, feet hip-width apart.'],
    cues: ['Hips stay up as the ball rolls.', 'Pull with your hamstrings.', 'Roll out slowly.'],
    source: { url: 'https://www.acefitness.org/resources/everyone/exercise-library/59/stability-ball-hamstring-curl/', title: 'ACE Exercise Library: Stability Ball Hamstring Curl', note: 'Described in our own words. Stick-figure approximation.' } },
  // lying, a 55 cm ball squeezed between the ankles (resting on the floor), arms overhead: fold up into a V and hand it to the
  // hands, lower with it overhead, fold up again and give it back to the feet. The V fitted so the hands reach the ball
  // just before the ankles (trunk 60° up, hips 145°, knees a little bent)
  { id: 'ball-pass', base: 'ball-bridge', name: 'Stability Ball Pass', otherNames: ['Stability Ball V-Pass', 'Swiss Ball Hand-to-Foot Pass', 'Ball Transfer', 'Exercise Ball Hand-Off'],
    category: 'Core', focus: 'Abdominals and hip flexors', collections: ['Core'],
    equipment: ['Stability ball'], props: [{ type: 'ball', r: 49, hands: ['handL', 'handR', 'ankleL', 'ankleR'] }],
    edit: ex => {
      const feet = ['ankleL', 'ankleR'], hands = ['handL', 'handR'], both = [...hands, ...feet];
      const legsUp = { hipL: [18, 13, 0], hipR: [18, 13, 0] }, armsUp = { shoulderL: [175, 0, 0], shoulderR: [175, 0, 0] };
      const lieFeet = { root: [-90, 0, 0], neck: [34, 0, 0], ...legsUp, ...armsUp };
      const lieHands = { root: [-90, 0, 0], neck: [34, 0, 0], shoulderL: [148, 15, 0], elbowL: 5, shoulderR: [148, 15, 0], elbowR: 5 };
      const V = { root: [-30, 0, 0], neck: [10, 0, 0], hipL: [145, 14, 0], kneeL: 20, hipR: [145, 14, 0], kneeR: 20, shoulderL: [115, 15, 0], elbowL: 14, shoulderR: [115, 15, 0], elbowR: 14 };
      const st = { anchor: 'pelvis', camera: 40 };
      ex.keyframes = [
        K('Ball between your feet', 'Lie on your back, arms overhead, the ball squeezed between your feet.', lieFeet, { ...st, phase: 'setup', holds: feet }),
        K('Pass it up', 'Fold up and take the ball in your hands.', V, { ...st, holds: both, durationMs: 1300 }),
        K('Lower with it', 'Lower your arms and legs, the ball overhead.', lieHands, { ...st, holds: hands, durationMs: 1500 }),
        K('Pass it back', 'Fold up and give the ball to your feet.', V, { ...st, holds: both, durationMs: 1300 }),
        K('Lower', 'Lower your arms and legs, the ball between your feet.', lieFeet, { ...st, holds: feet, durationMs: 1500 })]; },
    over: { ...reps('6–10', 8, 'One rep passes the ball to your hands and back to your feet. Lower slowly; keep your low back on the floor.') },
    description: 'Lying on your back with a stability ball between your feet, fold up into a V to pass it to your hands, lower with it overhead, then fold up again and pass it back to your feet.',
    setup: ['Lie on your back, arms overhead.', 'Squeeze a stability ball between your feet.'],
    cues: ['Fold up from your middle.', 'Hand the ball over at the top.', 'Lower slowly; low back stays down.'],
    source: { url: 'https://us.physitrack.com/home-exercise-video/core-activation---stability-ball-pass-hands-to-feet', title: 'Physitrack: Stability ball pass, hands to feet', note: 'Described in our own words. Stick-figure approximation.' } },
  // standing about 1.5 m from a wall (z 260), the ball at the chest, knees bent (loaded): drive up through the legs and
  // push it off (ease "in": it leaves the hands at full speed), it flies to the wall (dropping a little: it's heavy),
  // comes back slower, and the arms and knees give as it's caught (ease "out") and brought back to the chest. The
  // steps' times are set so the ball keeps its speed from one step to the next (no stop at the release or the catch)
  { id: 'mb-chest-pass', base: 'mb-slam', name: 'Medicine Ball Chest Pass', otherNames: ['Med Ball Chest Pass', 'Medicine Ball Wall Chest Pass'],
    category: 'Strength', focus: 'Chest, shoulders and triceps (power)', collections: ['Free weights'],
    equipment: ['Medicine ball', 'Wall'], props: [{ type: 'medball' }, { type: 'wall', z: 260 }],
    edit: ex => {
      const st = { anchor: 'ankleL', plant: ['L', 'R'], camera: 70 }, hands = ['handL', 'handR'], T = [335, 240, 300, 436];
      const load = { hipL: [22, 6, 0], kneeL: 38, hipR: [22, 6, 0], kneeR: 38, torso: [10, 0, 0], shoulderL: [25, 0, 0], elbowL: 118, shoulderR: [25, 0, 0], elbowR: 118 };
      const out = { hipL: [4, 6, 0], kneeL: 6, hipR: [4, 6, 0], kneeR: 6, torso: [6, 0, 0], shoulderL: [85, 0, 0], elbowL: 5, shoulderR: [85, 0, 0], elbowR: 5 };
      const reachC = { hipL: [8, 6, 0], kneeL: 14, hipR: [8, 6, 0], kneeR: 14, torso: [6, 0, 0], shoulderL: [78, 0, 0], elbowL: 25, shoulderR: [78, 0, 0], elbowR: 25 };
      const wall = [{ x: 0, y: 222, z: 240 }];
      ex.keyframes = [
        K('Ball at your chest', 'The ball at your chest, knees bent.', load, { ...st, holds: hands, durationMs: T[0], holdMs: 150, ease: 'out' }),
        K('Pass', 'Drive up and push it hard to the wall.', out, { ...st, holds: hands, durationMs: T[1], holdMs: 0, ease: 'in' }),
        // (it flies to the wall at the speed it left the hands, then back more slowly)
        K('', '', out, { ...st, holds: wall, durationMs: T[2], holdMs: 0, ease: 'linear', quiet: true }),
        K('Catch', 'Catch it and let your arms and knees give.', reachC, { ...st, holds: hands, durationMs: T[3], holdMs: 0, ease: 'linear' })]; },
    over: { bilateral: null, ...reps('8–12', 10, 'Use a ball that bounces back (not a slam ball). Stand close enough to catch it easily.') },
    description: 'Facing a wall with a medicine ball at your chest, push it off hard and straight to the wall, then catch the rebound with soft elbows and bring it back to your chest.',
    setup: ['Stand facing a sturdy wall, about a big step and a half away.', 'Feet shoulder-width apart, knees soft, the ball at your chest.'],
    cues: ['Push fast, straight from your chest.', 'Arms finish long.', 'Catch soft, then go again.'],
    source: { url: 'https://fitwill.app/exercise/5144/medicine-ball-chest-pass-against-wall/', title: 'Fitwill: Medicine Ball Chest Pass Against Wall', note: 'Described in our own words. Stick-figure approximation.' } },
];
