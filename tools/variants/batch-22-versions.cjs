// Batch 22 (Sep 2026): stretch, yoga and Pilates versions of library exercises (the ⏳ rows of
// docs/equipment-equivalents.md) with equipment the library already has: towel, chair, step, wall, band, block.
// node tools/research.cjs variants tools/variants/batch-22-versions.cjs [id...]
const SRC = require('./batch-22-sources.cjs');
const map = (ex, f) => { ex.keyframes = ex.keyframes.map(f); };
const hold = (n, note, step = 1) => ({ measure: 'time', holdStep: step, defaults: { seconds: n }, repName: null, prescription: { seconds: `${n}`, note } });
const LEGS = { bilateral: { labels: { L: 'Left leg', R: 'Right leg' } } }, SIDES = { bilateral: { labels: { L: 'Left side', R: 'Right side' } } };
// sitting on a chair (as in batches 2 and 20): feet flat, hands on the thighs
const CHAIR = [{ type: 'chair', back: 'behind', z: -12 }];
const handsOnThighs = [{ hand: 'handR', to: 'pelvis', dx: 22, dz: 26 }, { hand: 'handL', to: 'pelvis', dx: -22, dz: 26 }];
const seat = { hipL: [90, 0, 0], kneeL: 90, hipR: [90, 0, 0], kneeR: 90 };
const feetDown = [{ point: 'ankleL', adjust: 'kneeL' }, { point: 'ankleR', adjust: 'kneeR' }];
const Seat = (name, cue, pose = {}, x = {}) => ({ name, cue, camera: 60, durationMs: 1600, phase: 'rep', anchor: 'pelvis', plant: ['L', 'R'],
  reach: handsOnThighs, touch: feetDown, ...x, pose: { ...seat, ...pose } });
// sitting sideways (turned to face along the seat's side, the chair back at the right side): the right thigh on the seat,
// the left hip just past the seat's front edge, so the left leg can go back
const SIDEWAYS = [{ type: 'chair', back: 'behind', x: 5, z: -30 }];
const sideFeet = [{ point: 'ankleR', adjust: 'kneeR' }, { point: 'ankleL', adjust: 'kneeL' }], backToe = [{ point: 'ankleR', adjust: 'kneeR' }, { point: 'toeL', adjust: 'kneeL' }];
const Side = (name, cue, pose = {}, x = {}) => ({ name, cue, camera: 0, durationMs: 1800, phase: 'rep', anchor: 'pelvis', plant: ['R'], reach: [], touch: backToe, ...x,
  pose: { root: [0, 0, -90], hipR: [90, 0, 0], kneeR: 90, shoulderL: [-10, 10, 0], elbowL: 70, shoulderR: [-10, 10, 0], elbowR: 70, ...pose } });
