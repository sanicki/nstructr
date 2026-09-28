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
  const C = typeof module !== 'undefined' ? require('./core-v1.cjs') : root;
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

  /* ---------- Joint model (docs/3d-skeleton.md, "Joint model") ----------
     Modelled on an artist's mannequin: ball joints at the hips, shoulders, spine and neck; hinges at the knees and
     elbows. Measured here from the 3D points, in the body's own frame (so the numbers mean the same from any view),
     and compared with normal human range of motion (AAOS values). */
  const V = { sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }), dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
    cross: (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }),
    unit: a => { const l = Math.hypot(a.x, a.y, a.z) || 1; return { x: a.x / l, y: a.y / l, z: a.z / l }; } };
  const deg = r => r * 180 / Math.PI;
  /* the frame of a body part: right (hip to hip, or shoulder to shoulder), up (along the spine), forward */
  function frame(P, left, rightPt, low, high) {
    const up = V.unit(V.sub(P[high], P[low]));
    let r = V.sub(P[rightPt], P[left]); r = V.unit(V.sub(r, { x: up.x * V.dot(r, up), y: up.y * V.dot(r, up), z: up.z * V.dot(r, up) }));
    return { r, up, f: V.cross(r, up) };
  }
  /* a limb's direction as forward/back and out/in angles from hanging straight down, in a frame */
  function swing(F, dir, s) {
    const d = V.unit(dir), fwd = V.dot(d, F.f), down = -V.dot(d, F.up), out = V.dot(d, F.r) * (s === 'R' ? 1 : -1);
    return { flex: deg(Math.atan2(fwd, down)), abd: deg(Math.atan2(out, Math.hypot(fwd, down))), up: down < 0 };
  }
  /* a hinge's bend (0 = straight) and whether it bends the wrong way: a knee folds the shin back, an elbow folds the
     forearm forward, both around the part's left-right axis */
  function hinge(F, a, b, backward) {
    const u = V.unit(a), w = V.unit(b), bend = deg(Math.acos(Math.max(-1, Math.min(1, V.dot(u, w)))));
    const side = V.dot(V.cross(u, w), F.r);
    return { bend, wrongWay: bend > 15 && (backward ? side < -0.2 : side > 0.2) };
  }
  function joints(P) {
    const pelvis = frame(P, 'hipL', 'hipR', 'pelvis', 'spine'), chest = frame(P, 'shoulderL', 'shoulderR', 'spine', 'neckBase'), J = {};
    for (const s of ['L', 'R']) {
      const thigh = V.sub(P['knee' + s], P['hip' + s]), shin = V.sub(P['ankle' + s], P['knee' + s]);
      const arm = V.sub(P['elbow' + s], P['shoulder' + s]), fore = V.sub(P['hand' + s], P['elbow' + s]);
      J['hip' + s] = swing(pelvis, thigh, s);
      J['knee' + s] = hinge(pelvis, thigh, shin, true);
      J['shoulder' + s] = swing(chest, arm, s);
      J['elbow' + s] = hinge(chest, arm, fore, false);
    }
    const low = V.sub(P.spine, P.pelvis), high = V.sub(P.neckBase, P.spine);
    J.spine = { bend: deg(Math.acos(Math.max(-1, Math.min(1, V.dot(V.unit(low), V.unit(high)))))) };
    return J;
  }
  /* Range of motion, in degrees, measured from hanging straight down (flex + = forward, abd + = out to the side).
     NORMAL: typical adults (AAOS). FLEXIBLE: what a trained, flexible person reaches (yoga, Pilates), with the pelvis
     and spine helping; past it, the pose is one no body makes. The stick figure folds at single points, so deep
     positions land a little past normal by design; only "past flexible" needs fixing. */
  const ROM = {
    normal:   { hipFlex: [-30, 120], hipAbd: [-30, 45], knee: [0, 135], shoulderFlex: [-60, 180], elbow: [0, 150] },
    flexible: { hipFlex: [-60, 170], hipAbd: [-45, 95], knee: [-10, 165], shoulderFlex: [-80, 180], elbow: [-10, 170] }
  };
  /* joints outside a range: [{ joint, value, range }] */
  function outOfRange(P, which = 'normal') {
    const J = joints(P), L = ROM[which], out = [];
    const chk = (joint, val, [lo, hi]) => { if (val < lo || val > hi) out.push({ joint, value: Math.round(val), range: [lo, hi] }); };
    for (const s of ['L', 'R']) {
      const h = J['hip' + s], k = J['knee' + s], sh = J['shoulder' + s], e = J['elbow' + s];
      // forward/back is only measured while the leg (arm) isn't mostly out to the side, where it has no meaning
      // a hip can't extend 120° back: a reading past that is a deep fold measured round the other way
      if (Math.abs(h.abd) < 45) chk(`hip${s} forward/back`, h.flex < -120 ? h.flex + 360 : h.flex, L.hipFlex);
      chk(`hip${s} out/in`, h.abd, L.hipAbd);
      chk(`knee${s}`, k.wrongWay ? -k.bend : k.bend, L.knee);   // bending the wrong way counts as negative
      // an arm raised behind the body can be flexion over the top, or abduction with a twist (hands behind the head):
      // without the shoulder's twist (v2) it can't be told, so only an arm behind and *below* the shoulder is judged
      if (Math.abs(sh.abd) < 45 && !(sh.up && sh.flex < 0)) chk(`shoulder${s} forward/back`, sh.flex, L.shoulderFlex);
      chk(`elbow${s}`, e.bend, L.elbow);    // which way an elbow bends needs the shoulder's twist: v2 has it, v1 doesn't
    }
    return out;
  }

  const api = { pose3d, project, drawOrder, backLeg, joints, outOfRange, ROM, PARTS };
  if (typeof module !== 'undefined') module.exports = api; else root.S3D = api;
})(typeof window !== 'undefined' ? window : globalThis);
