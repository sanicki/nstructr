/* Animation checks for one exercise, run by tools/build.mjs (and CI) on every exercise, both sides and directions.
   Each check mirrors something a person would notice (all in 3D, in px of the 400 px stage):
   - rest:    a held pose where the pinned point, the step's own anchor or a "touch" point isn't on the floor/surface,
              or a hand misses its reach
   - jump:    a body segment snapping round more than 20° in 1/60 of a move
   - planted: a hand/foot/knee resting in the same spot before and after a move that wanders during it
   - skid:    a foot on the floor at one end of a move only (lifting off, setting down) sliding along the floor */
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
  const tol = { rest: 7, planted: 6, skid: 12, ...(opts.tolerance || {}) };
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
        // a jump's "lift" is meant; a hanging step's anchor is held at its anchorY (a hand on a bar), not on the floor
        const d = k.anchorY != null && p === k.anchor ? P[p].y - k.anchorY : P[p].y - C.supportAt(P[p]) - gap - (pins.includes(p) ? (k.lift || 0) : 0);
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
    const ph = C.phaseInfo(kfs);
    for (const [ia, ib] of moves(R, kfs)) {
      // a travelling exercise's next rep carries on from where this one ended
      const b = R[ib], a = ex.travel && ia === ph.end && ib === ph.start ? C.travelStep(R[ia], b, seg) : R[ia], F = [];
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
      for (const s of ['L', 'R']) {
        const off = P => P['toe' + s].y - C.supportAt(P['toe' + s]) > 3 && P['ankle' + s].y - C.supportAt(P['ankle' + s]) > 3;
        if (off(F[0]) === off(F[60])) continue;
        // standing legs only: a seated, kneeling or lying foot may slide along the floor (Bound Angle, Pigeon)
        const G = off(F[0]) ? F[60] : F[0];
        if (G['hip' + s].y - C.supportAt(G['toe' + s]) < 120) continue;
        // how far the toe travels over the floor while it's still (or already) on it
        let skid = 0, prev = null;
        for (const P of F) {
          const T = P['toe' + s], on = T.y - C.supportAt(T) <= 3;
          if (on && prev) skid += Math.hypot(T.x - prev.x, T.z - prev.z);
          prev = on ? T : null;
        }
        if (skid > tol.skid) issues.push({ kind: 'skid', px: skid, msg: `${where}: toe${s} slides ${skid.toFixed(0)}px along the floor as the foot ${off(F[0]) ? 'sets down' : 'lifts'}` });
      }
    }
  }
  return issues;
}
module.exports = { check, versions, moves };
