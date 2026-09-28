/* ===== Is it already in the library? (used by submissions, the build, and the app before it sends one) =====
   Three things say whether two exercises are the same:
   - motion: each step's joint angles (after touch/reach/keep are solved, the first side, direction A; quiet in-between
     steps left out), compared step by step with dynamic time warping (the steps line up even if one has more), as the
     root-mean-square of the angle differences, in degrees. In the library, exercises that move the same are under 1°
     apart and the next closest pairs start at about 1.6° (Sep 2026): SAME below 1, SIMILAR below 2.5.
   - names: the name and other names, compared without case, punctuation, plurals, word order or filler words.
   - equipment and measure (reps or a timed hold): the same motion with a band or a barbell, or held instead of repeated,
     is a variant, not a duplicate. */
(function (root) {
  // in the browser core.js's top-level names are shared script globals (a const isn't on window)
  const C = typeof module !== 'undefined' ? require('./core.js') : { resolveSequence, DEFAULT_SEGMENTS, JOINT_KEYS };
  const SAME = 1, SIMILAR = 2.5;
  const w = a => ((a % 360) + 540) % 360 - 180;
  function fingerprint(ex) {
    const R = C.resolveSequence(ex.keyframes, C.DEFAULT_SEGMENTS, ex);
    const steps = R.filter(r => !r.quiet);
    return (steps.length ? steps : R).map(r => C.JOINT_KEYS.flatMap(k => (Array.isArray(r.pose[k]) ? r.pose[k] : [r.pose[k]])).map(w));
  }
  const stepDist = (a, b) => Math.sqrt(a.reduce((s, x, i) => s + w(x - b[i]) ** 2, 0) / a.length);
  function motionDistance(A, B) {
    const n = A.length, m = B.length, D = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(Infinity));
    D[0][0] = 0;
    for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) D[i][j] = stepDist(A[i - 1], B[j - 1]) + Math.min(D[i - 1][j], D[i][j - 1], D[i - 1][j - 1]);
    return D[n][m] / (n + m);
  }
  const FILLER = new Set(['the', 'a', 'an', 'pose', 'exercise', 'with', 'and', 'on', 'of', 'in', 'to', 'your']);
  const singular = t => (t.length > 3 && /[^s]s$/.test(t) ? t.slice(0, -1) : t);
  const nameKey = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ')
    .split(' ').filter(t => t && !FILLER.has(t)).map(singular).sort().join(' ');
  const namesOf = ex => [ex.name, ...(Array.isArray(ex.otherNames) ? ex.otherNames : [])].map(nameKey).filter(Boolean);
  /* equipment, as kinds: "Resistance band" and "band" are one thing, "Dumbbells" and "dumbbell" too; a mat or the
     floor isn't equipment. Also used for the AI's "equipmentInSource" (free text). */
  const KINDS = [['door anchor', /door/], ['band', /band|tube/], ['dumbbell', /dumb ?bell/], ['barbell', /barbell/], ['kettlebell', /kettle ?bell/], ['chair', /chair/],
    ['bench', /bench/], ['wall', /wall/], ['step', /\bstep|box/], ['towel', /towel/], ['block', /block/], ['strap', /strap/], ['ball', /ball/]];
  const equipKind = e => {
    const t = String(e || '').toLowerCase().trim();
    if (!t || /\bmat\b|floor|none|bodyweight|body weight/.test(t)) return '';
    const k = KINDS.find(([, re]) => re.test(t)); return k ? k[0] : singular(t);
  };
  const equipKinds = list => [...new Set((list || []).map(equipKind).filter(Boolean))].sort();
  const equipKey = ex => equipKinds(ex.equipment).join('|');
  const measureOf = ex => ex.measure || 'reps';
  /* How ex compares with each library exercise, closest first: [{ id, name, motion, sameName, sameEquipment,
     sameMeasure, verdict }]. verdict: "duplicate" (moves the same, same equipment and measure), "variant" (moves the
     same, other equipment or measure), "similar" (close), "name" (a name matches, the motion doesn't). Only matches
     are listed. prints: optional cache of library fingerprints by id. */
  function similarTo(ex, library, prints = new Map()) {
    const mine = fingerprint(ex), names = new Set(namesOf(ex)), out = [];
    for (const lib of library) {
      if (lib.id === ex.id) continue;
      if (!prints.has(lib.id)) prints.set(lib.id, fingerprint(lib));
      const motion = motionDistance(mine, prints.get(lib.id));
      const sameName = namesOf(lib).some(n => names.has(n));
      const sameEquipment = equipKey(lib) === equipKey(ex), sameMeasure = measureOf(lib) === measureOf(ex);
      const verdict = motion < SAME ? (sameEquipment && sameMeasure ? 'duplicate' : 'variant') : motion < SIMILAR ? 'similar' : sameName ? 'name' : null;
      if (verdict) out.push({ id: lib.id, name: lib.name, motion: Math.round(motion * 100) / 100, sameName, sameEquipment, sameMeasure, verdict });
    }
    const rank = { duplicate: 0, variant: 1, name: 2, similar: 3 };
    return out.sort((a, b) => rank[a.verdict] - rank[b.verdict] || a.motion - b.motion);
  }
  const api = { fingerprint, motionDistance, similarTo, nameKey, equipKinds, SAME, SIMILAR };
  if (typeof module !== 'undefined') module.exports = api; else root.SIMILAR_EX = api;
})(typeof window !== 'undefined' ? window : globalThis);
