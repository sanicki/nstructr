/* ===== Pose math (exercise format v2): a 3D figure, drawn as SVG =====
   The figure is jointed like an artist's mannequin (docs/3d-skeleton.md): ball joints at the hips, shoulders, spine
   and neck take three angles [forward, side, turn]; knees, elbows and ankles are hinges with one. Forward kinematics
   gives every body point in 3D; a camera (a turn around the vertical) projects them, and the parts are drawn far to
   near, so a leg crossing behind another is behind because it is.

   World frame: x = the figure's right (as it starts), y = up, z = forward; the floor is y = 0 and the stage centre
   is x = z = 0. Camera yaw: 90 = side view (the figure faces screen-right), 0 = front view (facing you).
   Screen: x = CX + z·sin(yaw) − x·cos(yaw), y = FLOOR − y. */
const W = 400, CX = 200, FLOOR = 360;
const DEFAULT_SEGMENTS = { torso: 100, neck: 14, head: 18, upperArm: 55, lowerArm: 50, thigh: 80, shin: 80, foot: 22, shoulderHalf: 22, hipHalf: 12 };
const SHOULDER_DROP = 4;
/* [key, name, what each number does]. Ball joints: forward, side, turn. Signs follow the body, not the screen: the
   same numbers mean the same pose from any camera, and the other side is the mirror image. */
const JOINTS = [
  ['root', 'Whole body', ['Lean forward', 'Lean right', 'Turn left']],
  ['torso', 'Lower back', ['Bend forward', 'Bend right', 'Turn left']],
  ['chest', 'Upper back', ['Bend forward', 'Bend right', 'Turn left']],
  ['neck', 'Head', ['Nod', 'Tilt right', 'Turn left']],
  ['shoulderL', 'Left shoulder', ['Forward', 'Out to the side', 'Turn out']], ['elbowL', 'Left elbow', ['Bend']],
  ['shoulderR', 'Right shoulder', ['Forward', 'Out to the side', 'Turn out']], ['elbowR', 'Right elbow', ['Bend']],
  ['hipL', 'Left hip', ['Forward', 'Out to the side', 'Turn out']], ['kneeL', 'Left knee', ['Bend']], ['ankleL', 'Left ankle', ['Point toes']],
  ['hipR', 'Right hip', ['Forward', 'Out to the side', 'Turn out']], ['kneeR', 'Right knee', ['Bend']], ['ankleR', 'Right ankle', ['Point toes']]
];
const JOINT_KEYS = JOINTS.map(j => j[0]);
const BALL = new Set(JOINTS.filter(j => j[2].length === 3).map(j => j[0]));
const SPINE = new Set(['root', 'torso', 'chest', 'neck']);
const COMPONENTS = ['forward', 'side', 'turn'];            // "hipR.side": a ball joint's second number
const POINTS = ['pelvis', 'spine', 'neckBase', 'head', 'headTop', 'headLow', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'toeL', 'toeR', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR', 'footL', 'footR', 'armpitL', 'armpitR', 'backL', 'backR'];
/* body segments (the bone lines as drawn), for what lies across a foam roller: "touch" can name one (it rests where
   it's lowest over what's under it), and none of them sinks into a roller */
// (sideL/R: the flank, hip to shoulder, for lying on your side on it)
const SEGMENTS = { thighL: ['hipL', 'kneeL'], thighR: ['hipR', 'kneeR'], shinL: ['kneeL', 'ankleL'], shinR: ['kneeR', 'ankleR'], back: ['pelvis', 'spine', 'neckBase'], sideL: ['hipL', 'shoulderL'], sideR: ['hipR', 'shoulderR'] };
/* every point that can rest on the floor: nothing in this list may sink below it */
const CONTACT_POINTS = ['pelvis', 'spine', 'neckBase', 'headLow', 'headTop', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'toeL', 'toeR',
  'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR'];

const lerp = (a, b, t) => a + (b - a) * t;
const num = x => (typeof x === 'number' && isFinite(x) ? x : 0);
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const nearest = (val, ref) => val + 360 * Math.round((ref - val) / 360);     // same angle, written closest to ref
const wrap180 = a => ((a % 360) + 540) % 360 - 180;

/* ---------- 3D vectors and rotations (3×3, row-major) ---------- */
const V3 = {
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }), sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
  mul: (a, k) => ({ x: a.x * k, y: a.y * k, z: a.z * k }), dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
  len: a => Math.hypot(a.x, a.y, a.z), lerp: (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) }),
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
};
V3.unit = a => { const l = V3.len(a) || 1; return V3.mul(a, 1 / l); };
function rx(a) { const c = Math.cos(a * D2R), s = Math.sin(a * D2R); return [1, 0, 0, 0, c, -s, 0, s, c]; }
function ry(a) { const c = Math.cos(a * D2R), s = Math.sin(a * D2R); return [c, 0, s, 0, 1, 0, -s, 0, c]; }
function rz(a) { const c = Math.cos(a * D2R), s = Math.sin(a * D2R); return [c, -s, 0, s, c, 0, 0, 0, 1]; }
function mm(A, B) {
  const C = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
  return C;
}
const mv = (M, x, y, z) => ({ x: M[0] * x + M[1] * y + M[2] * z, y: M[3] * x + M[4] * y + M[5] * z, z: M[6] * x + M[7] * y + M[8] * z });
const mtv = (M, v) => ({ x: M[0] * v.x + M[3] * v.y + M[6] * v.z, y: M[1] * v.x + M[4] * v.y + M[7] * v.z, z: M[2] * v.x + M[5] * v.y + M[8] * v.z });
const sgn = s => (s === 'R' ? 1 : -1);                    // +x is the figure's right

/* each joint's rotation relative to its parent. Whole body: turn (around the vertical), then lean forward, then
   lean right. Spine and neck: bend forward, bend right, turn left. Hips and shoulders (limbs hang down at 0):
   forward, out to the side, turn out. Knee: the shin folds back; elbow: the forearm folds forward; ankle: toes down. */
const rootM = a => mm(ry(-a[2]), mm(rx(a[0]), rz(-a[1])));
const spineM = a => mm(rx(a[0]), mm(rz(-a[1]), ry(-a[2])));
const ballM = (a, s) => { const k = sgn(s); return mm(rx(-a[0]), mm(rz(k * a[1]), ry(k * a[2]))); };

/* a pose with every joint present: ball joints [3 numbers], hinges a number */
function normPose(p) {
  const out = {};
  for (const k of JOINT_KEYS) {
    const v = p && p[k];
    out[k] = BALL.has(k) ? (Array.isArray(v) ? [num(v[0]), num(v[1]), num(v[2])] : [0, 0, 0]) : num(v);
  }
  return out;
}
function lerpPose(a, b, e) {
  const out = {};
  for (const k of JOINT_KEYS) out[k] = BALL.has(k) ? [lerp(a[k][0], b[k][0], e), lerp(a[k][1], b[k][1], e), lerp(a[k][2], b[k][2], e)] : lerp(a[k], b[k], e);
  return out;
}
/* "hipR" (its first number), "hipR.side", "torso.turn"... */
function jointRef(key) {
  const [j, c] = String(key).split('.');
  return { j, c: BALL.has(j) ? Math.max(0, COMPONENTS.indexOf(c || 'forward')) : -1 };
}
function getJ(pose, key) { const { j, c } = jointRef(key); return c < 0 ? pose[j] : pose[j][c]; }
function setJ(pose, key, v) { const { j, c } = jointRef(key); if (c < 0) pose[j] = v; else pose[j][c] = v; }

/* Forward kinematics: every body point relative to the pelvis (in the world's orientation). F, if given, receives
   each part's rotation (world): root, torso, chest, neck, hipL, kneeL, ankleL, shoulderL, elbowL... */
function fk(pose, seg, F) {
  const P = { pelvis: { x: 0, y: 0, z: 0 } };
  const at = (p, M, x, y, z) => V3.add(p, mv(M, x, y, z));
  const M0 = rootM(pose.root);
  for (const s of ['L', 'R']) {
    const hip = mv(M0, sgn(s) * seg.hipHalf, 0, 0);
    const Mh = mm(M0, ballM(pose['hip' + s], s)), knee = at(hip, Mh, 0, -seg.thigh, 0);
    const Mk = mm(Mh, rx(pose['knee' + s])), ankle = at(knee, Mk, 0, -seg.shin, 0);
    const Ma = mm(Mk, rx(pose['ankle' + s])), toe = at(ankle, Ma, 0, 0, seg.foot);
    Object.assign(P, { ['hip' + s]: hip, ['knee' + s]: knee, ['ankle' + s]: ankle, ['toe' + s]: toe, ['foot' + s]: V3.lerp(ankle, toe, 0.6) });   // foot: the ball of the foot (where a band loops)
    if (F) Object.assign(F, { ['hip' + s]: Mh, ['knee' + s]: Mk, ['ankle' + s]: Ma });
  }
  /* spine = two segments: lower back (torso) from the pelvis, upper back (chest) from mid-spine */
  const lower = seg.torso / 2, upper = seg.torso - lower;
  const Mt = mm(M0, spineM(pose.torso)); P.spine = mv(Mt, 0, lower, 0);
  const Mc = mm(Mt, spineM(pose.chest)); P.neckBase = at(P.spine, Mc, 0, upper, 0);
  const Mn = mm(Mc, spineM(pose.neck));
  P.head = at(P.neckBase, Mn, 0, seg.neck + seg.head, 0);
  P.headTop = at(P.neckBase, Mn, 0, seg.neck + 2 * seg.head, 0);
  P.headLow = { x: P.head.x, y: P.head.y - seg.head, z: P.head.z };   // lowest point of the head, whatever its orientation
  for (const s of ['L', 'R']) {
    const k = sgn(s), sh = at(P.spine, Mc, k * seg.shoulderHalf, upper - SHOULDER_DROP, 0);
    const Ms = mm(Mc, ballM(pose['shoulder' + s], s)), elbow = at(sh, Ms, 0, -seg.upperArm, 0);
    const Me = mm(Ms, rx(-pose['elbow' + s])), hand = at(elbow, Me, 0, -seg.lowerArm, 0);
    Object.assign(P, { ['shoulder' + s]: sh, ['elbow' + s]: elbow, ['hand' + s]: hand,
      // where equipment wraps the upper body: just under the shoulder, and across the shoulder blades behind the back
      ['armpit' + s]: at(sh, Mc, 0, -12, 0), ['back' + s]: at(P.spine, Mc, k * seg.shoulderHalf * 0.6, upper * 0.72, -11) });
    if (F) Object.assign(F, { ['shoulder' + s]: Ms, ['elbow' + s]: Me });
  }
  if (F) Object.assign(F, { root: M0, torso: Mt, chest: Mc, neck: Mn });
  return P;
}
const moved = (P, pos) => { const Q = {}; for (const k in P) Q[k] = V3.add(P[k], pos); return Q; };
/* body points in the world: the pose placed at pelvis position pos */
const fkAt = (pose, seg, pos, F) => moved(fk(pose, seg, F), pos);

