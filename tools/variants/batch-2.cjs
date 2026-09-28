// Equipment versions, batch 2 (Sep 2026): chair and wall yoga. node tools/research.cjs variants tools/variants/batch-2.cjs [id...]
const CHAIR = [{ type: 'chair', back: 'behind', z: -12 }];
const handsOnThighs = [{ hand: 'handR', to: 'pelvis', dx: 22, dz: 26 }, { hand: 'handL', to: 'pelvis', dx: -22, dz: 26 }];
const feet = [{ point: 'ankleL', adjust: 'kneeL' }, { point: 'ankleR', adjust: 'kneeR' }];
const seat = { hipL: [90, 0, 0], kneeL: 90, hipR: [90, 0, 0], kneeR: 90 };
const sit = (name, cue, pose = {}, extra = {}) => ({ name, cue, camera: 90, durationMs: 2000, holdMs: 400, phase: 'rep', anchor: 'pelvis', plant: ['L', 'R'],
  reach: handsOnThighs, touch: feet, pose: { ...seat, ...pose }, ...extra });
const YJ_CHAIR = { url: 'https://www.yogajournal.com/yoga-101/types-of-yoga/chair-yoga-poses/', title: 'Yoga Journal: 13 Chair Yoga Poses You Can Do Anywhere' };
const YJ_WALL = { url: 'https://www.yogajournal.com/practice/yoga-wall-poses/', title: 'Yoga Journal: 12 Wall Yoga Poses' };
const hold = (s = 30) => ({ measure: 'time', holdStep: 1, defaults: { seconds: s }, repName: null, prescription: { reps: `hold ${s} seconds`, note: 'Breathe slowly and evenly; ease out of the pose if anything pinches.' } });
const sides = { bilateral: { labels: { L: 'Left side', R: 'Right side' } } };
module.exports = [
  { id: 'chair-yoga-cat-cow', base: 'chair-hip-marching', name: 'Seated Cat-Cow', otherNames: ['Chair Cat-Cow'],
    category: 'Mobility', focus: 'Spine', equipment: ['Chair'], collections: ['Yoga', 'Chair-based'], props: CHAIR,
    edit: ex => { ex.keyframes = [
      sit('Sit tall', 'Feet flat, hands on your thighs.'),
      sit('Cow', 'Breathe in, lift your chest and gently arch your back.', { chest: [-22, 0, 0], neck: [-22, 0, 0] }),
      sit('Cat', 'Breathe out, round your back and tuck your chin.', { torso: [-6, 0, 0], chest: [22, 0, 0], neck: [22, 0, 0] })]; },
    over: { bilateral: null, measure: 'reps', holdStep: null, defaults: { reps: 8 }, repName: null, prescription: { reps: '5–10 slow rounds', note: 'Move with your breath: arch as you breathe in, round as you breathe out.' } },
    description: 'The cat-cow spine stretch done sitting on a chair: arch your back and lift your chest, then round your back and tuck your chin.',
    setup: ['Sit toward the front of a sturdy chair, feet flat and hip-width apart.', 'Rest your hands on your thighs.'],
    cues: ['Arch as you breathe in.', 'Round as you breathe out.', 'Keep your feet grounded.'], source: YJ_CHAIR },
  { id: 'chair-yoga-twist', base: 'chair-hip-marching', name: 'Chair Twist', otherNames: ['Seated Chair Twist'],
    category: 'Twist', focus: 'Spine', equipment: ['Chair'], collections: ['Yoga', 'Chair-based'], props: CHAIR,
    edit: ex => { ex.keyframes = [
      sit('Sit tall', 'Feet flat, spine long.', {}, { phase: 'setup' }),
      sit('Chair Twist', 'Turn to the right, left hand to your right knee.', { torso: [0, 0, 25], chest: [0, 0, 20], neck: [0, 0, 15] },
        { reach: [{ hand: 'handL', to: 'pelvis', dx: 18, dz: 24 }, { hand: 'handR', to: 'pelvis', dx: 30, dz: -24 }] })]; },
    over: { ...sides, ...hold(30) },
    description: 'A gentle seated twist on a chair: sitting tall, turn your chest to one side with the opposite hand on your knee.',
    setup: ['Sit toward the front of a sturdy chair, feet flat.', 'Grow tall through your spine before you turn.'],
    cues: ['Lengthen as you breathe in.', 'Turn a little more as you breathe out.', 'Keep both hips on the seat.'], source: YJ_CHAIR },
  { id: 'chair-yoga-forward-bend', base: 'chair-hip-marching', name: 'Chair Forward Bend', otherNames: ['Seated Forward Fold on a Chair'],
    category: 'Forward bend', focus: 'Back and hamstrings', equipment: ['Chair'], collections: ['Yoga', 'Chair-based'], props: CHAIR,
    edit: ex => { ex.keyframes = [
      sit('Sit tall', 'Feet wider than your hips.', {}, { phase: 'setup' }),
      { ...sit('Chair Forward Bend', 'Fold forward and let your arms and head hang.', { torso: [55, 0, 0], chest: [20, 0, 0], neck: [20, 0, 0], shoulderL: [80, 0, 0], shoulderR: [80, 0, 0] }), reach: undefined }]; },
    over: { bilateral: null, ...hold(30) },
    description: 'A relaxed forward fold sitting on a chair: lean forward over your thighs and let your back round, arms and head hanging.',
    setup: ['Sit toward the front of a sturdy chair, feet flat and wider than your hips.'],
    cues: ['Let your back round.', 'Arms and head hang heavy.', 'Come up slowly.'], source: YJ_CHAIR },
  { id: 'chair-yoga-pigeon', base: 'chair-hip-marching', name: 'Chair Pigeon', otherNames: ['Seated Figure Four', 'Seated Pigeon'],
    category: 'Hip opener', focus: 'Outer hip', equipment: ['Chair'], collections: ['Yoga', 'Chair-based'], props: CHAIR,
    edit: ex => { ex.keyframes = [
      sit('Sit tall', 'Feet flat, hands on your thighs.', {}, { phase: 'setup' }),
      { ...sit('Chair Pigeon', 'Right ankle on your left knee, sit tall.', { hipR: [108, 22, 62], kneeR: 118, ankleR: 10 }), plant: ['L'], touch: [feet[0]],
        reach: [{ hand: 'handR', to: 'kneeR', dz: -10 }, { hand: 'handL', to: 'pelvis', dx: -22, dz: 26 }] }]; },
    over: { ...sides, ...hold(30) },
    description: 'A seated hip stretch on a chair: rest one ankle on the opposite knee and sit tall, the lifted knee dropping out to the side.',
    setup: ['Sit on a sturdy chair, feet flat.', 'Lift one ankle onto the opposite knee.'],
    cues: ['Flex the lifted foot.', 'Sit tall, lean in a little for more.', 'Keep it gentle on the knee.'], source: YJ_CHAIR },
  { id: 'chair-yoga-side-bend', base: 'chair-hip-marching', name: 'Seated Side Bend', otherNames: ['Chair Side Stretch'],
    category: 'Side bend', focus: 'Side of the body', equipment: ['Chair'], collections: ['Yoga', 'Chair-based'], props: CHAIR,
    edit: ex => { ex.keyframes = [
      sit('Sit tall', 'Feet flat, hands on your thighs.', {}, { phase: 'setup', camera: 0 }),
      { ...sit('Seated Side Bend', 'Right arm up and over, lean to the left.', { torso: [0, -14, 0], chest: [0, -12, 0], shoulderR: [0, 165, 90], elbowR: 10 }),
        camera: 0, reach: [{ hand: 'handL', to: 'pelvis', dx: -26, dz: 6 }] }]; },
    over: { ...sides, ...hold(20) },
    description: 'A side stretch sitting on a chair: reach one arm up and over your head and lean to the other side.',
    setup: ['Sit tall on a sturdy chair, feet flat and hip-width apart.'],
    cues: ['Reach up before you lean.', 'Both hips stay on the seat.', 'Breathe into your ribs.'], source: YJ_CHAIR },
  { id: 'wall-downward-dog', base: 'yoga-warrior-3', name: 'Wall Downward Dog', otherNames: ['Downward Dog at the Wall', 'Half Dog at the Wall'],
    category: 'Stretch', focus: 'Shoulders and back of the legs', equipment: ['Wall'], collections: ['Yoga', 'Stretches'], props: [{ type: 'wall', at: 'handR', keyframe: 1 }],
    edit: ex => { ex.keyframes = [
      { name: 'Hands on the wall', cue: 'Hands at shoulder height, arms straight.', camera: 90, durationMs: 2000, holdMs: 300, phase: 'setup', anchor: 'ankleL', plant: ['L', 'R'],
        pose: { shoulderL: [90, 0, 0], shoulderR: [90, 0, 0] } },
      { name: 'Wall Downward Dog', cue: 'Walk back and hinge until your back is flat.', camera: 90, durationMs: 3000, holdMs: 400, phase: 'rep', anchor: 'ankleL', plant: ['L', 'R'],
        pose: { torso: [78, 0, 0], neck: [-6, 0, 0], shoulderL: [172, 0, 0], shoulderR: [172, 0, 0], hipL: [12, 0, 0], hipR: [12, 0, 0] } }]; },
    over: { bilateral: null, ...hold(30) },
    description: 'Downward Dog standing at a wall: hands on the wall, hinge at your hips until your back is flat and your arms and legs make an L.',
    setup: ['Stand an arm\'s length or more from a wall, feet hip-width apart.', 'Put your hands on the wall at shoulder height.'],
    cues: ['Push the wall away.', 'Long back, hips back.', 'Soften your knees if your hamstrings pull.'], source: YJ_WALL },
  { id: 'wall-warrior-3', base: 'yoga-warrior-3', name: 'Warrior III at the Wall', otherNames: ['Wall Warrior III'],
    equipment: ['Wall'], collections: ['Yoga', 'Balance'], props: [{ type: 'wall', at: 'handR', keyframe: 1 }],
    edit: ex => ex,
    steps: [[null, 'Stand tall facing the wall.'], ['Warrior III at the Wall', 'Tip forward on your left leg, fingertips on the wall.']],
    description: 'Warrior III with your fingertips on a wall: balance on one leg with your body and the other leg level, arms reaching to the wall.',
    setup: ['Stand facing a wall, about your leg\'s length away.'],
    cues: ['Press your fingertips into the wall.', 'Hips level, back leg long.', 'Keep a soft standing knee.'],
    source: { url: 'https://yogauonline.com/pose-library/warrior-3-yoga-pose-practice-propped-variations-at-the-wall/', title: 'YogaUOnline: Warrior 3 at the wall' } },
  { id: 'wall-tree', base: 'yoga-tree', name: 'Tree Pose at the Wall', otherNames: ['Wall Tree Pose'],
    equipment: ['Wall'], collections: ['Yoga', 'Balance'], props: [{ type: 'wall', at: 'handL', keyframe: 1, beside: true }],
    edit: ex => { const p = ex.keyframes[1].pose; p.shoulderL = [0, 90, 0]; delete p.elbowL; ex.keyframes[1].reach = [{ hand: 'handL', to: 'wall' }]; },
    steps: [[null, 'Stand side-on to a wall.'], ['Tree Pose at the Wall', 'Left hand on the wall, right foot to your inner leg.']],
    description: 'Tree Pose with one hand on a wall for balance: stand on one leg with the other foot on your inner leg, knee out to the side.',
    setup: ['Stand side-on to a wall, close enough to touch it.'],
    cues: ['Hand lightly on the wall.', 'Foot above or below the knee, never on it.', 'Stand tall.'], source: YJ_WALL },
];
