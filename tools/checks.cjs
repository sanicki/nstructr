/* Animation checks for one exercise, run by tools/build.mjs (and CI) on every exercise, both sides and directions.
   Each check mirrors something a person would notice (all in 3D, in px of the 400 px stage):
   - rest:    a held pose where the pinned point, the step's own anchor or a "touch" point isn't on the floor/surface,
              or a hand misses its reach
   - jump:    a body segment snapping round more than 20° in 1/60 of a move
   - planted: a hand/foot/knee resting in the same spot before and after a move that wanders during it */
const C = require('../src/core.js');
const seg = C.DEFAULT_SEGMENTS, V = C.V3;
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const PLANTED = ['ankleL', 'ankleR', 'toeL', 'toeR', 'handL', 'handR', 'kneeL', 'kneeR', 'elbowL', 'elbowR', 'pelvis', 'neckBase'];
const BONES = [['pelvis', 'neckBase'], ['neckBase', 'head'], ['hipL', 'kneeL'], ['kneeL', 'ankleL'], ['hipR', 'kneeR'], ['kneeR', 'ankleR'],
  ['shoulderL', 'elbowL'], ['elbowL', 'handL'], ['shoulderR', 'elbowR'], ['elbowR', 'handR']];

function versions(ex) {
  const out = [];
  for (const side of ex.bilateral ? ['L', 'R'] : ['L']) for (const dir of ex.direction ? ['A', 'B'] : ['A']) {
    let kfs = ex.keyframes;
    if (dir === 'B') kfs = C.reverseReps(kfs);
    if (side === 'R') kfs = kfs.map(C.mirrorKeyframe);
    const props = side === 'R' ? C.mirrorProps(ex.props) : ex.props;
    out.push({ label: `${side}${dir === 'B' ? '/reverse' : ''}`, R: C.resolveSequence(kfs, seg, ex, props), kfs });
  }
  return out;
}
/* the moves the app actually plays: through setup, the rep, finish, and the rep looping back on itself */
function moves(R, kfs) {
  const ph = C.phaseInfo(kfs), pairs = [];
  for (let i = 1; i < R.length; i++) pairs.push([i - 1, i]);
  if (ph.rep.length > 1 || ph.setup.length) pairs.push([ph.end, ph.start]);
  if (!ph.setup.length && !ph.finish.length) pairs.push([R.length - 1, 0]);
  return [...new Map(pairs.map(p => [p.join('>'), p])).values()].filter(([a, b]) => a !== b);
}
function check(ex, opts = {}) {
  const tol = { rest: 7, planted: 6, ...(opts.tolerance || {}) };
  const issues = [];
  for (const { label, R, kfs } of versions(ex)) {
    // held poses
    R.forEach((r, i) => {
      const k = kfs[i];
      C.frameAt(r, r, 1, seg);
      const P = C.fkAt(r.pose, seg, C.place(r.pose, seg, r.rule));
      // the point the engine pinned, and the step's own anchor too: a hand-off to another pin (e.g. feet that
      // stayed put) must not leave the anchor (a seated pelvis, say) floating off the floor
      const pins = [...new Set(k.anchor ? [r.rule.anchor, k.anchor] : [])];
      const need = [...pins.map(p => [p, 0]), ...(k.touch || []).map(t => [t.point, t.gap || 0])];
      for (const [p, gap] of need) {
        const d = P[p].y - C.supportAt(P[p]) - gap;
        if (Math.abs(d) > tol.rest) issues.push({ kind: 'rest', px: Math.abs(d), msg: `${label} step ${i + 1} "${r.name}": ${p} ${d > 0 ? 'floats' : 'sinks'} ${Math.abs(d).toFixed(0)}px` });
      }
      for (const rc of k.reach || []) {
        let T;
        const sh = P['shoulder' + rc.hand.slice(-1)];
        if (rc.to === 'wall') { const wl = R.walls.find(Boolean); if (!wl) continue; T = wl.axis === 'z' ? { x: P[rc.hand].x, y: P[rc.hand].y, z: wl.at } : { x: wl.at, y: P[rc.hand].y, z: P[rc.hand].z }; }
        else if (rc.to === 'chair') { const g = C.chairGrip(); if (!g) continue; T = { x: sh.x + (rc.dx || 0), y: g.y + (rc.dy || 0), z: g.z + (rc.dz || 0) }; }
        else T = V.add(P[rc.to], { x: rc.dx || 0, y: rc.dy || 0, z: rc.dz || 0 });
        const d = V.dist(P[rc.hand], T);
        if (d > tol.rest) issues.push({ kind: 'rest', px: d, msg: `${label} step ${i + 1} "${r.name}": ${rc.hand} misses ${rc.to} by ${d.toFixed(0)}px` });
      }
    });
    // moves
    for (const [ia, ib] of moves(R, kfs)) {
      const a = R[ia], b = R[ib], F = [];
      for (let s = 0; s <= 60; s++) { const f = C.frameAt(a, b, (b.ease === 'linear' ? s / 60 : ease(s / 60)), seg); F.push(C.fkAt(f.pose, seg, f.pos)); }
      const where = `${label} "${a.name}" → "${b.name}"`;
      let worst = 0, wb = '';
      for (let s = 1; s < F.length; s++) for (const [p, q] of BONES) {
        const u = V.unit(V.sub(F[s - 1][q], F[s - 1][p])), w = V.unit(V.sub(F[s][q], F[s][p]));
        const d = Math.acos(Math.max(-1, Math.min(1, V.dot(u, w)))) * 180 / Math.PI;
        if (d > worst) { worst = d; wb = `${p}-${q}`; }
      }
      if (worst > 20) issues.push({ kind: 'jump', px: worst, msg: `${where}: ${wb} snaps ${worst.toFixed(0)}° in one frame` });
      for (const p of PLANTED) {
        const A = F[0][p], B = F[60][p];
        if (V.dist(A, B) > 2 || A.y - C.supportAt(A) > 3) continue;
        let d = 0; for (const P of F) d = Math.max(d, V.dist(P[p], A));
        if (d > tol.planted) issues.push({ kind: 'planted', px: d, msg: `${where}: planted ${p} wanders ${d.toFixed(0)}px` });
      }
    }
  }
  return issues;
}
module.exports = { check, versions, moves };
