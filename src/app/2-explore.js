/* ===================== UI: Exercises (the library + Bookmarked) ===================== */
/* the library's collections (each exercise's "collections": it can be in several), alphabetically; Bookmarked comes before them */
const collectionsOf = ex => (ex.collections && ex.collections.length ? ex.collections : ['Other']);
const collections = () => [...new Set(POSE_DB.exercises.flatMap(collectionsOf))].sort((a, b) => a.localeCompare(b));
const inCollection = c => POSE_DB.exercises.filter(ex => collectionsOf(ex).includes(c));
const typeOf = ex => ex.focus || ex.category || '';
/* Two separate things:
   - My exercises: the user's own (imported, copied, made). They live in S.lib.items (the old "saved" store).
   - Bookmarks: a flag on any exercise, library or own: a set of ids (BOOKMARKS, nstructr-bookmarks-v1).
   A library exercise is bookmarked by id only, so library fixes reach it. */
const BOOKMARK_KEY = 'nstructr-bookmarks-v1';
let BOOKMARKS = (() => { try { const v = JSON.parse(localStorage.getItem(BOOKMARK_KEY) || 'null'); return Array.isArray(v) ? new Set(v) : null; } catch (e) { return null; } })();
const saveBookmarks = () => { try { localStorage.setItem(BOOKMARK_KEY, JSON.stringify([...BOOKMARKS])); } catch (e) { } };
const isBookmarked = id => !!BOOKMARKS && BOOKMARKS.has(id);
const isOwn = id => !findInDb(id) && S.lib.items.some(it => it.id === id);
const bookmarkedExercises = () => [...(BOOKMARKS || [])].map(id => exById(id)).filter(Boolean);
/* Before bookmarks, "Saved" held copies of library exercises. Once, and after restoring an old backup: everything
   saved stays bookmarked; a stored library copy becomes a plain bookmark, unless it was changed (with the old pose
   editor), in which case it becomes the user's own "<name> (copy)" so nothing is lost. */
