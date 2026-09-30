// Batch 18 (Sep 2026): Kettlebell Around the World, Clean and Turkish Get-Up. The bell passes from hand to hand round the waist: each step says
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
  // one arm: hike the bell back between the legs, drive the hips so it rises close to the body, catch it at the
  // shoulder (the rack: elbow tucked, the bell resting on the back of the forearm), then let it drop back to the hike
  { id: 'kb-clean', base: 'fw-kb-swing', name: 'Kettlebell Clean', otherNames: ['Single-Arm Kettlebell Clean', 'One-Arm Kettlebell Clean'],
    category: 'Strength', focus: 'Hips, glutes, back and grip (power)', collections: ['Free weights'], equipment: ['Kettlebell'],
    props: [{ type: 'kettlebell', hand: 'handR' }],
    edit: ex => { const S = (name, cue, pose, x = {}) => ({ name, cue, camera: 60, durationMs: 600, holdMs: 0, phase: 'rep', anchor: 'ankleL', plant: ['L', 'R'], ...x, pose });
      ex.keyframes = [
        S('Hike back', 'Hinge and hike the bell back between your legs.', { torso: [60, 0, 0], shoulderR: [12, -4, 0], shoulderL: [30, 20, 0], hipL: [20, 8, 0], kneeL: 30, ankleL: -10, hipR: [20, 8, 0], kneeR: 30, ankleR: -10 }, { durationMs: 700, holdMs: 100 }),
        S('Drive', 'Snap your hips forward; pull the bell up close to your body.', { torso: [8, 0, 0], shoulderR: [-10, 0, 0], elbowR: 100, shoulderL: [10, 15, 0], hipL: [0, 8, 0], hipR: [0, 8, 0] }, { durationMs: 350 }),
        S('Rack', 'Catch it at your shoulder, elbow tucked in, wrist straight.', { shoulderR: [20, 10, 0], elbowR: 150, shoulderL: [0, 8, 0], hipL: [0, 8, 0], hipR: [0, 8, 0] }, { durationMs: 350, holdMs: 500 })]; },
    over: { measure: 'reps', holdStep: null, defaults: { reps: 6 }, repName: null, direction: null, bilateral: { labels: { L: 'Right arm', R: 'Left arm' } },
      prescription: { reps: '5–8 each arm', note: 'Learn the swing first. The bell travels close to your body and rolls round your hand; it shouldn\'t bang your forearm.' } },
    description: 'From a hinge with the kettlebell hiked back between your legs, drive your hips forward so the bell rises close to your body, and catch it at your shoulder in the rack position.',
    setup: ['Stand with feet a little wider than hip-width, a kettlebell on the floor just in front of you.', 'Hinge and grip the handle with one hand.'],
    cues: ['Power comes from your hips, not your arm.', 'Keep the bell close; zip it up.', 'Elbow tucked at the top.'],
    source: { url: 'https://www.garagegymreviews.com/kettlebell-clean', title: 'Garage Gym Reviews: Kettlebell clean' } },
  // the bell stays straight up in the right hand (reach: the hand a straight arm above the shoulder) while the body
  // gets up off the floor and back down: lie, elbow, hand, hips up, sweep the left leg back to a half-kneel, stand, and
  // the same back down. The right foot stays planted the whole way (the anchor); each position was fitted numerically
  // to its floor contacts (the left hand planted from "hand" to the sweep), seeded from the one before, with quiet
  // in-between steps where a straight line would lift the hand or swing the leg through the floor.
  { id: 'kb-turkish-get-up', base: 'kb-halo', name: 'Turkish Get-Up', otherNames: ['Kettlebell Turkish Get-Up', 'Get-Up', 'TGU'],
    category: 'Strength', focus: 'Shoulders, core and hips (full body)', collections: ['Free weights'], equipment: ['Kettlebell'],
    props: [{ type: 'kettlebell', hand: 'handR' }],
    edit: ex => { const UP = { hand: 'handR', to: 'shoulderR', dx: 0, dy: 104, dz: 0 };
      const S = (name, cue, pose, x) => ({ name, cue, camera: 30, durationMs: x.quiet ? 700 : 1500, holdMs: x.quiet ? 0 : 500, phase: 'rep', anchor: 'ankleR', reach: [UP], ...x, pose });
      ex.keyframes = [
    S("Lie back, bell up", "Lie on your back, the bell pressed straight up in your right hand, right knee bent.", {"root": [-90, 0, 0], "neck": [34, 0, 0], "shoulderL": [0, 45, 0], "hipR": [58, 0, 0], "kneeR": 116, "ankleR": 32, "hipL": [0, 30, 56.5], "shoulderR": [-82.5, 180, 0], "elbowR": 15.8}, {"plant": ["R"]}),
    S("Up onto your elbow", "Roll up onto your left elbow; eyes on the bell.", {"root": [-90, -0.5, 0], "torso": [26.8, 0, 0], "chest": [0, 0, 0], "neck": [34, 0, 0], "shoulderL": [-23.5, 0, 0], "elbowL": 49.5, "shoulderR": [-55.7, 180, 0], "elbowR": 15.8, "hipL": [0, 30, 56.5], "kneeL": -0.5, "ankleL": 0, "hipR": [58, 0, 0], "kneeR": 115.5, "ankleR": 32}, {"plant": ["R"]}),
    S("Up onto your hand", "Push up onto your left hand.", {"root": [-90, -0.5, 0], "torso": [46.3, 0, 0], "chest": [0, 0, 0], "neck": [34, 0, 0], "shoulderL": [-23.5, 0, 0], "elbowL": 49.5, "shoulderR": [-36.2, 180, 0], "elbowR": 15.8, "hipL": [0, 30, 56.5], "kneeL": -0.5, "ankleL": 0, "hipR": [58, 0, 0], "kneeR": 115.5, "ankleR": 32}, {"plant": ["R"]}),
    S("Lift", "", {"root": [-85, 1.3, -2], "torso": [-2.8, 0, 0], "chest": [0, 0, 0], "neck": [34, 0, 0], "shoulderL": [-34.5, -1.5, 0], "elbowL": 35.9, "shoulderR": [-80.3, 180.1, -0.1], "elbowR": 15.8, "hipL": [-8, 30, -54.1], "kneeL": -1.6, "ankleL": 0, "hipR": [41.5, 2.5, 0], "kneeR": 112.2, "ankleR": 32}, {"plant": ["R"], "quiet": true}),
    S("Lift your hips", "Drive through your right foot to lift your hips high.", {"root": [-79.5, 3.5, -4], "torso": [-8.8, 0, 0], "chest": [0, 0, 0], "neck": [34, 0, 0], "shoulderL": [-46, 0, 0], "elbowL": 21.3, "shoulderR": [-80.8, 180.7, -0.1], "elbowR": 15.8, "hipL": [-16, 30, 29.3], "kneeL": -0.8, "ankleL": 0, "hipR": [25, 0, 0], "kneeR": 108.8, "ankleR": 32}, {"plant": ["R"]}),
    S("Tuck", "", {"root": [-24.8, 13.6, 1], "torso": [-54.8, 0, 0], "chest": [0, 0, 0], "neck": [34, 0, 0], "shoulderL": [-94.7, 22, 0], "elbowL": 0, "shoulderR": [-72.5, 192.2, 1.7], "elbowR": 15.8, "hipL": [-62.3, 44.7, 7.1], "kneeL": 24.6, "ankleL": 13.2, "hipR": [11.1, -42.7, 0], "kneeR": 116.8, "ankleR": 32}, {"plant": ["R"], "quiet": true}),
    S("Swing", "", {"root": [-3.5, -2.9, 40], "torso": [-68.8, 0, 0], "chest": [0, 0, 0], "neck": [34, 0, 0], "shoulderL": [-63.3, 28, 0], "elbowL": -3.8, "shoulderR": [-64.8, 176.9, 1.2], "elbowR": 15.8, "hipL": [-52.5, 43.4, 0.8], "kneeL": 34.1, "ankleL": 26.4, "hipR": [29.3, -2.9, 0], "kneeR": 122.9, "ankleR": 32}, {"plant": ["R"], "quiet": true}),
    S("Sweep the leg back", "Sweep your left leg back under you onto your knee.", {"root": [10, -40.3, 49.5], "torso": [-52.8, 0, 0], "chest": [0, 0, 0], "neck": [34, 0, 0], "shoulderL": [-18.5, 24, 0], "elbowL": -0.3, "shoulderR": [-30.6, 142.8, -21.2], "elbowR": 15.8, "hipL": [-48, 24.8, -11.8], "kneeL": 53, "ankleL": 52.8, "hipR": [67.5, -13.3, 0], "kneeR": 121, "ankleR": 32}, {"plant": ["R"]}),
    S("Kneel up", "Lift your chest to kneeling, the bell still overhead.", {"root": [8, -20, 24.5], "torso": [-8.5, 0, 0], "chest": [0, 0, 0], "neck": [0, 0, 0], "shoulderL": [0, 35, 0], "elbowL": 10, "shoulderR": [6.4, 164.7, -37.6], "elbowR": 15.8, "hipL": [4.5, 1, 8.8], "kneeL": 92, "ankleL": 46.3, "hipR": [91.8, 0.3, 0], "kneeR": 85.8, "ankleR": 0}, {"plant": ["R"]}),
    S("Stand up", "Stand up; the bell stays straight up.", {"root": [0, 0, 25], "torso": [-0.5, 0, 0], "chest": [0, 0, 0], "neck": [0, 0, 0], "shoulderL": [0, 35, 0], "elbowL": 10, "shoulderR": [5.6, 184.4, -35.9], "elbowR": 15.8, "hipL": [0, 0, 0], "kneeL": 0, "ankleL": 0, "hipR": [0, 0, 0], "kneeR": 0, "ankleR": 0}, {"plant": ["L", "R"]}),
    S("Step back to kneeling", "Step your left leg back and lower to your knee.", {"root": [8, -20, 24.5], "torso": [-8.5, 0, 0], "chest": [0, 0, 0], "neck": [0, 0, 0], "shoulderL": [0, 35, 0], "elbowL": 10, "shoulderR": [6.4, 164.7, -37.6], "elbowR": 15.8, "hipL": [4.5, 1, 8.8], "kneeL": 92, "ankleL": 46.3, "hipR": [91.8, 0.3, 0], "kneeR": 85.8, "ankleR": 0}, {"plant": ["R"]}),
    S("Hand to the floor", "Reach your left hand to the floor beside you.", {"root": [10, -40.3, 49.5], "torso": [-52.8, 0, 0], "chest": [0, 0, 0], "neck": [34, 0, 0], "shoulderL": [-18.5, 24, 0], "elbowL": -0.3, "shoulderR": [-30.6, 142.8, -21.2], "elbowR": 15.8, "hipL": [-48, 24.8, -11.8], "kneeL": 53, "ankleL": 52.8, "hipR": [67.5, -13.3, 0], "kneeR": 121, "ankleR": 32}, {"plant": ["R"]}),
    S("Swing back", "", {"root": [-3.5, -2.9, 40], "torso": [-68.8, 0, 0], "chest": [0, 0, 0], "neck": [34, 0, 0], "shoulderL": [-63.3, 28, 0], "elbowL": -3.8, "shoulderR": [-64.8, 176.9, 1.2], "elbowR": 15.8, "hipL": [-52.5, 43.4, 0.8], "kneeL": 34.1, "ankleL": 26.4, "hipR": [29.3, -2.9, 0], "kneeR": 122.9, "ankleR": 32}, {"plant": ["R"], "quiet": true}),
    S("Tuck back", "", {"root": [-24.8, 13.6, 1], "torso": [-54.8, 0, 0], "chest": [0, 0, 0], "neck": [34, 0, 0], "shoulderL": [-94.7, 22, 0], "elbowL": 0, "shoulderR": [-72.5, 192.2, 1.7], "elbowR": 15.8, "hipL": [-62.3, 44.7, 7.1], "kneeL": 24.6, "ankleL": 13.2, "hipR": [11.1, -42.7, 0], "kneeR": 116.8, "ankleR": 32}, {"plant": ["R"], "quiet": true}),
    S("Leg through, hips high", "Swing your left leg through and hold your hips high.", {"root": [-79.5, 3.5, -4], "torso": [-8.8, 0, 0], "chest": [0, 0, 0], "neck": [34, 0, 0], "shoulderL": [-46, 0, 0], "elbowL": 21.3, "shoulderR": [-80.8, 180.7, -0.1], "elbowR": 15.8, "hipL": [-16, 30, 29.3], "kneeL": -0.8, "ankleL": 0, "hipR": [25, 0, 0], "kneeR": 108.8, "ankleR": 32}, {"plant": ["R"]}),
    S("Lift back", "", {"root": [-85, 1.3, -2], "torso": [-2.8, 0, 0], "chest": [0, 0, 0], "neck": [34, 0, 0], "shoulderL": [-34.5, -1.5, 0], "elbowL": 35.9, "shoulderR": [-80.3, 180.1, -0.1], "elbowR": 15.8, "hipL": [-8, 30, -54.1], "kneeL": -1.6, "ankleL": 0, "hipR": [41.5, 2.5, 0], "kneeR": 112.2, "ankleR": 32}, {"plant": ["R"], "quiet": true}),
    S("Sit down", "Lower your hips to the floor.", {"root": [-90, -0.5, 0], "torso": [46.3, 0, 0], "chest": [0, 0, 0], "neck": [34, 0, 0], "shoulderL": [-23.5, 0, 0], "elbowL": 49.5, "shoulderR": [-36.2, 180, 0], "elbowR": 15.8, "hipL": [0, 30, 56.5], "kneeL": -0.5, "ankleL": 0, "hipR": [58, 0, 0], "kneeR": 115.5, "ankleR": 32}, {"plant": ["R"]}),
    S("Down to your elbow", "Lower onto your left elbow.", {"root": [-90, -0.5, 0], "torso": [26.8, 0, 0], "chest": [0, 0, 0], "neck": [34, 0, 0], "shoulderL": [-23.5, 0, 0], "elbowL": 49.5, "shoulderR": [-55.7, 180, 0], "elbowR": 15.8, "hipL": [0, 30, 56.5], "kneeL": -0.5, "ankleL": 0, "hipR": [58, 0, 0], "kneeR": 115.5, "ankleR": 32}, {"plant": ["R"]})]; },
    over: { measure: 'reps', holdStep: null, defaults: { reps: 2 }, repName: 'get-up', direction: null, bilateral: { labels: { L: 'Bell in the right hand', R: 'Bell in the left hand' } },
      prescription: { reps: '1–3 each side', note: 'Learn it without a weight first (a shoe balanced on your fist works). Slow and deliberate; keep your eyes on the bell.' } },
    description: 'Lying on your back with a kettlebell pressed straight up in one hand, get up to standing in a set sequence of positions, keeping the bell straight overhead the whole time, then reverse the steps back down to the floor.',
    setup: ['Lie on your back, the kettlebell pressed up in your right hand, arm straight.', 'Right knee bent with the foot flat; left leg straight and a little out; left arm on the floor at your side.'],
    cues: ['Arm straight, wrist straight, eyes on the bell.', 'Move one step at a time; no rushing.', 'Push the floor away with your left hand.'],
    source: { url: 'https://www.acefitness.org/resources/everyone/exercise-library/388/turkish-get-up/', title: 'ACE Exercise Library: Turkish Get-up' } },
];