const Stand = (name, cue, pose = {}, x = {}) => ({ name, cue, camera: 90, durationMs: 1600, phase: 'rep', anchor: 'ankleL', plant: ['L', 'R'], ...x, pose });
module.exports = [
  // ---------- stretches ----------
  { id: 'towel-hamstring-stretch', base: 'yoga-reclining-hand-to-big-toe', name: 'Towel Hamstring Stretch', otherNames: ['Lying Hamstring Stretch with a Towel', 'Supine Towel Hamstring Stretch'],
    category: 'Flexibility', focus: 'Back of the thighs', collections: ['Stretches'], equipment: ['Towel'], props: [{ type: 'towel', from: 'handL', via: ['footL'], to: 'handR' }],
    steps: [[null, 'Lie on your back, a towel round one foot.'], ['Pull the leg up', 'Straighten the leg and gently pull it toward you.']],
    over: { ...LEGS, ...hold(30, 'Pull only until you feel a stretch; the other leg stays long or bent, foot flat.') },
    description: 'Lying on your back with a towel looped round one foot, straighten that leg up toward the ceiling and gently pull it toward you with the towel.',
    setup: ['Lie on your back.', 'Loop a towel round the ball of one foot and hold an end in each hand.'],
    cues: ['Leg straight, or a soft knee.', 'Head and shoulders relaxed on the floor.', 'Breathe slowly.'], source: SRC.towelHamstring },
  { id: 'chair-hamstring-stretch', base: 'chair-leg-raise', name: 'Chair Hamstring Stretch', otherNames: ['Seated Chair Hamstring Stretch', 'Seated Single-Leg Hamstring Stretch'],
    category: 'Flexibility', focus: 'Back of the thighs', collections: ['Stretches', 'Chair-based'], equipment: ['Chair'], props: CHAIR,
    edit: ex => { const out = { hipR: [60, 0, 0], kneeR: 0, ankleR: -15 }, t = { plant: ['L'], touch: [{ point: 'ankleL', adjust: 'kneeL' }, { point: 'ankleR', adjust: 'hipR' }] };
      ex.keyframes = [
        Seat('Leg out', 'Sit near the front, one leg straight out, heel on the floor.', out, { ...t, phase: 'setup' }),
        Seat('Lean forward', 'Keep your back long and fold forward from the hips.', { ...out, torso: [28, 0, 0], neck: [-6, 0, 0],
          // (arms fitted, Sep 2026: hands resting on the thighs, the right halfway down the straight leg)
          shoulderL: [-3, -9.25, 0], elbowL: 82, shoulderR: [2, -6.25, 0], elbowR: 41.5 }, { ...t, durationMs: 2400, reach: [] })]; },
    over: { ...LEGS, ...hold(30, 'Fold from the hips, not the waist; stop where you feel a stretch.') },
    description: 'Sitting near the front of a chair with one leg straight out and the heel on the floor, keep your back long and lean forward from the hips until you feel a stretch behind the thigh.',
    setup: ['Sit near the front of a sturdy chair.', 'Straighten one leg out in front, heel down, toes up; the other foot flat.'],
    cues: ['Back long, chest forward.', 'Hinge at the hips.', 'Breathe slowly.'], source: SRC.chairHamstring },
  { id: 'towel-calf-stretch', base: 'yoga-seated-forward-bend-strap', name: 'Towel Calf Stretch', otherNames: ['Seated Towel Calf Stretch'],
    category: 'Flexibility', focus: 'Calves', collections: ['Stretches'], equipment: ['Towel'], props: [{ type: 'towel', from: 'handL', via: ['toeL'], to: 'handR' }],
    edit: ex => { const legs = { hipL: [90, 0, 0], hipR: [90, 0, 0] }, hands = [{ hand: 'handR', to: 'kneeL', dx: 12, dy: 18, dz: -8 }, { hand: 'handL', to: 'kneeL', dx: -12, dy: 18, dz: -8 }];
      ex.keyframes = [
        { name: 'Towel round the foot', cue: 'Sit tall, legs straight, a towel round the ball of one foot.', camera: 70, durationMs: 1600, phase: 'setup', anchor: 'pelvis', reach: hands, pose: { torso: [8, 0, 0], ...legs } },
        { name: 'Pull the toes back', cue: 'Pull the towel to bring your toes toward you.', camera: 70, durationMs: 2200, phase: 'rep', anchor: 'pelvis', reach: hands, pose: { torso: [8, 0, 0], ...legs, ankleL: -25 } }]; },
    over: { ...LEGS, ...hold(30, 'Keep the knee straight; pull gently.') },
    description: 'Sitting with your legs straight and a towel round the ball of one foot, pull the towel to draw your toes toward you until you feel a stretch in the calf.',
    setup: ['Sit on the floor, legs straight in front.', 'Loop a towel round the ball of one foot, an end in each hand.'],
    cues: ['Sit tall.', 'Knee straight.', 'Pull the toes, not the leg.'], source: SRC.towelCalf },
  { id: 'step-calf-stretch', base: 'step-calf-raise', name: 'Step Calf Stretch', otherNames: ['Heel Drop Calf Stretch'],
    category: 'Flexibility', focus: 'Calves', collections: ['Stretches'], equipment: ['Step', 'Wall'],
    edit: ex => { const [down] = ex.keyframes;
      ex.keyframes = [{ ...down, name: 'Feet level', cue: 'Balls of your feet on the edge of the step, hands on the wall.', phase: 'setup', pose: { ...down.pose, ankleL: 0, ankleR: 0 } },
        { ...down, name: 'Drop the heels', cue: 'Let both heels sink below the step.', durationMs: 2200, phase: 'rep' }]; },
    over: { bilateral: null, ...hold(30, 'Sink only as far as is comfortable; keep the knees straight.') },
    description: 'Standing with the balls of your feet on the edge of a step and a hand on the wall, let your heels sink below the step until you feel a stretch in the calves.',
    setup: ['Stand on a step facing a wall or rail, the balls of your feet on its edge.', 'Hands on the wall for balance.'],
    cues: ['Knees straight.', 'Sink slowly.', 'Stand tall.'], source: SRC.stepCalf },
  { id: 'chair-quad-stretch', base: 'mayo-quadriceps', name: 'Chair-Supported Quad Stretch', otherNames: ['Standing Quad Stretch with a Chair'],
    category: 'Flexibility', focus: 'Front of the thighs', collections: ['Stretches', 'Chair-based'], equipment: ['Chair'], props: [{ type: 'chair', back: 'behind', z: 70 }],
    edit: ex => map(ex, k => ({ ...k, reach: [{ hand: 'handL', to: 'chair' }, ...(k.reach || []).filter(r => r.to !== 'wall')] })),
    description: 'Standing tall with one hand on a chair back, bend one knee and hold that ankle behind you, drawing the heel toward your buttock.',
    setup: ['Stand behind a sturdy chair, one hand on its back.', 'Feet hip-width apart.'],
    cues: ['Knees side by side.', 'Stand tall; tuck the hips a little.', 'Gentle pull, no bouncing.'], source: SRC.chairQuad },
  // face down (a sagittal stretch lying on the side happens in the floor's plane, which no camera shows): the towel
  // round the ankle, held over the shoulder, draws the heel toward the seat
  { id: 'towel-quad-stretch', base: 'yoga-sphinx', name: 'Towel Quad Stretch', otherNames: ['Prone Quad Stretch with a Towel', 'Lying Quad Stretch'],
    category: 'Flexibility', focus: 'Front of the thighs', collections: ['Stretches'], equipment: ['Towel'], props: [{ type: 'towel', from: 'handR', to: 'ankleR' }],
    edit: ex => { const k0 = ex.keyframes[0], base = { root: [90, 0, 0], neck: [-34, 0, 0], shoulderL: [180, 0, 0], ankleL: 90 };
      ex.keyframes = [
        { ...k0, name: 'Towel round the ankle', cue: 'Lie face down, a towel round one ankle, the ends over your shoulder.', phase: 'setup', durationMs: 1600,
          pose: { ...base, kneeR: 70, ankleR: 60, shoulderR: [-30, 10, 0], elbowR: 20 } },
        { ...k0, name: 'Heel to your seat', cue: 'Pull the towel to bring the heel toward your seat.', phase: 'rep', durationMs: 2400,
          pose: { ...base, kneeR: 125, ankleR: 60, shoulderR: [-70, 10, 0], elbowR: 70 } }]; },
    over: { bilateral: { labels: { L: 'Right leg', R: 'Left leg' } }, ...hold(30, 'Hips stay down on the floor; stop at a gentle stretch.') },
    description: 'Lying face down with a towel looped round one ankle and the ends held over your shoulder, pull the towel to bring that heel toward your seat until you feel a stretch in the front of the thigh.',
    setup: ['Lie face down, one arm long on the floor past your head.', 'Loop a towel round one ankle and hold the ends over the same shoulder.'],
    cues: ['Hips pressed down.', 'Knees close together.', 'Pull gently.'], source: SRC.towelQuad },
  { id: 'towel-chest-stretch', base: 'mayo-shoulder-towel', name: 'Towel Chest Stretch', otherNames: ['Standing Towel Chest Stretch'],
    category: 'Flexibility', focus: 'Chest and front of the shoulders', collections: ['Stretches'], equipment: ['Towel'], props: [{ type: 'towel', from: 'handR', to: 'handL' }],
    edit: ex => { const k0 = ex.keyframes[0];
      ex.keyframes = [
        { ...k0, camera: 130, name: 'Towel behind you', cue: 'Hold a towel behind you, hands wide, arms straight.', phase: 'setup', durationMs: 1600, reach: [], pose: { shoulderL: [-18, 16, 0], elbowL: 4, shoulderR: [-18, 16, 0], elbowR: 4 } },
        { ...k0, camera: 130, name: 'Lift and open', cue: 'Lift the towel away from you and squeeze your shoulder blades.', phase: 'rep', durationMs: 2200, reach: [], pose: { chest: [-6, 0, 0], shoulderL: [-45, 16, 0], elbowL: 4, shoulderR: [-45, 16, 0], elbowR: 4 } }]; },
    over: { bilateral: null, ...hold(20, 'Stand tall; lift only as far as feels good.') },
    description: 'Standing tall with a towel held behind you in both hands, arms straight, lift the towel back and away from you to open the chest.',
    setup: ['Stand tall, feet hip-width apart.', 'Hold a towel behind you, hands wide apart, arms straight.'],
    cues: ['Chest up.', 'Squeeze your shoulder blades together.', 'Don\'t lean forward.'], source: SRC.towelChest },
  // sitting sideways at the front corner of the seat (turned to face along the seat's side edge): the front thigh on the
  // seat, the back leg off its front edge. Chair back at the right side.
  { id: 'chair-hip-flexor-stretch', base: 'chair-hip-marching', name: 'Chair Hip Flexor Stretch', otherNames: ['Seated Hip Flexor Stretch'],
    category: 'Flexibility', focus: 'Front of the hips', collections: ['Stretches', 'Chair-based'], equipment: ['Chair'], props: SIDEWAYS,
    edit: ex => { ex.keyframes = [
      Side('Sit sideways', 'Sit sideways near the front corner of the seat, both feet flat.', { hipL: [80, 18, 0], kneeL: 80 }, { phase: 'setup', touch: sideFeet }),
      Side('Leg back', 'Slide the leg nearest the front of the chair back, knee pointing down.', { hipL: [-18, 6, 0], kneeL: 70, ankleL: 30 }, { touch: backToe, durationMs: 2400 })]; },
    over: { bilateral: { labels: { L: 'Left hip', R: 'Right hip' } }, ...hold(30, 'Squeeze your seat and tuck your hips under a little to feel more.') },
    description: 'Sitting sideways near the front corner of a chair, slide the leg nearest the front of the seat back until the knee points down, and tuck your hips under to stretch the front of that hip.',
    setup: ['Sit sideways near the front corner of a sturdy chair, the chair back beside you.', 'Front foot flat on the floor.'],
    cues: ['Sit tall.', 'Knee points to the floor.', 'Squeeze your seat; tuck the hips.'], source: SRC.chairHipFlexor },
  // ---------- chair yoga ----------
  { id: 'chair-yoga-mountain', base: 'yoga-mountain', name: 'Seated Mountain Pose', otherNames: ['Chair Mountain Pose', 'Seated Tadasana'],
    category: 'Flexibility', collections: ['Yoga', 'Chair-based'], equipment: ['Chair'], props: CHAIR,
    edit: ex => { ex.keyframes = [
      Seat('Sit', 'Sit near the front of the seat, feet flat.', { torso: [8, 0, 0] }, { phase: 'setup' }),
      Seat('Seated Mountain Pose', 'Sit tall, crown of the head up, shoulders relaxed.', { neck: [0, 0, 0] }, { durationMs: 2400 })]; },
    over: { bilateral: null, ...hold(30, 'Breathe slowly; feel your feet on the floor and your seat on the chair.') },
    description: 'Sitting tall near the front of a chair, feet flat and hip-width apart, hands resting on the thighs: lengthen up through the crown of your head and breathe.',
    setup: ['Sit near the front of a sturdy chair.', 'Feet flat, hip-width apart; knees over the ankles.'],
    cues: ['Crown of the head up.', 'Shoulders soft, away from your ears.', 'Breathe slowly.'], source: SRC.seatedMountain },
  { id: 'chair-yoga-warrior-1', base: 'yoga-warrior-1', name: 'Chair Warrior I', otherNames: ['Seated Warrior I', 'Chair Virabhadrasana I'],
    category: 'Strength', collections: ['Yoga', 'Chair-based'], equipment: ['Chair'], props: SIDEWAYS,
    edit: ex => { ex.keyframes = [
      Side('Sit sideways', 'Sit sideways near the front corner of the seat, both feet flat.', { hipL: [80, 18, 0], kneeL: 80 }, { phase: 'setup', touch: sideFeet }),
      Side('Leg back', 'Reach the leg nearest the front of the chair back, toes tucked.', { hipL: [-38, 6, 0], kneeL: 4, ankleL: 50 }, { touch: backToe }),
      Side('Chair Warrior I', 'Sweep your arms up overhead.', { hipL: [-38, 6, 0], kneeL: 4, ankleL: 50, shoulderL: [175, 0, 0], elbowL: 4, shoulderR: [175, 0, 0], elbowR: 4 }, { touch: backToe, reach: [], durationMs: 2400 })]; },
    over: { bilateral: { labels: { L: 'Left side', R: 'Right side' } }, ...hold(30, 'Sit tall; keep the back leg long.', 2) },
    description: 'Sitting sideways near the front corner of a chair with the front foot flat, reach the other leg long behind you, toes tucked, and lift your arms overhead.',
    setup: ['Sit sideways near the front corner of a sturdy chair, the chair back beside you.', 'Front foot flat, knee over the ankle.'],
    cues: ['Back leg long, heel reaching back.', 'Arms up by your ears.', 'Sit tall.'], source: SRC.chairWarrior1 },
  { id: 'chair-yoga-warrior-2', base: 'yoga-warrior-2', name: 'Chair Warrior II', otherNames: ['Seated Warrior II', 'Chair Virabhadrasana II'],
    category: 'Strength', collections: ['Yoga', 'Chair-based'], equipment: ['Chair'], props: [{ type: 'chair', back: 'behind', z: -32 }],
    edit: ex => { // (legs fitted, Sep 2026: both feet on the floor, the straight leg clearing the seat's front corner)
    const legs = { hipR: [82.75, 40, 45], kneeR: 82.75, ankleR: 28.75, hipL: [60, 32, 16.75], kneeL: 4, ankleL: 48.25 };
      ex.keyframes = [
      Seat('Sit', 'Sit near the front of the seat, feet flat.', {}, { phase: 'setup', camera: 0 }),
      Seat('Open the legs', 'Turn one knee out; reach the other leg long to the side, heel down.', legs, { camera: 0, touch: [] }),
      Seat('Chair Warrior II', 'Arms out at shoulder height; look past the front hand.', { ...legs, neck: [0, 0, -40], shoulderL: [0, 90, 0], elbowL: 4, shoulderR: [0, 90, 0], elbowR: 4 },
        { camera: 0, reach: [], durationMs: 2400, touch: [] })]; },
    over: { bilateral: { labels: { L: 'Right side', R: 'Left side' } }, ...hold(30, 'Front knee over the ankle; arms level.', 2) },
    description: 'Sitting near the front of a chair, turn one knee out to the side with the foot flat, reach the other leg long to the other side, and stretch your arms out at shoulder height, looking past the front hand.',
    setup: ['Sit near the front of a sturdy chair.', 'Feet flat, wide apart.'],
    cues: ['Front knee over the ankle.', 'Arms long and level.', 'Shoulders relaxed.'], source: SRC.chairWarrior2 },
  { id: 'chair-yoga-eagle', base: 'yoga-eagle', name: 'Chair Eagle Pose', otherNames: ['Seated Eagle Pose', 'Chair Garudasana'],
    category: 'Flexibility', collections: ['Yoga', 'Chair-based'], equipment: ['Chair'], props: CHAIR,
    edit: ex => { const cross = { hipR: [100, -18, 0], kneeR: 85, ankleR: 20 };
      ex.keyframes = [
      Seat('Sit', 'Sit near the front of the seat, feet flat.', {}, { phase: 'setup', camera: 30 }),
      Seat('Chair Eagle Pose', 'Cross one thigh over the other; wrap the arms, elbows up.', { ...cross, torso: [6, 0, 0], shoulderL: [100, -10, 0], elbowL: 95, shoulderR: [100, -10, 0], elbowR: 95 },
        { camera: 30, reach: [], plant: ['L'], touch: [{ point: 'ankleL', adjust: 'kneeL' }], durationMs: 2400 })]; },
    over: { ...SIDES, ...hold(30, 'Lift the elbows a little; keep both sitting bones on the seat.') },
    description: 'Sitting near the front of a chair, cross one thigh over the other and wrap your arms, crossing them at the elbows with the forearms up and the palms toward each other.',
    setup: ['Sit near the front of a sturdy chair, feet flat.'],
    cues: ['Thigh over thigh.', 'Elbows at shoulder height.', 'Sit tall and breathe.'], source: SRC.chairEagle },
  // ---------- inversions at the wall: the base poses, the heels resting on a wall behind (hands or forearms near it) ----------
  { id: 'wall-handstand', base: 'yoga-handstand', name: 'Handstand at the Wall', otherNames: ['Wall Handstand', 'Wall-Supported Handstand'],
    collections: ['Yoga'], equipment: ['Wall'], props: [{ type: 'wall', at: 'ankleR', keyframe: 1, offset: 6 }],
    // a little past vertical, so the heels rest on the wall
    edit: ex => { const k = ex.keyframes; k[1] = { ...k[1], anchor: 'handR', pose: { ...k[1].pose, root: [188, 0, 0] } }; },
    description: 'Handstand with a wall behind you: from Downward-Facing Dog with your hands a little way from the wall, kick up one leg at a time and rest your heels lightly on the wall, arms straight and strong.',
    setup: ['Hands shoulder-width apart, about a foot from the wall, fingers spread.', 'Come into Downward-Facing Dog facing the wall.'],
    cues: ['Push the floor away.', 'Heels touch the wall lightly.', 'Ribs in, legs strong.'], source: SRC.wallHandstand },
  { id: 'wall-headstand', base: 'yoga-headstand', name: 'Headstand at the Wall', otherNames: ['Wall Headstand', 'Supported Headstand at the Wall'],
    collections: ['Yoga'], equipment: ['Wall'], props: [{ type: 'wall', at: 'ankleR', keyframe: 1, offset: 6 }],
    edit: ex => { const k = ex.keyframes; k[1] = { ...k[1], pose: { ...k[1].pose, root: [186, 0, 0] } }; },
    description: 'Supported Headstand with a wall behind you: with your forearms down and fingers interlaced near the wall, lift your legs up and rest your heels on the wall, the weight mostly in your forearms.',
    setup: ['Forearms down, fingers interlaced, a hand\'s width or so from the wall.', 'Crown of the head on the floor, the back of the head against your hands.'],
    cues: ['Press the forearms down.', 'Shoulders lift away from your ears.', 'Heels rest on the wall lightly.'], source: SRC.wallHeadstand },
  { id: 'wall-forearm-stand', base: 'yoga-forearm-balance', name: 'Forearm Stand at the Wall', otherNames: ['Wall Forearm Stand', 'Pincha Mayurasana at the Wall'],
    collections: ['Yoga'], equipment: ['Wall'], props: [{ type: 'wall', at: 'ankleR', keyframe: 1, offset: 6 }],
    edit: ex => { const k = ex.keyframes; k[1] = { ...k[1], anchor: 'elbowR', pose: { ...k[1].pose, root: [190, 0, 0], shoulderL: [-170, 0, 0], shoulderR: [-170, 0, 0] } }; },
    description: 'Forearm Stand with a wall behind you: from Dolphin with your hands near the wall, walk your feet in, kick up one leg at a time and rest your heels on the wall.',
    setup: ['Forearms down, shoulder-width apart, hands near the wall.', 'Come into Dolphin and walk your feet in.'],
    cues: ['Shoulders over the elbows.', 'Press the forearms down.', 'Heels touch the wall lightly.'], source: SRC.wallForearmStand },
  // ---------- Pilates with a band ----------
  { id: 'band-hundred', base: 'pil-hundred', name: 'Band Hundred', otherNames: ['Banded Hundred'],
    collections: ['Pilates', 'Resistance band'], equipment: ['Resistance band'], props: [{ type: 'band', from: 'handL', via: ['footL', 'footR'], to: 'handR' }],
    description: 'The Hundred with a band looped round both feet and an end in each hand: head and shoulders curled up, legs long at an angle, pump the arms in small beats against the band.',
    setup: ['Lie on your back, a band round both feet, an end in each hand.', 'Legs up and long at about 45 degrees.'],
    cues: ['Breathe in for five beats, out for five.', 'Low back stays down.', 'Press the legs a little into the band.'], source: SRC.bandHundred },
  { id: 'band-leg-circles', base: 'pil-leg-circles', name: 'Band Leg Circles', otherNames: ['Banded Leg Circles', 'Resistance Band Leg Circles'],
    collections: ['Pilates', 'Resistance band'], equipment: ['Resistance band'], props: [{ type: 'band', from: 'handL', via: ['footR'], to: 'handR' }],
    // the hands hold the band's ends, just off the floor by the hips
    edit: ex => map(ex, k => ({ ...k, pose: { ...k.pose, shoulderL: [28, 0, 0], elbowL: 20, shoulderR: [28, 0, 0], elbowR: 20 } })),
    description: 'Leg Circles with a band looped round the lifted foot and an end in each hand: keeping the hips still, draw small circles with the straight leg against the band, then change direction.',
    setup: ['Lie on your back, one leg long on the floor.', 'Loop a band round the other foot, an end in each hand, and lift that leg up.'],
    cues: ['Hips still.', 'Small circles.', 'Keep the band taut.'], source: SRC.bandLegCircles },
  { id: 'band-roll-up', base: 'pil-roll-up', name: 'Roll-Up with a Band', otherNames: ['Assisted Roll-Up'],
    collections: ['Pilates', 'Resistance band'], equipment: ['Resistance band'], props: [{ type: 'band', from: 'handL', via: ['footL', 'footR'], to: 'handR' }],
    // the arms reach toward the feet holding the band all the way (not overhead)
    edit: ex => { const k = ex.keyframes, arms = (sh, el) => ({ shoulderL: [sh, 0, 0], elbowL: el, shoulderR: [sh, 0, 0], elbowR: el });
      k[0] = { ...k[0], name: 'Lie long', pose: { ...k[0].pose, ...arms(60, 0) } };
      k[2] = { ...k[2], pose: { ...k[2].pose, ...arms(150, 0) } }; },
    steps: [[null, 'Lie long, the band round your feet, arms reaching up.'], [null, null], ['Roll up', 'Roll up one bone at a time, the band helping you.']],
    description: 'The Roll-Up with a band looped round the feet and held in both hands: curl up one bone at a time, using the band to help, reach toward the feet, then roll back down slowly.',
    setup: ['Lie on your back, legs long, a band round both feet.', 'Hold an end in each hand, arms reaching up.'],
    cues: ['Chin in, roll up slowly.', 'Use the band only as much as you need.', 'Roll down one bone at a time.'], source: SRC.bandRollUp },
  // ---------- a block ----------
  { id: 'yoga-bound-angle-forward-bend-block', base: 'yoga-bound-angle-forward-bend', name: 'Supported Bound Angle Forward Fold', otherNames: ['Bound Angle Forward Fold with a Block'],
    collections: ['Yoga'], equipment: ['Yoga mat', 'Yoga block'], props: [{ type: 'block', z: 128, width: 27, depth: 41, height: 18 }],
    // the block lies flat in front of the feet; the forehead rests on it
    // (no Staff Pose step: the straight legs would lie over the block; start with the soles together)
    edit: ex => { const k = ex.keyframes; k[3] = { ...k[3], name: 'Rest on the block', cue: 'Fold forward and rest your forehead on the block.', pose: { ...k[3].pose, torso: [66, 0, 0] } };
      // (knees fitted, Sep 2026: feet flat, clear of the block)
      k[1] = { ...k[1], phase: 'setup', touch: k[1].touch.filter(t => t.point.startsWith('hand')), pose: { ...k[1].pose, hipL: [143.5, 25, 25], kneeL: 118, hipR: [143.5, 25, 25], kneeR: 118 } }; ex.keyframes = k.slice(1); ex.holdStep = 2; },
    description: 'Bound Angle Forward Fold with a yoga block lying flat in front of your feet: soles together, fold forward from the hips and rest your forehead on the block, letting the back soften.',
    setup: ['Sit with the soles of your feet together, knees open.', 'Set a block flat on the floor in front of your feet.'],
    cues: ['Fold from the hips.', 'Let your head rest.', 'Breathe into your back.'], source: SRC.supportedBoundAngle },
  // ---------- warm-ups ----------
  { id: 'chair-hip-circles', base: 'wu-hip-circles', name: 'Chair-Supported Hip Circles', otherNames: ['Standing Hip Circles with a Chair'],
    category: 'Mobility', collections: ['Warm-up', 'Chair-based'], equipment: ['Chair'], props: [{ type: 'chair', back: 'behind', z: 78 }],
    edit: ex => map(ex, k => { const p = { ...k.pose }; for (const j of ['shoulderL', 'shoulderR', 'elbowL', 'elbowR']) delete p[j];
      return { ...k, camera: 60, reach: [{ hand: 'handL', to: 'chair' }, { hand: 'handR', to: 'chair' }], pose: p }; }),
    description: 'Standing behind a chair with your hands on its back, circle your hips slowly: forward, to one side, back and to the other side.',
    setup: ['Stand behind a sturdy chair, hands on its back.', 'Feet shoulder-width apart, knees soft.'],
    cues: ['Big, slow circles.', 'Shoulders stay quiet.', 'Change direction halfway.'], source: SRC.chairHipCircles },
  { id: 'standing-march', base: 'wu-high-knees', name: 'Standing March', otherNames: ['Marching in Place', 'Standing Marches'],
    category: 'Cardio', focus: 'Hips, legs and balance', collections: ['Warm-up', 'Balance'], equipment: [],
    edit: ex => { const arms = (fwd) => ({ ['shoulder' + fwd]: [30, 0, 0], ['elbow' + fwd]: 80, ['shoulder' + (fwd === 'L' ? 'R' : 'L')]: [-15, 0, 0], ['elbow' + (fwd === 'L' ? 'R' : 'L')]: 80 });
      const still = { shoulderL: [0, 0, 0], elbowL: 80, shoulderR: [0, 0, 0], elbowR: 80 };
      ex.keyframes = [
        Stand('Stand tall', 'Feet hip-width apart, elbows bent.', still, { phase: 'setup', durationMs: 1200 }),
        Stand('Right knee up', 'Lift your right knee, left arm forward.', { hipR: [70, 0, 0], kneeR: 75, ...arms('L') }, { plant: ['L'], durationMs: 900, holdMs: 300 }),
        Stand('Down', 'Lower it with control.', still, { durationMs: 700 }),
        Stand('Left knee up', 'Lift your left knee, right arm forward.', { hipL: [70, 0, 0], kneeL: 75, ...arms('R') }, { anchor: 'ankleR', plant: ['R'], durationMs: 900, holdMs: 300 }),
        Stand('Down', 'Lower it with control.', still, { anchor: 'ankleR', durationMs: 700 })]; },
    over: { bilateral: null, measure: 'reps', holdStep: null, defaults: { reps: 10 }, repName: null, prescription: { reps: '10–20', note: 'Slow and steady; hold a chair or the wall for balance if you need to.' } },
    description: 'Standing tall, lift one knee toward hip height with the opposite arm swinging forward, lower it with control, then lift the other: a slow march in place.',
    setup: ['Stand tall, feet hip-width apart.', 'Elbows bent; a chair or wall nearby if you need balance.'],
    cues: ['Stand tall; don\'t lean back.', 'Lift and lower slowly.', 'Opposite arm, opposite knee.'], source: SRC.standingMarch },
];
