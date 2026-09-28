/* ===== Pose math: nested-pendulum skeleton (forward kinematics, grounding, touch solver) ===== */
const W = 400, CX = 200, FLOOR = 360;
const DEFAULT_SEGMENTS = { torso: 100, neck: 14, head: 18, upperArm: 55, lowerArm: 50, thigh: 80, shin: 80, foot: 22, footFront: 12, shoulderHalf: 22, hipHalf: 12 };
const SHOULDER_DROP = 4;
const JOINTS = [
  ['root', 'Whole body'], ['torso', 'Lower back'], ['chest', 'Upper back'], ['neck', 'Head'],
  ['shoulderL', 'Left shoulder'], ['elbowL', 'Left elbow'],
  ['shoulderR', 'Right shoulder'], ['elbowR', 'Right elbow'],
  ['hipL', 'Left hip'], ['kneeL', 'Left knee'], ['ankleL', 'Left ankle'],
  ['hipR', 'Right hip'], ['kneeR', 'Right knee'], ['ankleR', 'Right ankle'],
  // arms turned toward or away from the camera: 0 = in the picture plane, ±90 = pointing straight at/away from you
  ['armDepthL', 'Left upper arm toward you'], ['forearmDepthL', 'Left forearm toward you'],
  ['armDepthR', 'Right upper arm toward you'], ['forearmDepthR', 'Right forearm toward you'],
  ['thighDepthL', 'Left thigh toward you'], ['shinDepthL', 'Left shin toward you'],
  ['thighDepthR', 'Right thigh toward you'], ['shinDepthR', 'Right shin toward you']
];
const JOINT_KEYS = JOINTS.map(j => j[0]);
const POINTS = ['pelvis', 'spine', 'neckBase', 'head', 'headTop', 'headLow', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'toeL', 'toeR', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR', 'footL', 'footR', 'armpitL', 'armpitR', 'backL', 'backR'];
/* every point that can rest on the floor: nothing in this list may sink below it */
const CONTACT_POINTS = ['pelvis', 'spine', 'neckBase', 'headLow', 'headTop', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'toeL', 'toeR',
  'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR'];

const lerp = (a, b, t) => a + (b - a) * t;
/* a segment turned toward the camera by `deg` shows only cos(deg) of its length (foreshortening) */
const depthScale = deg => Math.abs(Math.cos((deg || 0) * Math.PI / 180));
/* CSS rotate(θ) in SVG's y-down space: positive = clockwise on screen */
function rot(deg, x, y) { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [x * c - y * s, x * s + y * c]; }
const add = (p, v) => ({ x: p.x + v[0], y: p.y + v[1] });

/* v = 0 side view, 1 front view; values in between morph the figure as it turns */
function viewGeom(seg, v) {
  return {
    hx: { L: seg.hipHalf * v, R: -seg.hipHalf * v },
    sx: { L: seg.shoulderHalf * v, R: -seg.shoulderHalf * v },
    foot: { L: lerp(seg.foot, seg.footFront, v), R: lerp(seg.foot, -seg.footFront, v) }
  };
}

/* Mirrors the SVG group nesting exactly: each joint = translate(to joint) · rotate(angle) */
function fk(pose, v, seg, ox = 0, oy = 0) {
  const g = viewGeom(seg, v), P = {}, root = { x: ox, y: oy }, rr = pose.root;
  P.pelvis = root;
  for (const s of ['L', 'R']) {
    const hip = add(root, rot(rr, g.hx[s], 0));
    const a1 = rr + pose['hip' + s], knee = add(hip, rot(a1, 0, seg.thigh * depthScale(pose['thighDepth' + s])));
    const a2 = a1 + pose['knee' + s], ankle = add(knee, rot(a2, 0, seg.shin * depthScale(pose['shinDepth' + s])));
    const a3 = a2 + pose['ankle' + s], toe = add(ankle, rot(a3, g.foot[s], 0));
    Object.assign(P, { ['hip' + s]: hip, ['knee' + s]: knee, ['ankle' + s]: ankle, ['toe' + s]: toe,
      ['foot' + s]: { x: lerp(ankle.x, toe.x, 0.6), y: lerp(ankle.y, toe.y, 0.6) } });   // ball of the foot (where a band loops)
  }
  /* spine = two segments: lower back (torso) from the pelvis, upper back (chest) from mid-spine */
  const lower = seg.torso / 2, upper = seg.torso - lower;
  const at = rr + pose.torso;
  P.spine = add(root, rot(at, 0, -lower));
  const ac = at + pose.chest;
  P.neckBase = add(P.spine, rot(ac, 0, -upper));
  const an = ac + pose.neck;
  P.head = add(P.neckBase, rot(an, 0, -(seg.neck + seg.head)));
  P.headTop = add(P.neckBase, rot(an, 0, -(seg.neck + 2 * seg.head)));
  P.headLow = { x: P.head.x, y: P.head.y + seg.head };   // lowest point of the head circle, whatever its orientation
  for (const s of ['L', 'R']) {
    const sh = add(P.spine, rot(ac, g.sx[s], -upper + SHOULDER_DROP));
    const b1 = ac + pose['shoulder' + s], elbow = add(sh, rot(b1, 0, seg.upperArm * depthScale(pose['armDepth' + s])));
    const b2 = b1 + pose['elbow' + s], hand = add(elbow, rot(b2, 0, seg.lowerArm * depthScale(pose['forearmDepth' + s])));
    Object.assign(P, { ['shoulder' + s]: sh, ['elbow' + s]: elbow, ['hand' + s]: hand,
      // where equipment wraps the upper body: just under the shoulder, and across the shoulder blades behind the back
      // (the "behind" offset fades out in front view, where behind the back is straight into the picture)
      ['armpit' + s]: add(sh, rot(ac, 0, 12)),
      ['back' + s]: add(P.spine, rot(ac, -11 * (1 - v), -upper * 0.72)) });
  }
  return P;
}

/* ---------- Raised surfaces (chair seat, bench, step) ----------
   The "floor" under any point is the highest surface beneath it, or the floor itself. */
const SURFACE_TYPES = ['chair', 'bench', 'step'];
const SURFACE_DEFAULTS = { chair: { width: 70, height: 80, backHeight: 85 }, bench: { width: 200, height: 70 }, step: { width: 90, height: 30 } };
let SUPPORTS = [];
function surfacesFrom(props) {
  return (props || []).filter(p => SURFACE_TYPES.includes(p.type)).map(p => {
    const d = SURFACE_DEFAULTS[p.type], w = num(p.width) || d.width, h = num(p.height) || d.height, cx = CX + num(p.x);
    return { type: p.type, x0: cx - w / 2, x1: cx + w / 2, h, back: p.type === 'chair' ? (p.back || 'left') : null, backHeight: num(p.backHeight) || d.backHeight || 0 };
  });
}
function supportY(x) {
  let y = FLOOR;
  for (const s of SUPPORTS) if (x >= s.x0 - 2 && x <= s.x1 + 2) y = Math.min(y, FLOOR - s.h);
  return y;
}
/* the top of a chair's backrest: where hands rest when standing behind it */
function chairGrip() {
  const s = SUPPORTS.find(k => k.type === 'chair');
  return s ? { x: s.back === 'left' ? s.x0 : s.x1, y: FLOOR - s.h - s.backHeight } : null;
}
/* outline of each surface, for drawing */
function surfaceShapes(sup = SUPPORTS) {
  return sup.map(s => {
    const top = FLOOR - s.h, f = FLOOR + 7;
    if (s.type === 'step') return { solid: true, d: `M${s.x0} ${f}L${s.x0} ${top}L${s.x1} ${top}L${s.x1} ${f}Z` };
    let d = `M${s.x0} ${top}L${s.x1} ${top}M${s.x0 + 5} ${top}L${s.x0 + 5} ${f}M${s.x1 - 5} ${top}L${s.x1 - 5} ${f}`;
    if (s.type === 'chair') { const bx = s.back === 'left' ? s.x0 : s.x1; d += `M${bx} ${top}L${bx} ${top - s.backHeight}`; }
    return { solid: false, d };
  });
}

/* Where the pelvis must sit so the figure touches the floor (or pins an anchor point) */
function place(pose, v, seg, rule, keepOffFloor = true) {
  const P = fk(pose, v, seg);
  if (rule.anchor && P[rule.anchor]) {
    const a = P[rule.anchor], ax = CX + (rule.anchorX || 0);
    const tx = ax - a.x, ty = supportY(ax) - a.y;
    // pin the anchor to whatever it rests on, unless that would push another body part through a surface
    let pen = 0;
    if (keepOffFloor) for (const k of CONTACT_POINTS) pen = Math.max(pen, P[k].y + ty - supportY(P[k].x + tx));
    return { x: tx, y: ty - pen };
  }
  const x = CX + (rule.anchorX || 0);
  let y = Infinity;
  for (const k of CONTACT_POINTS) y = Math.min(y, supportY(P[k].x + x) - P[k].y);
  return { x, y: y - (rule.lift || 0) };
}

/* Final floor constraint used during playback: the lowest body point always rests on the floor (minus any lift) */
function groundY(pose, v, seg, x, y, lift = 0) {
  const P = fk(pose, v, seg, x, y);
  let pen = -Infinity;
  for (const k of CONTACT_POINTS) pen = Math.max(pen, P[k].y - supportY(P[k].x));
  return y - pen - lift;
}

/* During a transition a free limb can swing through the floor. Instead of lifting the whole body,
   turn just that limb at its root joint (the smallest turn that clears the floor). Anchored limbs are left alone. */
const SLIDE_CHAINS = [
  { s: 'L', root: 'hip', mid: 'knee', tip: 'ankle', l1: 'thigh', l2: 'shin' }, { s: 'R', root: 'hip', mid: 'knee', tip: 'ankle', l1: 'thigh', l2: 'shin' },
  { s: 'L', root: 'shoulder', mid: 'elbow', tip: 'hand', l1: 'upperArm', l2: 'lowerArm' }, { s: 'R', root: 'shoulder', mid: 'elbow', tip: 'hand', l1: 'upperArm', l2: 'lowerArm' }
];
const absAngle = (dx, dy) => Math.atan2(-dx, dy) * 180 / Math.PI;           // angle of a limb pointing along (dx, dy)
const nearest = (val, ref) => val + 360 * Math.round((ref - val) / 360);     // same angle, written closest to ref
function slideContacts(a, b, e, pose, v, seg, pos, pinned = [a.rule.anchor, b.rule.anchor]) {
  const A = fk(a.pose, a.v, seg, ...Object.values(place(a.pose, a.v, seg, a.rule, false)));
  const B = fk(b.pose, b.v, seg, ...Object.values(place(b.pose, b.v, seg, b.rule, false)));
  for (const ch of SLIDE_CHAINS) {
    const tip = ch.tip + ch.s;
    if (pinned.includes(tip)) continue;                                      // pinned limbs are placed by the anchor
    if (a.v !== b.v && ch.root === 'hip') continue;                          // legs don't step while the camera turns between views
    const sa = supportY(A[tip].x), sb = supportY(B[tip].x);
    if (sa - A[tip].y > 3 || sb - B[tip].y > 3) continue;                 // only limbs resting on a surface at both ends
    if (Math.abs(b.pose[ch.mid + ch.s] - a.pose[ch.mid + ch.s]) > 160) continue;   // a leg folding right over swings, it doesn't step
    // a foot or hand that has somewhere to go is lifted and set down again (a step), not dragged along the floor
    const travel = Math.abs(B[tip].x - A[tip].x);
    const climb = Math.abs(sa - sb);                                       // stepping up or down: clear the edge
    const arc = (travel > 15 || climb > 3 ? Math.max(Math.min(35, travel * 0.35), climb ? climb + 14 : 0) : 0) * Math.sin(Math.PI * e);
    // fade the slide in and out so the limb meets both keyframes exactly
    solveTwoBone(pose, v, seg, pos, ch, { x: lerp(A[tip].x, B[tip].x, e), y: lerp(sa, sb, e) - arc }, Math.min(1, 4 * e * (1 - e)), bendOf(a, b, pose, ch.mid + ch.s));
  }
}

function solveTwoBone(pose, v, seg, pos, ch, T, weight = 1, bend = 0, fade = true) {
  if (ch.root === 'shoulder' && (depthScale(pose['armDepth' + ch.s]) < 0.99 || depthScale(pose['forearmDepth' + ch.s]) < 0.99)) return false;
  if (ch.root === 'hip' && (depthScale(pose['thighDepth' + ch.s]) < 0.99 || depthScale(pose['shinDepth' + ch.s]) < 0.99)) return false;
  const P = fk(pose, v, seg, pos.x, pos.y);
  const root = ch.root + ch.s, mid = ch.mid + ch.s;
  const J = P[root];
  const L1 = seg[ch.l1], L2 = seg[ch.l2];
  let dx = T.x - J.x, dy = T.y - J.y, d = Math.hypot(dx, dy);
  if (d > L1 + L2 - 0.01) { const k = (L1 + L2 - 0.01) / d; dx *= k; dy *= k; d = L1 + L2 - 0.01; }
  // near a full fold the limb's direction is undefined: ease the correction out instead of switching it off
  const fold = Math.abs(L1 - L2) + 0.5;
  if (d < fold + 0.01) return false;
  const w = fade ? weight * Math.min(1, (d - fold) / 20) : weight;
  const along = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - along * along));
  const base = ch.root === 'hip' ? pose.root : pose.root + pose.torso + pose.chest;
  // of the two knee/elbow positions, take the one closest to where the limb already is (so it never flips)
  let pick = null;
  for (const side of [1, -1]) {
    const K = { x: J.x + along * dx / d - side * h * dy / d, y: J.y + along * dy / d + side * h * dx / d };
    const t1 = absAngle(K.x - J.x, K.y - J.y), t2 = absAngle(J.x + dx - K.x, J.y + dy - K.y);
    const r = nearest(t1 - base, pose[root]), m = nearest(t2 - t1, pose[mid]);
    const rel = ((t2 - t1) % 360 + 540) % 360 - 180;
    // a knee or elbow keeps bending the way it bends at both ends of the move; otherwise stay closest to the current limb
    const cost = bend ? (Math.sign(rel) === bend ? 0 : 1e6) + Math.abs(r - pose[root]) : Math.abs(r - pose[root]) + Math.abs(m - pose[mid]);
    if (!pick || cost < pick.cost) pick = { r, m, cost };
  }
  const oldMid = pose[mid];
  pose[root] = lerp(pose[root], pick.r, w);
  pose[mid] = lerp(oldMid, pick.m, w);
  if (ch.root === 'hip') pose['ankle' + ch.s] += oldMid - pose[mid];   // keep the foot's angle to the floor
  return true;
}
function bendOf(a, b, pose, mid) {
  const sgn = x => (Math.abs(x) > 5 && Math.abs(x) < 170 ? Math.sign(x) : 0);
  const rel = x => ((x % 360) + 540) % 360 - 180;
  const sa = sgn(rel(a.pose[mid])), sb = sgn(rel(b.pose[mid]));
  if (sa && sb && sa === sb) return sa;
  if (sa || sb) return sa || sb;
  // limb straight at both ends: bend it the natural way - knees forward and elbows back when seen from the side,
  // knees and elbows outward when seen from the front
  const side = mid.slice(-1), leg = mid.startsWith('knee');
  if (b.v < 0.5) return leg ? 1 : -1;               // decided once per move (by the view it ends in), never mid-move
  return side === 'L' ? 1 : -1;
}
function clampTips(a, b, pose, v, seg, pos, pinned = [a.rule.anchor, b.rule.anchor]) {
  // a knee that would sink turns the thigh just enough to rest on the floor (whichever side of the hip it already is)
  for (const s of ['L', 'R']) {
    if (pinned.includes('knee' + s) || a.v !== b.v || depthScale(pose['thighDepth' + s]) < 0.99) continue;   // not while the camera turns
    const P = fk(pose, v, seg, pos.x, pos.y);
    if (P['knee' + s].y <= supportY(P['knee' + s].x) + 0.5) continue;
    const H = P['hip' + s], dy = supportY(P['knee' + s].x) - H.y;
    if (dy < 0 || dy > seg.thigh) continue;
    const side = Math.sign(P['knee' + s].x - H.x) || 1;
    const dx = side * Math.sqrt(seg.thigh * seg.thigh - dy * dy);
    const oldHip = pose['hip' + s];
    pose['hip' + s] = nearest(absAngle(dx, dy) - pose.root, oldHip);
    pose['knee' + s] -= pose['hip' + s] - oldHip;                        // the shin keeps its direction
  }
  for (const ch of SLIDE_CHAINS) {
    const tip = ch.tip + ch.s;
    if (pinned.includes(tip)) continue;
    const P = fk(pose, v, seg, pos.x, pos.y);
    if (P[tip].y <= supportY(P[tip].x) + 0.5) continue;
    solveTwoBone(pose, v, seg, pos, ch, { x: P[tip].x, y: supportY(P[tip].x) }, 1, bendOf(a, b, pose, ch.mid + ch.s));
  }
}

