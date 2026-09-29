// Batch 11 (engine: hanging, Sep 2026): exercises hanging from a pull-up bar. The bar is a prop {type: "bar", y, z};
// a hanging step anchors a hand with anchorY = the bar's height, so the figure hangs from it (feet off the floor).
// node tools/research.cjs variants tools/variants/batch-11-hanging.cjs [id...]
const BAR = 385;                                     // a doorway bar, just above a standing reach (hands overhead: 361)
const PROPS = [{ type: 'bar', y: BAR, z: 0, width: 190 }];
const EQ = ['Pull-up bar'];
const K = (name, cue, pose, x = {}) => ({ name, cue, camera: 90, durationMs: 1400, holdMs: 300, phase: 'rep', ...x, pose });
// the right hand holds the bar at the height of the bar; anchorX puts the hands either side of its middle
const HANG = (w) => ({ anchor: 'handR', anchorY: BAR, anchorZ: 0, anchorX: w / 2 });
const STAND = (x = {}) => ({ anchor: 'ankleL', anchorX: -12, plant: ['L', 'R'], ...x });     // under the bar's middle
const reps = (r, n, note) => ({ measure: 'reps', holdStep: null, defaults: { reps: n }, repName: null, prescription: { reps: r, note } });
const LEGS = { hipL: [8, 0, 0], kneeL: 25, hipR: [8, 0, 0], kneeR: 25 };      // legs soft, feet together, off the floor
/* getting on and off the bar: stand, reach up with the arms as they'll hang, jump up to it (quick); at the end let go and
   land with the arms still up, knees soft, then lower the arms. arms: the hang's shoulders */