/* the camera: screen x/y (y down, like SVG) and depth (larger = nearer the camera) */
function project(P, yaw) {
  const s = Math.sin(yaw * D2R), c = Math.cos(yaw * D2R), out = {};
  for (const k in P) { const p = P[k]; out[k] = { x: CX + p.z * s - p.x * c, y: FLOOR - p.y, d: p.x * s + p.z * c }; }
  return out;
}
/* the figure's parts, to be drawn far to near */
const PARTS = {
  legL: [['hipL', 'kneeL'], ['kneeL', 'ankleL'], ['ankleL', 'toeL']], legR: [['hipR', 'kneeR'], ['kneeR', 'ankleR'], ['ankleR', 'toeR']],
  armL: [['shoulderL', 'elbowL'], ['elbowL', 'handL']], armR: [['shoulderR', 'elbowR'], ['elbowR', 'handR']],
  body: [['pelvis', 'spine'], ['spine', 'neckBase'], ['neckBase', 'head']]
};
/* ties (parts side by side, facing the camera) keep a fixed order, so nothing flickers */
const PART_BIAS = { armL: -0.3, legL: -0.2, body: 0, legR: 0.2, armR: 0.3 };
function partDepth(Q, part) { let s = 0, n = 0; for (const [a, b] of PARTS[part]) { s += Q[a].d + Q[b].d; n += 2; } return s / n + PART_BIAS[part]; }
function drawOrder(Q) { return Object.keys(PARTS).sort((a, b) => partDepth(Q, a) - partDepth(Q, b)); }
/* every bone on its own, far to near: a leg crossing behind the other is behind where it really is (the thigh can be
   in front while the shin is behind). prev: the last order; bones within 1 px of depth keep it, so they don't flicker */
const BONES = Object.entries(PARTS).flatMap(([part, bones]) => bones.map(([a, b]) => ({ part, a, b, id: a + '-' + b })));
function boneOrder(Q, prev) {
  const rank = new Map((prev || []).map((id, i) => [id, i]));
  const depth = bn => (Q[bn.a].d + Q[bn.b].d) / 2 + PART_BIAS[bn.part];
  const list = BONES.map((bn, i) => ({ bn, d: depth(bn), r: rank.has(bn.id) ? rank.get(bn.id) : i }));
  // insertion sort: a bone only moves past another when it is clearly further back
  for (let i = 1; i < list.length; i++) {
    const x = list[i]; let j = i - 1;
    while (j >= 0 && (list[j].d > x.d + 1 || (Math.abs(list[j].d - x.d) <= 1 && list[j].r > x.r))) { list[j + 1] = list[j]; j--; }
    list[j + 1] = x;
  }
  return list.map(x => x.bn.id);
}

/* ---------- Surfaces (chair seat, bench, step) ----------
   A box on the floor: "z" is its centre along the figure's forward direction, "width" its length that way, "x" and
   "depth" the same sideways. The "floor" under any point is the highest surface beneath it, or the floor itself. */
const SURFACE_TYPES = ['chair', 'bench', 'step', 'block', 'ball', 'roller'];
// a yoga block stands on end (23 × 15 × 10 cm at about 5.6 mm a px): 41 high, 27 front to back, 18 side to side
const SURFACE_DEFAULTS = { chair: { width: 70, depth: 80, height: 80, backHeight: 85 }, bench: { width: 200, depth: 70, height: 70 }, step: { width: 90, depth: 140, height: 30 }, block: { width: 27, depth: 18, height: 41 } };
let SUPPORTS = [];
function surfacesFrom(props) {
  return (props || []).filter(p => SURFACE_TYPES.includes(p.type)).map(p => {
    // a stability ball: round, resting on the floor (r 58: a 65 cm ball); what's over it rests on its curve
    if (p.type === 'ball') { const r = num(p.r) || 58, x = num(p.x), z = num(p.z); return { type: 'ball', r, cx: x, cz: z, x0: x - r, x1: x + r, z0: z - r, z1: z + r, h: 2 * r, back: null, backHeight: 0 }; }
    // a foam roller: a cylinder lying on the floor across the figure (side to side), r 14 and 160 long (15 × 90 cm);
    // what lies over it rests on its curve
    if (p.type === 'roller') { const r = num(p.r) || 14, len = num(p.length) || 160, x = num(p.x), z = num(p.z); return { type: 'roller', r, cx: x, cz: z, x0: x - len / 2, x1: x + len / 2, z0: z - r, z1: z + r, h: 2 * r, back: null, backHeight: 0, dz: 0 }; }
    const d = SURFACE_DEFAULTS[p.type], w = num(p.width) || d.width, dp = num(p.depth) || d.depth, h = num(p.height) || d.height;
    return { type: p.type, z0: num(p.z) - w / 2, z1: num(p.z) + w / 2, x0: num(p.x) - dp / 2, x1: num(p.x) + dp / 2, h,
      back: p.type === 'chair' ? (p.back || 'behind') : null, backHeight: num(p.backHeight) || d.backHeight || 0 };
  });
}
function supportY(x, z) {
  let y = 0;
  for (const s of SUPPORTS) {
    if (s.type === 'ball') { const d2 = (x - s.cx) ** 2 + (z - s.cz) ** 2; if (d2 < s.r * s.r) y = Math.max(y, s.r + Math.sqrt(s.r * s.r - d2)); continue; }
    if (s.type === 'roller') { const d = z - s.cz; if (Math.abs(d) < s.r && x >= s.x0 - 2 && x <= s.x1 + 2) y = Math.max(y, s.r + Math.sqrt(s.r * s.r - d * d)); continue; }
    if (z >= s.z0 - 2 && z <= s.z1 + 2 && x >= s.x0 - 2 && x <= s.x1 + 2) y = Math.max(y, s.h);
  }
  return y;
}
const supportAt = p => supportY(p.x, p.z);
/* the surfaces with each foam roller rolled dz along the floor (it turns dz / r as it goes) */
function rolledSupports(sups, dz) {
  return sups.map(s => (s.type !== 'roller' ? s : { ...s, cz: s.cz + dz - s.dz, z0: s.z0 + dz - s.dz, z1: s.z1 + dz - s.dz, dz }));
}
const rollerDz = sups => { const s = (sups || []).find(k => k.type === 'roller'); return s ? s.dz : 0; };
/* points along a body segment (P: body points), ends included */
function segmentPoints(P, name, n = 12) {
  const ks = SEGMENTS[name], out = [];
  for (let i = 0; i + 1 < ks.length; i++) for (let j = i ? 1 : 0; j <= n; j++) out.push(V3.lerp(P[ks[i]], P[ks[i + 1]], j / n));
  return out;
}
/* how far a point, or a segment at its lowest over what's under it, is above what it rests on (below: negative) */
function clearance(P, name) {
  if (P[name]) return P[name].y - supportAt(P[name]);
  return SEGMENTS[name] ? Math.min(...segmentPoints(P, name).map(q => q.y - supportAt(q))) : 0;
}
/* how far the body (points P, placed at pos) sinks into a foam roller: its segments aren't just their end points */
function rollerSink(P, pos) {
  if (!SUPPORTS.some(s => s.type === 'roller')) return -Infinity;
  let pen = -Infinity;
  for (const k in SEGMENTS) for (const q of segmentPoints(P, k, 8)) pen = Math.max(pen, supportY(q.x + pos.x, q.z + pos.z) - (q.y + pos.y));
  return pen;
}
/* the top of a chair's backrest: where hands rest when standing behind it */
function chairGrip() {
  const s = SUPPORTS.find(k => k.type === 'chair');
  return s ? { y: s.h + s.backHeight, z: s.back === 'behind' ? s.z0 : s.z1 } : null;
}
/* outline of each surface seen by the camera, for drawing */
function surfaceShapes(sup, yaw) {
  const s = Math.sin(yaw * D2R), c = Math.cos(yaw * D2R), sx = (x, z) => CX + z * s - x * c;
  return (sup || []).map(k => {
    // (the floor line is drawn 7 below the floor the body rests on, for the feet's thickness: the ball reaches it, its top
    // where the body rests on it)
    if (k.type === 'ball') { const c = sx(k.cx, k.cz), r = k.r + 3.5, cy = FLOOR + 7 - r;
      return { solid: true, ball: true, d: `M${c - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`, x0: c - r, x1: c + r }; }
    // a foam roller: seen end-on a circle, from the front a bar, in between a bar with round ends (the near one outlined)
    if (k.type === 'roller') {
      const r = k.r + 3.5, cy = FLOOR + 7 - r, e0 = sx(k.x0, k.cz), e1 = sx(k.x1, k.cz), a = Math.min(e0, e1), b = Math.max(e0, e1), rx = Math.max(0.01, r * Math.abs(s));
      const near = (k.x0 * s + k.cz * c) > (k.x1 * s + k.cz * c) ? e0 : e1;
      // turned by how far it has rolled: a line across its near end shows it
      const ph = k.dz / k.r, ux = Math.sin(ph) * rx * Math.sign(s || 1), uy = -Math.cos(ph) * r;
      const d = `M${a} ${cy - r}L${b} ${cy - r}A${rx} ${r} 0 0 1 ${b} ${cy + r}L${a} ${cy + r}A${rx} ${r} 0 0 1 ${a} ${cy - r}Z` +
        `M${near} ${cy - r}A${rx} ${r} 0 0 1 ${near} ${cy + r}A${rx} ${r} 0 0 1 ${near} ${cy - r}` +
        `M${(near - ux).toFixed(1)} ${(cy - uy).toFixed(1)}L${(near + ux).toFixed(1)} ${(cy + uy).toFixed(1)}`;   // (same winding: stays filled)
      return { solid: true, roller: true, d, x0: a - rx, x1: b + rx };
    }
    const xs = [sx(k.x0, k.z0), sx(k.x1, k.z0), sx(k.x0, k.z1), sx(k.x1, k.z1)];
    const a = Math.min(...xs), b = Math.max(...xs), top = FLOOR - k.h, f = FLOOR + 7;
    if (k.type === 'step' || k.type === 'block') return { solid: true, block: k.type === 'block', d: `M${a} ${f}L${a} ${top}L${b} ${top}L${b} ${f}Z`, x0: a, x1: b };
    let d = `M${a} ${top}L${b} ${top}M${a + 5} ${top}L${a + 5} ${f}M${b - 5} ${top}L${b - 5} ${f}`;
    if (k.type === 'chair') { const bx = sx((k.x0 + k.x1) / 2, k.back === 'behind' ? k.z0 : k.z1); d += `M${bx} ${top}L${bx} ${top - k.backHeight}`; }
    return { solid: false, d, x0: a, x1: b };
  });
}

