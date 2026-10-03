
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

/* ---------- Install the app ----------
   Chrome, Edge and Samsung Internet say when the app can be installed (beforeinstallprompt): we keep the event (so
   Chrome doesn't show its own mini-bar; its menu's Install stays) and offer Install ourselves. Safari on iPhone and
   iPad has no event: Share > Add to Home Screen, told in words. Offered once, after the first workout that was
   started (finished or left early), never during one; Settings > Import & tools keeps an Install row while it's possible. */
const INSTALL_KEY = 'nstructr-install-hint-v1';     // "due": a workout was started, the tip is owed; "shown": offered once
let INSTALL_EVT = null;
const onIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const iosAddable = () => onIOS() && navigator.standalone !== true;
// (a page put in full screen for a workout also matches display-mode: fullscreen; an installed app has no fullscreenElement)
const runningInstalled = () => installedApp() && !document.fullscreenElement;
const canInstall = () => !runningInstalled() && (!!INSTALL_EVT || iosAddable());
const IOS_STEPS = 'In Safari, tap Share, then Add to Home Screen.';
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); INSTALL_EVT = e; renderInstall(); maybeInstallHint(); });
window.addEventListener('appinstalled', () => { INSTALL_EVT = null; setPref(INSTALL_KEY, 'shown'); renderInstall(); });
function installDue() { if (!pref(INSTALL_KEY, '')) setPref(INSTALL_KEY, 'due'); }
function maybeInstallHint() {
  if (pref(INSTALL_KEY, '') !== 'due' || S.view === 'wplay' || !canInstall()) return;
  setPref(INSTALL_KEY, 'shown');
  snack(`Install ${APP_NAME}?`, 12000, { label: INSTALL_EVT ? 'Install' : 'How', run: installApp });   // why: Settings > Install app
}
async function installApp() {
  if (!INSTALL_EVT) { if (iosAddable()) snack(IOS_STEPS, 8000); return; }
  const e = INSTALL_EVT; INSTALL_EVT = null;                  // a prompt can only be used once
  try { await e.prompt(); } catch (err) { }
  renderInstall();
}
function renderInstall() {
  const row = $('#installRow'); if (!row) return;
  row.hidden = !canInstall();
  $('#installHow').textContent = INSTALL_EVT ? 'Works offline and full screen, and the browser is much less likely to clear your data.' : IOS_STEPS;
  $('#installBtn').hidden = !INSTALL_EVT;
}
renderInstall();

/* ---------- Export everything / Import everything ---------- */
const BACKUP_FORMAT = 'nstructr/backup';
/* every setting and remembered choice, by the name it has in a backup: [name, storage key, kind, default]
   (on/off switches are true/false in the file; the Instruction, speech speed and encouragement are handled on their own) */