const PIN_CACHE = new WeakMap();
function sharedPin(a, b, seg) {
  let m = PIN_CACHE.get(a); if (!m) PIN_CACHE.set(a, (m = new Map()));
  if (m.has(b)) return m.get(b);
  let rule = null;
  const pa = place(a.pose, a.v, seg, a.rule), A = fk(a.pose, a.v, seg, pa.x, pa.y);
  const pb = place(b.pose, b.v, seg, b.rule), B = fk(b.pose, b.v, seg, pb.x, pb.y);
  const same = k => k && A[k] && B[k] && Math.hypot(A[k].x - B[k].x, A[k].y - B[k].y) < 2 && supportY(A[k].x) - A[k].y <= 3;
  // same pin name but a different spot (the foot that was on the step is now on the floor) doesn't count as staying put
  if (!(a.rule.anchor === b.rule.anchor && same(a.rule.anchor))) {
    if (same(b.rule.anchor)) rule = b.rule; else if (same(a.rule.anchor)) rule = a.rule;
    else {
      // neither step's own pin stays put, but something else does (the foot that stays on the floor while
      // the other steps down): pin that for the whole move
      const k = ['ankleL', 'ankleR', 'handL', 'handR', 'kneeL', 'kneeR', 'pelvis', 'elbowL', 'elbowR', 'neckBase', 'toeL', 'toeR'].find(same);
      if (k) rule = { anchor: k, anchorX: A[k].x - CX, lift: 0 };
    }
  }
  m.set(b, rule);
  return rule;
}