/* Where the pelvis must be so the figure touches the floor (or pins an anchor point). rule: { anchor, x, z, lift }:
   with an anchor, x/z is where that point is pinned; without one, where the pelvis is. */
function place(pose, seg, rule, keepOffFloor = true) {
  const P = fk(pose, seg);
  if (rule.anchor && P[rule.anchor]) {
    const a = P[rule.anchor], ax = num(rule.x), az = num(rule.z);
    // hanging: the anchor (a hand on a bar) is held at that height, not on the floor
    const pos = { x: ax - a.x, y: (rule.y != null ? rule.y : supportY(ax, az)) - a.y, z: az - a.z };
    // pin the anchor to whatever it rests on, unless that would push another body part through a surface
    if (keepOffFloor) {
      let pen = 0;
      for (const k of CONTACT_POINTS) pen = Math.max(pen, supportY(P[k].x + pos.x, P[k].z + pos.z) - (P[k].y + pos.y));
      pos.y += Math.max(pen, rollerSink(P, pos));
    }
    pos.y += num(rule.lift);     // airborne (a jump): the whole figure that far above where it would rest
    return pos;
  }
  const x = num(rule.x), z = num(rule.z);
  let y = -Infinity;
  for (const k of CONTACT_POINTS) y = Math.max(y, supportY(P[k].x + x, P[k].z + z) - P[k].y);
  y = Math.max(y, rollerSink(P, { x, y: 0, z }));
  return { x, y: y + num(rule.lift), z };
}
/* Final floor constraint used during playback: the lowest body point always rests on the floor (plus any lift) */
function groundY(pose, seg, pos, lift = 0) {
  const P = fk(pose, seg);
  let pen = -Infinity;
  for (const k of CONTACT_POINTS) pen = Math.max(pen, supportY(P[k].x + pos.x, P[k].z + pos.z) - (P[k].y + pos.y));
  pen = Math.max(pen, rollerSink(P, pos));
  return pos.y + pen + lift;
}

/* ---------- Limbs: turning a hip + knee (shoulder + elbow) to put the foot (hand) somewhere ---------- */
const CHAINS = [
  { s: 'L', root: 'hip', mid: 'knee', tip: 'ankle', l1: 'thigh', l2: 'shin' }, { s: 'R', root: 'hip', mid: 'knee', tip: 'ankle', l1: 'thigh', l2: 'shin' },
  { s: 'L', root: 'shoulder', mid: 'elbow', tip: 'hand', l1: 'upperArm', l2: 'lowerArm' }, { s: 'R', root: 'shoulder', mid: 'elbow', tip: 'hand', l1: 'upperArm', l2: 'lowerArm' }
];
/* The angles that point a limb's upper segment along u and its lower along w (both in the parent's frame): the
   ball joint [forward, side, turn] and the hinge's bend. Of the equivalent answers, the one closest to ref (so a
   limb never flips); a hinge bends backwards at most a little. */
function limbAngles(u, w, s, arm, ref) {
  const k = sgn(s), U = V3.unit(u), W2 = V3.unit(w);
  const a1 = Math.asin(Math.max(-1, Math.min(1, k * U.x))) * R2D;
  // straight out to the side, forward/back means nothing: keep the one the limb had (ref.flat, if given)
  const gimbal = Math.abs(Math.cos(a1 * D2R)) < 0.02, rf = gimbal && ref.flat != null ? ref.flat : ref.ball[0];
  const f1 = gimbal ? rf : Math.atan2(U.z, -U.y) * R2D;
  let best = null;
  for (const [f0, a0] of [[f1, a1], [f1 + 180, 180 - a1]]) {
    const f = nearest(f0, rf), a = nearest(a0, ref.ball[1]);
    const w2 = mtv(mm(rx(-f), rz(k * a)), W2);
    const b = Math.atan2(Math.hypot(w2.x, w2.z), -w2.y) * R2D;          // (a nearly straight limb's turn is noise: keep ref's)
    const t0 = b < 3 ? ref.ball[2] : k * (arm ? Math.atan2(w2.x, w2.z) : Math.atan2(-w2.x, -w2.z)) * R2D;
    for (const [tt, bb] of [[t0, b], [t0 + 180, -b]]) {
      // ref.bend can depend on the turn (a converted v1 angle means opposite bends with the limb turned round)
      const t = nearest(tt, ref.ball[2]), rb = typeof ref.bend === 'function' ? ref.bend(t, f, a) : ref.bend, bend = nearest(bb, rb);
      const cost = Math.abs(f - rf) + Math.abs(a - ref.ball[1]) + Math.abs(t - ref.ball[2]) + Math.abs(bend - rb) + (wrap180(bb) < -15 ? 1e4 : 0);
      if (!best || cost < best.cost) best = { ball: [f, a, t], bend, cost };
    }
  }
  return best;
}
/* Two-bone IK in 3D: put the limb's tip on world point T (pelvis at pos). The knee (elbow) stays in the plane it
   bends in: a knee always comes out forward of the hip–ankle line and an elbow back, so they never bend the wrong
   way. weight < 1 blends toward the answer; near a full fold the direction is undefined, so it eases out. */
function reachTip(pose, seg, pos, ch, T, weight = 1, fade = true) {
  const F = {}, P = fk(pose, seg, F), s = ch.s, arm = ch.root === 'shoulder';
  const rootK = ch.root + s, midK = ch.mid + s;
  const J = V3.add(P[rootK], pos), L1 = seg[ch.l1], L2 = seg[ch.l2];
  let d = V3.sub(T, J), dist = V3.len(d);
  const fold = Math.abs(L1 - L2) + 0.5;
  if (dist < fold + 0.01) return false;
  const w = fade ? weight * Math.min(1, (dist - fold) / 20) : weight;
  // part-way: aim part-way (from where the tip is now), and solve that exactly. Blending the angles instead would
  // bend the limb differently depending on which of the equivalent ways of writing the answer came out
  if (w < 1) { T = V3.lerp(V3.add(P[ch.tip + s], pos), T, w); d = V3.sub(T, J); dist = V3.len(d); if (dist < fold + 0.01) return false; }
  if (dist > L1 + L2 - 0.01) { d = V3.mul(d, (L1 + L2 - 0.01) / dist); dist = L1 + L2 - 0.01; }
  const n = V3.mul(d, 1 / dist), along = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, L1 * L1 - along * along));
  const Mu = F[rootK], Mp = arm ? F.chest : F.root;
  let pole = V3.mul({ x: Mu[2], y: Mu[5], z: Mu[8] }, arm ? -1 : 1);
  let p = V3.sub(pole, V3.mul(n, V3.dot(n, pole)));
  if (V3.len(p) < 1e-3) { pole = V3.mul({ x: Mp[2], y: Mp[5], z: Mp[8] }, arm ? -1 : 1); p = V3.sub(pole, V3.mul(n, V3.dot(n, pole))); }
  if (V3.len(p) < 1e-3) p = { x: Mp[1], y: Mp[4], z: Mp[7] };
  p = V3.unit(p);
  const K = V3.add(J, V3.add(V3.mul(n, along), V3.mul(p, h)));
  const Tt = V3.add(J, d);
  const sol = limbAngles(mtv(Mp, V3.sub(K, J)), mtv(Mp, V3.sub(Tt, K)), s, arm, { ball: pose[rootK], bend: pose[midK] });
  const oldMid = pose[midK];
  pose[rootK] = sol.ball;
  pose[midK] = sol.bend;
  if (!arm) pose['ankle' + s] -= pose[midK] - oldMid;               // keep the foot's angle to the floor
  return true;
}

/* 1-D solver: the value of x nearest x0 (within ±range) where f(x) = 0, or null. Searches outward from x0 in both
   directions and stops at the first sign change, then bisects it. */
