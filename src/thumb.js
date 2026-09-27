/* Static thumbnail of a resolved pose, drawn from the same forward kinematics */
function poseThumbSVG(ex, kf, opts = {}) {
  const seg = { ...DEFAULT_SEGMENTS, ...((ex.figure && ex.figure.segments) || {}) };
  const seq = resolveSequence(ex.keyframes, seg, ex);
  const idx = ex.keyframes.indexOf(kf);
  const r = idx >= 0 ? seq[idx] : resolveKeyframe(kf, seg, ex);
  const pos = place(r.pose, r.v, seg, r.rule);
  const P = fk(r.pose, r.v, seg, pos.x, pos.y);
  const flip = ex.facing === 'left';
  const X = x => (flip ? W - x : x);
  const pts = POINTS.map(k => P[k]);
  let minX = Math.min(...pts.map(p => X(p.x))) - 26, maxX = Math.max(...pts.map(p => X(p.x))) + 26;
  for (const wx of seq.walls || []) if (wx != null) { minX = Math.min(minX, X(wx) - 12); maxX = Math.max(maxX, X(wx) + 12); }
  for (const s of seq.supports || []) { minX = Math.min(minX, Math.min(X(s.x0), X(s.x1)) - 8); maxX = Math.max(maxX, Math.max(X(s.x0), X(s.x1)) + 8); }
  let minY = Math.min(...pts.map(p => p.y)) - 26, maxY = FLOOR + 14;
  const w = maxX - minX, h = maxY - minY, s = Math.max(w, h, 150);
  const vx = (minX + maxX) / 2 - s / 2, vy = maxY - s;
  const L = (a, b, c) => `<line x1="${X(P[a].x).toFixed(1)}" y1="${P[a].y.toFixed(1)}" x2="${X(P[b].x).toFixed(1)}" y2="${P[b].y.toFixed(1)}" class="${c}"/>`;
  const limb = s => L('hip' + s, 'knee' + s, 't' + s) + L('knee' + s, 'ankle' + s, 't' + s) + L('ankle' + s, 'toe' + s, 't' + s) +
    L('shoulder' + s, 'elbow' + s, 't' + s) + L('elbow' + s, 'hand' + s, 't' + s);
  const rest = bandRestLengths(ex.props, seq, seg);
  const bands = (ex.props || []).map((pr, i) => {
    if (WEIGHT_TYPES.includes(pr.type)) return weightSVG(pr, P, r.v, X);
    if (pr.type === 'wall' && ((pr.view === 'side' && r.v > 0.5) || (pr.view === 'front' && r.v < 0.5))) return '';
    if (pr.type === 'wall') return `<line class="tw" x1="${X(seq.walls[i]).toFixed(1)}" y1="${FLOOR + 7}" x2="${X(seq.walls[i]).toFixed(1)}" y2="${(vy - 5).toFixed(1)}"/>`;
    const pts = propRoute(P, pr);
    if (!pts) return '';
    if (pr.type === 'towel') return `<path class="tt" d="M${pts.map(p => `${X(p.x).toFixed(1)} ${p.y.toFixed(1)}`).join('L')}"/>`;
    return `<path class="tb" d="${bandPathRoute(pts.map(p => ({ x: X(p.x), y: p.y })), rest[i]).d}"/>`;
  }).join('');
  const surf = surfaceShapes(seq.supports || []).map(sh => `<path class="ts${sh.solid ? ' solid' : ''}" d="${sh.d}"${flip ? ` transform="translate(${W} 0) scale(-1 1)"` : ''}/>`).join('');
  return `<svg class="thumb" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${s.toFixed(1)} ${s.toFixed(1)}" aria-hidden="true">
    <line x1="${vx}" y1="${FLOOR + 7}" x2="${vx + s}" y2="${FLOOR + 7}" class="tf"/>${surf}
    ${limb('L')}${L('pelvis', 'spine', 'tc')}${L('spine', 'neckBase', 'tc')}${L('neckBase', 'head', 'tc')}<circle cx="${X(P.head.x).toFixed(1)}" cy="${P.head.y.toFixed(1)}" r="${seg.head}" class="th"/>${limb('R')}${bands}</svg>`;
}
