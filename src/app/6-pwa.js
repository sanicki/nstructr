
/* ===================== Installable app: offline, storage, backup ===================== */

/* The service worker (sw.js, written by the build) caches the app and the library so the installed app works
   offline. Only the multi-file build registers it: the single file has everything inline already. */
if ('serviceWorker' in navigator && !window.NSTRUCTR_BUNDLE && /^https?:$/.test(location.protocol)) {
  const hadWorker = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => { });
  // a new version took over: this page keeps running the old one until it's reopened
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadWorker && S.view !== 'wplay') snack(`${APP_NAME} was updated. Reopen it to use the new version.`, 6000); });
}

/* Ask the browser not to clear NstructR's storage when space runs low. Chrome decides by itself (installed apps
   and sites you use a lot are kept); Firefox may ask. Asked for once the user has something to lose. */
async function keepStorage() {
  try { if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch (e) { }
  renderPersistNote();
}
async function renderPersistNote() {
  const el = $('#persistNote'); if (!el) return;
  let kept = null;
  try { if (navigator.storage && navigator.storage.persisted) kept = await navigator.storage.persisted(); } catch (e) { }
  el.textContent = kept === true ? 'This browser keeps your data until you delete it or uninstall the app.'
    : kept === false ? 'This browser may clear your data if the device runs low on space. Installing the app (Add to Home screen) makes that much less likely.'
    : '';
}

/* ---------- Export everything / Import everything ---------- */
const BACKUP_FORMAT = 'nstructr/backup';
function backupData() {
  let fullscreen = null; try { fullscreen = localStorage.getItem(FS_KEY); } catch (e) { }
  return {
    format: BACKUP_FORMAT, version: FILE_VERSION, exported: new Date().toISOString(),
    workouts: WK.list || [], exercises: S.lib.items, bookmarks: [...(BOOKMARKS || [])], history: loadLog(),
    settings: { sound: WK.sound, speechRate: speechRate(), encourage: encourageOn(), ...(fullscreen ? { fullscreen } : {}) }
  };
}
async function exportEverything() {
  const d = backupData(), name = `nstructr-backup-${d.exported.slice(0, 10)}.json`;
  await shareFile(JSON.stringify(d, null, 1), name, `${APP_NAME} backup`);
  keepStorage();
}
/* Restoring merges: anything in the backup replaces the item with the same id here, and nothing here is
   deleted, so importing an older backup never loses newer work. */
function restoreBackup(data) {
  const byId = (mine, theirs, key = 'id') => { const m = new Map(mine.map(x => [x[key], x])); for (const x of theirs) if (x && x[key] != null) m.set(x[key], x); return [...m.values()]; };
  const ws = (Array.isArray(data.workouts) ? data.workouts : []).filter(w => w && w.id && typeof w.name === 'string' && Array.isArray(w.blocks));
  const exs = Array.isArray(data.exercises) && data.exercises.length ? normalizeImport({ exercises: data.exercises }) : [];
  const log = (Array.isArray(data.history) ? data.history : []).filter(s => s && s.id && s.start);
  WK.list = byId(WK.list || [], ws); saveWorkouts();
  S.lib.items = byId(S.lib.items, exs); saveLib();
  for (const id of Array.isArray(data.bookmarks) ? data.bookmarks : []) if (typeof id === 'string') BOOKMARKS.add(id);
  saveBookmarks(); migrateSaved();                           // an older backup may hold stored library copies
  saveLog(byId(loadLog(), log).sort((a, b) => String(a.start).localeCompare(String(b.start))));
  const st = data.settings || {};
  if (st.sound && SOUND_MODES.some(m => m[0] === st.sound)) setSound(st.sound);
  if (typeof st.speechRate === 'number') setRate(st.speechRate, false);
  if (typeof st.encourage === 'boolean') setPref(ENCOURAGE_KEY, st.encourage ? 'on' : 'off');
  if (st.fullscreen) { try { localStorage.setItem(FS_KEY, st.fullscreen); } catch (e) { } }
  keepStorage();
  return { workouts: ws.length, exercises: exs.length, sessions: log.length };
}

/* a file to the phone's share sheet (save to Drive, send to yourself), or a download where that isn't supported */
async function shareFile(text, name, title) {
  try {
    const file = new File([text], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    snack(`Saved ${name}`);
  } catch (e) { showJson(title, text); }
}

document.querySelector('.shell').addEventListener('click', e => {
  const t = e.target.closest('[data-act="backup"]'); if (t) exportEverything();
});
if (installedApp()) keepStorage();

boot();                                    // everything's defined: load the library and show the first page