/* One playback frame: blend two resolved keyframes at eased progress e and return the pose and pelvis position */
function frameAt(a, b, e, seg) {
  SUPPORTS = b.supports || a.supports || [];
  const pose = {};
  // joints turn exactly as authored (a keyframe's angle may be written as e.g. -270 instead of 90 to pick the direction)
  for (const k of JOINT_KEYS) pose[k] = lerp(a.pose[k], b.pose[k], e);
  const v = lerp(a.v, b.v, e);
  // if one step's pin is also resting at the same spot in the other step, use it for the whole move (no sliding)
  const rule = sharedPin(a, b, seg);
  const pa = place(pose, v, seg, rule || a.rule, false), pb = place(pose, v, seg, rule || b.rule, false);
  const pos = { x: lerp(pa.x, pb.x, e), y: lerp(pa.y, pb.y, e) };
  const lift = lerp(a.rule.lift, b.rule.lift, e);
  // a foot or hand that is on the floor at both ends of the move slides along it (two-bone IK), instead of
  // swinging through the floor
  // the points actually held still during this move
  const pinned = rule ? [rule.anchor] : [a.rule.anchor, b.rule.anchor];
  if (e > 0 && e < 1) slideContacts(a, b, e, pose, v, seg, pos, pinned);
  // a hand or foot that would dip into the floor is held on the floor surface at the same spot (two-bone IK),
  // so the rest of the body - a seated pelvis, a planted hand - doesn't get pushed up
  if (e > 0 && e < 1) clampTips(a, b, pose, v, seg, pos, pinned);
  // a foot that tips its toes into the floor flexes at the ankle instead of pushing the body up
  if (e > 0 && e < 1) {
    for (const s of ['L', 'R']) {
      const P = fk(pose, v, seg, pos.x, pos.y);
      if (P['toe' + s].y <= supportY(P['toe' + s].x) + 0.5 || P['ankle' + s].y > supportY(P['ankle' + s].x) + 0.5) continue;
      const a0 = pose['ankle' + s];
      let best = a0;
      for (let d = 0.5; d <= 120; d += 0.5) {
        let hit = false;
        for (const sg of [1, -1]) {
          pose['ankle' + s] = a0 + sg * d;
          const Q = fk(pose, v, seg, pos.x, pos.y)['toe' + s];
          if (Q.y <= supportY(Q.x) + 0.5) { best = pose['ankle' + s]; hit = true; break; }
        }
        if (hit) break;
      }
      pose['ankle' + s] = best;
    }
  }
  // anything still below the floor mid-move lifts the whole body smoothly
  pos.y = groundY(pose, v, seg, pos.x, pos.y, lift);
  return { pose, v, pos };
}

