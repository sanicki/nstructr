/* One-off: convert exercise files from format v1 (2D, per-view angles) to v2 (3D joint angles), and compare the two
   engines' pictures. Uses a copy of the v1 engine kept in this folder only for the conversion.
     node tools/v1/convert.cjs [ids...]            compare only (prints the largest differences)
     node tools/v1/convert.cjs --write [ids...]    also rewrite library/exercises/<id>.json as v2
   How: the v1 engine resolves each step (touch, reach, keep, plant), the step-1 3D skeleton gives its body points
   in 3D, and the v2 angles are measured from those points (hips and shoulders: forward/side/turn; knees and elbows:
   bend). Where several angles give the same pose, the one closest to the v1 numbers is kept, so deliberate
   windings (540, -235) and the direction of every move carry over. */
const fs = require('fs'), path = require('path');
const C1 = require('./core-v1.cjs'), S3 = require('./skeleton3d-v1.cjs'), C2 = require('../../src/core.js');
const seg = C1.DEFAULT_SEGMENTS, seg2 = C2.DEFAULT_SEGMENTS;
const DIR = path.join(__dirname, '..', '..', 'library', 'exercises');
const args = process.argv.slice(2), WRITE = args.includes('--write'), only = args.filter(a => !a.startsWith('--'));
const r1 = x => Math.round(x * 10) / 10 + 0;
const sgn = s => (s === 'R' ? 1 : -1);

function convertPose(r, prev) {
  const p = r.pose, front = r.v >= 0.5;
  const out = {};
  // whole body and spine: one angle in the picture plane = lean forward (side) or sideways (front)
  for (const k of ['root', 'torso', 'chest', 'neck']) out[k] = front ? [0, -p[k], 0] : [p[k], 0, 0];
  const P3 = S3.pose3d(p, r.v, seg), F = {};
  C2.fk(C2.normPose(out), seg2, F);
  for (const s of ['L', 'R']) {
    const k = sgn(s);
    for (const [ball, hinge, tip, parent, arm, depth] of [['hip', 'knee', 'ankle', 'root', false, 'thighDepth'], ['shoulder', 'elbow', 'hand', 'chest', true, 'armDepth']]) {
      const B = ball + s, H = hinge + s;
      const mid = hinge === 'knee' ? 'knee' + s : 'elbow' + s;
      const u = C2.V3.sub(P3[mid], P3[B]), w = C2.V3.sub(P3[tip + s], P3[mid]);
      const Mp = F[parent];
      // what the v1 numbers would be as v2 numbers, if nothing turned out of the picture: the reference for windings
      // the bend: in the side view a v1 angle is the bend with the limb facing forward, and minus it turned round
      // the bend: v1's angle turns the lower segment around the camera's axis (x from the side, z from the front);
      // the hinge turns it around its own axis, which the limb's turn points either way. Same way round = same sign,
      // so a knee going from 360 to 180 swings over the top, as in v1, not down through the floor
      const bend = (t, f, a) => {
        const M = C2.mm(Mp, C2.ballM([f, a, t], s)), along = front ? M[6] : M[0];
        const same = (arm ? -along : along) >= 0;
        return same ? p[H] : -p[H];
      };
      const exp = front ? { ball: [p[depth + s] || 0, k * p[B], prev ? prev[B][2] : 0], bend }
        : { ball: [-p[B], k * (p[depth + s] || 0), prev ? prev[B][2] : 0], bend };
      if (prev) exp.flat = prev[B][0];
      const sol = C2.limbAngles(C2.mtv(Mp, u), C2.mtv(Mp, w), s, arm, exp);
      out[B] = sol.ball; out[H] = sol.bend;
    }
  }
  // ankles: measured from the foot's direction (front view: the forward-pointing 3D foot, see skeleton3d)
  const F2 = {}; C2.fk(C2.normPose(out), seg2, F2);
  for (const s of ['L', 'R']) {
    const fd = C2.V3.sub(P3['toe' + s], P3['ankle' + s]), f = C2.mtv(F2['knee' + s], fd);
    const val = Math.atan2(-f.y, f.z) * 180 / Math.PI;
    // front view: the 2D foot was a sideways stub that says nothing about where the toes point: a level foot
    out['ankle' + s] = front ? C2.flatAnkle(C2.normPose(out), s, seg2) : val + 360 * Math.round((p['ankle' + s] - val) / 360);
  }
  return out;
}
/* how far the converted pose's points are from the 3D points it came from */
function poseError(r, pose2) {
  const P3 = S3.pose3d(r.pose, r.v, seg), Q = C2.fk(C2.normPose(pose2), seg2);
  let worst = 0, at = '';
  for (const k of Object.keys(P3)) {
    if (/^(toe|foot)[LR]$/.test(k) || /^back[LR]$/.test(k) || !Q[k]) continue;
    const d = C2.V3.dist(P3[k], Q[k]); if (d > worst) { worst = d; at = k; }
  }
  return { worst, at };
}
const viewOf = ex => { const n = ex.keyframes.filter(k => k.view === 'front').length; return n > ex.keyframes.length / 2 ? 'front' : 'side'; };
function convertEnd(end, front) {           // a fixed spot {x, y} on the v1 stage -> {x, y, z} in the world
  if (!end || typeof end !== 'object') return end;
  return front ? { x: -end.x, y: end.y } : { z: end.x, y: end.y };
}
/* side view: the camera is on the figure's right, so v1's "toward you" (+x) is out to the side for a right limb but
   across the body for a left one. Authors meant the mirror image (both arms out to the sides), and the picture is
   the same either way, so a left limb's depth is read as "out to its own side" */
