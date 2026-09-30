// Batch 20 (Sep 2026): smaller additions from the collection research: band front raise, upright row and chest fly;
// seated knee extension, leg raise and punches (chair).
// node tools/research.cjs variants tools/variants/batch-20-small.cjs [id...]
const K = (name, cue, pose, x = {}) => ({ name, cue, camera: 70, durationMs: 1500, holdMs: 300, phase: 'rep', anchor: 'ankleL', plant: ['L', 'R'], ...x, pose });
const reps = (r, n, note) => ({ measure: 'reps', holdStep: null, defaults: { reps: n }, repName: null, prescription: { reps: r, note } });
const BAND = { type: 'band' }, UNDER_FEET = [{ ...BAND, from: 'footL', to: 'handL' }, { ...BAND, from: 'footR', to: 'handR' }];
const SHOULDERS = { url: 'https://www.setforset.com/blogs/news/resistance-band-shoulder-workout-for-building-muscle', title: 'Set For Set: Resistance band shoulder exercises', note: 'Described in our own words. Stick-figure approximation.' };
// sitting on a chair (as in batch 2): hands on the thighs, feet flat
const CHAIR = [{ type: 'chair', back: 'behind', z: -12 }];
const handsOnThighs = [{ hand: 'handR', to: 'pelvis', dx: 22, dz: 26 }, { hand: 'handL', to: 'pelvis', dx: -22, dz: 26 }];
const seat = { hipL: [90, 0, 0], kneeL: 90, hipR: [90, 0, 0], kneeR: 90 };
const S = (name, cue, pose = {}, x = {}) => ({ name, cue, camera: 60, durationMs: 1500, holdMs: 300, phase: 'rep', anchor: 'pelvis', plant: ['L', 'R'],
  reach: handsOnThighs, touch: [{ point: 'ankleL', adjust: 'kneeL' }, { point: 'ankleR', adjust: 'kneeR' }], ...x, pose: { ...seat, ...pose } });