function flatAnkle(pose, s) { return -(pose.root + pose['hip' + s] + pose['knee' + s]); }

/* 1-D solver: turn one joint until a point lands on the floor, nearest to the authored angle */
function solveTouch(pose, v, seg, rule, t, applyPlant) {
  const f = th => {
    pose[t.adjust] = th; applyPlant();
    const pos = place(pose, v, seg, rule, false);   // raw anchor pin, so the solver sees the true height
    const Q = fk(pose, v, seg, pos.x, pos.y)[t.point];
    return Q.y - (supportY(Q.x) - (t.gap || 0));
  };
  const a0 = pose[t.adjust];
  let best = a0, bestAbs = Infinity, prevTh = null, prevF = null;
  const brackets = [];
  for (let d = -80; d <= 80; d += 1) {
    const th = a0 + d, y = f(th);
    if (Math.abs(y) < bestAbs) { bestAbs = Math.abs(y); best = th; }
    if (prevF !== null && Math.sign(y) !== Math.sign(prevF)) brackets.push([prevTh, th]);
    prevTh = th; prevF = y;
  }
  if (brackets.length) {
    brackets.sort((p, q) => Math.abs(p[0] - a0) - Math.abs(q[0] - a0));
    let [lo, hi] = brackets[0], flo = f(lo);
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2, fm = f(mid);
      if (Math.sign(fm) === Math.sign(flo)) { lo = mid; flo = fm; } else hi = mid;
    }
    best = (lo + hi) / 2;
  }
  pose[t.adjust] = best; applyPlant();
  return best;
}

