/* Range of motion (docs/3d-skeleton.md, "Joint model"): every step of every exercise (both sides, both directions,
   after touch/reach/keep are solved), compared with normal human range of motion and with what a flexible person
   reaches. v2 poses are joint angles, so this reads them directly. Informational for now: the build prints the summary.
     node tools/rom.cjs          (lists every joint past the flexible range) */
const fs = require('fs'), path = require('path');
const C = require('../src/core.js');
const { versions } = require('./checks.cjs');
const w = a => ((a % 360) + 540) % 360 - 180;
/* degrees; ball joints: forward, side (out +), turn (out +); hinges: bend. NORMAL: AAOS reference for typical adults.
   FLEXIBLE: what a trained, flexible person reaches (yoga, Pilates), with the pelvis and spine helping. */
const ROM = {
  normal: { hipForward: [-30, 120], hipSide: [-30, 45], hipTurn: [-40, 45], knee: [0, 135], shoulderForward: [-60, 180], shoulderSide: [-30, 180], shoulderTurn: [-70, 90], elbow: [0, 150] },
  flexible: { hipForward: [-60, 170], hipSide: [-45, 95], hipTurn: [-60, 90], knee: [-10, 165], shoulderForward: [-80, 190], shoulderSide: [-45, 190], shoulderTurn: [-90, 110], elbow: [-10, 170] }
};
function outOfRange(pose, which) {
  const L = ROM[which], out = [];
  const chk = (joint, v, [lo, hi]) => { if (v < lo - 0.5 || v > hi + 0.5) out.push({ joint, value: Math.round(v), range: [lo, hi] }); };
  for (const s of ['L', 'R']) {
    const h = pose['hip' + s], sh = pose['shoulder' + s];
    chk(`hip${s} forward`, w(h[0]), L.hipForward); chk(`hip${s} side`, w(h[1]), L.hipSide); chk(`hip${s} turn`, w(h[2]), L.hipTurn);
    chk(`knee${s}`, w(pose['knee' + s]), L.knee);
    // an arm overhead can be written as forward 180 or out to the side 180: judge the one that's in use
    chk(`shoulder${s} forward`, w(sh[0]) < -90 ? w(sh[0]) + 360 : w(sh[0]), L.shoulderForward);
    chk(`shoulder${s} side`, w(sh[1]) < -90 ? w(sh[1]) + 360 : w(sh[1]), L.shoulderSide); chk(`shoulder${s} turn`, w(sh[2]), L.shoulderTurn);
    chk(`elbow${s}`, w(pose['elbow' + s]), L.elbow);
  }
  return out;
}
module.exports = { ROM, outOfRange };
if (require.main === module) {
  const dir = path.join(__dirname, '..', 'library', 'exercises');
  const pastNormal = new Map(), pastFlexible = new Map();
  let steps = 0;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
    const ex = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const { label, R } of versions(ex)) R.forEach((r, i) => {
      steps++;
      for (const x of outOfRange(r.pose, 'normal')) { const j = x.joint.replace(/[LR](?= |$)/, ''); pastNormal.set(j, (pastNormal.get(j) || new Set()).add(ex.id)); }
      for (const x of outOfRange(r.pose, 'flexible')) { const key = `${ex.id}: ${x.joint} ${x.value}° (flexible range ${x.range[0]}…${x.range[1]})`; if (!pastFlexible.has(key)) pastFlexible.set(key, `${label} step ${i + 1}${r.name ? ` "${r.name}"` : ''}`); }
    });
  }
  const exs = new Set([...pastFlexible.keys()].map(k => k.split(':')[0]));
  console.log(`range of motion: ${steps} steps; past what a flexible person can do: ${pastFlexible.size} joints in ${exs.size} exercises (to fix; see docs/3d-skeleton.md)`);
  console.log(`  past normal range (AAOS), by joint: ${[...pastNormal].map(([j, set]) => `${j} ${set.size}`).join(', ') || 'none'} (exercises; expected for yoga and deep stretches)`);
  for (const [k, where] of pastFlexible) console.log(`  ${k}  (${where})`);
}
