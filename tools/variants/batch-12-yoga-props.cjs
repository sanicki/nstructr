// Batch 12 (new equipment: yoga block and strap, Sep 2026). A block is a small surface ({type: "block", x, z}: 41 high
// on end) the hand rests on (touch); a strap is drawn like the towel ({type: "strap", from, via, to}).
// node tools/research.cjs variants tools/variants/batch-12-yoga-props.cjs [id...]
const YJ = (slug, title) => ({ url: `https://www.yogajournal.com/${slug}/`, title: `Yoga Journal: ${title}` });
const BLOCKS = { url: 'https://www.doyogawithme.com/blog/how-use-blocks', title: 'DoYogaWithMe: How to use yoga blocks' };
const touchOn = (hand, adjust) => ({ point: hand, adjust });
module.exports = [
  { id: 'yoga-triangle-block', base: 'yoga-triangle', name: 'Triangle Pose with a Block', otherNames: ['Supported Triangle Pose'],
    collections: ['Yoga'], equipment: ['Yoga mat', 'Yoga block'], props: [{ type: 'block', x: 25, z: 3 }],
    edit: ex => { const k = ex.keyframes[1];
      Object.assign(k.pose, { torso: [0, 67.5, 0], shoulderR: [20, 85, 0] });
      k.touch = [...(k.touch || []), touchOn('handR', 'torso.side')]; k.cue = 'Hinge over the front leg and rest your lower hand on the block, top arm up.'; return ex; },
    description: 'Triangle Pose with the lower hand on a block outside the front foot, so you can keep both sides of the waist long and the chest open.',
    setup: ['Step your feet wide, front toes forward, back foot turned in slightly.', 'Stand a block on end just outside your front foot.'],
    cues: ['Lengthen out over the front leg before you tip down.', 'Press the hand lightly into the block.', 'Chest turns up to the ceiling.'], source: BLOCKS },
  { id: 'yoga-half-moon-block', base: 'yoga-half-moon', name: 'Half Moon Pose with a Block', otherNames: ['Supported Half Moon', 'Ardha Chandrasana with a Block'],
    collections: ['Yoga', 'Balance'], equipment: ['Yoga mat', 'Yoga block'], props: [{ type: 'block', x: 67, z: 0 }],
    edit: ex => { const k = ex.keyframes[1];
      Object.assign(k.pose, { torso: [0, 85, 0], shoulderR: [0, 75, 0] });            // the hand comes to the block's top
      k.touch = [...(k.touch || []), touchOn('handR', 'shoulderR.side')]; k.cue = 'Balance on the standing leg with your lower hand on the block, top leg level.'; return ex; },
    description: 'Half Moon Pose with the lower hand on a block in front of the standing foot, for steadier balance while the hips and chest open.',
    setup: ['Start in Triangle Pose.', 'Stand a block on end about a foot in front of your front foot.'],
    cues: ['Weight in the standing leg, not the hand.', 'Top leg level with your hip.', 'Stack the hips and open the chest.'],
    source: { url: 'https://www.huggermugger.com/blog/2015/half-moon-pose-block/', title: 'Hugger Mugger: Half Moon Pose with a block' } },
  { id: 'yoga-pyramid-blocks', base: 'yoga-pyramid', name: 'Pyramid Pose with Blocks', otherNames: ['Supported Pyramid Pose', 'Parsvottanasana with Blocks'],
    collections: ['Yoga'], equipment: ['Yoga mat', 'Yoga block'], props: [{ type: 'block', x: 28, z: 39 }, { type: 'block', x: -52, z: 39 }],
    edit: ex => { const k = ex.keyframes[1];
      k.pose = { ...k.pose, torso: [90, 0, 0], shoulderL: [85, 10, 0], shoulderR: [85, 10, 0] }; delete k.pose.elbowL; delete k.pose.elbowR;
      k.touch = [...(k.touch || []), touchOn('handR', 'shoulderR'), touchOn('handL', 'shoulderL')];
      k.cue = 'Fold over the front leg, a hand on a block either side of the front foot.'; return ex; },
    description: 'Pyramid Pose with a hand on a block either side of the front foot, so you can fold over the front leg with a long back.',
    setup: ['Stand with one foot about a leg\'s length in front of the other, hips square.', 'A block on end either side of the front foot.'],
    cues: ['Hips square to the front.', 'Fold from the hips with a long spine.', 'Press lightly into the blocks.'], source: BLOCKS },
  { id: 'yoga-seated-forward-bend-strap', base: 'yoga-seated-forward-bend', name: 'Seated Forward Bend with a Strap', otherNames: ['Paschimottanasana with a Strap', 'Strap Forward Fold'],
    collections: ['Yoga', 'Stretches'], equipment: ['Yoga mat', 'Yoga strap'], props: [{ type: 'strap', from: 'handL', via: ['footL', 'footR'], to: 'handR' }],
    edit: ex => { const k = ex.keyframes[1], s = ex.keyframes[0];
      // sitting tall, the hands already hold the strap in front (not on the floor behind)
      s.pose = { ...s.pose, shoulderL: [55, 0, 0], shoulderR: [55, 0, 0] }; delete s.touch; s.cue = 'Sit tall, legs straight, holding the strap round your feet.';
      k.pose = { ...k.pose, torso: [45, 0, 0], neck: [10, 0, 0], shoulderL: [100, 0, 0], shoulderR: [100, 0, 0] };
      k.cue = 'Hold the strap round your feet and fold forward from the hips, back long.'; return ex; },
    description: 'A seated forward bend with a strap looped round the soles of the feet, so you can fold from the hips with a long back instead of rounding to reach your toes.',
    setup: ['Sit with your legs straight out in front, a strap looped round the balls of both feet.', 'Hold an end of the strap in each hand.'],
    cues: ['Sit up tall before you fold.', 'Walk your hands down the strap as you lengthen.', 'Lead with the chest, not the head.'], source: YJ('practice/10-ways-to-use-blocks-to-advance-your-yoga-practice', 'Props for forward bends') },
  { id: 'yoga-reclining-hand-to-big-toe', base: 'mayo-knee-to-chest', name: 'Reclining Hand-to-Big-Toe Pose', otherNames: ['Supta Padangusthasana', 'Supine Hamstring Stretch with a Strap'],
    category: 'Stretch', focus: 'Hamstrings and calves', collections: ['Yoga', 'Stretches'], equipment: ['Yoga mat', 'Yoga strap'],
    props: [{ type: 'strap', from: 'handL', via: ['footL'], to: 'handR' }],
    edit: ex => { const k = ex.keyframes[1];
      delete k.reach;
      k.name = 'Reclining Hand-to-Big-Toe Pose';
      k.pose = { root: [-90, 0, 0], neck: [34, 0, 0], hipL: [85, 0, 0], kneeL: 0, ankleL: -10, shoulderL: [70, 0, 0], elbowL: 5, shoulderR: [70, 0, 0], elbowR: 5 };
      k.cue = 'Strap round the arch of your raised foot; straighten the leg up toward the ceiling.'; return ex; },
    over: { bilateral: { labels: { L: 'Left leg', R: 'Right leg' } } },
    steps: [['Lie on your back', 'Lie on your back, legs long.']],
    description: 'Lying on your back with a strap round the arch of one foot, straighten that leg up toward the ceiling to stretch the back of the leg, the other leg long on the floor.',
    setup: ['Lie on your back with your legs straight.', 'Loop a strap round the arch of one foot and hold an end in each hand.'],
    cues: ['Heel reaches up; other leg presses down.', 'Shoulders relaxed on the floor.', 'Walk your hands up the strap as the leg straightens.'], source: YJ('poses/reclining-big-toe-pose', 'Reclining Hand-to-Big-Toe Pose') },
];
