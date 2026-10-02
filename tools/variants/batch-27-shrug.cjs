// Batch 27 (Oct 2026): the Shoulder Shrug, standing (UMM Health describes it seated; the owner asked for standing).
// Uses the shoulder lift joint added for it (shrugL/R, src/core.js).
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
];
