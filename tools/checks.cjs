/* Animation checks for one exercise, run by tools/build.mjs (and CI) on every exercise, both sides and directions.
   Each check mirrors something a person would notice:
   - rest:    a held pose where the pinned point or a "touch" point isn't on the floor/surface, or a hand misses its reach
   - jump:    a body segment snapping round more than 20° in 1/60 of a move
   - planted: a hand/foot/knee resting in the same spot before and after a move that wanders during it */
const C = require('../src/core.js');
const seg = C.DEFAULT_SEGMENTS;
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
      const pos = C.place(r.pose, r.v, seg, r.rule), P = C.fk(r.pose, r.v, seg, pos.x, pos.y);
      const need = [...(k.anchor ? [[r.rule.anchor, 0]] : []), ...(k.touch || []).map(t => [t.point, t.gap || 0])];
      for (const [p, gap] of need) {
        const d = C.supportY(P[p].x) - P[p].y - gap;
        if (Math.abs(d) > tol.rest) issues.push({ kind: 'rest', px: Math.abs(d), msg: `${label} step ${i + 1} "${r.name}": ${p} ${d > 0 ? 'floats' : 'sinks'} ${Math.abs(d).toFixed(0)}px` });
      }
      for (const rc of k.reach || []) {
        let T;
        if (rc.to === 'wall') { const wx = R.walls.find(x => x != null); if (wx == null) continue; T = { x: wx, y: P[rc.hand].y }; }
        else if (rc.to === 'chair') { const g = C.chairGrip(); if (!g) continue; T = { x: g.x + (rc.dx || 0), y: g.y + (rc.dy || 0) }; }
        else T = { x: P[rc.to].x + (rc.dx || 0), y: P[rc.to].y + (rc.dy || 0) };
        const d = Math.hypot(P[rc.hand].x - T.x, P[rc.hand].y - T.y);
        if (d > tol.rest) issues.push({ kind: 'rest', px: d, msg: `${label} step ${i + 1} "${r.name}": ${rc.hand} misses ${rc.to} by ${d.toFixed(0)}px` });
      }
    });
    // moves
    for (const [ia, ib] of moves(R, kfs)) {
      const a = R[ia], b = R[ib], F = [];
      for (let s = 0; s <= 60; s++) { const f = C.frameAt(a, b, (b.ease === 'linear' ? s / 60 : ease(s / 60)), seg); F.push(C.fk(f.pose, f.v, seg, f.pos.x, f.pos.y)); }
      const where = `${label} "${a.name}" → "${b.name}"`;
      let worst = 0, wb = '';
      for (let s = 1; s < F.length; s++) for (const [p, q] of BONES) {
        const ang = P => Math.atan2(P[q].y - P[p].y, P[q].x - P[p].x);
        const l0 = Math.hypot(F[s - 1][q].x - F[s - 1][p].x, F[s - 1][q].y - F[s - 1][p].y);
        if (l0 < 12) continue;                                             // foreshortened: direction is meaningless
        let d = Math.abs(ang(F[s]) - ang(F[s - 1])) * 180 / Math.PI; if (d > 180) d = 360 - d;
        if (d > worst) { worst = d; wb = `${p}-${q}`; }
      }
      if (worst > 20) issues.push({ kind: 'jump', px: worst, msg: `${where}: ${wb} snaps ${worst.toFixed(0)}° in one frame` });
      for (const p of PLANTED) {
        const A = F[0][p], B = F[60][p];
        if (Math.hypot(A.x - B.x, A.y - B.y) > 2 || C.supportY(A.x) - A.y > 3) continue;
        let d = 0; for (const P of F) d = Math.max(d, Math.hypot(P[p].x - A.x, P[p].y - A.y));
        if (d > tol.planted) issues.push({ kind: 'planted', px: d, msg: `${where}: planted ${p} wanders ${d.toFixed(0)}px` });
      }
    }
  }
  return issues;
}
module.exports = { check };
