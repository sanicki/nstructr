// Batch 18 (Sep 2026): Kettlebell Around the World. The bell passes from hand to hand round the waist: each step says
// which hands hold it ("holds"), and between steps the grip moves from one to the other (gripAt in src/core.js).
// node tools/research.cjs variants tools/variants/batch-18-around-the-world.cjs [id...]
const R = (hand, dx, dz) => ({ hand, to: 'pelvis', dx, dy: 0, dz });
const K = (name, cue, holds, reach, pose = {}) => ({ name, cue, camera: 30, durationMs: 700, holdMs: 0, phase: 'rep', anchor: 'ankleL', plant: ['L', 'R'], holds, reach,
  pose: { hipL: [0, 8, 0], hipR: [0, 8, 0], ...pose } });
module.exports = [
  { id: 'kb-around-the-world', base: 'kb-halo', name: 'Kettlebell Around the World', otherNames: ['Around the World', 'Kettlebell Around the Waist', 'Kettlebell Around the Body', 'Kettlebell Pass Around'],
    category: 'Core', focus: 'Core, grip and shoulders', collections: ['Free weights', 'Warm-up'], equipment: ['Kettlebell'],
    props: [{ type: 'kettlebell', hands: ['handL', 'handR'] }],
    edit: ex => { ex.keyframes = [
      K('Pass in front', 'Pass the bell to your right hand in front.', ['handL', 'handR'], [R('handR', 4, 30), R('handL', -4, 30)]),
      K('Round the right side', 'Right hand takes it round your right side.', ['handR'], [R('handR', 42, 0)], { shoulderL: [0, 10, 0] }),
      K('Pass behind', 'Pass it to your left hand behind your back.', ['handL', 'handR'], [R('handR', 4, -28), R('handL', -4, -28)]),
      K('Round the left side', 'Left hand brings it round your left side.', ['handL'], [R('handL', -42, 0)], { shoulderR: [0, 10, 0] })]; },
    over: { measure: 'reps', holdStep: null, defaults: { reps: 5 }, repName: 'circle', prescription: { reps: '5–10 each way', note: 'A light bell. Hips and shoulders face forward the whole time; only the arms move. Change direction halfway.' },
      direction: { labels: { A: 'Clockwise', B: 'Counterclockwise' } } },
    description: 'Standing tall with a kettlebell, pass it from hand to hand in a circle round your waist, in front and behind, keeping your hips and chest still.',
    setup: ['Stand tall, feet hip-width apart, knees soft.', 'Hold a light kettlebell by the handle in front of you with both hands.'],
    cues: ['Brace your stomach; hips stay square.', 'Pass it cleanly, hand to hand.', 'Keep the bell close to your body.'],
    source: { url: 'https://www.onnit.com/blogs/the-edge/the-kettlebell-around-the-world-exercise-explained', title: 'Onnit: The kettlebell around the world exercise explained' } },
];