function root1D(f, x0, range = 80, step = 1) {
  const f0 = f(x0);
  if (Math.abs(f0) < 1e-9) return x0;
  let lo = null, hi = null;
  let pp = f0, pm = f0;
  for (let d = step; d <= range + 1e-9 && lo === null; d += step) {
    const yp = f(x0 + d);
    if (Math.sign(yp) !== Math.sign(pp)) { lo = x0 + d - step; hi = x0 + d; break; }
    pp = yp;
    const ym = f(x0 - d);
    if (Math.sign(ym) !== Math.sign(pm)) { lo = x0 - d + step; hi = x0 - d; break; }
    pm = ym;
  }
  if (lo === null) return null;
  let flo = f(lo);
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2, fm = f(mid); if (Math.sign(fm) === Math.sign(flo)) { lo = mid; flo = fm; } else hi = mid; }
  const best = (lo + hi) / 2; f(best);
  return best;
}

/* a foot flat on the floor: the ankle angle that makes the foot level (from the side: minus the leg's angles) */
function flatAnkle(pose, s, seg) {
  const F = {}; fk(pose, seg, F);
  const Mk = F['knee' + s];
  const guess = -(pose.root[0] - pose['hip' + s][0] + pose['knee' + s]);
  return nearest(Math.atan2(Mk[5], Mk[4]) * R2D, guess);
}

/* During a transition a free limb can swing through the floor. A foot or hand resting on the floor at both ends
   of a move slides (or steps) along it instead; anchored limbs are left alone. */
function slideContacts(a, b, e, pose, seg, pos, pinned) {
  const A = worldOf(a, seg), B = worldOf(b, seg);
  for (const ch of CHAINS) {
    const tip = ch.tip + ch.s;
    if (pinned.includes(tip)) continue;
    const sa = supportAt(A[tip]), sb = supportAt(B[tip]);
    const onA = A[tip].y - sa <= 3, onB = B[tip].y - sb <= 3;
    if (ch.root === 'hip') {
      // a standing foot lifting off or setting down (toes or heel on the floor at one end only) peels off and sets
      // down rather than riding along the floor; a seated, kneeling or lying one may slide (Bound Angle, Pigeon)
      const toe = 'toe' + ch.s, down = W => W[tip].y - supportAt(W[tip]) <= 3 || W[toe].y - supportAt(W[toe]) <= 3;
      const dA = down(A), dB = down(B), G = dA ? A : B, O = dA ? B : A;
      // (the other end clearly up: not a foot a few px off as the hips sway)
      if (dA !== dB && Math.min(O[tip].y - supportAt(O[tip]), O[toe].y - supportAt(O[toe])) > 6) {
        if (G[ch.root + ch.s].y - supportAt(G[toe]) > 120 && Math.abs(b.pose[ch.mid + ch.s] - a.pose[ch.mid + ch.s]) <= 160) peel(pose, seg, pos, ch, G, dA ? e : 1 - e, dA ? B : A);
        continue;
      }
    }
    if (onA !== onB) continue;                                         // a heel rising with the toes down; hands swing as they are
    if (a.cam !== b.cam && ch.root === 'hip') continue;                // legs don't step while the camera turns between views
    if (!onA) continue;                                                // only limbs resting on a surface at both ends
    if (Math.abs(b.pose[ch.mid + ch.s] - a.pose[ch.mid + ch.s]) > 160) continue;   // a leg folding right over swings, it doesn't step
    // a foot or hand that has somewhere to go is lifted and set down again (a step), not dragged along the floor
    const travel = Math.hypot(B[tip].x - A[tip].x, B[tip].z - A[tip].z), climb = Math.abs(sa - sb);
    const arc = (travel > 15 || climb > 3 ? Math.max(Math.min(35, travel * 0.35), climb ? climb + 14 : 0) : 0) * Math.sin(Math.PI * e);
    // fade the slide in and out so the limb meets both keyframes exactly
    reachTip(pose, seg, pos, ch, { x: lerp(A[tip].x, B[tip].x, e), y: lerp(sa, sb, e) + arc, z: lerp(A[tip].z, B[tip].z, e) }, Math.min(1, 4 * e * (1 - e)));
  }
}
/* A foot or hand on the floor at one end of a move only (a foot lifting to step back, a hand coming down): it peels
   off, rising before it travels, and sets down, arriving above its spot and then lowering, instead of riding along
   the floor while the angles turn. F = its spot on the floor, sup = that floor's height, u = progress away from it
   (0 on the floor, 1 where the angles put it at the other end, which it then meets exactly). */
function peel(pose, seg, pos, ch, G, u, O) {
  if (u <= 0 || u >= 1) return;
  const tip = ch.tip + ch.s, toe = 'toe' + ch.s, F = G[tip], sup = Math.min(supportAt(G[tip]), supportAt(G[toe]));
  const Q = fkAt(pose, seg, pos)[tip];
  // travel waits for the lift; a long swing (a leg sweeping up behind, Dancer) only lifts: held under the body, the knee
  // would come up in front and snap round
  const far = Math.hypot(O[tip].x - F.x, O[tip].z - F.z) > 100 || O[tip].y - sup > 90, t = Math.min(1, Math.max(0, (u - 0.1) / 0.9));
  const h = far ? 1 : t, rise = (far ? 40 : 22) * Math.sin(Math.PI * u);
  const T = { x: lerp(F.x, Q.x, h), y: Math.max(Q.y, sup + rise), z: lerp(F.z, Q.z, h) };
  reachTip(pose, seg, pos, ch, T, 1);
  // the toes clear the floor too (a pointed foot would otherwise drag them)
  const dip = sup + rise * 0.7 - fkAt(pose, seg, pos)[toe].y;
  if (dip > 0) reachTip(pose, seg, pos, ch, { ...T, y: T.y + dip }, 1);
}
function clampTips(a, b, pose, seg, pos, pinned) {
  // a knee that would sink turns the thigh just enough to rest on the floor; the shin keeps its direction
  for (const s of ['L', 'R']) {
    if (pinned.includes('knee' + s)) continue;
    const P = fkAt(pose, seg, pos), K = P['knee' + s], sup = supportAt(K);
    // (only a leg swinging forward and back: turning a leg that's out to the side wouldn't lift its knee)
    if (K.y >= sup - 1 || Math.abs(wrap180(pose['hip' + s][1])) > 45) continue;
    const H = P['hip' + s]; if (H.y - sup < 0 || H.y - sup > seg.thigh) continue;
    const hip = pose['hip' + s], f0 = hip[0], b0 = pose['knee' + s];
    const f = th => { hip[0] = th; pose['knee' + s] = b0 + (th - f0); const Q = fkAt(pose, seg, pos)['knee' + s]; return Q.y - supportAt(Q); };
    const th = root1D(f, f0, 90, 2);
    if (th == null) { hip[0] = f0; pose['knee' + s] = b0; } else f(th);
  }
  // a hand or foot that would dip into the floor is held on the floor surface at the same spot
  for (const ch of CHAINS) {
    const tip = ch.tip + ch.s;
    if (pinned.includes(tip)) continue;
    const Q = fkAt(pose, seg, pos)[tip], sup = supportAt(Q);
    if (Q.y >= sup - 0.5) continue;
    reachTip(pose, seg, pos, ch, { x: Q.x, y: sup, z: Q.z }, 1);
  }
}

/* resolved steps' world points (cached: a resolved step never changes after resolveSequence) */
const WORLD_CACHE = new WeakMap();
function worldOf(r, seg) {
  let w = WORLD_CACHE.get(r);
  if (!w) { const keep = SUPPORTS; SUPPORTS = r.supports || SUPPORTS; w = fkAt(r.pose, seg, place(r.pose, seg, r.rule, false)); SUPPORTS = keep; WORLD_CACHE.set(r, w); }   // (the frame's own surfaces stay: a rolling roller differs from both steps')
  return w;
}
const PIN_CACHE = new WeakMap();
function sharedPin(a, b, seg) {
  let m = PIN_CACHE.get(a); if (!m) PIN_CACHE.set(a, (m = new Map()));
  if (m.has(b)) return m.get(b);
  let rule = null;
  const A = fkAt(a.pose, seg, place(a.pose, seg, a.rule)), B = fkAt(b.pose, seg, place(b.pose, seg, b.rule));
  // (an airborne step's "lift" doesn't count: the foot that pushed off lands where it was)
  const la = num(a.rule.lift), lb = num(b.rule.lift);
  const same = k => k && A[k] && B[k] && Math.hypot(A[k].x - B[k].x, A[k].z - B[k].z) < 2 && Math.abs(A[k].y - B[k].y) < 2 + Math.abs(la - lb) && A[k].y - supportAt(A[k]) <= 3 + la;
  // same pin name but a different spot (the foot that was on the step is now on the floor) doesn't count as staying put
  if (!(a.rule.anchor === b.rule.anchor && same(a.rule.anchor))) {
    if (same(b.rule.anchor)) rule = b.rule; else if (same(a.rule.anchor)) rule = a.rule;
    else {
      // neither step's own pin stays put, but something else does (the foot that stays on the floor while
      // the other steps down): pin that for the whole move
      const k = ['ankleL', 'ankleR', 'handL', 'handR', 'kneeL', 'kneeR', 'pelvis', 'elbowL', 'elbowR', 'neckBase', 'toeL', 'toeR'].find(same);
      if (k) rule = { anchor: k, x: A[k].x, z: A[k].z, lift: 0 };
    }
  }
  m.set(b, rule);
  return rule;
}

