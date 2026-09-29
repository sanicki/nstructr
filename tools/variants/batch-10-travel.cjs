// Batch 10 (engine: travelling, Sep 2026): exercises that move across the floor. "travel": true; a rep ends further
// along than it starts and the next rep carries on from there (src/core.js travelOf). Each rep's first step pins the
// foot that stays put.   node tools/research.cjs variants tools/variants/batch-10-travel.cjs [id...]
const K = (name, cue, pose, x = {}) => ({ name, cue, camera: 90, durationMs: 1200, holdMs: 200, phase: 'rep', ...x, pose });
const reps = (r, n, note) => ({ measure: 'reps', holdStep: null, defaults: { reps: n }, repName: null, prescription: { reps: r, note } });
const ARMS = { shoulderL: [-27.5, 0, 0], elbowL: 69.4, shoulderR: [-27.5, 0, 0], elbowR: 69.4 };     // hands on hips
// a forward lunge with the s leg in front (the back leg's toes stay where they were)
const lunge = (s, o) => ({ ...ARMS, [`hip${s}`]: [85, 0, 0], [`knee${s}`]: 88, [`ankle${s}`]: -3, [`hip${o}`]: [4, 0, 0], [`knee${o}`]: 100, [`ankle${o}`]: 40 });
module.exports = [
  { id: 'bw-walking-lunge', base: 'bw-reverse-lunge', name: 'Walking Lunge', otherNames: ['Forward Walking Lunge', 'Walking Lunges'], category: 'Strength', focus: 'Thighs and glutes',
    collections: ['Bodyweight'], equipment: [],
    edit: ex => { ex.keyframes = [
      K('Stand tall', 'Feet together, hands on your hips.', { ...ARMS }, { anchor: 'ankleL', plant: ['L', 'R'], holdMs: 300 }),
      K('Step forward with the right', 'Step forward with your right foot and lower until both knees bend.', lunge('R', 'L'), { anchor: 'toeL', plant: ['R'], touch: [{ point: 'toeL', adjust: 'hipL' }], durationMs: 1600, holdMs: 300 }),
      K('Stand up', 'Push up and bring your left foot next to your right.', { ...ARMS }, { anchor: 'ankleR', plant: ['L', 'R'], durationMs: 1400 }),
      K('Step forward with the left', 'Now step forward with your left foot and lower.', lunge('L', 'R'), { anchor: 'toeR', plant: ['L'], touch: [{ point: 'toeR', adjust: 'hipR' }], durationMs: 1600, holdMs: 300 }),
      K('Stand up', 'Push up and bring your feet together.', { ...ARMS }, { anchor: 'ankleL', plant: ['L', 'R'], durationMs: 1400, phase: 'finish' })]; },
    over: { bilateral: null, travel: true, ...reps('8–12 each leg', 8, 'Needs a clear stretch of floor, about 5 m. Short of space? Do Reverse Lunges in place.') },
    description: 'Step forward into a lunge, stand up bringing the back foot through, then lunge forward with the other leg, moving across the floor.',
    setup: ['Stand tall with your feet together and your hands on your hips.', 'A clear path in front of you.'],
    cues: ['Front knee over the ankle.', 'Back knee lowers toward the floor.', 'Stand tall between steps.'],
    source: { url: 'https://www.acefitness.org/about-ace/press-room/in-the-news/8310/how-to-do-walking-lunges-properly-for-all-the-lower-body-benefits-according-to-a-trainer-women-s-health/', title: 'ACE: How to do walking lunges properly' } },
  // side steps against a band round the ankles, in a half squat, seen from the front; the other side goes the other way
  { id: 'band-lateral-walk', base: 'bhf-abduction', name: 'Lateral Band Walk', otherNames: ['Banded Lateral Walk', 'Band Side Steps', 'Banded Side Step'], category: 'Strength', focus: 'Outer hips (glutes)',
    collections: ['Resistance band'], equipment: ['Resistance band'], props: [{ type: 'band', from: 'ankleL', to: 'ankleR' }],
    edit: ex => { const half = (w) => ({ ...ARMS, torso: [20, 0, 0], hipL: [30, w, 0], kneeL: 35, ankleL: -12, hipR: [30, w, 0], kneeR: 35, ankleR: -12 });
      ex.keyframes = [
        K('Half squat', 'Feet hip-width, knees bent, hands on your hips.', half(6), { camera: 0, anchor: 'ankleR', plant: ['L', 'R'], durationMs: 900, holdMs: 200 }),
        K('Step right', 'Step your right foot out to the side against the band.', half(14), { camera: 0, anchor: 'ankleL', plant: ['L', 'R'], durationMs: 900, holdMs: 200 })]; },
    over: { travel: true, bilateral: { labels: { L: 'To the right', R: 'To the left' } }, ...reps('10–12 steps each way', 10, 'Keep the band taut the whole time: bring the trailing foot in only to hip-width. Short of space? Step out and back in place.'), repName: 'step' },
    description: 'In a half squat with a band round your ankles, step sideways against the band, then bring the other foot in to hip-width, travelling to the side.',
    setup: ['Loop a band round your ankles (or just above your knees).', 'Feet hip-width apart, knees bent, chest up.'],
    cues: ['Stay low the whole way.', 'Knees in line with your toes.', 'Don\'t let the band go slack.'],
    source: { url: 'https://sweat.com/exercises/lateral-band-walk', title: 'Sweat: Lateral Band Walk' } },
  // walking a line, the heel of the front foot just in front of the back foot's toes
  { id: 'bal-heel-to-toe-walk', base: 'bal-tandem-stance', name: 'Heel-to-Toe Walk', otherNames: ['Tandem Walk', 'Tightrope Walk'], category: 'Balance', focus: 'Balance',
    collections: ['Balance'], equipment: [], props: [],
    edit: ex => { const arms = { shoulderL: [0, 30, 0], shoulderR: [0, 30, 0] };
      ex.keyframes = [
        K('Right foot in front', 'Put your right heel just in front of your left toes.', { ...arms, hipR: [4, -5.5, 0], hipL: [-6, -3, 0] }, { anchor: 'ankleL', plant: ['L', 'R'], durationMs: 1400, holdMs: 500 }),
        K('Left foot in front', 'Now your left heel in front of your right toes.', { ...arms, hipL: [4, -5.5, 0], hipR: [-6, -3, 0] }, { anchor: 'ankleR', plant: ['L', 'R'], durationMs: 1400, holdMs: 500 })]; },
    over: { travel: true, bilateral: null, ...reps('20 steps, 1–3 times', 10, 'Look ahead, not at your feet. Walk beside a wall or counter you can touch if you wobble.'), repName: 'step pair' },
    description: 'Walk in a straight line, putting the heel of each foot just in front of the toes of the other, as if on a tightrope.',
    setup: ['Stand tall beside a wall or counter you can touch if you need to.', 'Arms out to the sides for balance.'],
    cues: ['Heel to toe with each step.', 'Eyes on a point ahead.', 'Slow and steady.'],
    source: { url: 'https://www.nhs.uk/live-well/exercise/balance-exercises/', title: 'NHS: Balance exercises (heel-to-toe walk)' } },
  // walking tall with a heavy dumbbell in each hand
  { id: 'fw-farmers-carry', base: 'fw-db-squat', name: "Farmer's Carry", otherNames: ["Farmer's Walk", 'Farmer Carry', 'Dumbbell Farmer\'s Walk'], category: 'Strength', focus: 'Grip, shoulders and core',
    collections: ['Free weights'], equipment: ['Dumbbells'],
    edit: ex => { const arms = { shoulderL: [0, 8, 0], shoulderR: [0, 8, 0] };
      ex.keyframes = [
        K('Right foot forward', 'Walk tall: step with your right foot, weights by your sides.', { ...arms, hipR: [15, 0, 0], kneeR: 5, hipL: [-12, 0, 0] }, { anchor: 'ankleL', plant: ['L', 'R'], durationMs: 700, holdMs: 0 }),
        K('Left foot forward', 'Now the left foot; short, steady steps.', { ...arms, hipL: [15, 0, 0], kneeL: 5, hipR: [-12, 0, 0] }, { anchor: 'ankleR', plant: ['L', 'R'], durationMs: 700, holdMs: 0 })]; },
    over: { travel: true, bilateral: null, ...reps('20–40 steps, 2–3 times', 15, 'Pick weights heavy for you but that you can hold without leaning. Set them down with a squat, not a stoop.'), repName: 'step pair' },
    description: 'Hold a heavy dumbbell in each hand by your sides and walk tall with short, steady steps, without letting the weights swing.',
    setup: ['Stand between the dumbbells, squat down and pick them up with a firm grip.', 'Stand tall, shoulders back, arms by your sides.'],
    cues: ['Chest up, shoulders down.', 'Short, quick steps.', 'Weights still by your sides.'],
    source: { url: 'https://www.acefitness.org/resources/everyone/exercise-library/359/farmer-s-carry/', title: "ACE Exercise Library: Farmer's Carry" } },
];
