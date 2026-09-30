// Batch 25 (Sep 2026): the last steps missing from the linked variations' progressions (library/progressions.json):
// Marching Glute Bridge (Glute Bridge -> Marching -> Feet-Elevated -> Single-Leg) and Band-Assisted Pull-Up (Dead Hang ->
// Band-Assisted -> Chin-Up -> Pull-Up). The third gap, a partial crunch, is the library's Crunch already (head and
// shoulders only): its other names now say so.
// node tools/research.cjs variants tools/variants/batch-25-links.cjs [id...]
const note = 'Described in our own words. Stick-figure approximation.';
module.exports = [
  // hips up in a bridge, lift one foot then the other, hips level
  { id: 'bw-marching-glute-bridge', base: 'bw-glute-bridge', name: 'Marching Glute Bridge', otherNames: ['Marching Bridge', 'Bridge March'],
    category: 'Strength', focus: 'Glutes, hamstrings and core', collections: ['Bodyweight', 'Core'], equipment: [],
    edit: ex => { const [lie, lift] = ex.keyframes, up = lift.pose;
      const march = (s, o) => ({ ...lift, name: `Lift your ${s === 'R' ? 'right' : 'left'} knee`, cue: `Keep the hips up and level; lift your ${s === 'R' ? 'right' : 'left'} knee.`,
        plant: [o], keep: ['ankle' + o, 'handL', 'handR'], durationMs: 1000, holdMs: 400,
        pose: { ...up, ['hip' + s]: [60, 0, 0], ['knee' + s]: 95, ['ankle' + s]: 20 } });
      const down = s => ({ ...lift, name: 'Foot down', cue: 'Put it down, hips still up.', durationMs: 900, holdMs: 100, keep: ['ankleL', 'ankleR', 'handL', 'handR'] });
      ex.keyframes = [{ ...lie, phase: 'setup' }, { ...lift, name: 'Lift your hips', cue: 'Squeeze your glutes and lift your hips.', phase: 'setup' },
        march('R', 'L'), down('R'), march('L', 'R'), down('L'),
        { ...lie, name: 'Lower', cue: 'Lower your hips slowly.', phase: 'finish' }]; },
    over: { bilateral: null, measure: 'reps', holdStep: null, defaults: { reps: 8 }, repName: null, prescription: { reps: '6–10 each leg', note: 'Hips stay level and lifted the whole time; lift the knee only as high as you can without the hips dropping.' } },
    description: 'Holding a glute bridge, lift one knee toward you, put the foot down and lift the other, keeping the hips up and level the whole time.',
    setup: ['Lie on your back, knees bent, feet flat, arms by your sides.', 'Lift your hips into a bridge.'],
    cues: ['Hips level; no dipping.', 'Squeeze your seat.', 'Slow, one knee at a time.'],
    source: { url: 'https://www.healthline.com/health/fitness-exercise/glute-bridge-variations', title: 'Healthline: Glute bridge variations', note } },
  // the pull-up with a band looped over the bar and under the knees, which helps at the bottom
  { id: 'bar-band-assisted-pull-up', base: 'bar-pull-up', name: 'Band-Assisted Pull-Up', otherNames: ['Assisted Pull-Up', 'Banded Pull-Up'],
    category: 'Strength', focus: 'Back and arms', collections: ['Bodyweight', 'Resistance band'], equipment: ['Pull-up bar', 'Resistance band'],
    props: p => [...p, { type: 'band', from: { x: -14, y: 385, z: 0 }, via: ['kneeL', 'kneeR'], to: { x: 14, y: 385, z: 0 } }],
    edit: ex => { ex.keyframes = ex.keyframes.map(k => (k.anchor === 'handR' ? { ...k, pose: { ...k.pose, hipL: [15, 0, 0], kneeL: 95, hipR: [15, 0, 0], kneeR: 95 } } : k));
      ex.keyframes[3] = { ...ex.keyframes[3], cue: 'Grip the bar, knees in the band; hang with straight arms.' }; },
    over: { prescription: { reps: '5–10', note: 'A thicker band helps more; move to a thinner one as you get stronger.' }, defaults: { reps: 6 } },
    description: 'A pull-up with a resistance band looped over the bar and under your knees: the band takes some of your weight, most at the bottom, so you can do full pull-ups while you build up to them.',
    setup: ['Loop a band over the bar and pull one end through the other.', 'From a step or chair, put your knees (or one foot) in the loop and grip the bar.'],
    cues: ['Pull your elbows down and in.', 'Chin over the bar.', 'Lower all the way, slowly.'],
    source: { url: 'https://www.nasm.org/resource-center/exercise-library/band-assisted-pull-up', title: 'NASM Exercise Library: Band Assisted Pull-Up', note } },
];