/* One playback frame: blend two resolved keyframes at eased progress e; returns the pose, camera and pelvis position */
function frameAt(a, b, e, seg) {
  SUPPORTS = b.supports || a.supports || [];
  // a foam roller rolls along with the move (it's where it was at a, then b)
  if (a.supports && b.supports && rollerDz(a.supports) !== rollerDz(b.supports)) SUPPORTS = rolledSupports(a.supports, lerp(rollerDz(a.supports), rollerDz(b.supports), e));
  const frameSupports = SUPPORTS;
  // joints turn exactly as written (an angle may be written as e.g. -270 instead of 90 to pick the direction)
  const pose = lerpPose(a.pose, b.pose, e);
  const cam = lerp(a.cam, b.cam, e);
  // if one step's pin is also resting at the same spot in the other step, use it for the whole move (no sliding)
  const rule = sharedPin(a, b, seg);
  SUPPORTS = frameSupports;
  const pa = place(pose, seg, rule || a.rule, false), pb = place(pose, seg, rule || b.rule, false);
  const pos = V3.lerp(pa, pb, e);
  const lift = lerp(num(a.rule.lift), num(b.rule.lift), e);
  const pinned = rule ? [rule.anchor] : [a.rule.anchor, b.rule.anchor];
  if (e > 0 && e < 1) {
    // rolling on a foam roller: a segment that rests on it at both ends of the move (the same "touch" in both steps)
    // stays on it the whole way, by the same joint, while the pin holds (in-between angles alone would lift it off);
    // so do the other touches both steps share (a foot on the floor), in the order written
    const r0 = rule || (a.rule.anchor === b.rule.anchor ? a.rule : null);
    const rolls = r0 && SUPPORTS.some(k => k.type === 'roller') ? (a.touch || []).filter(t => (b.touch || []).some(u => u.point === t.point && u.adjust === t.adjust)) : [];
    const flat = () => { for (const s of (a.plant || []).filter(x => (b.plant || []).includes(x))) pose['ankle' + s] = flatAnkle(pose, s, seg); };   // (feet planted at both ends stay flat)
    for (let pass = 0; pass < (rolls.length > 1 ? 4 : 1); pass++) for (const t of rolls) solveTouch(pose, seg, r0, t, flat);   // (over again when they pull on each other)
    if (rolls.length) {
      Object.assign(pos, rule ? place(pose, seg, rule, false) : V3.lerp(place(pose, seg, a.rule, false), place(pose, seg, b.rule, false), e));
      // a foot or hand planted on the same spot at both ends (the top foot pushing) stays on it: the limb reaches back
      const A = worldOf(a, seg), B = worldOf(b, seg);
      for (const ch of CHAINS) {
        const tip = ch.tip + ch.s;
        if (tip === r0.anchor || V3.dist(A[tip], B[tip]) > 2 || A[tip].y - supportAt(A[tip]) > 3) continue;
        // (aimed from where it is at one end to where it is at the other, so the move arrives exactly on the next step)
        const T = { [tip]: V3.lerp(A[tip], B[tip], e), ['toe' + ch.s]: V3.lerp(A['toe' + ch.s], B['toe' + ch.s], e) };
        if (ch.root === 'hip') holdFoot(pose, seg, pos, ch, T, flat); else reachTip(pose, seg, pos, ch, T[tip], 1);
      }
    }
    // rolling, the feet and hands slide along the floor with it rather than stepping
    if (!rolls.length) { slideContacts(a, b, e, pose, seg, pos, pinned); clampTips(a, b, pose, seg, pos, pinned); }
    // a foot that tips its toes into the floor flexes at the ankle instead of pushing the body up
    for (const s of ['L', 'R']) {
      const P = fkAt(pose, seg, pos);
      if (P['toe' + s].y >= supportAt(P['toe' + s]) - 0.5 || P['ankle' + s].y < supportAt(P['ankle' + s]) - 0.5) continue;
      const a0 = pose['ankle' + s];
      const th = root1D(x => { pose['ankle' + s] = x; const Q = fkAt(pose, seg, pos)['toe' + s]; return Q.y - supportAt(Q) - 0.25; }, a0, 120, 2);
      pose['ankle' + s] = th == null ? a0 : th;
    }
    // a hand planted on the same spot at both ends (the hand under a Turkish get-up) stays on it: the arm reaches back
    if (!rolls.length) {
      const A = worldOf(a, seg), B = worldOf(b, seg);
      for (const ch of CHAINS) {
        const tip = ch.tip + ch.s;
        if (ch.root !== 'shoulder' || pinned.includes(tip) || V3.dist(A[tip], B[tip]) > 2 || A[tip].y - supportAt(A[tip]) > 3) continue;
        reachTip(pose, seg, pos, ch, A[tip], 1);
      }
    }
    // toes resting on the same spot of a raised surface at both ends (the back foot on a bench) stay on it: the leg
    // reaches so the toe lands back where it was (twice, since moving the ankle moves the toe too)
    const A = worldOf(a, seg), B = worldOf(b, seg);
    for (const ch of CHAINS) {
      if (ch.root !== 'hip') continue;
      const toe = 'toe' + ch.s, T = A[toe];
      if (pinned.includes(ch.tip + ch.s) || supportAt(T) < 5 || T.y - supportAt(T) > 3 || V3.dist(T, B[toe]) > 3) continue;
      for (let it = 0; it < 2; it++) {
        const P = fkAt(pose, seg, pos);
        reachTip(pose, seg, pos, ch, V3.add(P[ch.tip + ch.s], V3.sub(T, P[toe])), 1);
      }
    }
  }
  // anything still below the floor mid-move lifts the whole body smoothly
  // hanging (either step holds a hand at a height): only kept out of the floor; otherwise resting on it
  const hang = a.rule.y != null || b.rule.y != null, g = groundY(pose, seg, pos, lift);
  pos.y = hang ? Math.max(pos.y, g - lift) : g;
  // hanging at both ends: a hand gripping the same spot in both (the one that isn't the anchor) stays on it
  if (a.rule.y != null && b.rule.y != null && e > 0 && e < 1) {
    const A = worldOf(a, seg), B = worldOf(b, seg);
    for (const ch of CHAINS) {
      const tip = ch.tip + ch.s;
      if (ch.root !== 'shoulder' || tip === a.rule.anchor || V3.dist(A[tip], B[tip]) > 3) continue;
      reachTip(pose, seg, pos, ch, A[tip], 1);
    }
  }
  return { pose, cam, pos, supports: frameSupports };
}

/* a foot kept where it was (A: that step's world points): the leg reaches the ankle back, flat if planted (flat()), and
   the hip turns until the toes are back too, so the foot doesn't swivel on the spot */
function holdFoot(pose, seg, pos, ch, A, flat = () => {}) {
  const tip = 'ankle' + ch.s, toe = 'toe' + ch.s, hk = 'hip' + ch.s;   // (A: where the ankle and toes go)
  // (each try from the same leg: reachTip answers nearest to the angles it starts from; a hip swinging sideways costs
  // as much as a toe off its spot)
  const leg = [hk, 'knee' + ch.s, 'ankle' + ch.s].map(k => [k, Array.isArray(pose[k]) ? [...pose[k]] : pose[k]]), s0 = pose[hk][1];
  const miss = t => { for (const [k, v] of leg) pose[k] = Array.isArray(v) ? [...v] : v; pose[hk][2] = t; reachTip(pose, seg, pos, ch, A[tip], 1); flat(); const q = fkAt(pose, seg, pos)[toe]; return Math.hypot(q.x - A[toe].x, q.z - A[toe].z) + Math.abs(pose[hk][1] - s0); };
  const t0 = pose[hk][2];
  let bt = t0, bm = miss(bt);
  for (const step of [4, 1, 0.25]) { const c = bt; for (let k = -4; k <= 4; k++) { const t = c + k * step; if (Math.abs(t - t0) > 25) continue; const m = miss(t); if (m < bm - 0.05) { bm = m; bt = t; } } }   // (within 25°)
  miss(bt);
}

/* touch: turn one joint (or one number of a ball joint) until a point lands on the floor, nearest to the angle written */
function solveTouch(pose, seg, rule, t, applyPlant) {
  const f = th => {
    setJ(pose, t.adjust, th); applyPlant();
    return clearance(fkAt(pose, seg, place(pose, seg, rule, false)), t.point) - num(t.gap);    // raw anchor pin, so the solver sees the true height
  };
  const a0 = getJ(pose, t.adjust);
  let best = root1D(f, a0, 80, 1);
  if (best == null) {                                                     // can't reach: as close as it gets
    let bestAbs = Infinity; best = a0;
    for (let d = -80; d <= 80; d++) { const y = Math.abs(f(a0 + d)); if (y < bestAbs) { bestAbs = y; best = a0 + d; } }
  }
  setJ(pose, t.adjust, best); applyPlant();
  return best;
}