const num = x => (typeof x === 'number' && isFinite(x) ? x : 0);

function resolveKeyframe(kf, seg, ex = {}) {
  const pose = Object.fromEntries(JOINT_KEYS.map(k => [k, num(kf.pose && kf.pose[k])]));
  const v = kf.view === 'front' ? 1 : 0;
  const plant = kf.plant || [];
  const auto = new Set();
  const applyPlant = () => { for (const s of plant) { pose['ankle' + s] = flatAnkle(pose, s); auto.add('ankle' + s); } };
  applyPlant();
  const rule = { anchor: kf.anchor || null, anchorX: kf.anchorX != null ? num(kf.anchorX) : num(ex.anchorX), lift: num(kf.lift) };
  const misses = [];
  for (const t of (kf.touch || [])) { solveTouch(pose, v, seg, rule, t, applyPlant); auto.add(t.adjust); }
  // reach: put a hand on another body part (hold the ankle, hand on the knee...) with two-bone IK
  for (const r of (kf.reach || [])) {
    if (typeof r.to !== 'string' || r.to === 'wall' || r.to === 'chair') continue;
    const pos = place(pose, v, seg, rule), P = fk(pose, v, seg, pos.x, pos.y);
    solveReach(pose, v, seg, rule, r, { x: P[r.to].x + num(r.dx), y: P[r.to].y + num(r.dy) });
    auto.add('shoulder' + r.hand.slice(-1)); auto.add('elbow' + r.hand.slice(-1));
  }
  for (const t of (kf.touch || [])) {
    const pos = place(pose, v, seg, rule, false), Q = fk(pose, v, seg, pos.x, pos.y)[t.point], gap = supportY(Q.x) - Q.y - (t.gap || 0);
    if (Math.abs(gap) > 2) misses.push({ point: t.point, adjust: t.adjust, gap });
  }
  return {
    pose, v, rule, auto, misses, touch: kf.touch || [], reach: kf.reach || [], ease: kf.ease || 'smooth', guide: kf.guide || null, layers: kf.layers || null, name: kf.name || '', cue: kf.cue || '', quiet: !!kf.quiet,
    dur: kf.durationMs == null ? 1000 : Math.max(0, num(kf.durationMs)), hold: Math.max(0, kf.holdMs == null ? 500 : num(kf.holdMs))
  };
}

