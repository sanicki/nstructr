/* ===== Starting and ending positions (used by the workout player and the build) =====
   Each exercise starts and ends in one of a few body positions: standing, kneeling, all fours, seated, lying on the back,
   lying face down, lying on the side, plank, and three ways into inversions and arm balances: a squat with the hands
   down (Crow), Downward Dog (Handstand), Dolphin (Headstand). It is worked out from the first and last frames (what touches the floor and
   which way the trunk and chest face), or given by the exercise's startPosition / endPosition when that guess is wrong.
   Between two exercises the workout player moves the figure through the "at rest" pose of each position (REST) and,
   when the position changes, along the quickest route of moves between positions (MOVES, positionPath), so it never
   jumps. Furniture (chair, bench, step, wall, bar) is walked up to: sitting or lying on it, or the hands on it, starts
   and ends standing beside it. A position it can't place (a foam roller under the calves) and a side-lying exercise's
   mirrored other side crossfade instead. */
(function (root) {
  // in the browser core.js's top-level names are shared script globals (a const isn't on window)
  const C = typeof module !== 'undefined' ? require('./core.js')
    : { resolveSequence, DEFAULT_SEGMENTS, frameAt, fkAt, place, supportAt, surfacesFrom, mirrorKeyframe };
  const POSITIONS = ['standing', 'kneeling', 'all-fours', 'seated', 'supine', 'prone', 'side-lying', 'plank', 'squat', 'down-dog', 'dolphin'];
  const LABELS = { standing: 'Standing', kneeling: 'Kneeling', 'all-fours': 'All fours', seated: 'Seated', supine: 'Lying on your back',
    prone: 'Lying face down', 'side-lying': 'Lying on your side', plank: 'Plank', squat: 'Squat', 'down-dog': 'Downward Dog', dolphin: 'Dolphin' };
  // the at-rest pose of each position, taken from the library's own first steps (named after each) so it faces and
  // lies the way the library's exercises in that position do: standing and kneeling face the camera's right, lying
  // on the back has the head to the left, on the front and on all fours to the right
  const REST = {
    standing: { anchor: 'ankleL', plant: ['L', 'R'], pose: {} },                                          // Mountain Pose
    kneeling: { anchor: 'kneeL', pose: { kneeL: 90, ankleL: 90, kneeR: 90, ankleR: 90 } },             // Camel: kneel tall
    'all-fours': { anchor: 'handR', touch: [{ point: 'kneeR', adjust: 'hipR' }, { point: 'kneeL', adjust: 'hipL' }],   // Cat-Cow: tabletop
      pose: { root: [75, 0, 0], shoulderL: [75, 0, 0], shoulderR: [75, 0, 0], hipL: [75, 0, 0], kneeL: 90, ankleL: 90, hipR: [75, 0, 0], kneeR: 90, ankleR: 90 } },
    seated: { anchor: 'pelvis', plant: ['L', 'R'],                                                        // Staff Pose
      touch: [{ point: 'ankleR', adjust: 'kneeR' }, { point: 'ankleL', adjust: 'kneeL' }, { point: 'handR', adjust: 'shoulderR' }, { point: 'handL', adjust: 'shoulderL' }],
      pose: { shoulderL: [-23.9, 0, 0], shoulderR: [-23.9, 0, 0], hipL: [120, 0, 0], kneeL: 60, ankleL: 60, hipR: [120, 0, 0], kneeR: 60, ankleR: 60 } },
    supine: { anchor: 'neckBase', plant: ['L', 'R'], touch: [{ point: 'ankleR', adjust: 'kneeR' }, { point: 'ankleL', adjust: 'kneeL' }],   // Corpse: knees bent
      pose: { root: [-90, 0, 0], neck: [34, 0, 0], hipL: [45, 0, 0], kneeL: 90, ankleL: 45, hipR: [45, 0, 0], kneeR: 90, ankleR: 45 } },
    prone: { anchor: 'pelvis', pose: { root: [90, 0, 0], neck: [-34, 0, 0], ankleL: 90, ankleR: 90 } },     // Superman, arms by the sides
    'side-lying': { pose: { root: [0, -90, 0], neck: [0, 8, 0], shoulderL: [0, -180, 0], hipL: [45, 0, 0], ankleL: 44.3, hipR: [45, 0, 0], ankleR: 44.3 } },   // Clamshell
    plank: { anchor: 'handR', touch: [{ point: 'toeR', adjust: 'hipR' }, { point: 'toeL', adjust: 'hipL' }],   // Push-up: plank
      pose: { root: [66, 0, 0], shoulderL: [66, 0, 0], shoulderR: [66, 0, 0], hipL: [-8, 0, 0], ankleL: 24, hipR: [-8, 0, 0], ankleR: 24 } },
    // the ways into inversions and arm balances (Oct 2026): each the first step of the exercises that start there, so
    // nothing moves between the rest pose and the exercise (written the same way: a blend between two ways of writing
    // one pose, a shoulder at 135° and at −225°, swings the arm round)
    squat: { anchor: 'handR', plant: ['L', 'R'], touch: [{ point: 'ankleR', adjust: 'kneeR' }, { point: 'ankleL', adjust: 'kneeL' }],   // Crow: squat, hands down
      pose: { torso: [55, 0, 0], shoulderL: [55, 0, 0], shoulderR: [55, 0, 0], hipL: [110, 0, 0], kneeL: 124.9, ankleL: -14.9, hipR: [110, 0, 0], kneeR: 124.9, ankleR: -14.9 } },
    'down-dog': { anchor: 'handR', plant: ['L', 'R'], touch: [{ point: 'ankleR', adjust: 'hipR' }, { point: 'ankleL', adjust: 'hipL' }],   // Handstand: Downward Dog
      pose: { torso: [135, 0, 0], shoulderL: [180, 0, 0], shoulderR: [180, 0, 0], hipL: [-27.3, 0, 0], ankleL: -27.3, hipR: [-27.3, 0, 0], ankleR: -27.3 } },
    dolphin: { anchor: 'elbowR', plant: ['L', 'R'], touch: [{ point: 'ankleR', adjust: 'hipR' }, { point: 'ankleL', adjust: 'hipL' }],   // Headstand: Dolphin
      pose: { torso: [135, 0, 0], shoulderL: [135, 0, 0], elbowL: 90, shoulderR: [135, 0, 0], elbowR: 90, hipL: [-39.8, 0, 0], ankleL: -39.8, hipR: [-39.8, 0, 0], ankleR: -39.8 } }
  };
  /* Moves between positions (the edges of a small graph; each works both ways): the steps in between the two rest
     poses, written once from library poses. A change of position takes the quickest route (positionPath), e.g. standing
     to lying on the back: sit down, then lie back. Each move is checked by the build (tools/checks.cjs) both ways. */
  const arms = { shoulderL: [8, 0, 0], shoulderR: [8, 0, 0] };
  const CROUCH = { name: 'Squat, hands down', anchor: 'ankleL', plant: ['L', 'R'], touch: [{ point: 'handR', adjust: 'shoulderR' }, { point: 'handL', adjust: 'shoulderL' }],
    pose: { torso: [70, 0, 0], neck: [-10, 0, 0], shoulderL: [80, 0, 0], shoulderR: [80, 0, 0], hipL: [100, 0, 0], kneeL: 110, ankleL: -20, hipR: [100, 0, 0], kneeR: 110, ankleR: -20 } };   // Burpee
  const SIT_BACK = { name: 'Sit back', anchor: 'pelvis', plant: ['L', 'R'], touch: [{ point: 'handR', adjust: 'shoulderR' }, { point: 'handL', adjust: 'shoulderL' }],
    pose: { root: [-42, 0, 0], shoulderL: [-30, 0, 0], shoulderR: [-30, 0, 0], hipL: [118, 0, 0], kneeL: 140, ankleL: 20, hipR: [118, 0, 0], kneeR: 140, ankleR: 20 } };   // seat, feet and hands down (fitted)
  // on all fours, toes tucked under (the ankle set by the toes touching): the foot pivots here, so going up into Downward
  // Dog or Dolphin the toes stay put (straight from the tops of the feet they swung round 21 px)
  const TUCK = { name: 'Tuck the toes', anchor: 'handR', touch: [...REST['all-fours'].touch, { point: 'toeR', adjust: 'ankleR' }, { point: 'toeL', adjust: 'ankleL' }],
    pose: { ...REST['all-fours'].pose, ankleL: -10, ankleR: -10 } };
  const KICK = { name: 'Step back', anchor: 'handR', quiet: true, pose: { root: [85, 0, 0], shoulderL: [85, 0, 0], shoulderR: [85, 0, 0], hipL: [60, 0, 0], kneeL: 80, hipR: [60, 0, 0], kneeR: 80 } };   // Burpee's kick back
  const MOVES = [
    // step one foot back and set that knee down (Hip Flexor Stretch's half kneel), then the front knee
    { a: 'standing', b: 'kneeling', via: [{ name: 'Half kneel', anchor: 'kneeR', plant: ['L'], touch: [{ point: 'ankleL', adjust: 'hipL' }],
      pose: { ...arms, hipL: [90, 0, 0], kneeL: 90, kneeR: 90, ankleR: 90 } }] },
    // hands down in front: tabletop
    { a: 'kneeling', b: 'all-fours', via: [] },
    // knees back and legs long: plank
    { a: 'all-fours', b: 'plank', via: [] },
    // lower down onto the front: hips sink with the knees and toes still down (fitted), then the legs lie long (straight
    // from tabletop the shins flicked up)
    { a: 'all-fours', b: 'prone', via: [{ name: 'Lower down', anchor: 'kneeL', touch: [{ point: 'kneeR', adjust: 'hipR' }],
      pose: { root: [89, 0, 0], shoulderL: [3, 0, 0], shoulderR: [3, 0, 0], elbowL: 57, elbowR: 57, hipL: [34, 0, 0], kneeL: 38, ankleL: 75, hipR: [34, 0, 0], kneeR: 38, ankleR: 75 } }] },
    { a: 'plank', b: 'prone', via: [] },
    // squat, hands to the floor (Burpee), then step back to plank
    { a: 'standing', b: 'plank', via: [CROUCH, KICK] },
    // squat (Squat's low point), sit back onto the floor with the hands behind, legs out (Staff)
    { a: 'standing', b: 'seated', via: [
      { name: 'Squat', anchor: 'ankleL', plant: ['L', 'R'], pose: { torso: [38, 0, 0], shoulderL: [60, 0, 0], shoulderR: [60, 0, 0], hipL: [88, 0, 0], kneeL: 102, ankleL: -14, hipR: [88, 0, 0], kneeR: 102, ankleR: -14 } },
      SIT_BACK] },
    // roll down onto the back, knees bent
    { a: 'seated', b: 'supine', via: [] },
    // lift the arm that goes under the head, then roll onto that side (sliding it along the floor read as a slip)
    { a: 'supine', b: 'side-lying', via: [{ ...REST.supine, name: 'Arm up', pose: { ...REST.supine.pose, shoulderL: [90, 0, 0] } }] },
    { a: 'supine', b: 'side-lying-r', via: [{ ...REST.supine, name: 'Arm up', pose: { ...REST.supine.pose, shoulderR: [90, 0, 0] } }] },
    // knees up, rock forward onto the feet with the hands down, knees down: tabletop (stays on the floor between the
    // positions facing up and those facing down)
    { a: 'seated', b: 'all-fours', via: [SIT_BACK, CROUCH] },
    // squat down, hands to the floor (Burpee's crouch), then onto the hands (Crow's squat)
    { a: 'standing', b: 'squat', via: [CROUCH] },
    // fold forward and walk the hands out (Yoga Journal's way into Downward Dog from standing)
    { a: 'standing', b: 'down-dog', via: [{ name: 'Forward fold', anchor: 'ankleL', plant: ['L', 'R'], touch: [{ point: 'handR', adjust: 'shoulderR' }, { point: 'handL', adjust: 'shoulderL' }],
      pose: { torso: [150, 0, 0], neck: [10, 0, 0], shoulderL: [192.9, 0, 0], shoulderR: [192.9, 0, 0] } }] },   // Standing Forward Bend
    // tuck the toes and lift the hips (Downward Dog from tabletop)
    { a: 'all-fours', b: 'down-dog', via: [TUCK] },
    // forearms down, toes tucked, then lift the hips (Yoga Journal's Headstand and Forearm Stand: kneel, forearms down)
    { a: 'all-fours', b: 'dolphin', via: [{ ...TUCK, name: 'Forearms down', anchor: 'elbowR',
      pose: { ...TUCK.pose, root: [104, 0, 0], shoulderL: [104, 0, 0], shoulderR: [104, 0, 0], elbowL: 90, elbowR: 90, hipL: [104, 0, 0], hipR: [104, 0, 0] } }] }
  ];
  const STEP_MS = 900;
  /* the quickest route from one position to another: the steps after a's rest pose up to and including b's, or null */
  function positionPath(a, b) { const r = route(a, b); return r && r.path; }
  /* the positions that quickest route passes through, a and b included (["supine", "seated", "standing"]), or null */
  function positionRoute(a, b) { const r = route(a, b); return r && r.stops; }
  function route(a, b) {
    if (a === b) return { path: [], stops: [a] };
    const best = { [a]: { ms: 0, path: [], stops: [a] } }, todo = [a];
    while (todo.length) {
      todo.sort((x, y) => best[x].ms - best[y].ms);
      const at = todo.shift();
      for (const m of MOVES) {
        const fwd = m.a === at, back = m.b === at;
        if (!fwd && !back) continue;
        const to = fwd ? m.b : m.a, via = fwd ? m.via : [...m.via].reverse();
        const steps = [...via, { name: LABELS[to], ...REST[to] }].map(k => ({ durationMs: STEP_MS, holdMs: 0, ...k }));
        const ms = best[at].ms + steps.length * STEP_MS;
        if (!best[to] || ms < best[to].ms) { best[to] = { ms, path: [...best[at].path, ...steps], stops: [...best[at].stops, to] }; todo.push(to); }
      }
    }
    return best[b] || null;
  }
  // lying on the other side: the same rest pose mirrored (an exercise's right side lies on the other side)
  REST['side-lying-r'] = C.mirrorKeyframe({ name: 'side-lying', ...REST['side-lying'] });
  LABELS['side-lying-r'] = LABELS['side-lying'];
  /* which side a body lies on, as a REST key: the side whose shoulder is lower, compared with the rest pose's */
  function lyingSide(P, seg) {
    const r = pointsOf(C.resolveSequence([{ name: 's', ...REST['side-lying'] }], seg, {}, [])[0], seg), restLow = r.shoulderL.y < r.shoulderR.y;
    return (P.shoulderL.y < P.shoulderR.y) === restLow ? 'side-lying' : 'side-lying-r';
  }
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
  const len = v => Math.hypot(v.x, v.y, v.z) || 1;
  const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
  // the world points of one resolved frame (its own surfaces under it)
  function pointsOf(r, seg) { C.frameAt(r, r, 1, seg); return C.fkAt(r.pose, seg, C.place(r.pose, seg, r.rule, false)); }
  /* which position a body is in, from its world points; null if none fits (hanging, mid-roll, a lunge on one hand…) */
  function classify(P) {
    const near = k => P[k] && P[k].y - C.supportAt(P[k]) < 8;
    const any = (...ks) => ks.some(near);
    const feet = any('ankleL', 'footL', 'toeL', 'ankleR', 'footR', 'toeR'), knees = any('kneeL', 'kneeR'),
      hands = any('handL', 'handR', 'elbowL', 'elbowR'), seat = P.pelvis.y - C.supportAt(P.pelvis) < 16,
      trunkDown = any('neckBase', 'spine', 'backL', 'backR', 'shoulderL', 'shoulderR', 'head');
    const t = sub(P.neckBase, P.pelvis), up = t.y / len(t);                         // 1 upright, 0 level, −1 upside down
    const f = cross(sub(P.shoulderR, P.shoulderL), t), fy = f.y / len(f);          // the way the chest faces: +1 up
    const knee = { x: (P.kneeL.x + P.kneeR.x) / 2, y: (P.kneeL.y + P.kneeR.y) / 2, z: (P.kneeL.z + P.kneeR.z) / 2 };
    const k = sub(knee, P.pelvis), legsAlong = (k.x * t.x + k.y * t.y + k.z * t.z) / len(k) / len(t);   // +1 thighs toward the head
    // the ways into inversions (Oct 2026): hips high over the hands (Downward Dog) or the forearms (Dolphin), feet down
    const palms = any('handL', 'handR'), forearms = any('elbowL', 'elbowR');
    const leg = s => len(sub(P['hip' + s], P['knee' + s])) + len(sub(P['knee' + s], P['ankle' + s])), reach = s => len(sub(P['hip' + s], P['ankle' + s])) / leg(s);
    // (facing down, the hands well ahead of the feet: not a bridge or a standing forward fold)
    const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z), feetAt = { x: (P.ankleL.x + P.ankleR.x) / 2, z: (P.ankleL.z + P.ankleR.z) / 2 };
    const ahead = ['handL', 'handR', 'elbowL', 'elbowR'].some(k => near(k) && flat(P[k], feetAt) > 1.1 * leg('L'))   // Down Dog ~1.35 legs, a fold ≤ 0.9;
    if (feet && !knees && !seat && !trunkDown && fy < 0 && ahead && up < -0.3 && P.pelvis.y > P.neckBase.y) return forearms ? 'dolphin' : palms ? 'down-dog' : null;
    if (up < -0.3) return null;                                                     // upside down: handstands, headstands
    // squatting low on the feet with the hands down (Crow's way in)
    if (feet && palms && !knees && !seat && !forearms && reach('L') < 0.6 && reach('R') < 0.6) return 'squat';
    if (feet && !knees && !hands && !seat && !trunkDown && P.pelvis.y > 60) return 'standing';   // upright or hinged
    if ((seat || hands) && fy < -0.3 && legsAlong < -0.5 && up < 0.8 && P.pelvis.y - C.supportAt(P.pelvis) < 40) return 'prone';   // chest lifted, legs behind (Cobra, propped on the forearms)
    if (seat && legsAlong > -0.4 && (up > 0.45 || (fy < -0.3 && legsAlong > 0.2)) && !trunkDown) return 'seated';     // sitting tall, or folded over the legs
    if (knees && !hands && !seat && up > 0.45) return 'kneeling';
    if (knees && hands && !seat && Math.abs(up) < 0.7) return 'all-fours';
    if (hands && feet && !knees && !seat && Math.abs(up) < 0.7) return fy > 0.3 ? null : 'plank';   // face up on the hands: reverse plank
    if ((trunkDown || seat) && Math.abs(up) < 0.6) return fy > 0.6 ? 'supine' : fy < -0.6 ? 'prone' : 'side-lying';
    return null;
  }
  /* an exercise's start and end positions (its first side and direction, as written) */
  function positionsOf(ex) {
    const seg = C.DEFAULT_SEGMENTS, R = C.resolveSequence(ex.keyframes, seg, ex, ex.props || []);
    // on furniture (sitting on a chair, lying on a bench, hands or feet up on one, hanging from a bar) you start and end
    // standing beside it: that's where a workout's way in and out goes; on the floor with a ball or roller, as usual
    const guess = r => { try {
      const P = pointsOf(r, seg), up = RAISED.some(k => P[k] && C.supportAt(P[k]) > 35 && P[k].y - C.supportAt(P[k]) < 8);
      return up ? 'standing' : classify(P);
    } catch (e) { return null; } };
    const given = v => v === 'other' ? null : POSITIONS.includes(v) ? v : undefined;      // "other": none of these (a crossfade)
    let start = given(ex.startPosition) !== undefined ? given(ex.startPosition) : guess(R[0]);
    // a last frame it can't place (a bridge at the top, a forward fold) is where the reps come back to, when nothing
    // follows them: the start
    let end = given(ex.endPosition) !== undefined ? given(ex.endPosition) : guess(R[R.length - 1]);
    const finish = ex.keyframes.some(k => k.phase === 'finish');
    if (end === null && given(ex.endPosition) === undefined && !finish) end = start;
    // on furniture nothing else fits: you go to it standing (a handstand against the wall, hanging from the bar); and with
    // no finish step the reps come back to where they started (a bridge with the heels on a chair ends lying down). The
    // ways into inversions are floor positions: at a wall you still walk up to it standing
    const INTO = ['squat', 'down-dog', 'dolphin'];
    if (onFurniture(ex)) {
      if (INTO.includes(start) && given(ex.startPosition) === undefined) start = null;
      if (INTO.includes(end) && given(ex.endPosition) === undefined) end = null;
      if (start === null && given(ex.startPosition) === undefined) start = 'standing';
      if (given(ex.endPosition) === undefined && (!finish || end === null)) end = start;
    }
    return { start, end };
  }
  /* equipment the body rests on or moves against (a hand-held weight or band doesn't count) */
  const onEquipment = ex => C.surfacesFrom(ex.props || []).length > 0 || (ex.props || []).some(p => p.type === 'wall' || p.type === 'bar');
  /* furniture you walk up to: chair, bench, step, wall, bar (not a ball, roller or block on the floor) */
  const FURNITURE = ['chair', 'bench', 'step', 'wall', 'bar'];
  const onFurniture = ex => (ex.props || []).some(p => FURNITURE.includes(p.type));
  // sitting or lying on it, or the hands on it (feet up on a bench or ball: you lie or plank on the floor first)
  const RAISED = ['pelvis', 'spine', 'neckBase', 'handL', 'handR'];
  /* each rest pose, resolved on its own: no misses, and it is the position it rests in (the build checks this) */
  function checkRest() {
    const seg = C.DEFAULT_SEGMENTS, out = [];
    for (const p of POSITIONS) {
      const kf = { name: p, durationMs: 1000, ...REST[p] }, r = C.resolveSequence([kf], seg, { keyframes: [kf] }, [])[0];
      if (r.misses && r.misses.length) out.push(`${p}: ${r.misses[0]}`);
      const got = classify(pointsOf(r, seg)); if (got !== p) out.push(`${p}: reads as ${got}`);
    }
    return out;
  }
  const api = { POSITIONS, LABELS, REST, MOVES, positionPath, positionRoute, classify, positionsOf, onEquipment, onFurniture, lyingSide, pointsOf, checkRest };
  if (typeof module !== 'undefined') module.exports = api; else root.POSITIONS_EX = api;
})(typeof window !== 'undefined' ? window : globalThis);