const withMount = (ex, arms, cam = {}) => {
  const k = ex.keyframes, stand = k[0], drop = k[k.length - 1];
  const reach = K('Reach up', 'Reach up to the bar, arms overhead.', { ...arms }, { ...STAND(cam), phase: 'setup', durationMs: 900, holdMs: 200 });
  // a real jump: bend the knees, then spring up to the bar; land deep and soft
  const crouch = { torso: [15, 0, 0], hipL: [50, 0, 0], kneeL: 75, ankleL: -25, hipR: [50, 0, 0], kneeR: 75, ankleR: -25 };
  const dip = K('Bend your knees', 'Bend your knees, ready to jump.', { ...arms, ...crouch }, { ...STAND(cam), phase: 'setup', durationMs: 600, holdMs: 100 });
  k[1].durationMs = 450; k[1].name = 'Jump to the bar';
  const land = K('Drop down', 'Let go and land softly, knees deeply bent.', { ...arms, torso: [20, 0, 0], hipL: [60, 0, 0], kneeL: 85, ankleL: -28, hipR: [60, 0, 0], kneeR: 85, ankleR: -28 },
    { ...STAND(cam), phase: 'finish', durationMs: 450, holdMs: 250 });
  const down = K(drop.name === 'Drop down' ? 'Lower your arms' : drop.name, 'Stand tall and lower your arms.', {}, { ...STAND(cam), phase: 'finish', durationMs: 900, holdMs: 400 });
  ex.keyframes = [stand, reach, dip, ...k.slice(1, -1), land, down];
  return ex;
};
const x = (id, name, other, o) => ({ id, base: 'bw-squat', name, otherNames: other, equipment: EQ, props: PROPS, collections: ['Bodyweight'], category: 'Strength', ...o });
module.exports = [
  x('bar-pull-up', 'Pull-Up', ['Pullup', 'Wide-Grip Pull-Up'], { focus: 'Back (lats) and biceps',
    edit: ex => { const cam = { camera: 0 };
      ex.keyframes = [
        K('Stand under the bar', 'Stand under the bar.', {}, { ...STAND(cam), phase: 'setup', holdMs: 400 }),
        K('Hang', 'Grip the bar wider than your shoulders, palms forward; hang with straight arms.', { ...LEGS, shoulderL: [0, 145, 0], shoulderR: [0, 145, 0] }, { ...HANG(165), ...cam, durationMs: 1000, holdMs: 400 }),
        K('Pull up', 'Pull your elbows down and in until your chin clears the bar.', { ...LEGS, shoulderL: [0, 70, 90], elbowL: 100, shoulderR: [0, 70, 90], elbowR: 100 }, { ...HANG(165), ...cam, durationMs: 1600, holdMs: 300 }),
        K('Drop down', 'Lower to straight arms, then let go and stand.', {}, { ...STAND(cam), phase: 'finish', durationMs: 1000, holdMs: 400 })]; return withMount(ex, { shoulderL: [0, 145, 0], shoulderR: [0, 145, 0] }, cam); },
    over: { bilateral: null, ...reps('3–8', 5, 'Lower all the way each time. Too hard for now? Hang, or lower slowly from the top with a step to stand on.') },
    description: 'Hang from a bar with a wide grip, palms facing away, and pull yourself up until your chin clears the bar, then lower under control.',
    setup: ['A sturdy pull-up bar you can reach with a small hop or a step.', 'Grip it a bit wider than your shoulders, palms forward.'],
    cues: ['Shoulders down, away from your ears.', 'Pull your elbows toward your ribs.', 'Lower slowly, no swinging.'],
    source: { url: 'https://www.acefitness.org/resources/everyone/exercise-library/191/pull-ups/', title: 'ACE Exercise Library: Pull-ups' } }),
  x('bar-chin-up', 'Chin-Up', ['Chinup', 'Underhand Pull-Up'], { focus: 'Biceps and back (lats)',
    edit: ex => { ex.keyframes = [
        K('Stand under the bar', 'Stand under the bar.', {}, { ...STAND(), phase: 'setup', holdMs: 400 }),
        K('Hang', 'Grip the bar shoulder-width, palms toward you; hang with straight arms.', { ...LEGS, shoulderL: [180, 0, 0], shoulderR: [180, 0, 0] }, { ...HANG(44), durationMs: 1000, holdMs: 400 }),
        K('Pull up', 'Pull up, elbows forward and down, until your chin clears the bar.', { ...LEGS, torso: [-10, 0, 0], shoulderL: [75, 0, 0], elbowL: 145, shoulderR: [75, 0, 0], elbowR: 145 }, { ...HANG(44), durationMs: 1600, holdMs: 300 }),
        K('Drop down', 'Lower to straight arms, then let go and stand.', {}, { ...STAND(), phase: 'finish', durationMs: 1000, holdMs: 400 })]; return withMount(ex, { shoulderL: [180, 0, 0], shoulderR: [180, 0, 0] }); },
    over: { bilateral: null, ...reps('3–8', 5, 'Usually a little easier than the pull-up. Lower all the way each time.') },
    description: 'Hang from a bar with your hands shoulder-width apart, palms facing you, and pull up until your chin clears the bar, then lower under control.',
    setup: ['A sturdy pull-up bar you can reach with a small hop or a step.', 'Grip it shoulder-width, palms facing you.'],
    cues: ['Chest up toward the bar.', 'Elbows close to your body.', 'Lower all the way.'],
    source: { url: 'https://www.acefitness.org/continuing-education/certified/february-2025/8800/the-ace-do-it-better-series-chin-ups/', title: 'ACE: The Do It Better series, chin-ups' } }),
  x('bar-dead-hang', 'Dead Hang', ['Bar Hang', 'Passive Hang'], { focus: 'Grip, shoulders and spine (decompression)', category: 'Mobility',
    edit: ex => { ex.keyframes = [
        K('Stand under the bar', 'Stand under the bar.', {}, { ...STAND(), phase: 'setup', holdMs: 400 }),
        K('Hang', 'Grip the bar and hang with straight arms; breathe.', { ...LEGS, shoulderL: [180, 0, 0], shoulderR: [180, 0, 0] }, { ...HANG(44), durationMs: 1000, holdMs: 20000 }),
        K('Drop down', 'Let go and stand.', {}, { ...STAND(), phase: 'finish', durationMs: 1000, holdMs: 400 })]; return withMount(ex, { shoulderL: [180, 0, 0], shoulderR: [180, 0, 0] }); },
    over: { bilateral: null, measure: 'time', holdStep: 3, defaults: { seconds: 20 }, repName: null, prescription: { reps: '10–30 seconds, 2–3 times', note: 'Let go before your grip gives out. Feet near a step or the floor to stand on.' } },
    description: 'Hang from a bar with straight arms and relaxed shoulders, holding for time to build grip strength and ease the shoulders and spine.',
    setup: ['A sturdy pull-up bar you can reach with a small hop or a step.', 'Grip it shoulder-width, palms forward.'],
    cues: ['Breathe slowly.', 'Relax your legs.', 'Step down before your grip fails.'],
    source: { url: 'https://www.healthline.com/health/fitness-exercise/dead-hang', title: 'Healthline: Dead hang' } }),
  x('bar-hanging-knee-raise', 'Hanging Knee Raise', ['Hanging Knee Tuck', 'Hanging Knee Lift'], { focus: 'Core (lower abs) and hip flexors', collections: ['Core', 'Bodyweight'],
    edit: ex => { ex.keyframes = [
        K('Stand under the bar', 'Stand under the bar.', {}, { ...STAND(), phase: 'setup', holdMs: 400 }),
        K('Hang', 'Grip the bar and hang, legs straight.', { ...LEGS, shoulderL: [180, 0, 0], shoulderR: [180, 0, 0] }, { ...HANG(44), durationMs: 1000, holdMs: 400 }),
        K('Knees up', 'Bring your knees up to hip height, no swinging.', { shoulderL: [180, 0, 0], shoulderR: [180, 0, 0], hipL: [95, 0, 0], kneeL: 95, hipR: [95, 0, 0], kneeR: 95 }, { ...HANG(44), durationMs: 1400, holdMs: 400 }),
        K('Drop down', 'Lower your legs, then let go and stand.', {}, { ...STAND(), phase: 'finish', durationMs: 1000, holdMs: 400 })]; return withMount(ex, { shoulderL: [180, 0, 0], shoulderR: [180, 0, 0] }); },
    over: { bilateral: null, ...reps('8–12', 8, 'Lower your legs slowly so you don\'t swing. Easier: one knee at a time.') },
    description: 'Hanging from a bar, lift your knees to hip height by curling your pelvis up, then lower them slowly without swinging.',
    setup: ['A sturdy pull-up bar you can reach with a small hop or a step.', 'Grip it shoulder-width, palms forward.'],
    cues: ['Shoulders active, not shrugged.', 'Curl your hips up.', 'Lower slowly.'],
    source: { url: 'https://www.strengthlog.com/hanging-knee-raise/', title: 'StrengthLog: Hanging Knee Raise' } }),
];
