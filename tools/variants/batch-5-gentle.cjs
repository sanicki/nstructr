// Collection research, batch 5: common chair, stretch, warm-up and balance exercises the library didn't have
// (docs/collection-research.md). node tools/research.cjs variants tools/variants/batch-5-gentle.cjs [id...]
const K = (name, cue, pose, x = {}) => ({ name, cue, camera: 90, durationMs: 1500, holdMs: 300, phase: 'rep', ...x, pose });
const reps = (r = '8–12', n = 10, note = 'Move slowly and smoothly, within a comfortable range.') => ({ measure: 'reps', holdStep: null, defaults: { reps: n }, repName: null, prescription: { reps: r, note } });
const holdT = (s = 30, note = 'Ease in until you feel a gentle stretch; no bouncing.') => ({ measure: 'time', holdStep: 1, defaults: { seconds: s }, repName: null, prescription: { reps: `hold ${s} seconds`, note } });
const sidesL = (a = 'Left', b = 'Right') => ({ bilateral: { labels: { L: `${a} side`, R: `${b} side` } } });
const NHS = { url: 'https://www.nhs.uk/live-well/exercise/sitting-exercises/', title: 'NHS: Sitting exercises' };
const CHAIR = [{ type: 'chair', back: 'behind', z: -12 }];
const FEET = [{ point: 'ankleL', adjust: 'kneeL' }, { point: 'ankleR', adjust: 'kneeR' }];
const SEAT = { hipL: [90, 0, 0], kneeL: 90, hipR: [90, 0, 0], kneeR: 90 };
const sit = (name, cue, pose, x = {}) => K(name, cue, { ...SEAT, ...pose }, { anchor: 'pelvis', plant: ['L', 'R'], touch: FEET, ...x });
const THIGHS = [{ hand: 'handR', to: 'pelvis', dx: 22, dz: 26 }, { hand: 'handL', to: 'pelvis', dx: -22, dz: 26 }];
const CROSSED = [{ hand: 'handR', to: 'shoulderL', dz: 8 }, { hand: 'handL', to: 'shoulderR', dz: 8 }];
const STAND = { anchor: 'ankleL', plant: ['L', 'R'] };
const HIPS = [{ hand: 'handR', to: 'pelvis', dx: 26, dy: 10 }, { hand: 'handL', to: 'pelvis', dx: -26, dy: 10 }];
const HANDS_ON_HIPS = { shoulderL: [-27.5, 0, 0], elbowL: 69.4, shoulderR: [-27.5, 0, 0], elbowR: 69.4 };
const x = (id, base, name, other, o) => ({ id, base, name, otherNames: other, ...o });
module.exports = [
  // ---------- chair (NHS sitting exercises) ----------
  x('chair-chest-stretch', 'chair-hip-marching', 'Seated Chest Stretch', ['Chair Chest Stretch'], { equipment: ['Chair'], collections: ['Chair-based', 'Stretches'], category: 'Stretch', focus: 'Chest', props: CHAIR,
    edit: e => { e.keyframes = [sit('Sit tall', 'Sit upright, away from the chair back.', {}, { reach: THIGHS, phase: 'setup' }),
      sit('Seated Chest Stretch', 'Arms back, push your chest forward and up.', { chest: [-10, 0, 0], neck: [-8, 0, 0], shoulderL: [-35, 25, 0], elbowL: 15, shoulderR: [-35, 25, 0], elbowR: 15 }, { holdMs: 5000 })]; },
    over: { bilateral: null, ...holdT(10, 'Hold 5 to 10 seconds, 3 to 5 times.') },
    description: 'Sitting tall on a chair, draw your arms back and push your chest forward and up until you feel a stretch across the chest.',
    setup: ['Sit upright, away from the back of a sturdy chair, feet flat.'],
    cues: ['Chest forward and up.', 'Shoulders down, away from your ears.', 'Breathe easily.'], source: NHS }),
  x('chair-upper-body-twist', 'chair-hip-marching', 'Seated Upper-Body Twist', ['Chair Upper-Body Twist'], { equipment: ['Chair'], collections: ['Chair-based'], category: 'Mobility', focus: 'Spine', props: CHAIR,
    edit: e => { e.keyframes = [sit('Twist left', 'Arms crossed, turn your upper body to the left.', { torso: [0, 0, 25], chest: [0, 0, 20] }, { reach: CROSSED }),
      sit('Twist right', 'Now turn to the right.', { torso: [0, 0, -25], chest: [0, 0, -20] }, { reach: CROSSED })]; },
    over: { bilateral: null, ...reps('5 each side', 5), repName: 'twist' },
    description: 'Sitting tall with your arms crossed on your chest, turn your upper body slowly to one side and then the other, hips still.',
    setup: ['Sit upright, feet flat on the floor.', 'Cross your arms and reach for your shoulders.'],
    cues: ['Keep your hips still.', 'Turn as far as is comfortable.', 'Move slowly.'], source: NHS }),
  x('chair-arm-raises', 'chair-hip-marching', 'Seated Arm Raises', ['Chair Arm Raises', 'Arm Raises'], { equipment: ['Chair'], collections: ['Chair-based'], category: 'Mobility', focus: 'Shoulders', props: CHAIR,
    edit: e => { e.keyframes = [sit('Arms down', 'Hands on your thighs.', {}, { reach: THIGHS }),
      sit('Arms up', 'Raise both arms out to the sides and up.', { shoulderL: [0, 165, 90], shoulderR: [0, 165, 90] }, { camera: 0, durationMs: 2000 }),
      sit('Arms down', 'Lower them slowly.', {}, { camera: 0, reach: THIGHS })]; e.keyframes[0].camera = 0; },
    over: { bilateral: null, ...reps('5', 5) },
    description: 'Sitting tall, raise both arms out to the sides and up over your head, then lower them slowly.',
    setup: ['Sit upright, feet flat on the floor, hands on your thighs.'],
    cues: ['Palms facing forward.', 'Stop before it pinches.', 'Breathe out as you lower.'], source: NHS }),
  x('chair-neck-rotation', 'chair-hip-marching', 'Seated Neck Rotation', ['Neck Rotation', 'Neck Turns'], { equipment: ['Chair'], collections: ['Chair-based', 'Stretches'], category: 'Mobility', focus: 'Neck', props: CHAIR,
    edit: e => { e.keyframes = [sit('Look left', 'Slowly turn your head to the left.', { neck: [0, 0, 60] }, { reach: THIGHS, camera: 0 }),
      sit('Look right', 'Now to the right.', { neck: [0, 0, -60] }, { reach: THIGHS, camera: 0, durationMs: 2500 })]; },
    over: { bilateral: null, ...reps('5 each side', 5), repName: 'turn' },
    description: 'Sitting tall with shoulders down, turn your head slowly to look over one shoulder, then the other.',
    setup: ['Sit upright, shoulders down, looking straight ahead.'],
    cues: ['Shoulders stay still.', 'Turn only as far as is comfortable.', 'Move slowly.'], source: NHS }),
  // ---------- stretches ----------
  x('str-triceps-stretch', 'mayo-quadriceps', 'Overhead Triceps Stretch', ['Triceps Stretch'], { equipment: [], collections: ['Stretches'], category: 'Stretch', focus: 'Triceps and shoulders', props: [],
    edit: e => { e.keyframes = [K('Stand tall', 'Feet hip-width apart.', {}, { ...STAND, phase: 'setup' }),
      K('Overhead Triceps Stretch', 'Right hand down your back, left hand on your right elbow.', { neck: [10, 0, 0], shoulderR: [165, 10, 0], elbowR: 150, shoulderL: [150, -30, 0], elbowL: 110 }, { ...STAND, holdMs: 5000, reach: [{ hand: 'handL', to: 'elbowR' }] })]; },
    over: { ...sidesL(), ...holdT(20) },
    description: 'Reach one arm up, bend the elbow so the hand drops down your back, and use the other hand on the elbow to ease the stretch deeper.',
    setup: ['Stand tall, shoulders down and back.'],
    cues: ['Elbow points up.', 'Light pressure only.', 'Keep your head up.'], source: { url: 'https://www.acefitness.org/resources/everyone/exercise-library/174/overhead-triceps-stretch/', title: 'ACE Exercise Library: Overhead Triceps Stretch' } }),
  // the right ankle rests just above the left knee (hip fitted, Sep 2026), the left thigh drawn in until both hands are on its knee
  x('str-figure-four', 'mayo-knee-to-chest', 'Figure-Four Stretch', ['Supine Figure Four', 'Reclined Pigeon'], { equipment: [], collections: ['Stretches'], category: 'Stretch', focus: 'Outer hip and glutes', props: [],
    edit: e => { e.keyframes = [K('Lie on your back', 'Knees bent, feet flat.', { root: [-90, 0, 0], neck: [34, 0, 0], hipL: [45, 0, 0], kneeL: 90, ankleL: 45, hipR: [45, 0, 0], kneeR: 90, ankleR: 45 }, { anchor: 'neckBase', plant: ['L', 'R'], touch: [{ point: 'ankleR', adjust: 'kneeR' }, { point: 'ankleL', adjust: 'kneeL' }], phase: 'setup', camera: 60 }),
      K('Figure-Four Stretch', 'Right ankle on your left knee, pull the left thigh toward you.', { root: [-90, 0, 0], neck: [34, 0, 0], hipL: [125, 0, 0], kneeL: 90, hipR: [130, 42.5, 88.5], kneeR: 110, ankleR: 10 }, { anchor: 'neckBase', holdMs: 5000, camera: 60, reach: [{ hand: 'handR', to: 'kneeL', dx: 6, dz: 6 }, { hand: 'handL', to: 'kneeL', dx: -6, dz: 6 }] })]; },
    over: { ...sidesL(), ...holdT(30) },
    description: 'Lying on your back, cross one ankle over the opposite knee and draw that thigh toward you to stretch the outer hip of the crossed leg.',
    setup: ['Lie on your back, knees bent, feet flat.'],
    cues: ['Flex the crossed foot.', 'Head stays down.', 'Pull gently.'], source: { url: 'https://www.hingehealth.com/resources/articles/figure-four/', title: 'Hinge Health: How to do a figure 4 stretch' } }),
  x('str-doorway-chest-stretch', 'wall-chest-stretch', 'Doorway Chest Stretch', ['Doorway Pec Stretch'], { equipment: ['Wall'], collections: ['Stretches'], category: 'Stretch', focus: 'Chest and front of the shoulders',
    props: [{ type: 'wall', at: 'elbowR', keyframe: 0, offset: 6, beside: true }, { type: 'wall', at: 'elbowL', keyframe: 0, offset: 6, beside: true }],
    edit: e => { e.keyframes = [K('Forearms on the frame', 'Stand in a doorway, forearms on each side, elbows at chest height.', { shoulderL: [0, 90, 90], elbowL: 90, shoulderR: [0, 90, 90], elbowR: 90 }, { ...STAND, camera: 45, phase: 'setup' }),
      K('Doorway Chest Stretch', 'Step one foot through and lean your chest forward.', { torso: [8, 0, 0], shoulderL: [-20, 85, 90], elbowL: 80, shoulderR: [-20, 85, 90], elbowR: 80, hipR: [15, 0, 0], kneeR: 5, hipL: [-10, 0, 0] }, { anchor: 'ankleL', plant: ['L', 'R'], camera: 45, holdMs: 5000 })]; },
    over: { bilateral: null, ...holdT(30) },
    description: 'Standing in a doorway with a forearm on each side of the frame, step one foot through and lean forward until you feel a stretch across the chest.',
    setup: ['Stand in a doorway, elbows bent and at about chest height, a forearm on each side of the frame.'],
    cues: ['Chest leads, not your chin.', 'Shoulders down.', 'Gentle: no pinching at the front of the shoulder.'], source: { url: 'https://www.hingehealth.com/resources/articles/sitting-stretches/', title: 'Hinge Health: Stretches to do after sitting all day' } }),
  // ---------- warm-up ----------
  x('wu-leg-swings', 'bw-side-leg-lift', 'Leg Swings', ['Front-to-Back Leg Swings'], { equipment: ['Wall'], collections: ['Warm-up'], category: 'Mobility', focus: 'Hips',
    props: [{ type: 'wall', at: 'handL', keyframe: 0, beside: true }],
    edit: e => { const hand = { shoulderL: [0, 99.5, 90], elbowL: 20 }, R = [{ hand: 'handL', to: 'wall' }];
      e.keyframes = [K('Swing forward', 'Hand on the wall, swing your right leg forward.', { ...hand, hipR: [55, 0, 0] }, { anchor: 'ankleL', plant: ['L'], reach: R, durationMs: 800, holdMs: 0 }),
        K('Swing back', 'Let it swing back behind you.', { ...hand, hipR: [-30, 0, 0] }, { anchor: 'ankleL', plant: ['L'], reach: R, durationMs: 800, holdMs: 0 })]; },
    over: { bilateral: { labels: { L: 'Right leg', R: 'Left leg' } }, ...reps('10 each leg', 10), repName: 'swing' },
    description: 'Standing side-on to a wall with one hand on it, swing the outside leg forward and back in a smooth, relaxed arc.',
    setup: ['Stand side-on to a wall, the near hand on it for balance.'],
    cues: ['Stand tall, don\'t lean.', 'Let the leg swing freely.', 'Start small, then go higher.'], source: { url: 'https://www.healthline.com/health/exercise-fitness/dynamic-stretching', title: 'Healthline: Dynamic stretching' } }),
  x('wu-inchworm', 'yoga-standing-forward-bend', 'Inchworm', ['Inchworms', 'Walkout'], { equipment: [], collections: ['Warm-up'], category: 'Mobility', focus: 'Hamstrings, core and shoulders', props: [],
    edit: e => { const touchHands = [{ point: 'handR', adjust: 'shoulderR' }, { point: 'handL', adjust: 'shoulderL' }];
      e.keyframes = [K('Stand tall', 'Feet together.', {}, { ...STAND }),
        K('Hands to the floor', 'Fold forward and put your hands on the floor.', { torso: [140, 0, 0], neck: [10, 0, 0], shoulderL: [185, 0, 0], shoulderR: [185, 0, 0], kneeL: 12, kneeR: 12 }, { ...STAND, touch: touchHands }),
        K('Walk out to a plank', 'Walk your hands forward to a plank.', { root: [66, 0, 0], shoulderL: [66, 0, 0], shoulderR: [66, 0, 0], hipL: [-8, 0, 0], ankleL: 24, hipR: [-8, 0, 0], ankleR: 24 }, { anchor: 'toeL', touch: [{ point: 'handR', adjust: 'root' }], durationMs: 2500 }),
        K('Walk back in', 'Walk your hands back to your feet.', { torso: [140, 0, 0], neck: [10, 0, 0], shoulderL: [185, 0, 0], shoulderR: [185, 0, 0], kneeL: 12, kneeR: 12 }, { ...STAND, touch: touchHands, durationMs: 2500 })]; },
    over: { bilateral: null, ...reps('5–8', 5), repName: null },
    description: 'From standing, fold forward to put your hands on the floor, walk them out to a plank, then walk them back in and stand up.',
    setup: ['Stand with your feet together or slightly apart.'],
    cues: ['Bend your knees as much as you need.', 'Small hand steps.', 'Keep your core firm in the plank.'], source: { url: 'https://www.acefitness.org/resources/everyone/exercise-library/254/inchworms/', title: 'ACE Exercise Library: Inchworms' } }),
  x('wu-torso-twists', 'bw-squat', 'Standing Torso Twists', ['Torso Twists', 'Trunk Rotations'], { equipment: [], collections: ['Warm-up'], category: 'Mobility', focus: 'Spine', props: [],
    edit: e => { const arms = { shoulderL: [0, 88, 0], shoulderR: [0, 88, 0] };
      e.keyframes = [K('Turn left', 'Arms out, turn your upper body to the left.', { torso: [0, 0, 30], chest: [0, 0, 25], ...arms, hipL: [0, 12, 0], hipR: [0, 12, 0] }, { ...STAND, camera: 0, durationMs: 1000, holdMs: 0 }),
        K('Turn right', 'And to the right.', { torso: [0, 0, -30], chest: [0, 0, -25], ...arms, hipL: [0, 12, 0], hipR: [0, 12, 0] }, { ...STAND, camera: 0, durationMs: 1000, holdMs: 0 })]; },
    over: { bilateral: null, ...reps('10 each side', 10), repName: 'twist' },
    description: 'Standing with feet shoulder-width apart and arms out at shoulder height, turn your upper body from side to side, hips facing forward.',
    setup: ['Stand with your feet shoulder-width apart, arms out to the sides at shoulder height.'],
    cues: ['Hips stay facing forward.', 'Turn smoothly, don\'t fling.', 'Breathe.'], source: { url: 'https://www.healthline.com/health/exercise-fitness/dynamic-stretching', title: 'Healthline: Dynamic stretching' } }),
  x('wu-butt-kicks', 'bw-squat', 'Butt Kicks', ['Heel Kicks', 'Standing Butt Kicks'], { equipment: [], collections: ['Warm-up'], category: 'Cardio', focus: 'Thighs and hamstrings', props: [],
    edit: e => { const arms = { shoulderL: [20, 0, 0], elbowL: 90, shoulderR: [20, 0, 0], elbowR: 90 };
      e.keyframes = [K('Right heel up', 'Kick your right heel up toward your seat.', { ...arms, hipR: [-5, 0, 0], kneeR: 130 }, { anchor: 'ankleL', plant: ['L'], durationMs: 500, holdMs: 0 }),
        K('Down', 'Put it down.', { ...arms }, { anchor: 'ankleL', plant: ['L', 'R'], durationMs: 400, holdMs: 0 }),
        K('Left heel up', 'Now the left heel.', { ...arms, hipL: [-5, 0, 0], kneeL: 130 }, { anchor: 'ankleR', plant: ['R'], durationMs: 500, holdMs: 0 }),
        K('Down', 'Put it down.', { ...arms }, { anchor: 'ankleR', plant: ['L', 'R'], durationMs: 400, holdMs: 0 })]; },
    over: { bilateral: null, ...reps('20–30 (both legs = 2)', 20), repName: 'kick' },
    description: 'In place, kick one heel up toward your seat and then the other, in a quick rhythm with arms bent. Jog to make it harder.',
    setup: ['Stand tall, arms bent at your sides.'],
    cues: ['Heel toward your seat.', 'Light on your feet.', 'Speed up when warm.'], source: { url: 'https://www.acefitness.org/resources/pros/expert-articles/6886/dynamic-warm-ups-and-sticking-finishes/', title: 'ACE: Dynamic warm-ups' } }),
  // ---------- balance ----------
  x('bal-single-leg-stand', 'bw-squat', 'Single-Leg Stand', ['Standing on One Leg', 'One-Leg Stand'], { equipment: [], collections: ['Balance'], category: 'Balance', focus: 'Balance and ankles', props: [],
    edit: e => { e.keyframes = [K('Stand tall', 'Hands on your hips.', { ...HANDS_ON_HIPS }, { ...STAND, phase: 'setup' }),
      K('Single-Leg Stand', 'Lift your right foot a little and hold.', { ...HANDS_ON_HIPS, hipR: [20, 0, 0], kneeR: 45 }, { anchor: 'ankleL', plant: ['L'], holdMs: 5000 })]; },
    over: { bilateral: { labels: { L: 'Standing on the left leg', R: 'Standing on the right leg' } }, ...holdT(30, 'Hold a chair or wall nearby at first. Build up to 30 seconds; closing your eyes makes it harder.') },
    description: 'Stand on one foot with the other lifted a little off the floor, and hold steady.',
    setup: ['Stand tall near a sturdy chair or wall you can hold if needed.'],
    cues: ['Soft standing knee.', 'Eyes on a spot ahead.', 'Hold on if you wobble.'], source: { url: 'https://go4life.nia.nih.gov/sample_workout/3-balance-exercises-older-adults', title: 'NIA Go4Life: 3 balance exercises for older adults' } }),
  x('bal-tandem-stance', 'bw-squat', 'Tandem Stance', ['Heel-to-Toe Stance', 'Semi-Tandem Stance'], { equipment: [], collections: ['Balance'], category: 'Balance', focus: 'Balance', props: [],
    edit: e => { e.keyframes = [K('Stand tall', 'Feet together.', {}, { ...STAND, phase: 'setup' }),
      K('Tandem Stance', 'Right heel right in front of your left toes; hold.', { hipR: [4, -5.5, 0], hipL: [-6, -3, 0], shoulderL: [0, 30, 0], shoulderR: [0, 30, 0] }, { anchor: 'ankleL', plant: ['L', 'R'], touch: [{ point: 'ankleR', adjust: 'hipR' }], holdMs: 5000 })]; },
    over: { bilateral: { labels: { L: 'Right foot in front', R: 'Left foot in front' } }, ...holdT(20, 'Stand near a wall or counter. Build up to 30 seconds.') },
    description: 'Stand with one foot directly in front of the other, heel touching toes, as if on a line, and hold steady.',
    setup: ['Stand next to a wall or counter you can touch if needed.'],
    cues: ['Heel to toe, on one line.', 'Look ahead, not down.', 'Arms out if it helps.'], source: { url: 'https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/balance-exercises/art-20546836', title: 'Mayo Clinic: Balance exercises' } }),
  x('bal-clock-reach', 'bw-squat', 'Clock Reach', ['Clock Arm Reach'], { equipment: [], collections: ['Balance'], category: 'Balance', focus: 'Balance and core', props: [],
    edit: e => { const leg = { hipR: [30, 0, 0], kneeR: 90 }, one = { anchor: 'ankleL', plant: ['L'], camera: 0 };
      e.keyframes = [K('Stand on your left leg', 'Lift your right foot, knee bent.', { ...leg }, { ...one, phase: 'setup' }),
        K('12 o\'clock', 'Reach your right arm straight up.', { ...leg, shoulderR: [0, 170, 90] }, { ...one }),
        K('3 o\'clock', 'Reach it out to the side.', { ...leg, shoulderR: [0, 90, 0] }, { ...one }),
        K('6 o\'clock', 'Reach it down and back behind you.', { ...leg, shoulderR: [-40, 20, 0] }, { ...one }),
        K('Back to the middle', 'Arm down.', { ...leg }, { ...one })]; },
    over: { bilateral: { labels: { L: 'Standing on the left leg', R: 'Standing on the right leg' } }, ...reps('3–5 rounds each side', 3), repName: 'round', holdStep: null },
    description: 'Standing on one leg, reach one arm to 12, 3 and 6 o\'clock on an imaginary clock and back, keeping your balance.',
    setup: ['Stand next to a sturdy chair you can hold.', 'Imagine standing in the middle of a clock face.'],
    cues: ['Standing knee soft.', 'Move the arm slowly.', 'Touch the chair if you wobble.'], source: { url: 'https://eat-move-save.extension.illinois.edu/move/exercise/clock-reach', title: 'University of Illinois Extension: Clock Reach' } }),
];
