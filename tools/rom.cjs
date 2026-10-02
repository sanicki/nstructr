/* Range of motion (docs/3d-skeleton.md, "Joint model"): every step of every exercise (both sides, both directions,
   after touch/reach/keep are solved), compared with normal human range of motion and with what a flexible person
   reaches. The build fails on any joint past the flexible range (tools/build.mjs); past normal is only counted.
     node tools/rom.cjs          (lists every joint past the flexible range, and a summary) */
const fs = require('fs'), path = require('path');
const C = require('../src/core.js');
const { versions } = require('./checks.cjs');
const w = a => ((a % 360) + 540) % 360 - 180;
/* Degrees. Hips and shoulders are judged by where the limb points and how far it's turned about its own axis (not by
   the three numbers one by one, which change meaning near overhead): forward = how far in front of the body (from
   hanging), back = how far behind, out = out to its own side, across = past the middle; turn + = turned out.
   NORMAL: AAOS reference for typical adults. FLEXIBLE: what a trained, flexible person reaches (yoga, Pilates), with
   the pelvis and spine helping. The figure has no shoulder blades, which give a real arm about 30° more: the
   shoulder's flexible range includes them. */
const ROM = {
  normal: { hip: { forward: 120, back: 30, out: 45, across: 30, turn: [-40, 45] }, knee: [0, 135], shoulder: { back: 60, across: 40, turn: [-70, 90] }, elbow: [0, 150], shrug: [-10, 35] },
  flexible: { hip: { forward: 170, back: 60, out: 95, across: 45, turn: [-60, 90] }, knee: [-10, 165], shoulder: { back: 110, across: 60, turn: [-90, 110] }, elbow: [-10, 170], shrug: [-15, 45] }
};
const D = 180 / Math.PI;
/* where a limb points (u, in its parent's frame) and its turn about its own axis (swing–twist) */
function limb(a, s) {
  const k = s === 'R' ? 1 : -1, M = C.ballM(a, s);
  const u = { x: -M[1], y: -M[4], z: -M[7] }, z = { x: M[2], y: M[5], z: M[8] };
  // the swing: the shortest turn from hanging straight down to u (straight up: taken as raised forward)
  let ax = { x: -u.z, y: 0, z: u.x };                                 // (0,-1,0) × u
  let len = Math.hypot(ax.x, ax.z); const e = Math.acos(Math.max(-1, Math.min(1, -u.y)));
  if (len < 1e-6) { ax = { x: 1, y: 0, z: 0 }; len = 1; }
  ax = { x: ax.x / len, y: 0, z: ax.z / len };
  // rotate (0,0,1) about ax by e (Rodrigues)
  const c = Math.cos(e), sn = Math.sin(e), v = { x: 0, y: 0, z: 1 }, d = ax.z;
  const cr = { x: ax.y * v.z - ax.z * v.y, y: ax.z * v.x - ax.x * v.z, z: ax.x * v.y - ax.y * v.x };
  const zs = { x: v.x * c + cr.x * sn + ax.x * d * (1 - c), y: v.y * c + cr.y * sn + ax.y * d * (1 - c), z: v.z * c + cr.z * sn + ax.z * d * (1 - c) };
  const x2 = { x: zs.y * z.z - zs.z * z.y, y: zs.z * z.x - zs.x * z.z, z: zs.x * z.y - zs.y * z.x };
  const twist = -k * Math.atan2(u.x * x2.x + u.y * x2.y + u.z * x2.z, zs.x * z.x + zs.y * z.y + zs.z * z.z) * D;
  return {
    forward: u.z > 0 ? Math.atan2(u.z, -u.y) * D : 0, back: u.z < 0 ? Math.atan2(-u.z, -u.y) * D : 0,
    // out to the side: in the side-to-side plane when the limb is mostly in it (a leg raised sideways past horizontal),
    // otherwise how far it points away from the middle
    out: k * u.x > 0 ? (Math.abs(u.z) < 0.3 ? Math.atan2(k * u.x, -u.y) : Math.atan2(k * u.x, Math.hypot(u.y, u.z))) * D : 0, across: k * u.x < 0 ? Math.asin(Math.min(1, -k * u.x)) * D : 0,
    sideways: Math.abs(u.x), frontBack: Math.abs(u.z), twist, elevation: e * D
  };
}
function outOfRange(pose, which) {
  const L = ROM[which], out = [];
  const chk = (joint, v, [lo, hi]) => { if (v < lo - 0.5 || v > hi + 0.5) out.push({ joint, value: Math.round(v), range: [lo, hi] }); };
  const up = (joint, v, hi) => { if (v > hi + 0.5) out.push({ joint, value: Math.round(v), range: [0, hi] }); };
  for (const s of ['L', 'R']) {
    const h = limb(pose['hip' + s], s), sh = limb(pose['shoulder' + s], s);
    // how far a limb is turned depends on the path its swing is measured along (Codman's paradox); clinically it's
    // measured after the forward and side swings, which is the order of the joint's own numbers: its turn, in the
    // spelling with the smaller turn ([f, side, turn] or [f + 180, 180 − side, turn + 180])
    const turn = a => { const t = w(a[2]), t2 = w(a[2] + 180); return Math.abs(t) <= Math.abs(t2) ? t : t2; };
    h.twist = turn(pose['hip' + s]); sh.twist = turn(pose['shoulder' + s]);
    // forward/back only counts while the limb isn't mostly out to the side (and out only while it isn't mostly forward/back)
    if (h.sideways < 0.7) { up(`hip${s} forward`, h.forward, L.hip.forward); up(`hip${s} back`, h.back, L.hip.back); }
    up(`hip${s} out`, h.out, L.hip.out);
    up(`hip${s} across`, h.across, L.hip.across);
    chk(`hip${s} turn`, h.twist, L.hip.turn);
    chk(`knee${s}`, w(pose['knee' + s]) === -180 ? 180 : w(pose['knee' + s]), L.knee);
    // an arm can go forward, out and overhead all the way; what a shoulder can't do is reach far behind or across
    if (sh.sideways < 0.7 && sh.elevation < 150) up(`shoulder${s} back`, sh.back, L.shoulder.back);
    if (sh.elevation < 150) up(`shoulder${s} across`, sh.across, L.shoulder.across);
    chk(`shoulder${s} turn`, sh.twist, L.shoulder.turn);
    chk(`elbow${s}`, w(pose['elbow' + s]), L.elbow);
    chk(`shrug${s}`, w(pose['shrug' + s] || 0), L.shrug);
  }
  return out;
}
/* every joint past the flexible range in one exercise (all sides and directions): [{ label, step, name, joint, value, range }] */
function pastFlexible(ex) {
  const out = [];
  for (const { label, R } of versions(ex)) R.forEach((r, i) => { for (const x of outOfRange(r.pose, 'flexible')) out.push({ label, step: i + 1, name: r.name, ...x }); });
  return out;
}
module.exports = { ROM, outOfRange, limb, pastFlexible };
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
  console.log(`range of motion: ${steps} steps; past what a flexible person can do: ${pastFlexible.size} joints in ${exs.size} exercises`);
  console.log(`  past normal range (AAOS), by joint: ${[...pastNormal].map(([j, set]) => `${j} ${set.size}`).join(', ') || 'none'} (exercises; expected for yoga and deep stretches)`);
  for (const [k, where] of pastFlexible) console.log(`  ${k}  (${where})`);
}