/* ---------- Equipment (props) ---------- */
const PROP_TYPES = ['band', 'towel', 'wall', 'chair', 'bench', 'step', 'dumbbell', 'kettlebell', 'barbell'];
const WEIGHT_TYPES = ['dumbbell', 'kettlebell', 'barbell'];
/* Hand-held weights, drawn where the hands are. A dumbbell's "axis" is its bar direction relative to the body:
   "lr" left-right (the usual grip), "fb" front-back (neutral grip), "ud" up-down (held upright, like a goblet squat).
   From the side an lr bar points straight at you (you see the end), from the front an fb bar does. */
function weightSVG(pr, P, v, X = x => x) {
  const f = n => n.toFixed(1);
  if (pr.type === 'dumbbell') {
    const h = P[pr.hand]; if (!h) return '';
    const axis = pr.axis || 'lr', side = v < 0.5;
    const end = (axis === 'lr' && side) || (axis === 'fb' && !side);
    if (end) return `<circle class="wt" cx="${f(X(h.x))}" cy="${f(h.y)}" r="9"/><circle class="wt-hub" cx="${f(X(h.x))}" cy="${f(h.y)}" r="3"/>`;
    const vert = axis === 'ud', dx = vert ? 0 : 15, dy = vert ? 15 : 0;
    const plate = (x, y) => vert ? `<rect class="wt" x="${f(X(x) - 8)}" y="${f(y - 3)}" width="16" height="6" rx="2"/>` : `<rect class="wt" x="${f(X(x) - 3)}" y="${f(y - 8)}" width="6" height="16" rx="2"/>`;
    return `<line class="wt-bar" x1="${f(X(h.x - dx))}" y1="${f(h.y - dy)}" x2="${f(X(h.x + dx))}" y2="${f(h.y + dy)}"/>${plate(h.x - dx, h.y - dy)}${plate(h.x + dx, h.y + dy)}`;
  }
  if (pr.type === 'kettlebell') {
    const hands = (pr.hands || [pr.hand]).map(k => P[k]).filter(Boolean); if (!hands.length) return '';
    const hx = hands.reduce((s, p) => s + p.x, 0) / hands.length, hy = hands.reduce((s, p) => s + p.y, 0) / hands.length;
    const el = pr.hands ? P['elbow' + pr.hands[0].slice(-1)] : P['elbow' + pr.hand.slice(-1)];
    let ux = 0, uy = 1;
    if (el) { const d = Math.hypot(hx - el.x, hy - el.y) || 1; ux = (hx - el.x) / d; uy = (hy - el.y) / d; }
    const bx = hx + ux * 15, by = hy + uy * 15;               // the bell hangs on, in line with the forearm
    return `<line class="wt-bar" x1="${f(X(hx))}" y1="${f(hy)}" x2="${f(X(bx))}" y2="${f(by)}"/><circle class="wt" cx="${f(X(bx))}" cy="${f(by)}" r="11"/>`;
  }
  if (pr.type === 'barbell') {
    const a = P[pr.from], b = P[pr.to]; if (!a || !b) return '';
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (v < 0.5) return `<circle class="wt" cx="${f(X(mx))}" cy="${f(my)}" r="20"/><circle class="wt-hub" cx="${f(X(mx))}" cy="${f(my)}" r="4"/>`;
    const half = Math.max(Math.abs(b.x - a.x) / 2 + 45, 90);
    return `<line class="wt-bar" x1="${f(X(mx - half))}" y1="${f(my)}" x2="${f(X(mx + half))}" y2="${f(my)}"/>` +
      `<rect class="wt" x="${f(X(mx - half + 6) - 4)}" y="${f(my - 20)}" width="8" height="40" rx="2"/><rect class="wt" x="${f(X(mx + half - 6) - 4)}" y="${f(my - 20)}" width="8" height="40" rx="2"/>`;
  }
  return '';
}
function mirrorProps(props) {
  const sw = e => (typeof e === 'string' ? swapSide(e) : e);
  return (props || []).map(pr => ({ ...pr, from: sw(pr.from), to: sw(pr.to), at: sw(pr.at), via: pr.via && pr.via.map(sw), hand: sw(pr.hand), hands: pr.hands && pr.hands.map(sw) }));
}
/* A resistance band runs between two body points (or a fixed spot on the stage). Its rest length is the shortest
   distance it spans in the routine, so it is just taut at its slackest and visibly stretches as it is pulled. */
function propPoint(P, end) {
  if (typeof end === 'string') return P[end];
  if (end && typeof end === 'object') return { x: CX + num(end.x), y: FLOOR - num(end.y) };
  return null;
}
/* the band's route: from, any "via" points it wraps around (e.g. behind the back), to */
function propRoute(P, pr) {
  const pts = [pr.from, ...(pr.via || []), pr.to].map(end => propPoint(P, end));
  return pts.every(Boolean) ? pts : null;
}
const routeLength = pts => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0);
function bandRestLengths(props, resolved, seg) {
  return (props || []).map(pr => {
    if (pr.type !== 'band') return null;
    if (pr.restLength) return pr.restLength;
    let min = Infinity;
    for (const r of resolved) {
      const pos = place(r.pose, r.v, seg, r.rule), P = fk(r.pose, r.v, seg, pos.x, pos.y);
      const pts = propRoute(P, pr);
      if (pts) min = Math.min(min, routeLength(pts));
    }
    return isFinite(min) ? Math.max(min, 10) : 100;
  });
}
function bandPathRoute(pts, rest) {
  if (pts.length === 2) return bandPath(pts[0], pts[1], rest);
  const stretch = routeLength(pts) / rest;
  return { d: 'M' + pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L'), width: Math.max(2, 5 / Math.sqrt(Math.max(1, stretch))), stretch };
}
function bandPath(a, b, rest) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const stretch = len / rest;
  if (stretch >= 1) return { d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`, width: Math.max(2, 5 / Math.sqrt(stretch)), stretch };
  // slack: the band sags below the straight line
  const sag = Math.sqrt(Math.max(0, rest * rest - len * len)) / 2;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + sag;
  return { d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${mx.toFixed(1)} ${Math.min(my, FLOOR + 3).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`, width: 5, stretch };
}