function migrateSaved() {
  const first = BOOKMARKS === null; if (first) BOOKMARKS = new Set();
  let changed = first;
  S.lib.items = S.lib.items.flatMap(ex => {
    const lib = findInDb(ex.id);
    if (!lib) { if (first) BOOKMARKS.add(ex.id); return [ex]; }
    changed = true;
    if (canonical(lib) === canonical(ex)) { BOOKMARKS.add(ex.id); return []; }       // just a bookmark
    BOOKMARKS.delete(ex.id);                                                          // the changed version is what they had
    let id = `u-${ex.id}-copy`, n = 2; while (S.lib.items.some(x => x.id === id) || findInDb(id)) id = `u-${ex.id}-copy-${n++}`;
    const copy = { ...ex, id, name: `${lib.name} (copy)`, basedOn: lib.id }; delete copy.collections;
    BOOKMARKS.add(id);
    return [copy];
  });
  if (changed) { saveBookmarks(); saveLib(); }
}
const E = { coll: 'All', type: 'All', equip: 'Any', q: '' };
/* All collections: grouped (a row per collection; with filters, a section per collection) or one A–Z list */
const GROUP_KEY = 'nstructr-group-collections-v1';
const grouped = () => pref(GROUP_KEY, 'on') !== 'off';
const byName = list => [...list].sort((a, b) => a.name.localeCompare(b.name));
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
    ${thumbFor(ex)}${isBookmarked(ex.id) ? '<span class="badge" title="Bookmarked"><span class="icon fill">bookmark</span></span>' : ''}
    <span class="t title-small">${esc(ex.name)}</span>
    <span class="meta body-small">${esc(otherNames(ex)[0] || typeOf(ex))}</span></button>`;
}
const chip = (attr, val, on, label = val) =>
  `<button class="filter stateful" ${attr}="${esc(val)}" aria-pressed="${on}"><span class="icon">check</span>${esc(label)}</button>`;

/* ---------- Exercises ----------
   "Bookmarked" is a collection like the others: bookmarked library exercises plus the user's own (imported or made),
   which exist only there. Searching "All" covers both. */
const SAVED = 'Bookmarked', MINE = 'My exercises';
/* My exercises: make one with AI from here too (as on Workouts), or import one; the two buttons are the same size */
const MINE_BTNS = '<div class="mine-add"><button class="btn tonal stateful" data-act="ai"><span class="icon">auto_awesome</span>Create with AI</button>' +
  '<button class="btn tonal stateful" data-act="import"><span class="icon">upload_file</span>Import</button></div>';
const ownExercises = () => S.lib.items.filter(ex => !findInDb(ex.id));
function renderExplore() {
  const colls = collections(), marked = bookmarkedExercises(), mine = ownExercises();
  const nSaved = marked.length;
  $('#fCollection').innerHTML = chip('data-coll', 'All', E.coll === 'All', 'All collections') +
    chip('data-coll', SAVED, E.coll === SAVED, nSaved ? `${SAVED} (${nSaved})` : SAVED) +
    chip('data-coll', MINE, E.coll === MINE, mine.length ? `${MINE} (${mine.length})` : MINE) + colls.map(c => chip('data-coll', c, E.coll === c)).join('');
  const scope = E.coll === SAVED ? marked : E.coll === MINE ? mine
    : E.coll === 'All' ? [...POSE_DB.exercises, ...mine] : inCollection(E.coll);
  const types = [...new Set(scope.map(typeOf).filter(Boolean))].sort();
  const equip = equipNames(scope.flatMap(ex => ex.equipment || [])).sort();
  // type and equipment each get their own row, so neither scrolls out of sight behind the other. Equipment shows
  // whenever it can narrow the list: two kinds, or one kind that only some of the exercises use
  const showType = E.coll !== 'All' && E.coll !== SAVED && E.coll !== MINE && types.length > 1;
  const showEquip = equip.length > 1 || (equip.length === 1 && scope.some(ex => !(ex.equipment || []).length));
  const eq = equip.find(q => equipKey(q) === equipKey(E.equip)) || 'Any';     // the choice is kept across collections; one without it shows all
  $('#fType').innerHTML = showType ? chip('data-type', 'All', E.type === 'All', 'All types') + types.map(t => chip('data-type', t, E.type === t)).join('') : '';
  $('#fType').hidden = !showType;
  $('#fEquip').innerHTML = showEquip ? chip('data-equip', 'Any', eq === 'Any', 'All equipment') + equip.map(q => chip('data-equip', q, eq === q)).join('') : '';
  $('#fEquip').hidden = !showEquip;
  $('#clearSearch').hidden = !E.q;

  const q = E.q.trim().toLowerCase();
  const list = scope.filter(ex => (E.type === 'All' || typeOf(ex) === E.type) &&
    (eq === 'Any' || (ex.equipment || []).some(x => equipKey(x) === equipKey(eq))) &&
    (!q || [ex.name, ...otherNames(ex), ex.category, ex.focus, ...(ex.collections || []), ...(ex.equipment || [])].some(s => String(s || '').toLowerCase().includes(q))));
  const body = $('#exploreBody');
  $('#groupWrap').hidden = E.coll !== 'All';
  $('#groupColl').checked = grouped();
  if (E.coll === 'All' && grouped() && list.length && (E.type !== 'All' || eq !== 'Any' || q)) {
    // filtered, grouped: every match, under each collection it's in
    const matches = new Set(list);
    const section = (c, items) => items.length ? `<section class="section"><div class="section-head">
        <h2 class="title-medium">${esc(c)}<span class="count">${items.length}</span></h2></div>
        <div class="results">${byName(items).map(card).join('')}</div></section>` : '';
    body.innerHTML = `<p class="body-small muted" style="margin:12px 0 0">${list.length} ${list.length === 1 ? 'exercise' : 'exercises'}</p>` +
      section(MINE, mine.filter(ex => matches.has(ex))) + colls.map(c => section(c, inCollection(c).filter(ex => matches.has(ex)))).join('');
    return;
  }
  if (E.coll === 'All' && grouped() && E.type === 'All' && eq === 'Any' && !q) {
    // browsing: one shelf per collection, Saved first
    const shelf = (c, items) => `<section class="section"><div class="section-head">
        <h2 class="title-medium">${esc(c)}<span class="count">${items.length}</span></h2>
        <button class="btn text stateful" data-coll="${esc(c)}">See all</button></div>
        <div class="carousel">${items.slice(0, 14).map(card).join('')}</div></section>`;
    body.innerHTML = (nSaved ? shelf(SAVED, marked) : '') + (mine.length ? shelf(MINE, mine) : '') + colls.map(c => shelf(c, inCollection(c))).join('');
    return;
  }
  if (E.coll === SAVED && !nSaved && !q) {
    body.innerHTML = `<div class="empty-state"><span class="icon">bookmarks</span><p class="title-medium" style="margin:8px 0 4px">Nothing bookmarked yet</p>
      <p class="muted" style="margin:0 0 16px">Tap the bookmark on any exercise to keep it here.</p></div>`;
    return;
  }
  if (E.coll === MINE && !mine.length && !q) {
    body.innerHTML = `<div class="empty-state"><span class="icon">person</span><p class="title-medium" style="margin:8px 0 4px">No exercises of your own yet</p>
      <p class="muted" style="margin:0 0 16px">Exercises you import, make with AI, or copy by editing a library one show up here.</p>
      ${MINE_BTNS}</div>`;
    return;
  }
  body.innerHTML = (E.coll === MINE ? MINE_BTNS : '') + (list.length
    ? `<p class="body-small muted" style="margin:12px 0 0">${list.length} ${list.length === 1 ? 'exercise' : 'exercises'}</p><div class="results">${byName(list).map(card).join('')}</div>`
    : `<div class="empty-state"><span class="icon">search_off</span><p class="title-medium" style="margin:8px 0 4px">Nothing matches</p>
       <p class="muted" style="margin:0 0 16px">Try a different word, or clear the filters.</p><button class="btn tonal stateful" data-act="clearFilters">Clear filters</button></div>`);
}
