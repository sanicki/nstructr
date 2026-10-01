// Batch 26 (Oct 2026): stretches for the one muscle group nothing in the library stretched, biceps and forearms
// (tools/muscles.cjs), so a light full-body stretch can outline every group: the Standing Biceps Stretch (hands
// clasped behind the back, arms lifted) and the Wrist Flexor Stretch (arm out, the other hand eases the hand back).
// node tools/research.cjs variants tools/variants/batch-26-arm-stretches.cjs [id...]
const note = 'Described in our own words. Stick-figure approximation.';
const stand = { name: 'Stand tall', cue: 'Feet hip-width apart, shoulders relaxed.', durationMs: 1500, holdMs: 300, phase: 'setup', anchor: 'ankleL', plant: ['L', 'R'], pose: {} };
module.exports = [
  // hands together behind the back, arms straight, palms turned down, then the arms lift
  { id: 'str-biceps-stretch', base: 'str-triceps-stretch', name: 'Standing Biceps Stretch', otherNames: ['Biceps Stretch', 'Behind-the-Back Biceps Stretch'],
    category: 'Stretch', focus: 'Biceps, chest and shoulders', collections: ['Stretches'], equipment: [],
    edit: ex => {
      const k = (o) => ({ camera: 70, anchor: 'ankleL', plant: ['L', 'R'], reach: [{ hand: 'handL', to: 'handR' }], ...o });
      ex.keyframes = [{ ...stand, camera: 70 },
        k({ name: 'Clasp your hands', cue: 'Interlace your fingers behind you, arms straight, palms turned down.', durationMs: 1500, holdMs: 300, phase: 'setup',
          pose: { shoulderR: [-28, -12, 0], elbowR: 0 } }),
        k({ name: 'Standing Biceps Stretch', cue: 'Lift your arms behind you until you feel the stretch.', durationMs: 1800, holdMs: 5000, phase: 'rep',
          pose: { shoulderR: [-55, -10, 0], elbowR: 0, neck: [-5, 0, 0] } }),
        { ...stand, camera: 70, name: 'Release', cue: 'Lower your arms and let go.', phase: 'finish' }];
    },
    over: { bilateral: null, measure: 'time', holdStep: 2, defaults: { seconds: 30 },
      prescription: { reps: 'hold 30 seconds, 1–3 times', note: 'Lift only until you feel a gentle stretch in the fronts of the arms; stand tall rather than leaning forward.' } },
    description: 'With your fingers interlaced behind your back and your arms straight, turn your palms down and lift your arms behind you to stretch the fronts of the upper arms, the chest and the shoulders.',
    setup: ['Stand tall, feet hip-width apart.', 'Interlace your fingers behind you at the base of your spine.'],
    cues: ['Arms straight, palms down.', 'Chest up, shoulders down.', 'Lift gently; no bouncing.'],
    source: { url: 'https://www.healthline.com/health/bicep-stretch', title: 'Healthline: Bicep stretches (standing bicep stretch)', note } },
  // one arm straight out, palm up; the other hand eases the hand and fingers back toward the floor
  { id: 'str-wrist-flexor-stretch', base: 'str-triceps-stretch', name: 'Wrist Flexor Stretch', otherNames: ['Forearm Flexor Stretch', 'Forearm Stretch'],
    category: 'Stretch', focus: 'Forearms and wrists', collections: ['Stretches'], equipment: [],
    edit: ex => {
      const k = (o) => ({ camera: 50, anchor: 'ankleL', plant: ['L', 'R'], ...o });
      ex.keyframes = [{ ...stand, camera: 50 },
        k({ name: 'Arm out, palm up', cue: 'Right arm straight out in front, palm up.', durationMs: 1500, holdMs: 300, phase: 'setup',
          pose: { shoulderR: [88, -22, 0], elbowR: 0 } }),
        k({ name: 'Wrist Flexor Stretch', cue: 'With your left hand, ease your right fingers down and back.', durationMs: 1500, holdMs: 5000, phase: 'rep',
          reach: [{ hand: 'handL', to: 'handR' }], pose: { shoulderR: [88, -22, 0], elbowR: 0 } }),
        { ...stand, camera: 50, name: 'Release', cue: 'Let go and lower your arm.', phase: 'finish' }];
    },
    over: { bilateral: { labels: { L: 'Right arm', R: 'Left arm' } }, measure: 'time', holdStep: 2, defaults: { seconds: 20 },
      prescription: { reps: 'hold 15–30 seconds each arm, 2–3 times', note: 'Keep the elbow straight and pull gently: you should feel it along the inside of the forearm, not in the wrist joint.' } },
    description: 'With one arm straight out in front and the palm up, use the other hand to ease the fingers and hand back toward the floor, stretching the inside of the forearm.',
    setup: ['Stand or sit tall.', 'Hold one arm straight out in front of you at shoulder height, palm up.'],
    cues: ['Elbow straight.', 'Ease the fingers back gently.', 'Feel it along the inside of the forearm.'],
    source: { url: 'https://www.hingehealth.com/resources/articles/wrist-flexor-stretch/', title: 'Hinge Health: How to do a wrist flexor stretch',
      note: note + ' The figure has no wrists: it shows the arm and the other hand at the fingers; the cue says how to bend the hand back.' } },
];