const BHF = (slug, title) => ({ url: `https://www.bhf.org.uk/informationsupport/heart-matters-magazine/activity/${slug}`, title: `British Heart Foundation: ${title}`, note: 'Described in our own words. Stick-figure approximation.' });
module.exports = [
  // standing on the band, both arms lift straight forward to shoulder height
  { id: 'band-front-raise', base: 'bhf-lateral-raise', name: 'Band Front Raise', otherNames: ['Resistance Band Front Raise'],
    category: 'Strength', focus: 'Front of the shoulders', collections: ['Resistance band'], equipment: ['Resistance band'], props: UNDER_FEET,
    edit: ex => { ex.keyframes = [
      K('Arms down', 'Stand on the band, hands in front of your thighs.', { shoulderL: [5, 0, 0], elbowL: 6, shoulderR: [5, 0, 0], elbowR: 6 }, { durationMs: 1800 }),
      K('Raise', 'Lift both arms straight in front to shoulder height.', { shoulderL: [88, 0, 0], elbowL: 6, shoulderR: [88, 0, 0], elbowR: 6 }, { holdMs: 400 })]; },
    over: { bilateral: null, ...reps('10–15', 12, 'Lower slowly; don\'t swing or lean back.') },
    description: 'Standing on a resistance band with an end in each hand, lift both arms straight in front of you to shoulder height, then lower slowly.',
    setup: ['Stand on the middle of the band, feet hip-width apart.', 'Hold an end in each hand in front of your thighs, palms facing you.'],
    cues: ['Arms long, a soft bend in the elbows.', 'Stop at shoulder height.', 'Ribs down; no swinging.'], source: SHOULDERS },
  // standing on the band, hands close together pull straight up the front of the body to the chest, elbows leading high
  { id: 'band-upright-row', base: 'bhf-lateral-raise', name: 'Band Upright Row', otherNames: ['Resistance Band Upright Row'],
    category: 'Strength', focus: 'Shoulders and upper back', collections: ['Resistance band'], equipment: ['Resistance band'], props: UNDER_FEET,
    edit: ex => { ex.keyframes = [
      K('Hands low', 'Stand on the band, hands close together in front of your thighs.', { shoulderL: [10, -9, 0], elbowL: 8, shoulderR: [10, -9, 0], elbowR: 8 }, { camera: 20, durationMs: 1800 }),
      // (angles fitted, Sep 2026: elbows out to the sides a little under the shoulders, hands in front of them; reaching the
      // hands to the chest bent the elbows back across the body)
      K('Pull up', 'Pull your hands up to your chest, elbows high and out.', { shoulderL: [37, 66, -85], elbowL: 146, shoulderR: [37, 66, -85], elbowR: 146 },
        { camera: 20, holdMs: 400 })]; },
    over: { bilateral: null, ...reps('10–15', 12, 'Keep the band close to your body; stop with your elbows at shoulder height.') },
    description: 'Standing on a resistance band with your hands close together in front of your thighs, pull straight up to your chest, elbows leading high and out, then lower.',
    setup: ['Stand on the middle of the band, feet hip-width apart.', 'Hold both ends close together in front of your thighs.'],
    cues: ['Elbows lead, higher than your hands.', 'Stop at shoulder height.', 'Shoulders down, away from your ears.'], source: SHOULDERS },
  // the band round the upper back (as in Band Chest Press): arms wide at shoulder height, then hug them together in front
  { id: 'band-chest-fly', base: 'bhf-chest-press', name: 'Band Chest Fly', otherNames: ['Resistance Band Chest Fly', 'Band Fly'],
    category: 'Strength', focus: 'Chest and front of the shoulders', collections: ['Resistance band'], equipment: ['Resistance band'],
    edit: ex => { ex.keyframes = [
      K('Arms wide', 'Band round your upper back, arms out wide at shoulder height.', { shoulderL: [15, 85, 0], elbowL: 18, shoulderR: [15, 85, 0], elbowR: 18 }, { camera: 45, durationMs: 1800 }),
      K('Hug', 'Sweep your arms together in front of your chest.', { shoulderL: [88, 8, 0], elbowL: 18, shoulderR: [88, 8, 0], elbowR: 18 }, { camera: 45, holdMs: 400 })]; },
    over: { bilateral: null, ...reps('10–15', 12, 'A soft bend in the elbows the whole way; open slowly.') },
    description: 'With a resistance band around your upper back and an end in each hand, open your arms wide at shoulder height, then sweep them together in front of your chest as if hugging a tree.',
    setup: ['Wrap the band around your upper back, under your arms.', 'Hold an end in each hand, arms out wide.'],
    cues: ['Elbows softly bent, as if hugging a tree.', 'Squeeze your chest at the front.', 'Open slowly.'],
    source: { url: 'https://www.garagestrength.com/blogs/news/resistance-band-chest-exercises', title: 'Garage Strength: Resistance band chest exercises', note: 'Described in our own words. Stick-figure approximation.' } },
  // sitting tall, straighten one knee until the leg is out straight, hold, lower
  { id: 'chair-knee-extension', base: 'chair-hip-marching', name: 'Seated Knee Extension', otherNames: ['Seated Leg Extension', 'Chair Knee Extension'],
    category: 'Strength', focus: 'Front of the thighs', collections: ['Chair-based'], equipment: ['Chair'], props: CHAIR,
    edit: ex => { ex.keyframes = [
      S('Sit tall', 'Feet flat, hands on your thighs.', {}, { phase: 'setup' }),
      S('Straighten', 'Lift your right foot until your leg is straight.', { kneeR: 3, ankleR: -10 }, { touch: [{ point: 'ankleL', adjust: 'kneeL' }], plant: ['L'], holdMs: 3000 }),
      S('Lower', 'Slowly lower your foot to the floor.', {})]; },
    over: { bilateral: { labels: { L: 'Right leg', R: 'Left leg' } }, ...reps('8–10 each leg', 8, 'Hold the leg straight for a few seconds, up to 10. If it won\'t straighten, lift as far as is comfortable.') },
    description: 'Sitting tall on a chair, slowly lift one foot until the leg is straight out in front of you, hold, then lower it back to the floor.',
    setup: ['Sit tall on a sturdy chair, feet flat and hip-width apart.', 'Hands on your thighs or the sides of the seat.'],
    cues: ['Straighten from the knee; thigh stays on the chair.', 'Toes toward you.', 'Lower slowly.'], source: BHF('knee-strengthening-exercises', '10 knee-strengthening exercises') },
  // sitting at the front of the seat with one leg straight out, heel on the floor: lift the straight leg
  { id: 'chair-leg-raise', base: 'chair-hip-marching', name: 'Seated Leg Raise', otherNames: ['Seated Straight-Leg Raise', 'Chair Leg Raise'],
    category: 'Strength', focus: 'Front of the thighs and hip flexors', collections: ['Chair-based'], equipment: ['Chair'], props: CHAIR,
    edit: ex => { const out = { hipR: [60, 0, 0], kneeR: 0, ankleR: -15 };
      ex.keyframes = [
      S('Leg out', 'Straighten your right leg out in front, heel on the floor.', out, { phase: 'setup', plant: ['L'], touch: [{ point: 'ankleL', adjust: 'kneeL' }, { point: 'ankleR', adjust: 'hipR' }] }),
      S('Lift', 'Lift the straight leg as high as is comfortable.', { hipR: [92, 0, 0], kneeR: 0, ankleR: -15 }, { plant: ['L'], touch: [{ point: 'ankleL', adjust: 'kneeL' }], holdMs: 800 }),
      S('Lower', 'Lower it until the heel touches the floor.', out, { plant: ['L'], touch: [{ point: 'ankleL', adjust: 'kneeL' }, { point: 'ankleR', adjust: 'hipR' }] })]; },
    over: { bilateral: { labels: { L: 'Right leg', R: 'Left leg' } }, ...reps('10–12 each leg', 10, 'Keep your chest up; lift less to make it easier.') },
    description: 'Sitting tall on a chair with one leg straight out in front and the heel on the floor, lift the straight leg as high as is comfortable, then lower it.',
    setup: ['Sit tall near the front of a sturdy chair.', 'Straighten one leg out in front, heel on the floor, toes up.'],
    cues: ['Leg straight, thigh tight.', 'Chest up; don\'t lean back.', 'Lower with control.'],
    source: { url: 'https://www.hingehealth.com/resources/articles/seated-leg-raise/', title: 'Hinge Health: How to do a seated leg raise', note: 'Described in our own words. Stick-figure approximation.' } },
  // fists up in front of the face, punch forward one arm at a time (the other comes back as it goes)
  { id: 'chair-punches', base: 'chair-hip-marching', name: 'Seated Punches', otherNames: ['Seated Forward Punches', 'Chair Punches'],
    category: 'Cardio', focus: 'Arms, shoulders and core', collections: ['Chair-based'], equipment: ['Chair'], props: CHAIR,
    edit: ex => { const guard = { shoulderL: [55, -12, 0], elbowL: 125, shoulderR: [55, -12, 0], elbowR: 125 };
      const punch = (s, o) => ({ ...guard, torso: [0, 0, s === 'R' ? 12 : -12], ['shoulder' + s]: [88, -6, 0], ['elbow' + s]: 4 });
      const noHands = { reach: [] };
      ex.keyframes = [
      S('Fists up', 'Sit tall, fists up in front of your face.', guard, { ...noHands, camera: 30, phase: 'setup' }),
      S('Right punch', 'Punch your right fist forward.', punch('R'), { ...noHands, camera: 30, durationMs: 500, holdMs: 100 }),
      S('Left punch', 'Bring it back as your left punches.', punch('L'), { ...noHands, camera: 30, durationMs: 500, holdMs: 100 })]; },
    over: { bilateral: null, repName: 'pair', ...reps('10–20 pairs', 12, 'Sit up straight away from the chair back; punch at your own pace.') },
    description: 'Sitting tall on a chair with your fists up in front of your face, punch one fist forward, and as it comes back, punch the other.',
    setup: ['Sit tall near the front of a firm chair, feet flat.', 'Make fists and hold them in front of your face.'],
    cues: ['Punch straight forward.', 'Turn a little with each punch.', 'Breathe out as you punch.'], source: BHF('chair-based-exercises/5-more-chair-based-exercises', '5 more chair-based exercises') },
  // on hands and knees (knees stay put): open the right arm to the ceiling, then thread it under the left arm along the
  // floor until the right shoulder and the side of the head rest down, hips lifted, the left hand reaching forward. Both
  // twists fitted numerically (Sep 2026: the contacts, the planted left hand under its shoulder when open, the hips over
  // the knees when threaded)
  { id: 'yoga-thread-the-needle', base: 'yoga-cat-cow', name: 'Thread the Needle', otherNames: ['Parsva Balasana'],
    category: 'Twist', focus: 'Shoulders and upper back', collections: ['Yoga', 'Stretches'], equipment: [],
    edit: ex => {
      const knees = [{ point: 'kneeR', adjust: 'hipR' }, { point: 'kneeL', adjust: 'hipL' }], legs = { hipL: [75, 0, 0], kneeL: 90, ankleL: 90, hipR: [75, 0, 0], kneeR: 90, ankleR: 90 };
      const st = { anchor: 'kneeL', camera: 45, touch: knees };
      ex.keyframes = [
        { name: 'Tabletop', cue: 'On hands and knees, wrists under shoulders, knees under hips.', ...st, durationMs: 1800, holdMs: 600, phase: 'setup',
          touch: [...knees, { point: 'handL', adjust: 'shoulderL' }, { point: 'handR', adjust: 'shoulderR' }], pose: { root: [75, 0, 0], shoulderL: [75, 0, 0], shoulderR: [75, 0, 0], ...legs } },
        { name: 'Open', cue: 'Breathe in, reach your right arm up to the ceiling.', ...st, durationMs: 1800, holdMs: 600, phase: 'setup', touch: [...knees, { point: 'handL', adjust: 'shoulderL' }],
          pose: { root: [75, 0, 0], torso: [-12, 0, -55], chest: [0, 0, -15], neck: [0, 0, -20], shoulderL: [34, 57, 0], elbowL: 0, shoulderR: [0, 115.5, 0], ...legs } },
        // (the arm comes down and reaches under the chest before the shoulder lowers: in one move it swept through the body)
        { name: '', cue: '', ...st, durationMs: 1200, holdMs: 0, phase: 'setup', quiet: true, touch: [...knees, { point: 'handL', adjust: 'shoulderL' }],
          pose: { root: [80, 0, 0], torso: [0, 0, 15], shoulderL: [78, 0, 0], shoulderR: [80, -35, -30], elbowR: 10, ...legs } },
        { name: 'Thread', cue: 'Breathe out, slide it under your left arm; rest your shoulder and head down.', ...st, durationMs: 1800, holdMs: 5000, phase: 'rep',
          pose: { root: [94, 0, 0], torso: [18, 6.3, 75.8], chest: [0, 0, 13.8], neck: [0, 27, 20], shoulderL: [145.5, -17.5, 0], elbowL: 8.3, shoulderR: [129.5, 5.8, -60], elbowR: 26.8, ...legs, hipL: [90, 0, 0], hipR: [90, 0, 0] } }]; },
    over: { bilateral: { labels: { L: 'Right arm threads', R: 'Left arm threads' } }, measure: 'time', holdStep: 3, defaults: { seconds: 30 }, repName: null, direction: null,
      prescription: { reps: 'hold 30 seconds each side', note: 'Keep your hips over your knees; a cushion under your head helps.' } },
    description: 'From hands and knees, reach one arm up to the ceiling, then thread it under the other arm along the floor until that shoulder and the side of your head rest down, hips lifted.',
    setup: ['Start on hands and knees, wrists under shoulders, knees under hips.'],
    cues: ['Hips stay over your knees.', 'Let the twist come from your upper back.', 'Press into the other hand to come up.'],
    source: { url: 'https://www.yogamatters.com/blogs/poses/thread-the-needle-pose-parsva-balasana', title: 'Yogamatters: Thread the Needle Pose (Parsva Balasana)', note: 'Described in our own words. Stick-figure approximation.' } },
];