/* Resolve a whole sequence and hand the floor contact over between steps: when a step pins a different point
   (say the hands instead of the feet), that point is pinned exactly where it already was, so nothing slides. */
function resolveSequence(keyframes, seg, ex = {}, props = ex.props) {
  SUPPORTS = surfacesFrom(props);
  const R = keyframes.map(kf => resolveKeyframe(kf, seg, ex));
  R.forEach(r => (r.supports = SUPPORTS));
  R.supports = SUPPORTS;
  const onFloor = (P, k) => supportY(P[k].x) - P[k].y <= 3;
  for (let i = 1; i < R.length; i++) {
    const a = R[i - 1], b = R[i];
    const pa = place(a.pose, a.v, seg, a.rule), A = fk(a.pose, a.v, seg, pa.x, pa.y);
    const pb = place(b.pose, b.v, seg, b.rule), B = fk(b.pose, b.v, seg, pb.x, pb.y);
    // the point that stays on the floor through the move: the previous pin if it still touches, else another shared contact
    // (the step's own pin goes first when it was already resting somewhere, e.g. the foot placed on a step)
    const order = [b.rule.anchor, a.rule.anchor, 'handR', 'handL', 'elbowR', 'elbowL', 'ankleR', 'ankleL', 'kneeR', 'kneeL',
      'toeR', 'toeL', 'pelvis', 'neckBase', 'headLow'].filter(Boolean);
    const shared = order.find(k => onFloor(A, k) && onFloor(B, k));
    if (!shared) continue;                                               // nothing stays down: leave the step where it is
    b.rule.anchor = shared;
    b.rule.anchorX = A[shared].x - CX;
  }
  // steps that were re-pinned (say onto a step) re-aim their floor contacts from where they now stand
  R.forEach((r, i) => {
    const kf = keyframes[i];
    if (!(kf.touch || []).length || (r.rule.anchor === (kf.anchor || null) && num(r.rule.anchorX) === num(kf.anchorX != null ? kf.anchorX : ex.anchorX))) return;
    const applyPlant = () => { for (const s of kf.plant || []) r.pose['ankle' + s] = flatAnkle(r.pose, s); };
    for (const t of kf.touch) if (t.point !== r.rule.anchor) solveTouch(r.pose, r.v, seg, r.rule, t, applyPlant);   // the pinned point is already down
  });
  // keep: hands or feet that stay exactly where they were in the previous step (feet planted while the hips lift...)
  for (let i = 0; i < R.length; i++) {
    const kf = keyframes[i], keep = kf.keep || [];
    if (!keep.length || R.length < 2) continue;
    const b = R[i];
    for (const item of keep) {
      // "ankleR" = where it was in the previous step; { "point": "ankleR", "keyframe": 0 } = where it was in that step
      const tip = typeof item === 'string' ? item : item.point;
      const a = typeof item === 'object' && R[item.keyframe] ? R[item.keyframe] : R[(i - 1 + R.length) % R.length];
      const pa = place(a.pose, a.v, seg, a.rule), A = fk(a.pose, a.v, seg, pa.x, pa.y);
      const s = tip.slice(-1), ch = SLIDE_CHAINS.find(k => k.tip + k.s === tip);
      if (!ch) continue;
      const pos = place(b.pose, b.v, seg, b.rule);
      const midRel = ((b.pose[ch.mid + s] % 360) + 540) % 360 - 180;       // which way the joint really bends (-189° bends like +171°)
      const bend = Math.sign(midRel) || (ch.root === 'hip' ? 1 : -1);
      solveTwoBone(b.pose, b.v, seg, pos, ch, { x: A[tip].x, y: A[tip].y }, 1, bend, false);
      if (ch.root === 'hip' && (kf.plant || []).includes(s)) b.pose['ankle' + s] = flatAnkle(b.pose, s);
      b.auto.add(ch.root + s); b.auto.add(ch.mid + s);
    }
  }
  // a wall stands where a chosen body point is in one step (e.g. where the hands rest), then stays put
  R.walls = (props || []).map(pr => {
    if (pr.type !== 'wall' || !R.length) return null;
    const k = R[Math.min(R.length - 1, Math.max(0, num(pr.keyframe)))];
    const pos = place(k.pose, k.v, seg, k.rule), P = fk(k.pose, k.v, seg, pos.x, pos.y);
    return (typeof pr.at === 'string' && P[pr.at] ? P[pr.at].x : CX + num(pr.x)) + num(pr.offset);
  });
  const wallX = R.walls.find(x => x != null), grip = chairGrip();
  for (const r of R) for (const rc of r.reach) {
    let T = null;
    const pos = place(r.pose, r.v, seg, r.rule), P = fk(r.pose, r.v, seg, pos.x, pos.y);
    if (rc.to === 'wall' && wallX != null) T = { x: wallX, y: P['shoulder' + rc.hand.slice(-1)].y + num(rc.dy) };
    if (rc.to === 'chair' && grip) T = { x: grip.x + num(rc.dx), y: grip.y + num(rc.dy) };     // hands on the chair back
    if (P[rc.to]) T = { x: P[rc.to].x + num(rc.dx), y: P[rc.to].y + num(rc.dy) };              // re-aim after feet were kept in place
    if (!T) continue;
    solveReach(r.pose, r.v, seg, r.rule, rc, T);
    r.auto.add('shoulder' + rc.hand.slice(-1)); r.auto.add('elbow' + rc.hand.slice(-1));
  }
  return R;
}