function resolveKeyframe(kf, seg, ex = {}) {
  const pose = normPose(kf.pose);
  const cam = kf.camera != null ? num(kf.camera) : 90;
  const plant = kf.plant || [];
  const auto = new Set();
  const applyPlant = () => { for (const s of plant) { pose['ankle' + s] = flatAnkle(pose, s, seg); auto.add('ankle' + s); } };
  applyPlant();
  const rule = { anchor: kf.anchor || null, x: num(kf.anchorX), z: num(kf.anchorZ), lift: num(kf.lift), y: kf.anchor && kf.anchorY != null ? num(kf.anchorY) : null };
  const misses = [];
  for (const t of (kf.touch || [])) { solveTouch(pose, seg, rule, t, applyPlant); auto.add(t.adjust.includes('.') ? t.adjust : t.adjust + '.forward'); }
  // reach: put a hand on another body part (hold the ankle, hand on the knee...)
  for (const r of (kf.reach || [])) {
    if (typeof r.to !== 'string' || r.to === 'wall' || r.to === 'chair') continue;
    const pos = place(pose, seg, rule), P = fkAt(pose, seg, pos);
    if (!P[r.to]) continue;
    solveReach(pose, seg, rule, r, reachTarget(P, r));
    auto.add('shoulder' + r.hand.slice(-1)); auto.add('elbow' + r.hand.slice(-1));
  }
  for (const t of (kf.touch || [])) {
    const gap = clearance(fkAt(pose, seg, place(pose, seg, rule, false)), t.point) - num(t.gap);
    if (Math.abs(gap) > 2) misses.push({ point: t.point, adjust: t.adjust, gap });
  }
  return {
    pose, cam, rule, auto, misses, touch: kf.touch || [], plant: kf.plant || [], reach: kf.reach || [], holds: Array.isArray(kf.holds) ? kf.holds : null, ease: kf.ease || 'smooth', guide: kf.guide || null, name: kf.name || '', cue: kf.cue || '', quiet: !!kf.quiet,
    dur: kf.durationMs == null ? 1000 : Math.max(0, num(kf.durationMs)), hold: Math.max(0, kf.holdMs == null ? 500 : num(kf.holdMs))
  };
}
const reachTarget = (P, r) => V3.add(P[r.to], { x: num(r.dx), y: num(r.dy), z: num(r.dz) });
function solveReach(pose, seg, rule, r, T) {
  const s = r.hand.slice(-1), ch = CHAINS.find(k => k.root === 'shoulder' && k.s === s);
  reachTip(pose, seg, place(pose, seg, rule), ch, T, 1, false);
}

/* ---------- Equipment (props) ---------- */
const PROP_TYPES = ['band', 'towel', 'strap', 'ring', 'wall', 'chair', 'bench', 'step', 'block', 'ball', 'roller', 'dumbbell', 'kettlebell', 'barbell', 'medball', 'bar'];
/* a Pilates ring (magic circle) between two points (hands, knees): 68 across (38 cm); pressed together it flattens
   into an oval, the long way across the press, the short way the gap between the points */
function ringSVG(pr, P, proj, cls) {
  const a = P[pr.from], b = P[pr.to]; if (!a || !b) return '';
  // a circle in 3D: across the press line (u) and upright (v, the world's up made square to u; forward if the press
  // is vertical), drawn by its points on screen
  const gap = Math.max(12, Math.min(68, V3.dist(a, b))), across = Math.min(95, 68 * 68 / gap);
  const c = V3.lerp(a, b, 0.5), u = V3.dist(a, b) > 1 ? V3.unit(V3.sub(b, a)) : { x: 1, y: 0, z: 0 };
  let up = { x: 0, y: 1, z: 0 }; if (Math.abs(V3.dot(up, u)) > 0.9) up = { x: 0, y: 0, z: 1 };
  const v = V3.unit(V3.sub(up, V3.mul(u, V3.dot(up, u))));
  const pts = [];
  for (let i = 0; i < 24; i++) { const t = i / 24 * 2 * Math.PI; pts.push(proj(V3.add(c, V3.add(V3.mul(u, Math.cos(t) * gap / 2), V3.mul(v, Math.sin(t) * across / 2))))); }
  return `<path class="${cls}" d="M${pts.map(q => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join('L')}Z"/>`;
}
/* a pull-up bar: y high, z forward of the stage centre, width side to side (a doorway bar, 90); seen end-on, a dot */
function barSVG(pr, proj, cls) {
  const w = num(pr.width) || 90, a = proj({ x: -w / 2, y: num(pr.y), z: num(pr.z) }), b = proj({ x: w / 2, y: num(pr.y), z: num(pr.z) });
  // (drawn in front of the hands that hold it; end-on, the round end shows as a dot)
  return `<line class="${cls}" x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"/>` +
    `<circle class="${cls}-end" cx="${((a.x + b.x) / 2).toFixed(1)}" cy="${((a.y + b.y) / 2).toFixed(1)}" r="5"/>`;
}
const WEIGHT_TYPES = ['dumbbell', 'kettlebell', 'barbell', 'medball'];
/* Hand-held weights, drawn where the hands are. A dumbbell's "axis" is its bar direction relative to the body:
   "lr" left-right (the usual grip), "fb" front-back (neutral grip), "ud" up-down (held upright, like a goblet
   squat). P: world points; M0: the body's rotation (the whole-body joint); proj: world point -> screen {x, y}. */
/* Which hands hold the weight (a kettlebell passed from hand to hand): a step's "holds" (["handR"], or both hands at
   the pass), shared between the hands; between two steps the grip moves from one to the other. null: as the prop says. */
function gripAt(a, b, e) {
  const w = h => (h ? { handL: h.includes('handL') ? 1 / h.length : 0, handR: h.includes('handR') ? 1 / h.length : 0 } : null);
  const A = w(a && a.holds), B = w(b && b.holds);
  if (!A && !B) return null;
  const x = A || B, y = B || A;
  return { handL: lerp(x.handL, y.handL, e), handR: lerp(x.handR, y.handR, e) };
}
function weightSVG(pr, P, M0, proj, grip = null) {
  const f = n => n.toFixed(1);
  const bar = (a, b, cls = 'wt-bar') => `<line class="${cls}" x1="${f(a.x)}" y1="${f(a.y)}" x2="${f(b.x)}" y2="${f(b.y)}"/>`;
  const plate = (c, ux, uy, half) => bar({ x: c.x - uy * half, y: c.y + ux * half }, { x: c.x + uy * half, y: c.y - ux * half }, 'wt-plate');
  if (pr.type === 'dumbbell') {
    const h = P[pr.hand]; if (!h) return '';
    const ax = { lr: [1, 0, 0], fb: [0, 0, 1], ud: [0, 1, 0] }[pr.axis || 'lr'] || [1, 0, 0], dir = mv(M0, ...ax);
    const A = proj(V3.add(h, V3.mul(dir, -15))), B = proj(V3.add(h, V3.mul(dir, 15))), H = proj(h);
    const L = Math.hypot(B.x - A.x, B.y - A.y);
    if (L < 8) return `<circle class="wt" cx="${f(H.x)}" cy="${f(H.y)}" r="9"/><circle class="wt-hub" cx="${f(H.x)}" cy="${f(H.y)}" r="3"/>`;   // seen end-on
    const ux = (B.x - A.x) / L, uy = (B.y - A.y) / L;
    return bar(A, B) + plate(A, ux, uy, 8) + plate(B, ux, uy, 8);
  }
  if (pr.type === 'kettlebell') {
    const hands = (pr.hands || [pr.hand]).map(k => P[k]).filter(Boolean); if (!hands.length) return '';
    let hc = V3.mul(hands.reduce((s, p) => V3.add(s, p), { x: 0, y: 0, z: 0 }), 1 / hands.length);
    // it hangs on in line with the forearm, or with both forearms (their directions averaged, by grip) when both hold it
    const w = grip || (pr.hands && pr.hands.length > 1 ? { handL: 0.5, handR: 0.5 } : { [pr.hand || pr.hands[0]]: 1 });
    if (grip) hc = V3.add(V3.mul(P.handL, grip.handL), V3.mul(P.handR, grip.handR));   // passed between the hands: where the grip is
    let sum = { x: 0, y: 0, z: 0 };
    for (const s of ['L', 'R']) if (w['hand' + s] > 0 && P['elbow' + s]) sum = V3.add(sum, V3.mul(V3.unit(V3.sub(P['hand' + s], P['elbow' + s])), w['hand' + s]));
    const dir = V3.len(sum) > 0.1 ? V3.unit(sum) : { x: 0, y: -1, z: 0 };
    const H = proj(hc), Bl = proj(V3.add(hc, V3.mul(dir, 15)));       // the bell hangs on, in line with the forearm
    return bar(H, Bl) + `<circle class="wt" cx="${f(Bl.x)}" cy="${f(Bl.y)}" r="11"/>`;
  }
  if (pr.type === 'medball') {                                          // a medicine ball, held in both hands (r 20: about 23 cm)
    const hands = (pr.hands || ['handL', 'handR']).map(k => P[k]).filter(Boolean); if (!hands.length) return '';
    const c = proj(V3.mul(hands.reduce((s, p) => V3.add(s, p), { x: 0, y: 0, z: 0 }), 1 / hands.length));
    return `<circle class="wt medball" cx="${f(c.x)}" cy="${f(c.y)}" r="20"/><path class="wt-seam" d="M${f(c.x - 20)} ${f(c.y)}Q${f(c.x)} ${f(c.y - 9)} ${f(c.x + 20)} ${f(c.y)}"/>`;
  }
  if (pr.type === 'barbell') {
    const a = P[pr.from], b = P[pr.to]; if (!a || !b) return '';
    const mid = V3.lerp(a, b, 0.5), dir = V3.dist(a, b) > 1 ? V3.unit(V3.sub(b, a)) : mv(M0, 1, 0, 0), half = Math.max(V3.dist(a, b) / 2 + 45, 90);
    const A = proj(V3.add(mid, V3.mul(dir, -half))), B = proj(V3.add(mid, V3.mul(dir, half))), M = proj(mid);
    const L = Math.hypot(B.x - A.x, B.y - A.y);
    if (L < 24) return `<circle class="wt" cx="${f(M.x)}" cy="${f(M.y)}" r="20"/><circle class="wt-hub" cx="${f(M.x)}" cy="${f(M.y)}" r="4"/>`;
    const ux = (B.x - A.x) / L, uy = (B.y - A.y) / L, in6 = (p, k) => ({ x: p.x + ux * 6 * k, y: p.y + uy * 6 * k });
    return bar(A, B) + plate(in6(A, 1), ux, uy, 20).replace('wt-plate', 'wt-plate big') + plate(in6(B, -1), ux, uy, 20).replace('wt-plate', 'wt-plate big');
  }
  return '';
}
function mirrorProps(props) {
  const sw = e => (typeof e === 'string' ? swapSide(e) : e && typeof e === 'object' ? { ...e, x: -num(e.x) } : e);
  return (props || []).map(pr => {
    const out = { ...pr, from: sw(pr.from), to: sw(pr.to), at: sw(pr.at), via: pr.via && pr.via.map(sw), hand: sw(pr.hand), hands: pr.hands && pr.hands.map(sw) };
    if (pr.x != null) out.x = -num(pr.x);
    if (pr.type === 'wall' && pr.beside && pr.offset != null) out.offset = -num(pr.offset);
    for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
    return out;
  });
}
/* A resistance band runs between two body points (or a fixed spot: {x, y, z} from the stage centre and the floor).
   Its rest length is the shortest it gets in the routine, so it is just taut at its slackest and stretches as it is
   pulled. */
