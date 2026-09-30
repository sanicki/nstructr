// Sources for batch 22: each exercise's own description, in our own words.
const note = 'Described in our own words. Stick-figure approximation.';
const S = (url, title) => ({ url, title, note });
const known = {
  towelHamstring: S('https://exrx.net/Stretches/Hamstrings/LyingTowel', 'ExRx: Lying Hamstring Stretch (towel)'),
  chairHamstring: S('https://exrx.net/Stretches/Hamstrings/SeatedChairSingleLeg', 'ExRx: Seated Single Leg Hamstring Stretch (chair)'),
  towelCalf: S('https://www.physitrack.com/exercise-library/how-to-perform-seated-calf-stretch', 'Physitrack: How to perform the seated calf stretch'),
  stepCalf: S('https://www.onepeloton.com/blog/best-calf-stretches', 'Peloton: The best calf stretches'),
  chairQuad: S('https://uk.physitrack.com/home-exercise-video/quads-stretch-using-chair', 'Physitrack: Quads stretch using chair'),
  towelQuad: S('https://library.theprehabguys.com/vimeo-video/prone-quad-stretch-strap/', '[P]rehab: Prone quad stretch with a strap'),
  chairHipFlexor: S('https://www.health.harvard.edu/healthy-aging-and-longevity/do-you-spend-most-of-your-day-sitting-these-hip-flexor-stretches-are-for-you', 'Harvard Health: Hip flexor stretches for people who sit a lot'),
  towelChest: S('https://www.ripple.sg/move/towel-chest-stretch', 'Ripple: Towel chest stretch'),
  chairHipCircles: S('https://www.onemedical.com/blog/exercise-fitness/hip-strengthening-exercises-for-seniors/', 'One Medical: Hip strengthening exercises for seniors'),
  standingMarch: S('https://www.physitrack.com/exercise-library/how-to-perform-the-standing-march-exercise', 'Physitrack: Step-by-step guide to the standing march'),
  chairWarrior1: S('https://www.tummee.com/yoga-poses/seated-warrior-pose-i-chair', 'Tummee: Seated Warrior Pose I, chair yoga'),
  chairWarrior2: S('https://georgewatts.org/lesson-planner/yoga_pilates_poses/chair-warrior-ii/', 'GeorgeWatts.org: How to teach Chair Warrior II'),
  seatedMountain: S('https://www.yogajournal.com/poses/chair-yoga-poses/', 'Yoga Journal: Chair yoga poses'),
  chairEagle: S('https://www.tummee.com/yoga-poses/garudasana-chair', 'Tummee: Eagle Pose, chair yoga'),
  wallHandstand: S('https://yogainternational.com/article/view/step-up-to-handstand/', 'Yoga International: Step up to Handstand'),
  wallHeadstand: S('https://yogaselection.com/headstand-preparation-kick-up-to-the-wall/', 'Yoga Selection: Headstand preparation at the wall'),
  wallForearmStand: S('https://liforme.com/blogs/blog/how-to-do-forearm-stand-pincha-mayurasana', 'Liforme: How to do Forearm Stand (Pincha Mayurasana)'),
  bandHundred: S('https://gravity.fitness/blogs/training/how-to-do-pilates-with-resistance-bands-a-complete-guide', 'Gravity Fitness: How to do Pilates with resistance bands'),
  bandLegCircles: S('https://gophysiotherapy.co.uk/pilates-with-resistance-band/', 'Go Physiotherapy: Pilates with a resistance band'),
  bandRollUp: S('https://complete-pilates.co.uk/pilates-roll-up/', 'Complete Pilates: How to do a Pilates Roll Up'),
  supportedBoundAngle: S('https://dorestorativeyoga.blogspot.com/2009/03/supported-bound-angle-forward-fold.html', 'Do Restorative Yoga: Supported Bound Angle Forward Fold'),
};
module.exports = new Proxy(known, { get: (o, k) => { if (!(k in o)) throw new Error(`batch-22-sources: no source for "${String(k)}"`); return o[k]; } });