function solveReach(pose, v, seg, rule, r, T) {
  const s = r.hand.slice(-1), ch = SLIDE_CHAINS.find(k => k.root === 'shoulder' && k.s === s);
  const bend = r.bend || (v < 0.5 ? -1 : (s === 'L' ? 1 : -1));      // elbows back from the side, out from the front
  solveTwoBone(pose, v, seg, place(pose, v, seg, rule), ch, T, 1, bend, false);
}

/* ---------- Reps: which steps set up, repeat, and finish ----------
   A step's "phase" is "setup" (played once before the reps), "rep" (the steps of one rep, or the held step
   of a timed exercise) or "finish" (played once after). With no phases marked, the whole loop is one rep. */
function phaseInfo(keyframes) {
  const idx = ph => keyframes.map((k, i) => ((k.phase || 'rep') === ph ? i : -1)).filter(i => i >= 0);
  let rep = idx('rep');
  if (!rep.length) rep = keyframes.map((_, i) => i);
  return { setup: idx('setup'), rep, finish: idx('finish'), start: rep[0], end: rep[rep.length - 1] };
}
/* The other direction of a circling exercise: the rep steps in reverse order. Each move takes the time of the
   move it reverses, so the rhythm is the same both ways. */
function reverseReps(keyframes) {
  const { rep } = phaseInfo(keyframes);
  const n = rep.length, out = keyframes.map(k => ({ ...k }));
  const durOf = pos => keyframes[rep[pos]].durationMs;          // time to move INTO the step at rep position pos
  for (let j = 0; j < n; j++) {
    const src = keyframes[rep[n - 1 - j]];
    out[rep[j]] = { ...src, durationMs: durOf((n - j) % n) };
  }
  // a "keep" that points at a step by number must follow that step to its new place
  const moved = i => { const pos = rep.indexOf(i); return pos < 0 ? i : rep[n - 1 - pos]; };
  for (const k of out) if (k.keep) k.keep = k.keep.map(x => (typeof x === 'object' && x && Number.isInteger(x.keyframe) ? { ...x, keyframe: moved(x.keyframe) } : x));
  return out;
}

/* Right-side version of a left-side keyframe: swap L/R; in front view also flip every angle */
function swapSide(s) { return typeof s === 'string' ? s.replace(/([LR])$/, m => (m === 'L' ? 'R' : 'L')) : s; }
function mirrorKeyframe(kf) {
  const front = kf.view === 'front';
  const pose = {};
  for (const [k, val] of Object.entries(kf.pose || {})) pose[swapSide(k)] = front ? -val : val;
  return {
    ...kf, pose,
    anchor: swapSide(kf.anchor),
    plant: (kf.plant || []).map(swapSide),
    touch: (kf.touch || []).map(t => ({ ...t, point: swapSide(t.point), adjust: swapSide(t.adjust) })),
    keep: (kf.keep || []).map(k => (typeof k === 'string' ? swapSide(k) : { ...k, point: swapSide(k.point) })),
    reach: (kf.reach || []).map(r => ({ ...r, hand: swapSide(r.hand), to: swapSide(r.to), dx: front ? -num(r.dx) : num(r.dx), bend: r.bend && front ? -r.bend : r.bend })),
    guide: kf.guide ? { ...kf.guide, direction: -num(kf.guide.direction) } : kf.guide,
    layers: kf.layers ? Object.fromEntries(Object.entries(kf.layers).map(([k, v]) => [swapSide(k), v])) : kf.layers
  };
}

if (typeof module !== 'undefined') module.exports = { phaseInfo, reverseReps, weightSVG, supportY, surfacesFrom, surfaceShapes, chairGrip, mirrorProps, bandRestLengths, bandPath, bandPathRoute, propRoute, propPoint, resolveSequence, frameAt, groundY, fk, place, resolveKeyframe, mirrorKeyframe, DEFAULT_SEGMENTS, FLOOR, CX, CONTACT_POINTS, JOINT_KEYS };