function propPoint(P, end) {
  if (typeof end === 'string') return P[end];
  if (end && typeof end === 'object') return { x: num(end.x), y: num(end.y), z: num(end.z) };
  return null;
}
function propRoute(P, pr) {
  const pts = [pr.from, ...(pr.via || []), pr.to].map(end => propPoint(P, end));
  return pts.every(Boolean) ? pts : null;
}
/* the fixed ends of a band (a door anchor): screen points to mark with a small strap */
const bandAnchors = (pr, Q) => [pr.from, pr.to].map((end, i) => (end && typeof end === 'object' ? Q[i ? Q.length - 1 : 0] : null)).filter(Boolean);
const anchorSVG = (q, cls) => `<rect class="${cls}" x="${(q.x - 5).toFixed(1)}" y="${(q.y - 7).toFixed(1)}" width="10" height="14" rx="2"/>`;
const routeLength = pts => pts.slice(1).reduce((s, p, i) => s + V3.dist(p, pts[i]), 0);
function bandRestLengths(props, resolved, seg) {
  return (props || []).map(pr => {
    if (pr.type === 'strap') return strapLength(pr, resolved, seg);
    if (pr.type !== 'band') return null;
    if (pr.restLength) return pr.restLength;
    let min = Infinity;
    for (const r of resolved) {
      SUPPORTS = r.supports || SUPPORTS;
      const pts = propRoute(fkAt(r.pose, seg, place(r.pose, seg, r.rule)), pr);
      if (pts) min = Math.min(min, routeLength(pts));
    }
    return isFinite(min) ? Math.max(min, 10) : 100;
  });
}
/* A yoga strap doesn't stretch: its length is its longest route in the exercise plus a hand's grip (or "length"). */
function strapLength(pr, resolved, seg) {
  if (pr.length) return pr.length;
  let max = 0;
  for (const r of resolved) {
    SUPPORTS = r.supports || SUPPORTS;
    const pts = propRoute(fkAt(r.pose, seg, place(r.pose, seg, r.rule)), pr);
    if (pts) max = Math.max(max, routeLength(pts));
  }
  return max + 16;
}
/* its route plus what's left over, hanging from the ends (the hands) by half each, so the drawn length never changes */
function strapPoints(pts, len) {
  const tail = Math.max(0, len - routeLength(pts)) / 2;
  // down from the end; what reaches the floor lies along it, on away from the strap's next point
  const hang = (p, q) => {
    const drop = Math.min(tail, Math.max(0, p.y - 2)), rest = tail - drop, down = { x: p.x, y: p.y - drop, z: p.z };
    if (rest <= 0.5) return [down];
    const dx = p.x - q.x, dz = p.z - q.z, n = Math.hypot(dx, dz) || 1;
    return [down, { x: down.x + (n > 1 ? dx / n : 1) * rest, y: down.y, z: down.z + (n > 1 ? dz / n : 0) * rest }];
  };
  const n = pts.length;
  return [...hang(pts[0], pts[1]).reverse(), ...pts, ...hang(pts[n - 1], pts[n - 2])];
}
/* the band on screen: pts are world points, Q their screen points. Slack bands sag, stretched ones thin */
function bandPathRoute(pts, Q, rest) {
  const stretch = routeLength(pts) / rest, f = n => n.toFixed(1);
  if (Q.length === 2 && stretch < 1) {
    const [a, b] = Q, sag = Math.sqrt(Math.max(0, rest * rest - routeLength(pts) ** 2)) / 2;
    const mx = (a.x + b.x) / 2, my = Math.min((a.y + b.y) / 2 + sag, FLOOR + 3);
    return { d: `M${f(a.x)} ${f(a.y)}Q${f(mx)} ${f(my)} ${f(b.x)} ${f(b.y)}`, width: 5, stretch };
  }
  return { d: 'M' + Q.map(p => `${f(p.x)} ${f(p.y)}`).join('L'), width: Math.max(2, 5 / Math.sqrt(Math.max(1, stretch))), stretch };
}

/* ---------- Walls ----------
   A wall stands where a chosen body point is in one step ("at", "keyframe"), or at a fixed "z" (or "x"), then stays
   put. It is in front of or behind the figure, or with "beside": true, at its side. */
function wallsOf(props, R, seg) {
  return (props || []).map(pr => {
    if (pr.type !== 'wall' || !R.length) return null;
    const axis = pr.beside ? 'x' : 'z';
    const k = R[Math.min(R.length - 1, Math.max(0, num(pr.keyframe)))];
    const P = fkAt(k.pose, seg, place(k.pose, seg, k.rule));
    return { axis, at: (typeof pr.at === 'string' && P[pr.at] ? P[pr.at][axis] : num(pr[axis])) + num(pr.offset) };
  });
}
/* where a wall is on screen, and how much it shows: a wall seen edge-on is a line; one facing the camera fades */
function wallOnScreen(wl, yaw) {
  const s = Math.sin(yaw * D2R), c = Math.cos(yaw * D2R);
  return wl.axis === 'z' ? { x: CX + wl.at * s, show: Math.abs(s) } : { x: CX - wl.at * c, show: Math.abs(c) };
}

/* Resolve a whole sequence and hand the floor contact over between steps: when a step pins a different point
   (say the hands instead of the feet), that point is pinned exactly where it already was, so nothing slides. */
/* Travel (an exercise with "travel": true walks, side-steps or carries across the floor): a rep ends further along
   than it starts, and the next rep carries on from there. travelOf(a, b) is how far: where the rep's first step b
   pins its point (the foot that stays) is at the end of the rep a, less where it is in b. travelStep(a, b) is a moved
   back by that much, so the move from the rep's end into its next start is the step it is, not a slide back. */
function travelOf(a, b, seg) {
  const k = b.rule.anchor || 'pelvis';
  SUPPORTS = a.supports || SUPPORTS;
  const A = fkAt(a.pose, seg, place(a.pose, seg, a.rule))[k], B = fkAt(b.pose, seg, place(b.pose, seg, b.rule))[k];
  return { x: A.x - B.x, z: A.z - B.z };
}
const TRAVEL_CACHE = new WeakMap();
function travelStep(a, b, seg) {
  let m = TRAVEL_CACHE.get(a); if (!m) TRAVEL_CACHE.set(a, (m = new Map()));
  if (!m.has(b)) { const d = travelOf(a, b, seg); m.set(b, { ...a, rule: { ...a.rule, x: num(a.rule.x) - d.x, z: num(a.rule.z) - d.z } }); }
  return m.get(b);
}
/* A foam roller isn't fixed: it rolls along the floor as the body rolls over it, half as far as the part on it moves
   (rolling on both faces, slipping on neither). Each step's roller is where that step's move left it: from the first
   step, half how far the same spot of the rolling segment (the one touching it there) has moved. The steps are
   resolved again with the roller there until it settles. */
