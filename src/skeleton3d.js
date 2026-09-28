/* ===== 3D skeleton, step 1 (see docs/3d-skeleton.md) =====
   Today's figure (core.js) is 2D: every step is drawn from one view, side or front, and anything toward or away from
   the camera is a "depth" angle that only shortens a limb on screen. This file gives every body point the third
   coordinate it was missing, so the same pose becomes a real 3D figure that can be looked at from any angle and drawn
   back to front.

   Frame (the figure's own): x = the figure's right, y = up, z = forward. The camera turns around the vertical axis:
   yaw 90 = the side view (camera on the figure's right, the figure facing screen-right), yaw 0 = the front view
   (facing the camera, the figure's right on screen left).

   Step 1 takes a v1 pose as its input: the points in the step's own picture plane come from core.js's fk() unchanged,
   and the depth comes from what the 2D figure leaves out: the hips' and shoulders' width, and the *Depth angles
   (a limb turned toward the camera by d goes L·sin(d) toward it: the 2D figure shows the other L·cos(d)).
   Seen from its own view the 3D figure is exactly today's picture (tools/check3d.cjs proves it for every step of
   every exercise); seen from anywhere else it's the same body, rigid, instead of two unrelated sets of angles. */
(function (root) {
  const C = typeof module !== 'undefined' ? require('./core.js') : root;
  const rad = d => (d || 0) * Math.PI / 180;

  /* 3D points of a pose, relative to the pelvis. v: the step's view (0 side, 1 front); in-between values are a
     camera turn in the 2D engine, and are taken as the nearer view. */
  function pose3d(pose, v, seg) {
    const front = v >= 0.5, P2 = C.fk(pose, front ? 1 : 0, seg, 0, 0), D = {};
    const side = s => (s === 'R' ? 1 : -1);               // +x is the figure's right
    // how far toward the camera each point sits (in its own view)
    D.pelvis = D.spine = D.neckBase = D.head = D.headTop = D.headLow = 0;
    for (const s of ['L', 'R']) {
      const hip = front ? 0 : side(s) * seg.hipHalf, sh = front ? 0 : side(s) * seg.shoulderHalf;
      const knee = hip + seg.thigh * Math.sin(rad(pose['thighDepth' + s]));
      const ankle = knee + seg.shin * Math.sin(rad(pose['shinDepth' + s]));
      const elbow = sh + seg.upperArm * Math.sin(rad(pose['armDepth' + s]));
      const hand = elbow + seg.lowerArm * Math.sin(rad(pose['forearmDepth' + s]));
      Object.assign(D, { ['hip' + s]: hip, ['knee' + s]: knee, ['ankle' + s]: ankle, ['toe' + s]: ankle, ['foot' + s]: ankle,
        ['shoulder' + s]: sh, ['elbow' + s]: elbow, ['hand' + s]: hand, ['armpit' + s]: sh, ['back' + s]: front ? -seg.shoulderHalf * 0.5 : sh * 0.6 });
    }
    // picture plane + depth -> 3D. Side: screen x = forward, depth = right. Front: screen x = left, depth = forward.
    const P = {};
    for (const [k, p] of Object.entries(P2)) P[k] = front ? { x: -p.x, y: -p.y, z: D[k] || 0 } : { x: D[k] || 0, y: -p.y, z: p.x };
    // Feet: the 2D front view draws them as short sideways stubs (they point at the camera, which it can't show).
    // A 3D foot points forward, so in front-view steps it's rebuilt: forward from the ankle, level with the old toe.
    if (front) for (const s of ['L', 'R']) {
      const a = P['ankle' + s], t = P['toe' + s];
      P['toe' + s] = { x: a.x, y: t.y, z: a.z + seg.foot };
      P['foot' + s] = { x: a.x, y: a.y + 0.6 * (t.y - a.y), z: a.z + 0.6 * seg.foot };
    }
    return P;
  }

  /* the camera: screen x/y (y down, like SVG) and depth (larger = nearer the camera) of each point */
  function project(P, yaw) {
    const s = Math.sin(rad(yaw)), c = Math.cos(rad(yaw)), out = {};
    for (const [k, p] of Object.entries(P)) out[k] = { x: p.z * s - p.x * c, y: -p.y, d: p.x * s + p.z * c };
    return out;
  }

  /* the figure's parts, to be drawn far to near: a part is only behind another if it really is */
  const PARTS = {
    legL: [['hipL', 'kneeL'], ['kneeL', 'ankleL'], ['ankleL', 'toeL']], legR: [['hipR', 'kneeR'], ['kneeR', 'ankleR'], ['ankleR', 'toeR']],
    armL: [['shoulderL', 'elbowL'], ['elbowL', 'handL']], armR: [['shoulderR', 'elbowR'], ['elbowR', 'handR']],
    body: [['pelvis', 'spine'], ['spine', 'neckBase'], ['neckBase', 'head']]
  };
  const partDepth = (Q, part) => { let s = 0, n = 0; for (const [a, b] of PARTS[part]) { s += Q[a].d + Q[b].d; n += 2; } return s / n; };
  function drawOrder(Q) { return Object.keys(PARTS).sort((a, b) => partDepth(Q, a) - partDepth(Q, b)); }

  /* which leg is further from the camera, in the step's own view: what the 2D engine's "layers" had to be told.
     null when the pose doesn't say (both legs at the same depth: a front-view pose with no depth angles) */
  function backLeg(pose, v, seg) {
    const Q = project(pose3d(pose, v, seg), v >= 0.5 ? 0 : 90), l = partDepth(Q, 'legL'), r = partDepth(Q, 'legR');
    return Math.abs(l - r) < 1 ? null : l < r ? 'L' : 'R';
  }

  const api = { pose3d, project, drawOrder, backLeg, PARTS };
  if (typeof module !== 'undefined') module.exports = api; else root.S3D = api;
})(typeof window !== 'undefined' ? window : globalThis);
