/* 3D skeleton, step 1: for every step of every exercise (both sides, both directions), the 3D figure seen from the
   step's own view must be today's picture, point for point. Also reports, for the steps that tell the 2D engine which
   leg to draw behind ("layers"), whether the 3D depth already knows.
     node tools/check3d.cjs          (exit code 1 if any point is off by more than 0.01 px) */
const fs = require('fs'), path = require('path');
const C = require('../src/core.js'), S3 = require('../src/skeleton3d.js');
const seg = C.DEFAULT_SEGMENTS, dir = path.join(__dirname, '..', 'library', 'exercises');
let steps = 0, worst = { d: 0 }, layered = 0, agree = 0; const disagree = [], silent = [], bent = new Set(), pastNormal = new Map(), pastFlexible = new Map();
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
  const ex = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const side of ex.bilateral ? ['L', 'R'] : ['L']) for (const d of ex.direction ? ['A', 'B'] : ['A']) {
    let kfs = ex.keyframes;
    if (d === 'B') kfs = C.reverseReps(kfs);
    if (side === 'R') kfs = kfs.map(C.mirrorKeyframe);
    const R = C.resolveSequence(kfs, seg, ex, side === 'R' ? C.mirrorProps(ex.props) : ex.props);
    R.forEach((r, i) => {
      steps++;
      const P2 = C.fk(r.pose, r.v, seg, 0, 0), Q = S3.project(S3.pose3d(r.pose, r.v, seg), r.v >= 0.5 ? 0 : 90);
      for (const k of Object.keys(P2)) {
        if (r.v >= 0.5 && /^(toe|foot)[LR]$/.test(k)) continue;        // front-view feet: 2D stubs vs real 3D feet (see skeleton3d.js)
        const e = Math.hypot(P2[k].x - Q[k].x, P2[k].y - Q[k].y);
        if (e > worst.d) worst = { d: e, where: `${ex.id} ${side}${d} step ${i + 1} ${k}` };
      }
      // a limb that looks straight in 2D (knee/elbow at 0) but whose two halves turn toward the camera by different
      // amounts is bent in 3D: the 2D view hid it. Worth fixing before the conversion (v2 would show the bend)
      for (const s of ['L', 'R']) for (const [hinge, a, b] of [['knee', 'thighDepth', 'shinDepth'], ['elbow', 'armDepth', 'forearmDepth']])
        if (Math.abs(r.pose[hinge + s]) < 3 && Math.abs((r.pose[a + s] || 0) - (r.pose[b + s] || 0)) > 10) bent.add(`${ex.id} (${hinge}${s}${r.name ? `, "${r.name}"` : ''})`);
      // outside human range of motion (joint model: docs/3d-skeleton.md)
      const P3 = S3.pose3d(r.pose, r.v, seg);
      for (const x of S3.outOfRange(P3, 'normal')) { const j = x.joint.replace(/[LR](?= |$)/, ''); pastNormal.set(j, (pastNormal.get(j) || new Set()).add(ex.id)); }
      for (const x of S3.outOfRange(P3, 'flexible')) { const key = `${ex.id}: ${x.joint} ${x.value}° (flexible range ${x.range[0]}…${x.range[1]})`; if (!pastFlexible.has(key)) pastFlexible.set(key, `${side}${d} step ${i + 1}${r.name ? ` "${r.name}"` : ''}`); }
      if (r.layers && (r.layers.legL || r.layers.legR)) {
        layered++;
        const said = r.layers.legR ? (r.layers.legR === 'back' ? 'R' : 'L') : (r.layers.legL === 'back' ? 'L' : 'R');
        const b = S3.backLeg(r.pose, r.v, seg);
        if (b === said) agree++; else if (!b) silent.push(`${ex.id} ${side}${d} step ${i + 1} "${r.name}"`); else disagree.push(`${ex.id} ${side}${d} step ${i + 1} "${r.name}": layers say ${said} behind, 3D says ${b}`);
      }
    });
  }
}
console.log(`3D skeleton: ${steps} steps; largest difference from today's picture ${worst.d.toFixed(4)} px${worst.where ? ` (${worst.where})` : ''}`);
console.log(`"layers": ${layered} steps set which leg is behind: the pose's own depth agrees on ${agree}, contradicts ${disagree.length}, doesn't say on ${silent.length}`);
for (const x of disagree) console.log('  contradicts: ' + x);
for (const x of silent) console.log('  doesn\'t say: ' + x + ' (front view, no depth: v2 must write "the leg reaches back")');
console.log(`knee/elbow at 0° in 2D but bent in 3D: ${bent.size} (some intended, e.g. a bench-press elbow bending toward the camera; the rest to fix when converting to v2)`); for (const x of bent) console.log('  ' + x);
console.log(`past normal range of motion (AAOS), by joint: ${[...pastNormal].map(([j, set]) => `${j} ${set.size}`).join(', ') || 'none'} (exercises; expected for yoga and deep stretches)`);
console.log(`past what a flexible person can do: ${pastFlexible.size}`); for (const [k, w] of pastFlexible) console.log(`  ${k}  (${w})`);
process.exit(worst.d > 0.01 ? 1 : 0);