const BACKUP_PREFS = [
  ['restBetween', REST_KEY, 'seconds', 5], ['restSets', REST_SETS_KEY, 'seconds', 10],
  ['theme', THEME_KEY, ['system', 'light', 'dark'], 'system'], ['fullscreen', FS_KEY, 'switch', true],
  ['autoplay', AUTOPLAY_KEY, 'switch', true], ['authoring', AUTHOR_KEY, 'switch', false],
  ['exerciseLoop', LOOP_KEY, 'switch', true], ['exerciseMute', EXMUTE_KEY, 'switch', true],
  ['groupCollections', GROUP_KEY, 'switch', false], ['equipPause', EQUIP_PAUSE_KEY, 'switch', false],
  ['aiApp', AI_KEY, AI_APPS.map(a => a.id), 'gemini'], ['aiEquipment', AI_EQUIP_KEY, 'list', []],
  ['libraryOrder', LIB_ORDER_KEY, 'list', null]
];
function prefOut([, key, kind, def]) {
  const raw = pref(key, null);
  if (raw == null) return def;
  if (kind === 'switch') return raw !== 'off' && (raw === 'on' || def);
  if (kind === 'seconds') { const v = parseFloat(raw); return v >= 0 ? v : def; }
  if (kind === 'list') { try { const v = JSON.parse(raw); return Array.isArray(v) ? v : def; } catch (e) { return def; } }
  return raw;
}
function prefIn([, key, kind], v) {
  if (kind === 'switch' && typeof v === 'boolean') setPref(key, v ? 'on' : 'off');
  else if (kind === 'seconds' && typeof v === 'number' && v >= 0 && v <= 300) setPref(key, String(Math.round(v)));
  else if (kind === 'list' && Array.isArray(v) && v.every(x => typeof x === 'string')) setPref(key, JSON.stringify(v));
  else if (Array.isArray(kind) && kind.includes(v)) setPref(key, v);
  // (the Settings strings "on"/"off" of older backups' fullscreen)
  else if (kind === 'switch' && (v === 'on' || v === 'off')) setPref(key, v);
}
function backupData() {
  const settings = { sound: WK.sound, speechRate: speechRate(), encourage: encourageOn() };
  for (const p of BACKUP_PREFS) { const v = prefOut(p); if (v != null) settings[p[0]] = v; }
  const resume = loadSession();
  return {
    format: BACKUP_FORMAT, version: FILE_VERSION, exported: new Date().toISOString(),
    workouts: WK.list || [], exercises: S.lib.items, bookmarks: [...(BOOKMARKS || [])], history: loadLog(),
    settings, ...(resume ? { resume } : {})
  };
}
async function exportEverything() {
  const d = backupData(), name = `nstructr-backup-${d.exported.slice(0, 10)}.json`;
  await shareFile(JSON.stringify(d, null, 1), name, `${APP_NAME} backup`);
  keepStorage();
}
/* Restoring, the user's choice each time (askRestore): "merge" (anything in the backup replaces the item with the same
   id here and nothing here is deleted, so importing an older backup never loses newer work), or "replace" (this device
   ends up as the backup: workouts, own exercises, bookmarks, history, every setting and the workout to resume). */
function restoreBackup(data, mode = 'merge') {
  const rep = mode === 'replace';
  const byId = (mine, theirs, key = 'id') => { const m = new Map((rep ? [] : mine).map(x => [x[key], x])); for (const x of theirs) if (x && x[key] != null) m.set(x[key], x); return [...m.values()]; };
  const ws = (Array.isArray(data.workouts) ? data.workouts : []).filter(w => w && w.id && typeof w.name === 'string' && Array.isArray(w.blocks));
  const exs = Array.isArray(data.exercises) && data.exercises.length ? normalizeImport({ exercises: data.exercises }) : [];
  const log = (Array.isArray(data.history) ? data.history : []).filter(s => s && s.id && s.start);
  WK.list = byId(WK.list || [], ws); saveWorkouts();
  S.lib.items = byId(S.lib.items, exs); saveLib();
  if (rep) BOOKMARKS = new Set();
  for (const id of Array.isArray(data.bookmarks) ? data.bookmarks : []) if (typeof id === 'string') BOOKMARKS.add(id);
  saveBookmarks(); migrateSaved();                           // an older backup may hold stored library copies
  saveLog(byId(loadLog(), log).sort((a, b) => String(a.start).localeCompare(String(b.start))));
  const st = data.settings || {};
  if (st.sound && SOUND_MODES.some(m => m[0] === st.sound)) setSound(st.sound);
  if (typeof st.speechRate === 'number') setRate(st.speechRate, false);
  if (typeof st.encourage === 'boolean') setPref(ENCOURAGE_KEY, st.encourage ? 'on' : 'off');
  for (const p of BACKUP_PREFS) if (st[p[0]] !== undefined) prefIn(p, st[p[0]]); else if (rep) try { localStorage.removeItem(p[1]); } catch (e) { }   // (replace: not in an older backup = the default)
  applyTheme(pref(THEME_KEY, 'system')); applyAuthoring(); orderLibrary();
  // an unfinished workout carries on here too, unless one is already waiting to be resumed on this device
  const r = data.resume;
  if (rep) dropSession();
  if (r && typeof r.wid === 'string' && Number.isInteger(r.i) && !loadSession() && wkById(r.wid)) { try { localStorage.setItem(SESSION_KEY, JSON.stringify({ wid: r.wid, i: r.i })); } catch (e) { } }
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
  if (e.target.closest('[data-act="install"]')) installApp();
});
if (installedApp()) keepStorage();

boot();                                    // everything's defined: load the library and show the first page
