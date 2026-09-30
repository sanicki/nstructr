// Batch 24 (Sep 2026): the steps missing from the linked variations' progressions (library/progressions.json):
// Knee Plank, before Plank, and Single-Leg Glute Bridge, after the Feet-Elevated Glute Bridge.
// node tools/research.cjs variants tools/variants/batch-24-links.cjs [id...]
const note = 'Described in our own words. Stick-figure approximation.';
module.exports = [
  // forearms down, knees down, a straight line from the knees to the shoulders
  { id: 'core-knee-plank', base: 'core-forearm-plank', name: 'Knee Plank', otherNames: ['Modified Plank', 'Kneeling Plank'],
    category: 'Core', focus: 'Core', collections: ['Core'], equipment: [],
    edit: ex => { const [set, plank] = ex.keyframes;
      ex.keyframes = [set, { ...plank, name: 'Knee Plank', cue: 'Walk your knees back: one straight line from knees to shoulders.', touch: [{ point: 'kneeR', adjust: 'hipR' }, { point: 'kneeL', adjust: 'hipL' }],
        pose: { root: [95, 0, 0], shoulderL: [95, 0, 0], elbowL: 90, shoulderR: [95, 0, 0], elbowR: 90, hipL: [0, 0, 0], kneeL: 95, ankleL: 90, hipR: [0, 0, 0], kneeR: 95, ankleR: 90 } }]; },
    description: 'Resting on your forearms and knees, walk the knees back until your body makes one straight line from the knees to the shoulders, and hold. The easier start to the Plank.',
    setup: ['On your forearms and knees, elbows under your shoulders.'],
    cues: ['Straight line from knees to shoulders.', 'Squeeze your seat; don\'t let the hips sag.', 'Breathe steadily.'],
    source: { url: 'https://www.healthline.com/health/14-plank-variations-your-core-will-thank-you-for-later', title: 'Healthline: Plank variations', note } },
  // the glute bridge with one leg straight, thighs level
  { id: 'bw-single-leg-glute-bridge', base: 'bw-glute-bridge', name: 'Single-Leg Glute Bridge', otherNames: ['One-Leg Glute Bridge', 'Single-Leg Bridge'],
    category: 'Strength', focus: 'Glutes and hamstrings', collections: ['Bodyweight'], equipment: [],
    edit: ex => { const [lie, lift] = ex.keyframes;
      ex.keyframes = [{ ...lie, cue: 'Knees bent, feet flat; straighten one leg, thighs level.', plant: ['L'], touch: [{ point: 'ankleL', adjust: 'kneeL' }], pose: { ...lie.pose, kneeR: 0, ankleR: 20 } },
        { ...lift, cue: 'Push through the heel on the floor and lift your hips.', plant: ['L'], keep: ['ankleL', 'handL', 'handR'], pose: { ...lift.pose, kneeR: 0, ankleR: 20 } }]; },
    over: { bilateral: { labels: { L: 'Left leg', R: 'Right leg' } } },
    description: 'Lying on your back with one foot flat and the other leg straight, thighs level, push through the heel on the floor to lift your hips, then lower. Harder than the two-legged Glute Bridge.',
    setup: ['Lie on your back, knees bent, feet flat, arms by your sides.', 'Straighten one leg, keeping the thighs level.'],
    cues: ['Hips level; don\'t let one side drop.', 'Squeeze your seat at the top.', 'Lower slowly.'],
    source: { url: 'https://www.acefitness.org/resources/everyone/exercise-library/145/glute-bridge-single-leg-progression/', title: 'ACE Exercise Library: Glute Bridge, single-leg progression', note } },
];