const outward = r => (r.v >= 0.5 ? r : { ...r, pose: { ...r.pose, ...Object.fromEntries(['thighDepthL', 'shinDepthL', 'armDepthL', 'forearmDepthL'].map(k => [k, -(r.pose[k] || 0)])) } });
function convertExercise(ex) {
  const R = C1.resolveSequence(ex.keyframes, seg, ex).map(outward);
  const out = { ...ex, version: 2 };
  delete out.facing; delete out.anchorX;
  const frontEx = viewOf(ex) === 'front';
  let prev = null;
  const errs = [];
  const poses = R.map(r => (prev = convertPose(r, prev)));
  // a straight limb can turn any way without changing the picture: in front view, give it the turn of the nearest
  // step where it bends (so a knee that bends out to the side doesn't swing round on the way)
  for (const [ball, hinge] of [['hipL', 'kneeL'], ['hipR', 'kneeR'], ['shoulderL', 'elbowL'], ['shoulderR', 'elbowR']]) {
    const bent = poses.map(p => Math.abs(((p[hinge] % 360) + 540) % 360 - 180) >= 3);
    if (!bent.some(Boolean)) continue;
    poses.forEach((p, i) => {
      if (bent[i] || R[i].v < 0.5) return;
      for (let d = 1; d < poses.length; d++) {
        const j = [(i + d) % poses.length, (i - d + poses.length) % poses.length].find(j => bent[j]);
        if (j != null) { const t = poses[j][ball][2]; p[ball][2] = t + 360 * Math.round((p[ball][2] - t) / 360); break; }
      }
    });
  }
  // Where the camera turns, v1 morphed between two unrelated sets of angles, and chose windings (270 for 90) to make
  // that morph look right. In 3D those are spins: take the short way round from the step before instead (moving the
  // rest of that camera's run by the same whole turns, so its own moves are unchanged), and bend hinges forward.
  if (R.some(r => r.v !== R[0].v)) {
    for (const j of C2.JOINT_KEYS) {
      const n = C2.BALL.has(j) ? 3 : 1;
      for (let c = 0; c < n; c++) {
        const get = p => (n === 3 ? p[j][c] : p[j]), set = (p, v) => { if (n === 3) p[j][c] = v; else p[j] = v; };
        if (n === 1 && !j.startsWith('ankle')) poses.forEach(p => { const w = ((get(p) % 360) + 540) % 360 - 180; set(p, w < -90 ? w + 360 : w); });
        let shift = 0;
        for (let i = 1; i < poses.length; i++) {
          if (R[i].v !== R[i - 1].v) { const v = get(poses[i]); shift = v + 360 * Math.round((get(poses[i - 1]) - v) / 360) - v; }
          if (n === 3 || j.startsWith('ankle')) set(poses[i], get(poses[i]) + shift);
        }
      }
    }
  }
  out.keyframes = ex.keyframes.map((kf, i) => {
    const r = R[i], front = r.v >= 0.5;
    const pose = poses[i];
    errs.push(poseError(r, pose));
    const k = { ...kf };
    delete k.view; delete k.layers; delete k.anchorX;
    // order the fields the way people read them
    const o = {};
    for (const f of ['name', 'cue', 'camera', 'durationMs', 'holdMs', 'ease', 'phase', 'quiet', 'anchor', 'anchorX', 'anchorZ', 'lift', 'plant', 'touch', 'reach', 'keep', 'guide', 'pose']) {
      if (f === 'camera') o.camera = front ? 0 : 90;
      else if (f === 'anchorX' || f === 'anchorZ') {
        const ax = kf.anchorX != null ? kf.anchorX : ex.anchorX;
        if (ax != null && ax !== 0) { if (front && f === 'anchorX') o.anchorX = -ax; if (!front && f === 'anchorZ') o.anchorZ = ax; }
      } else if (f === 'touch' && kf.touch) o.touch = kf.touch.map(t => {
        const j = t.adjust, ball = C2.BALL.has(j);
        return { ...t, adjust: ball && front ? j + '.side' : j };
      });
      else if (f === 'reach' && kf.reach) o.reach = kf.reach.map(rc => {
        const x = { hand: rc.hand, to: rc.to };
        // across the picture (depth) the hand stays where the v1 figure had it: at its own side, not on the target
        const P3 = S3.pose3d(r.pose, r.v, seg), across = P3[rc.to] ? (front ? P3[rc.hand].z - P3[rc.to].z : P3[rc.hand].x - P3[rc.to].x) : 0;
        const dx = front ? -(rc.dx || 0) : across, dz = front ? across : (rc.dx || 0);
        if (r1(dx)) x.dx = r1(dx);
        if (rc.dy) x.dy = -rc.dy;
        if (r1(dz)) x.dz = r1(dz);
        return x;
      });
      else if (f === 'pose') {
        const p = {};
        for (const j of C2.JOINT_KEYS) {
          const v = pose[j];
          if (Array.isArray(v)) { const a = v.map(r1); if (a.some(Boolean)) p[j] = a; }
          else if (r1(v)) p[j] = r1(v);
        }
        o.pose = p;
      } else if (k[f] !== undefined) o[f] = k[f];
    }
    for (const f of Object.keys(k)) if (!(f in o) && !['view', 'layers', 'anchorX'].includes(f)) o[f] = k[f];
    return o;
  });
  if (ex.props) out.props = ex.props.map(pr => {
    const p = { ...pr };
    if (['chair', 'bench', 'step'].includes(pr.type)) {
      p.z = pr.x; delete p.x;
      if (pr.back) p.back = pr.back === 'left' ? 'behind' : 'ahead';
    }
    if (pr.type === 'wall') {
      const beside = pr.view === 'front' || (!pr.view && frontEx);
      delete p.view;
      if (beside) { p.beside = true; if (pr.offset) p.offset = -pr.offset; if (pr.x != null) { p.x = -pr.x; } }
      else if (pr.x != null) { p.z = pr.x; delete p.x; }
    }
    if (pr.type === 'band' || pr.type === 'towel') { p.from = convertEnd(pr.from, frontEx); p.to = convertEnd(pr.to, frontEx); delete p.layer; }
    return p;
  });
  // file field order: keep the original order, with version first
  const ordered = {};
  for (const k of Object.keys(ex)) if (k in out) ordered[k] = out[k];
  if (!('version' in ordered)) Object.assign(ordered, { version: 2 });
  return { ex: ordered, errs };
}

