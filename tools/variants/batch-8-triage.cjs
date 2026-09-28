// Batch 8 (triage, Sep 2026): Bound Angle Forward Bend, from Bound Angle Pose with a fold forward added.
// node tools/research.cjs variants tools/variants/batch-8-triage.cjs [id...]
module.exports = [
  { id: 'yoga-bound-angle-forward-bend', base: 'yoga-bound-angle', name: 'Bound Angle Forward Bend',
    otherNames: ['Baddha Konasana Uttanasana', 'Bound Angle Forward Fold', 'Butterfly Forward Fold'],
    category: 'Stretch', focus: 'Inner thighs, hips and back', collections: ['Yoga'], equipment: ['Yoga mat'],
    edit: ex => {
      const [staff, bend, bound] = ex.keyframes;
      const legs = { hipL: [95, 55, 90], kneeL: 150, hipR: [95, 55, 90], kneeR: 150 };
      bound.phase = 'setup'; bound.holdMs = 1500; bound.name = 'Sit tall'; bound.cue = 'Soles together, hold your feet. Breathe in and sit tall.';
      ex.keyframes = [staff, bend, bound, {
        name: 'Fold forward', cue: 'Breathe out and fold forward from your hips, elbows out, head heavy.',
        camera: 45, durationMs: 2600, holdMs: 5000, phase: 'rep', anchor: 'pelvis',
        pose: { torso: [60, 0, 0], neck: [20, 0, 0], shoulderL: [60, 30, -90], elbowL: 60, shoulderR: [60, 30, -90], elbowR: 60, ...legs },
        reach: [{ hand: 'handR', to: 'footR' }, { hand: 'handL', to: 'footL' }] }];
      ex.holdStep = 3;
      return ex;
    },
    description: 'From Bound Angle Pose, with the soles of your feet together and your knees open, fold forward from the hips over your feet to stretch the inner thighs, hips and back.',
    setup: ['Sit on a mat, bend your knees and bring the soles of your feet together, heels toward you.', 'Hold your feet or ankles. Sit on a folded blanket if your back rounds.'],
    cues: ['Lengthen your spine before you fold.', 'Fold from the hips; let your knees drop on their own.', 'Rest your head wherever it reaches; don\'t force it.'],
    prescription: { reps: 'Hold 30–60 seconds', note: 'Breathe slowly; come up on a breath in. Skip the fold with a groin or knee injury.' },
    source: { url: 'https://www.tummee.com/yoga-poses/bound-angle-forward-bend', title: 'Tummee: Bound Angle Forward Bend (Baddha Konasana Uttanasana)', note: 'Described in our own words. Stick-figure approximation.' } },
];
