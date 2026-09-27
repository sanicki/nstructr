/* ===================== UI: Exercises (the library + Bookmarked) ===================== */
/* the library's collections (each exercise's "library" field), alphabetically; Bookmarked comes before them */
const collections = () => [...new Set(POSE_DB.exercises.map(ex => ex.library || 'Other'))].sort((a, b) => a.localeCompare(b));
const typeOf = ex => ex.focus || ex.category || '';
const isSaved = id => S.lib.items.some(it => it.id === id);
const E = { coll: 'All', type: 'All', equip: 'Any', q: '' };
const THUMBS = new Map();
function thumbFor(ex) {
  const key = ex.id + ':' + JSON.stringify(ex.keyframes).length;
  if (!THUMBS.has(key)) {
    const kf = ex.keyframes.reduce((best, k) => ((k.holdMs || 0) >= (best.holdMs || 0) ? k : best), ex.keyframes[0]);   // the held pose (latest on a tie)
    try { THUMBS.set(key, poseThumbSVG(ex, kf)); } catch (e) { THUMBS.set(key, '<svg class="thumb" viewBox="0 0 10 10"></svg>'); }
  }
  return THUMBS.get(key);
}
function card(ex) {
  return `<button class="pose-card stateful" data-open="${esc(ex.id)}">
    ${thumbFor(ex)}${isSaved(ex.id) ? '<span class="badge" title="Bookmarked"><span class="icon fill">bookmark</span></span>' : ''}
    <span class="t title-small">${esc(ex.name)}</span>
    <span class="meta body-small">${esc(ex.sanskrit || typeOf(ex))}</span></button>`;
}
const chip = (attr, val, on, label = val) =>
  `<button class="filter stateful" ${attr}="${esc(val)}" aria-pressed="${on}"><span class="icon">check</span>${esc(label)}</button>`;

/* ---------- Exercises ----------
   "Bookmarked" is a collection like the others: bookmarked library exercises plus the user's own (imported or made),
   which exist only there. Searching "All" covers both. */
const SAVED = 'Bookmarked';
const ownExercises = () => S.lib.items.filter(ex => !findInDb(ex.id));
function renderExplore() {
  const colls = collections(), nSaved = S.lib.items.length;
  $('#fCollection').innerHTML = chip('data-coll', 'All', E.coll === 'All', 'All collections') +
    chip('data-coll', SAVED, E.coll === SAVED, nSaved ? `${SAVED} (${nSaved})` : SAVED) + colls.map(c => chip('data-coll', c, E.coll === c)).join('');
  const scope = E.coll === SAVED ? S.lib.items
    : E.coll === 'All' ? [...POSE_DB.exercises, ...ownExercises()] : POSE_DB.exercises.filter(ex => (ex.library || 'Other') === E.coll);
  const types = [...new Set(scope.map(typeOf).filter(Boolean))].sort();
  const equip = [...new Set(scope.flatMap(ex => ex.equipment || []))].sort();
  let more = '';
  if (E.coll !== 'All' && E.coll !== SAVED && types.length > 1) more += chip('data-type', 'All', E.type === 'All', 'All types') + types.map(t => chip('data-type', t, E.type === t)).join('');
  if (equip.length > 1) more += (more ? '<span class="chip-sep" aria-hidden="true"></span>' : '') + chip('data-equip', 'Any', E.equip === 'Any', 'All equipment') + equip.map(q => chip('data-equip', q, E.equip === q)).join('');
  $('#fMore').innerHTML = more;
  $('#fMore').hidden = !more;
  $('#clearSearch').hidden = !E.q;

  const q = E.q.trim().toLowerCase();
  const list = scope.filter(ex => (E.type === 'All' || typeOf(ex) === E.type) &&
    (E.equip === 'Any' || (ex.equipment || []).includes(E.equip)) &&
    (!q || [ex.name, ex.sanskrit, ex.category, ex.focus, ex.library, ...(ex.equipment || [])].some(s => String(s || '').toLowerCase().includes(q))));
  const body = $('#exploreBody');
  if (E.coll === 'All' && E.type === 'All' && E.equip === 'Any' && !q) {
    // browsing: one shelf per collection, Saved first
    const shelf = (c, items) => `<section class="section"><div class="section-head">
        <h2 class="title-medium">${esc(c)}<span class="count">${items.length}</span></h2>
        <button class="btn text stateful" data-coll="${esc(c)}">See all</button></div>
        <div class="carousel">${items.slice(0, 14).map(card).join('')}</div></section>`;
    body.innerHTML = (nSaved ? shelf(SAVED, S.lib.items) : '') + colls.map(c => shelf(c, POSE_DB.exercises.filter(ex => (ex.library || 'Other') === c))).join('');
    return;
  }
  if (E.coll === SAVED && !nSaved && !q) {
    body.innerHTML = `<div class="empty-state"><span class="icon">bookmarks</span><p class="title-medium" style="margin:8px 0 4px">Nothing bookmarked yet</p>
      <p class="muted" style="margin:0 0 16px">Tap the bookmark on any exercise to keep it here. Exercises you import land here too.</p>
      <div class="row" style="justify-content:center"><button class="btn tonal stateful" data-act="import"><span class="icon">upload_file</span>Import</button></div></div>`;
    return;
  }
  body.innerHTML = list.length
    ? `<p class="body-small muted" style="margin:12px 0 0">${list.length} ${list.length === 1 ? 'exercise' : 'exercises'}</p><div class="results">${list.map(card).join('')}</div>`
    : `<div class="empty-state"><span class="icon">search_off</span><p class="title-medium" style="margin:8px 0 4px">Nothing matches</p>
       <p class="muted" style="margin:0 0 16px">Try a different word, or clear the filters.</p><button class="btn tonal stateful" data-act="clearFilters">Clear filters</button></div>`;
}