/* ---------- compare the two engines, frame by frame ---------- */
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function moves(R, kfs) {
  const ph = C1.phaseInfo(kfs), pairs = [];
  for (let i = 1; i < R.length; i++) pairs.push([i - 1, i]);
  if (ph.rep.length > 1 || ph.setup.length) pairs.push([ph.end, ph.start]);
  if (!ph.setup.length && !ph.finish.length) pairs.push([R.length - 1, 0]);
  return [...new Map(pairs.map(p => [p.join('>'), p])).values()].filter(([a, b]) => a !== b);
}
const CMP = ['pelvis', 'spine', 'neckBase', 'head', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR'];
function compare(ex1, ex2) {
  const res = { rest: 0, restAt: '', move: 0, moveAt: '' };
  for (const side of ex1.bilateral ? ['L', 'R'] : ['L']) for (const dir of ex1.direction ? ['A', 'B'] : ['A']) {
    let k1 = ex1.keyframes, k2 = ex2.keyframes;
    if (dir === 'B') { k1 = C1.reverseReps(k1); k2 = C2.reverseReps(k2); }
    if (side === 'R') { k1 = k1.map(C1.mirrorKeyframe); k2 = k2.map(C2.mirrorKeyframe); }
    const R1 = C1.resolveSequence(k1, seg, ex1, side === 'R' ? C1.mirrorProps(ex1.props) : ex1.props);
    const R2 = C2.resolveSequence(k2, seg2, ex2, side === 'R' ? C2.mirrorProps(ex2.props) : ex2.props);
    for (const [ia, ib] of [...R1.map((_, i) => [i, i]), ...moves(R1, k1)]) {
      const rest = ia === ib;
      if (R1[ia].v !== R1[ib].v) continue;                 // v1 morphs between views, v2 turns the camera: not comparable
      for (let s = rest ? 60 : 1; s <= 60; s += 3) {
        const e = ease(s / 60);
        const f1 = C1.frameAt(R1[ia], R1[ib], e, seg), P1 = C1.fk(f1.pose, f1.v, seg, f1.pos.x, f1.pos.y);
        const f2 = C2.frameAt(R2[ia], R2[ib], e, seg2), Q = C2.project(C2.fkAt(f2.pose, seg2, f2.pos), f2.cam);
        for (const k of CMP) {
          const d = Math.hypot(P1[k].x - Q[k].x, P1[k].y - Q[k].y);
          if (rest && d > res.rest) { res.rest = d; res.restAt = `${side}${dir} step ${ia + 1} ${k}`; }
          if (!rest && d > res.move) { res.move = d; res.moveAt = `${side}${dir} ${ia + 1}>${ib + 1} e=${(s / 60).toFixed(2)} ${k}`; }
        }
      }
    }
  }
  return res;
}

module.exports = { convertExercise, compare };
if (require.main === module) {
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort().filter(f => !only.length || only.includes(f.replace('.json', '')));
const rows = [];
for (const f of files) {
  const ex1 = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  if (ex1.version === 2) { console.log(`${ex1.id}: already v2`); continue; }
  const { ex: ex2, errs } = convertExercise(ex1);
  const pe = errs.reduce((a, b) => (b.worst > a.worst ? b : a), { worst: 0 });
  const cmp = compare(ex1, ex2);
  rows.push({ id: ex1.id, pose: pe.worst, poseAt: pe.at, ...cmp });
  if (WRITE) fs.writeFileSync(path.join(DIR, f), JSON.stringify(ex2, null, 2) + '\n');
}
rows.sort((a, b) => Math.max(b.rest, b.move) - Math.max(a.rest, a.move));
for (const r of rows) console.log(`${r.id.padEnd(34)} pose ${r.pose.toFixed(2).padStart(6)}  rest ${r.rest.toFixed(1).padStart(6)} (${r.restAt})  move ${r.move.toFixed(1).padStart(6)} (${r.moveAt})`);
const bad = t => rows.filter(r => Math.max(r.rest, r.move) > t).length;
console.log(`${rows.length} exercises; differ by more than 2 px: ${bad(2)}, 5 px: ${bad(5)}, 15 px: ${bad(15)}`);
}
