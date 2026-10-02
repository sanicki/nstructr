// Batch 27 (Oct 2026): the Shoulder Shrug, standing (UMM Health describes it seated; the owner asked for standing).
// Uses the shoulder lift joint added for it (shrugL/R, src/core.js). Then its band version (owner, Oct 2026).
// node tools/research.cjs variants tools/variants/batch-27-shrug.cjs [id...]
const note = 'Described in our own words. The source does it sitting in a chair; this is the same move standing.';
const arms = { shoulderL: [0, 4, 0], shoulderR: [0, 4, 0] };
module.exports = [
  { id: 'str-shoulder-shrug', base: 'str-triceps-stretch', name: 'Shoulder Shrug', otherNames: ['Standing Shoulder Shrug', 'Shrug'],
    category: 'Mobility', focus: 'Shoulders and neck', collections: ['Stretches', 'Warm-up'], equipment: [],
    edit: ex => {
      const k = o => ({ camera: 0, anchor: 'ankleL', plant: ['L', 'R'], ...o });
      ex.keyframes = [
        k({ name: 'Stand tall', cue: 'Feet hip-width apart, arms relaxed by your sides.', durationMs: 1200, holdMs: 300, phase: 'setup', pose: { ...arms } }),
        k({ name: 'Shrug', cue: 'Lift both shoulders up toward your ears.', durationMs: 1200, holdMs: 5000, phase: 'rep', pose: { ...arms, shrugL: 32, shrugR: 32 } }),
        k({ name: 'Release', cue: 'Let your shoulders drop and relax.', durationMs: 1200, holdMs: 500, phase: 'rep', pose: { ...arms } })];
    },
    over: { bilateral: null, measure: 'reps', holdStep: null, defaults: { reps: 10 }, repName: 'shrug',
      prescription: { reps: '10', note: 'Hold each shrug for a count of 5. Keep your head and neck still and relaxed; move only your shoulders.' } },
    description: 'Standing tall with your arms relaxed, lift both shoulders up toward your ears, hold for a count of five, then let them drop. It stretches and strengthens the shoulders and neck.',
    setup: ['Stand tall, feet hip-width apart, weight even.', 'Arms relaxed by your sides.'],
    cues: ['Shoulders straight up, not forward.', 'Head and neck still.', 'Let them drop all the way.'],
    source: { url: 'https://www.ummhealth.org/health-library/shoulder-shrug-exercise', title: 'UMM Health: Shoulder shrug exercise', note } },
  // standing on the middle of the band, an end in each hand at your sides; the same shrug against the band
  { id: 'band-shrug', base: 'str-shoulder-shrug', name: 'Band Shrug', otherNames: ['Resistance Band Shrug'],
    category: 'Strength', focus: 'Upper back and neck', collections: ['Resistance band'], equipment: ['Resistance band'],
    props: [{ type: 'band', from: 'handL', via: ['footL', 'footR'], to: 'handR' }],
    edit: ex => {
      const w = [['Stand on the band', 'Stand on the middle of the band, an end in each hand at your sides.'],
        ['Shrug', 'Lift both shoulders straight up toward your ears.'], ['Lower', 'Lower your shoulders slowly.']];
      ex.keyframes.forEach((k, i) => { [k.name, k.cue] = w[i]; k.holdMs = i === 1 ? 1000 : i === 2 ? 300 : k.holdMs; });
    },
    over: { bilateral: null, measure: 'reps', holdStep: null, defaults: { reps: 12 }, repName: 'shrug',
      prescription: { reps: '12–15', note: 'Arms stay straight; the shoulders move straight up and down, not rolled. Keep the band tight at the bottom.' } },
    description: 'Standing on the middle of a resistance band with an end in each hand at your sides, lift your shoulders straight up toward your ears against the band, pause, then lower them slowly.',
    setup: ['Stand on the middle of the band, feet hip-width apart.', 'Hold an end in each hand, arms straight at your sides, palms in.'],
    cues: ['Shoulders straight up, not rolled.', 'Arms stay straight.', 'Lower slowly.'],
    source: { url: 'https://www.trainwell.net/exercises/band-shrug', title: 'Trainwell: Band Shrug', note: 'Described in our own words. Stick-figure approximation.' } },
];