function resolveSequence(keyframes, seg, ex = {}, props = ex.props) {
  const base = surfacesFrom(props);
  let R = resolvePass(keyframes, seg, ex, props, base, null);
  if (!base.some(s => s.type === 'roller')) return R;
  // first guess: the steps as written, without what rests on the roller (resting on an unmoved roller bends them)
  const free = resolvePass(keyframes.map(k => ({ ...k, touch: (k.touch || []).filter(t => !SEGMENTS[t.point]) })), seg, ex, props, base, null);
  for (let it = 0; it < 4; it++) {
    const dz = rollerTravel(R, keyframes, seg, it ? R : free);
    if (!dz) break;
    const moved = R.some((r, i) => Math.abs(rollerDz(r.supports) - dz[i]) > 0.05);
    R = resolvePass(keyframes, seg, ex, props, base, dz);
    if (!moved) break;
  }
  return R;
}
/* how far the roller has rolled at each step: half the travel along the floor of the spot that rests on it at the first step */
function rollerTravel(R, keyframes, seg, M = R) {
  // (a segment on it, or failing that a point: the seat, sitting on it)
  const on = k => { SUPPORTS = R[0].supports; const P = worldOf(R[0], seg), q = SEGMENTS[k.point] ? segmentPoints(P, k.point, 40) : P[k.point] ? [P[k.point]] : [];
    return q.some(v => SUPPORTS.some(s => s.type === 'roller' && Math.abs(v.z - s.cz) < s.r && v.x >= s.x0 && v.x <= s.x1) && Math.abs(v.y - supportAt(v)) < 3); };
  const touches = (keyframes[0] && keyframes[0].touch) || [];
  const t = touches.find(k => SEGMENTS[k.point] && on(k)) || touches.find(k => SEGMENTS[k.point]) || touches.find(k => on(k));
  if (!t) return null;
  const spot = (r, frac) => { const P = worldOf(r, seg), pts = SEGMENTS[t.point] ? segmentPoints(P, t.point, 40) : [P[t.point]]; return frac == null ? pts : pts[Math.round(frac * (pts.length - 1))]; };
  SUPPORTS = R[0].supports;
  const pts0 = spot(R[0]);
  let best = 0, low = Infinity;
  pts0.forEach((q, i) => { const c = q.y - supportAt(q); if (c < low) { low = c; best = i; } });
  const f = pts0.length > 1 ? best / (pts0.length - 1) : 0;
  const m0 = spot(M[0], f).z;
  return M.map((r, i) => (i ? (spot(r, f).z - m0) / 2 : 0));
}
function resolvePass(keyframes, seg, ex, props, base, dz) {
  const supAt = i => (dz ? rolledSupports(base, dz[i]) : base);
  const R = keyframes.map((kf, i) => { SUPPORTS = supAt(i); return resolveKeyframe(kf, seg, ex); });
  R.forEach((r, i) => { r.supports = supAt(i); r.step = i; });
  SUPPORTS = R.supports = R.length ? R[0].supports : base;
  R.bars = (props || []).filter(p => p.type === 'bar');                 // pull-up bars, for framing
  const onFloor = (P, k, sup) => { SUPPORTS = sup; return P[k].y - supportAt(P[k]) <= 3; };
  for (let i = 1; i < R.length; i++) {
    const a = R[i - 1], b = R[i];
    if (b.rule.y != null) continue;                                      // hanging: held where it says
    SUPPORTS = a.supports; const A = fkAt(a.pose, seg, place(a.pose, seg, a.rule));
    SUPPORTS = b.supports; const B = fkAt(b.pose, seg, place(b.pose, seg, b.rule));
    // the point that stays on the floor through the move: the previous pin if it still touches, else another shared contact
    // (the step's own pin goes first when it was already resting somewhere, e.g. the foot placed on a step)
    const order = [b.rule.anchor, a.rule.anchor, 'handR', 'handL', 'elbowR', 'elbowL', 'ankleR', 'ankleL', 'kneeR', 'kneeL',
      'toeR', 'toeL', 'pelvis', 'neckBase', 'headLow'].filter(Boolean);
    const shared = order.find(k => onFloor(A, k, a.supports) && onFloor(B, k, b.supports));
    if (!shared) continue;                                               // nothing stays down: leave the step where it is
    b.rule.anchor = shared;
    b.rule.x = A[shared].x; b.rule.z = A[shared].z;
  }
  // steps that were re-pinned (say onto a step) re-aim their floor contacts from where they now stand
  R.forEach((r, i) => {
    const kf = keyframes[i];
    const own = { anchor: kf.anchor || null, x: num(kf.anchorX), z: num(kf.anchorZ), y: kf.anchor && kf.anchorY != null ? num(kf.anchorY) : null };
    if (!(kf.touch || []).length || (r.rule.anchor === own.anchor && r.rule.x === own.x && r.rule.z === own.z)) return;
    SUPPORTS = r.supports;
    const applyPlant = () => { for (const s of kf.plant || []) r.pose['ankle' + s] = flatAnkle(r.pose, s, seg); };
    for (const t of kf.touch) if (t.point !== r.rule.anchor) solveTouch(r.pose, seg, r.rule, t, applyPlant);   // the pinned point is already down
  });
  // keep: hands or feet that stay exactly where they were in the previous step (feet planted while the hips lift...)
  const roller = base.some(k => k.type === 'roller');
  for (let i = 0; i < R.length; i++) {
    const kf = keyframes[i], keep = kf.keep || [];
    if (!keep.length || R.length < 2) continue;
    const b = R[i];
    for (const item of keep) {
      // "ankleR" = where it was in the previous step; { "point": "ankleR", "keyframe": 0 } = where it was in that step
      const tip = typeof item === 'string' ? item : item.point;
      const a = typeof item === 'object' && R[item.keyframe] ? R[item.keyframe] : R[(i - 1 + R.length) % R.length];
      SUPPORTS = a.supports; const A = fkAt(a.pose, seg, place(a.pose, seg, a.rule)); SUPPORTS = b.supports;
      const s = tip.slice(-1), ch = CHAINS.find(k => k.tip + k.s === tip);
      if (!ch) continue;
      const flatB = () => { if ((kf.plant || []).includes(s)) b.pose['ankle' + s] = flatAnkle(b.pose, s, seg); };
      if (ch.root === 'hip' && roller) holdFoot(b.pose, seg, place(b.pose, seg, b.rule), ch, A, flatB);   // (on a foam roller: the foot doesn't swivel either)
      else { reachTip(b.pose, seg, place(b.pose, seg, b.rule), ch, A[tip], 1, false); if (ch.root === 'hip') flatB(); }
      b.auto.add(ch.root + s); b.auto.add(ch.mid + s);
    }
  }
  SUPPORTS = R.supports;
  R.walls = wallsOf(props, R, seg);
  const grip = chairGrip();
  for (const r of R) for (const rc of r.reach) {
    let T = null;
    SUPPORTS = r.supports;
    const P = fkAt(r.pose, seg, place(r.pose, seg, r.rule)), sh = P['shoulder' + rc.hand.slice(-1)];
    if (rc.to === 'wall') {
      const wl = R.walls.find(Boolean);
      if (wl) T = wl.axis === 'z' ? { x: sh.x + num(rc.dx), y: sh.y + num(rc.dy), z: wl.at } : { x: wl.at, y: sh.y + num(rc.dy), z: sh.z + num(rc.dz) };
    }
    if (rc.to === 'chair' && grip) T = { x: sh.x + num(rc.dx), y: grip.y + num(rc.dy), z: grip.z + num(rc.dz) };   // hands on the chair back
    if (P[rc.to]) T = reachTarget(P, rc);                                                                           // re-aim after feet were kept in place
    if (!T) continue;
    solveReach(r.pose, seg, r.rule, rc, T);
    r.auto.add('shoulder' + rc.hand.slice(-1)); r.auto.add('elbow' + rc.hand.slice(-1));
  }
  return R;
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
/* The other direction of a circling exercise (or walking backward): the rep steps in reverse order. Each move takes
   the time of the move it reverses, so the rhythm is the same both ways, and holds on to what that move held on to:
   a step's pin is the foot that stays as the body moves into it, so a reversed step takes the pin of the step that
   came after it (a walk forward, played backward, keeps the other foot down; the same pin throughout changes nothing). */
const PIN_KEYS = ['anchor', 'anchorX', 'anchorY', 'anchorZ'];
function reverseReps(keyframes) {
  const { rep } = phaseInfo(keyframes);
  const n = rep.length, out = keyframes.map(k => ({ ...k }));
  const durOf = pos => keyframes[rep[pos]].durationMs;          // time to move INTO the step at rep position pos
  for (let j = 0; j < n; j++) {
    const src = keyframes[rep[n - 1 - j]], next = keyframes[rep[(n - j) % n]];
    const step = { ...src, durationMs: durOf((n - j) % n) };
    for (const k of PIN_KEYS) { delete step[k]; if (next[k] != null) step[k] = next[k]; }
    out[rep[j]] = step;
  }
  // a "keep" that points at a step by number must follow that step to its new place
  const movedTo = i => { const pos = rep.indexOf(i); return pos < 0 ? i : rep[n - 1 - pos]; };
  for (const k of out) if (k.keep) k.keep = k.keep.map(x => (typeof x === 'object' && x && Number.isInteger(x.keyframe) ? { ...x, keyframe: movedTo(x.keyframe) } : x));
  return out;
}

/* The other side: the mirror image. Left and right swap; turns and sideways leans change direction; limbs keep
   their numbers (they already say "out" and "turn out", not left or right) */
function swapSide(s) { return typeof s === 'string' ? s.replace(/([LR])$/, m => (m === 'L' ? 'R' : 'L')) : s; }
function mirrorPose(p) {
  const out = {};
  for (const [k, v] of Object.entries(p || {})) out[swapSide(k)] = SPINE.has(k) && Array.isArray(v) ? [v[0], -num(v[1]), -num(v[2])] : v;
  return out;
}
function mirrorKeyframe(kf) {
  const out = {
    ...kf, pose: mirrorPose(kf.pose),
    anchor: swapSide(kf.anchor),
    plant: (kf.plant || []).map(swapSide),
    touch: (kf.touch || []).map(t => ({ ...t, point: swapSide(t.point), adjust: swapSide(jointRef(t.adjust).j) + (String(t.adjust).includes('.') ? '.' + t.adjust.split('.')[1] : '') })),
    keep: (kf.keep || []).map(k => (typeof k === 'string' ? swapSide(k) : { ...k, point: swapSide(k.point) })),
    reach: (kf.reach || []).map(r => ({ ...r, hand: swapSide(r.hand), to: swapSide(r.to), ...(r.dx != null ? { dx: -num(r.dx) } : {}) })),
    ...(Array.isArray(kf.holds) ? { holds: kf.holds.map(swapSide) } : {}),
    guide: kf.guide ? { ...kf.guide, direction: -num(kf.guide.direction) } : kf.guide
  };
  if (kf.anchorX != null) out.anchorX = -num(kf.anchorX);
  return out;
}

if (typeof module !== 'undefined') module.exports = {
  phaseInfo, reverseReps, weightSVG, gripAt, supportY, supportAt, surfacesFrom, surfaceShapes, chairGrip, mirrorProps, mirrorPose, bandRestLengths, bandPathRoute,
  propRoute, propPoint, strapPoints, bandAnchors, anchorSVG, barSVG, ringSVG, resolveSequence, travelOf, travelStep, frameAt, groundY, fk, fkAt, place, project, drawOrder, boneOrder, BONES, partDepth, PARTS, resolveKeyframe, mirrorKeyframe, wallOnScreen,
  SEGMENTS, clearance, normPose, lerpPose, getJ, setJ, jointRef, rootM, ballM, limbAngles, V3, rx, mm, mtv, flatAnkle,
  DEFAULT_SEGMENTS, FLOOR, CX, W, CONTACT_POINTS, JOINT_KEYS, JOINTS, BALL, POINTS, COMPONENTS
};
