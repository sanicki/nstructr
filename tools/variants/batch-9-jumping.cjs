// Batch 9 (engine: jumping, Sep 2026): exercises with both feet off the floor for a moment. An airborne step has
// "lift" (how far the whole figure is above where it would rest); the checks count that as meant, not floating.
// node tools/research.cjs variants tools/variants/batch-9-jumping.cjs [id...]
// (a null in x drops that field: no anchor means the lowest point rests on the floor, the pelvis centred)
const K = (name, cue, pose, x = {}) => Object.fromEntries(Object.entries({ name, cue, camera: 90, durationMs: 1000, holdMs: 200, phase: 'rep', anchor: 'ankleL', plant: ['L', 'R'], ...x, pose }).filter(([, v]) => v !== null));
const reps = (r, n, note) => ({ measure: 'reps', holdStep: null, defaults: { reps: n }, repName: null, prescription: { reps: r, note } });
const ACE = (n, slug, title) => ({ url: `https://www.acefitness.org/resources/everyone/exercise-library/${n}/${slug}/`, title: `ACE Exercise Library: ${title}` });
const SQUAT = { torso: [38, 0, 0], hipL: [88, 0, 0], kneeL: 102, ankleL: -14, hipR: [88, 0, 0], kneeR: 102, ankleR: -14 };
module.exports = [
  { id: 'bw-jump-squat', base: 'bw-squat', name: 'Jump Squat', otherNames: ['Squat Jump', 'Squat Jumps'], category: 'Strength', focus: 'Thighs, glutes and calves (power)',
    collections: ['Bodyweight', 'Warm-up'], equipment: [],
    edit: ex => { ex.keyframes = [
      K('Stand tall', 'Feet shoulder-width apart, arms by your sides.', {}, { phase: 'setup', holdMs: 500 }),
      K('Squat down', 'Squat down and swing your arms back.', { ...SQUAT, shoulderL: [5, 0, 0], shoulderR: [5, 0, 0] }, { durationMs: 900, holdMs: 100 }),
      K('Jump', 'Swing your arms up and jump.', { torso: [5, 0, 0], shoulderL: [165, 0, 0], shoulderR: [165, 0, 0], ankleL: 35, ankleR: 35 }, { durationMs: 350, holdMs: 0, lift: 45, quiet: true }),
      K('Land softly', 'Land softly, knees bent.', { torso: [18, 0, 0], shoulderL: [40, 0, 0], shoulderR: [40, 0, 0], hipL: [40, 0, 0], kneeL: 50, ankleL: -10, hipR: [40, 0, 0], kneeR: 50, ankleR: -10 }, { durationMs: 350, holdMs: 100, quiet: true }),
      K('Stand tall', 'Stand up and breathe.', {}, { phase: 'finish', holdMs: 500 })]; },
    over: { ...reps('8–12', 8, 'Land softly on the balls of your feet, then heels, with knees bent; rest if your landings get heavy. Learn the plain squat first.') },
    description: 'From standing, squat down with your arms swinging back, then swing them up and jump as high as you can, landing softly back into the squat.',
    setup: ['Stand with your feet shoulder-width apart, arms by your sides.', 'Clear space above and around you; a firm, non-slip floor.'],
    cues: ['Knees in line with your toes.', 'Land quietly, knees soft.', 'Straight into the next squat.'], source: ACE(116, 'squat-jumps', 'Squat Jumps') },
  { id: 'bw-jumping-jacks', base: 'bw-squat', name: 'Jumping Jacks', otherNames: ['Star Jumps', 'Jumping Jack'], category: 'Cardio', focus: 'Whole body (cardio)',
    collections: ['Warm-up', 'Bodyweight'], equipment: [],
    edit: ex => { const F = { camera: 0, anchor: null, plant: null };
      ex.keyframes = [
      K('Stand tall', 'Feet together, arms by your sides.', { kneeL: 5, kneeR: 5 }, { ...F, phase: 'setup', holdMs: 400 }),
      K('Jump out', 'Jump your feet apart and swing your arms up.', { hipL: [0, 10, 0], hipR: [0, 10, 0], ankleL: 30, ankleR: 30, shoulderL: [0, 110, 0], shoulderR: [0, 110, 0] }, { ...F, durationMs: 300, holdMs: 0, lift: 20, quiet: true }),
      K('Feet wide, arms up', 'Land with feet wide, arms overhead.', { hipL: [0, 18, 0], kneeL: 12, ankleL: -6, hipR: [0, 18, 0], kneeR: 12, ankleR: -6, shoulderL: [0, 170, 0], shoulderR: [0, 170, 0] }, { ...F, durationMs: 300, holdMs: 50 }),
      K('Jump in', 'Jump your feet back together, arms down.', { hipL: [0, 8, 0], hipR: [0, 8, 0], ankleL: 30, ankleR: 30, shoulderL: [0, 90, 0], shoulderR: [0, 90, 0] }, { ...F, durationMs: 300, holdMs: 0, lift: 20, quiet: true }),
      K('Feet together', 'Land with feet together, arms by your sides.', { kneeL: 12, ankleL: -6, kneeR: 12, ankleR: -6 }, { ...F, durationMs: 300, holdMs: 50 }),
      K('Stand tall', 'Stand still and breathe.', {}, { ...F, phase: 'finish', holdMs: 400 })]; },
    over: { ...reps('20–40', 20, 'Stay light on the balls of your feet. For less impact, step one foot out at a time instead of jumping.'), repName: 'jack' },
    description: 'Jump your feet apart while swinging your arms overhead, then jump them back together as your arms come down, in a steady rhythm.',
    setup: ['Stand tall with your feet together and your arms by your sides.', 'A firm, non-slip floor with room to your sides.'],
    cues: ['Land softly on the balls of your feet.', 'Knees slightly bent.', 'Keep a steady rhythm.'], source: { url: 'https://www.nasm.org/resource-center/exercise-library/jumping-jacks', title: 'NASM Exercise Library: Jumping Jacks' } },
  // running in place: the standing foot swaps each step (a small hop); anchorX keeps the pelvis where it is
  { id: 'wu-high-knees', base: 'bw-squat', name: 'High Knees', otherNames: ['High Knee Run', 'Running in Place with High Knees'], category: 'Cardio', focus: 'Hips, legs and core (cardio)',
    collections: ['Warm-up'], equipment: [],
    edit: ex => { const knee = (s, o) => { const up = { [`hip${s}`]: [90, 0, 0], [`knee${s}`]: 100, [`ankle${o}`]: 15 };
        const arm = { [`shoulder${o}`]: [55, 0, 0], [`elbow${o}`]: 90, [`shoulder${s}`]: [-30, 0, 0], [`elbow${s}`]: 90 };
        return { ...up, ...arm }; };
      ex.keyframes = [
      K('Stand tall', 'Feet hip-width apart, arms bent at your sides.', { shoulderL: [0, 0, 0], elbowL: 90, shoulderR: [0, 0, 0], elbowR: 90 }, { phase: 'setup', holdMs: 400 }),
      K('Right knee up', 'Drive your right knee up to hip height.', knee('R', 'L'), { durationMs: 350, holdMs: 0, plant: ['L'], lift: 6 }),
      K('Left knee up', 'Now the left knee, opposite arm forward.', knee('L', 'R'), { durationMs: 350, holdMs: 0, anchor: 'ankleR', anchorX: 24, plant: ['R'], lift: 6 }),
      K('Stand tall', 'Slow down and stand.', {}, { phase: 'finish', holdMs: 400 })]; },
    over: { ...reps('20–40 each leg', 20, 'Stay on the balls of your feet and pump your arms. For less impact, march with high knees instead of running.') },
    description: 'Run in place, driving each knee up to about hip height in turn and pumping the opposite arm, landing lightly on the balls of your feet.',
    setup: ['Stand tall with your feet hip-width apart.', 'Clear, non-slip floor.'],
    cues: ['Knees up to hip height.', 'Opposite arm, opposite knee.', 'Land lightly.'], source: { url: 'https://www.healthline.com/health/fitness/high-knees-benefits', title: 'Healthline: High Knees, benefits and how-to' } },
];
