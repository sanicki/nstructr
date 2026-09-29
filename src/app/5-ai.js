
/* ===================== Create with AI ===================== */
/* No keys and no server: NstructR writes the instructions (the prompt), opens the chosen AI app with them filled in
   (or copied, where the app can't take them in its link), and the user pastes the answer (JSON) back.
   One prompt: the AI answers with an exercise file or a workout file, whichever fits what the user has. */
const AI_KEY = 'nstructr-ai-app-v1';
const AI_Q_MAX = 15000;          // longest link we fill in (Cloudflare, in front of most of these, refuses URLs over 16 KB); longer ones are only copied
const AI_APPS = [                // A–Z by provider, "other" last. q: the link parameter that fills in the message, where the app has one
  { id: 'claude', provider: 'Anthropic', name: 'Claude', url: 'https://claude.ai/new', q: 'q' },
  { id: 'deepseek', provider: 'DeepSeek', name: 'DeepSeek', url: 'https://chat.deepseek.com/' },
  { id: 'gemini', provider: 'Google', name: 'Gemini', url: 'https://gemini.google.com/app' },
  { id: 'copilot', provider: 'Microsoft', name: 'Copilot', url: 'https://copilot.microsoft.com/', q: 'q' },
  { id: 'mistral', provider: 'Mistral', name: 'Vibe', url: 'https://chat.mistral.ai/chat' },   // formerly Le Chat; refuses the long link (header too large): copy
  { id: 'chatgpt', provider: 'OpenAI', name: 'ChatGPT', url: 'https://chatgpt.com/', q: 'q' },
  { id: 'grok', provider: 'xAI', name: 'Grok', url: 'https://grok.com/' },                  // refuses the long link too: copy
  { id: 'other', name: 'Other LLM' },
];
/* the list shows "Provider (App)", e.g. "Google (Gemini)"; the button and messages use the app's name ("Open Gemini") */
const aiAppLabel = a => (!a.provider ? a.name : a.provider === a.name ? a.name : `${a.provider} (${a.name})`);
const AI_KINDS = [                // in the order they're offered; a goal first (it only uses what's in the app)
  { id: 'plan', label: 'Workout goal', field: 'What you want', ph: 'e.g. a 30-minute leg workout', hint: 'The AI plans a workout from the library\'s exercises (and your own), using only the equipment you pick.' },
  { id: 'routine', label: 'Workout routine', field: 'The routine', ph: 'Paste or type it: exercises, reps, sets, rests…', hint: 'A list of exercises makes a workout; one exercise makes an exercise.' },
  { id: 'name', label: 'Missing exercise', field: 'Exercise name', ph: 'e.g. Pilates leg circles', hint: 'One that isn\'t in the library yet. The AI uses what it knows, and looks it up on the web where it can to check it.' },
  { id: 'media', label: 'Photo/Video', field: '', ph: '', hint: 'Attach your photo or video in the AI app after it opens (a link can\'t carry it). Pick an app that accepts them.' },
  { id: 'link', label: 'YouTube link', field: 'YouTube link', ph: 'https://www.youtube.com/watch?v=…', hint: 'Gemini can watch YouTube videos; most other apps only read the page (a web page link works too).' },
];
/* "plan": the equipment the user has, as the kinds src/similar.js uses (a mat doesn't count). Remembered. */
const AI_EQUIP_KEY = 'nstructr-ai-equipment-v1';
const AI_EQUIP_LABEL = { band: 'Resistance band', 'door anchor': 'Door anchor (for a band)', block: 'Yoga block', strap: 'Yoga strap' };
const aiEquipLabel = k => AI_EQUIP_LABEL[k] || k.charAt(0).toUpperCase() + k.slice(1);
const aiEquipKinds = () => [...new Set(allExercises().flatMap(ex => SIMILAR_EX.equipKinds(ex.equipment)))].sort();
function aiEquipChosen() { try { const v = JSON.parse(pref(AI_EQUIP_KEY, '[]')); return new Set(Array.isArray(v) ? v : []); } catch (e) { return new Set(); } }   // nothing picked at first (a wall until Sep 2026)
/* the exercises a plan may use: every piece of their equipment is one the user has */
const aiCanDo = (ex, have = aiEquipChosen()) => SIMILAR_EX.equipKinds(ex.equipment).every(k => have.has(k));
const aiApp = () => AI_APPS.find(a => a.id === pref(AI_KEY, 'gemini')) || AI_APPS.find(a => a.id === 'gemini');   // the last one picked
let AI_KIND = 'plan';

/* the library, one line per exercise with its names, so the AI can use what's already there; grouped by equipment (a
   mat doesn't count), so a band or dumbbell version isn't matched to the bodyweight one, with one heading per group.
   Accuracy first: a prompt too long for a link is copied to paste instead (HANDOFF §10). */
function libraryLines() {
  const groups = new Map(), word = t => String(t).trim().replace(/\s+/g, '-');
  for (const ex of allExercises()) {
    const bits = [];
    if (ex.measure === 'time') bits.push('time');
    if (ex.bilateral) bits.push('sides');
    if (ex.direction) bits.push(`dir A-${word(ex.direction.labels.A)} B-${word(ex.direction.labels.B)}`);
    const k = SIMILAR_EX.equipKinds(ex.equipment).join(' and ');
    if (!groups.has(k)) groups.set(k, []);
    // its names too, so a source's name for it (Butterfly, Hip Raise) finds it
    const names = [ex.name, ...otherNames(ex)].map(n => String(n).replace(/\s+/g, ' ').trim()).filter(Boolean);
    groups.get(k).push(`${[ex.id, ...bits].join(' ')}: ${[...new Set(names)].join(' / ')}`);
  }
  return [...groups.keys()].sort().map(k => `${k ? 'WITH ' + k : 'NO EQUIPMENT'}\n${groups.get(k).join('\n')}`).join('\n');
}
const aiItemRules = `- Rep-based exercises get "reps"; time-based ones get "seconds".
- "sides" (only for exercises marked sides): "L", "R", "both" (one side then the other) or "alternate". Reps count per side.
- "dir" (only for exercises marked dir): "A", "B", "both" or "alternate".
- "sets" defaults to 1 (rests between exercises and between sets are the user's settings). "tempo" is a speed multiplier (1 = the exercise's own pace, 2 = twice as fast).
- Leave out "sides" and "dir" for exercises that don't list them, and "sets" and "tempo" when they're the defaults.`;
/* a plan: only library exercises the user's equipment allows, each with its pace and what it works; only the workout
   format (no exercise format: nothing new is written), so it's the shortest prompt */
function planLines(have) {
  const groups = new Map(), word = t => String(t).trim().replace(/\s+/g, '-');
  for (const ex of allExercises().filter(ex => aiCanDo(ex, have))) {
    const bits = [ex.measure === 'time' ? 'time' : `${round1(repSeconds(ex))}s`];
    if (ex.bilateral) bits.push('sides');
    if (ex.direction) bits.push(`dir A-${word(ex.direction.labels.A)} B-${word(ex.direction.labels.B)}`);
    const k = SIMILAR_EX.equipKinds(ex.equipment).join(' and ');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(`${ex.id} ${bits.join(' ')}: ${ex.name} (${String(ex.focus || ex.category || '').replace(/\s+/g, ' ').trim()})`);
  }
  return [...groups.keys()].sort().map(k => `${k ? 'WITH ' + k : 'NO EQUIPMENT'}\n${groups.get(k).join('\n')}`).join('\n');
}
function planPrompt(what, have = aiEquipChosen()) {
  const kit = [...have].filter(k => aiEquipKinds().includes(k)).map(aiEquipLabel).join(', ').toLowerCase();
  return `Plan a workout for my exercise app: ${what || '[GOAL]'}

The app is NstructR: a stick figure shows each exercise, and the app runs the workout and times it. Answer with ONE JSON file and nothing else (no markdown fences, no commentary before or after).

RULES
- Use ONLY exercise ids from the LIBRARY below, exactly as written: they are the exercises I can do with what I have (${kit ? kit + ', or nothing' : 'no equipment'}). Don't make up exercises or write new ones.
- Plan it the way a qualified trainer would: a warm-up, the main work, then a cool-down; exercises that suit the goal; reps, holds, sets and rounds that suit it too.
- Fit the length I asked for, if any. Count about 5 s to get into position for each exercise. After each id: the seconds one rep takes at tempo 1 (for "sides", one side), or "time" for exercises that last their "seconds". Between exercises the app rests ${restGap()} s, and ${restSets()} s between sets.

FILE
{"format":"nstructr/workout","version":2,"workouts":[WORKOUT]}

WORKOUT
{"version":2,"id":"kebab-case-name","name":"...","description":"one sentence","blocks":[
  {"name":"Warm-up","rounds":1,"roundRest":30,"items":[
    {"ex":"<exercise id>","sets":1,"reps":10,"sides":"both","dir":"both","tempo":1},
    {"ex":"<exercise id>","seconds":30,"sides":"both"}]}]}
${aiItemRules}
- Group the exercises into blocks (Warm-up, Main, Cool-down, or a circuit with "rounds" and "roundRest").

LIBRARY (exercise ids under the equipment they use; after an id: seconds per rep or "time"; "sides" = takes sides; "dir A-x B-y" = takes a direction, A is x and B is y; after the colon, its name and what it works)
${planLines(have)}`;
}
function aiPrompt(kind = AI_KIND, input = '') {
  const what = input.trim();
  if (kind === 'plan') return planPrompt(what);
  const from = {
    name: `Make this for my exercise app: ${what || '[NAME]'}`,
    routine: `Turn this into a workout (or an exercise, if it is only one) for my exercise app:\n${what || '[ROUTINE]'}`,
    link: `Watch or read this and make what it shows for my exercise app: ${what || '[LINK]'}`,
    media: 'I have attached a photo or video. Make what it shows for my exercise app.',
  }[kind];
  return `${from}

The app is NstructR: a stick figure animates each exercise step by step. Answer with ONE JSON file and nothing else (no markdown fences, no commentary before or after).

GET IT RIGHT
Use what you know, and if you can search the web, look up the exercise (or each exercise of a routine) to confirm or correct it: how it is done, its steps, typical reps or hold times, and safety notes. Prefer reputable sources (physiotherapy, sports medicine, certified instructors). Put the page you relied on most in "source" (url and title).

WHICH FILE
- ONE exercise that is in the LIBRARY below: answer {"inLibrary":"<its id>"}.
- ONE exercise that is not in the LIBRARY: an exercise file (EXERCISE FORMAT).
- A ROUTINE of several exercises: a workout file:
  {"format":"nstructr/workout","version":2,"workouts":[WORKOUT],"exercises":[new exercises, if any]}
  Use LIBRARY ids where an exercise matches by movement AND equipment, not just by name: a squat with a band, dumbbells or a chair is not the plain squat. For any exercise with no match, write it in "exercises" (EXERCISE FORMAT, id starting "u-", with its "equipment") and use that id in the workout.

WORKOUT
{"version":2,"id":"kebab-case-name","name":"...","description":"one sentence","blocks":[
  {"name":"Warm-up","rounds":1,"roundRest":30,"items":[
    {"ex":"<exercise id>","calledInSource":"Hip Raise","equipmentInSource":[],"sets":1,"reps":10,"sides":"both","dir":"both","tempo":1},
    {"ex":"<exercise id>","calledInSource":"...","equipmentInSource":["Resistance band"],"seconds":30,"sides":"both"}]}]}
- On every item: "calledInSource", the source's name for it (any language), and "equipmentInSource", the equipment the source uses for it ([] for none; a mat doesn't count).
${aiItemRules} Use the routine's numbers; for a range, use the lower end.
- Keep the routine's sections as blocks, in order. For a circuit ("repeat 3 times"), set the block's "rounds" and "roundRest".

${aiPromptText()}
7. Write "description", "setup" and "cues" in your own words; short, plain directions. Put where it came from in "source".

LIBRARY (exercise ids under the equipment they use; after an id: "time" = measured in seconds, otherwise reps; "sides" = takes sides; "dir A-x B-y" = takes a direction, A is x and B is y; after the colon, its names, separated by /)
${libraryLines()}`;
}
function aiPromptText() { return $('#aiPrompt').innerHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/(\S) {2,}/g, '$1 '); }   // alignment spaces cost link length

/* the JSON in an answer: AI apps often wrap it in ``` fences or add a sentence around it */
function extractJson(text) {
  const t = String(text || '').trim();
  try { JSON.parse(t); return t; } catch (e) { }
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  if (fenced) { try { JSON.parse(fenced[1]); return fenced[1].trim(); } catch (e) { } }
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { const s = t.slice(a, b + 1); try { JSON.parse(s); return s; } catch (e) { } }
  return t;                      // not JSON: the import says why
}

function renderAi() {
  const k = AI_KINDS.find(x => x.id === AI_KIND), app = aiApp();
  $('#aiKind').innerHTML = AI_KINDS.map(x => `<button class="filter stateful" data-aikind="${x.id}" aria-pressed="${x.id === AI_KIND}"><span class="icon">check</span>${x.label}</button>`).join('');
  $('#aiInputWrap').hidden = !k.field;
  $('#aiEquipWrap').hidden = AI_KIND !== 'plan';
  if (AI_KIND === 'plan') { const have = aiEquipChosen(); $('#aiEquip').innerHTML = aiEquipKinds().sort((a, b) => aiEquipLabel(a).localeCompare(aiEquipLabel(b))).map(q => chip('data-aiequip', q, have.has(q), aiEquipLabel(q))).join(''); }
  $('#aiInputLabel').textContent = k.field;
  $('#aiInput').placeholder = k.ph;
  $('#aiInput').rows = AI_KIND === 'routine' ? 6 : 2;
  $('#aiKindHint').textContent = k.hint;
  $('#aiOpenLabel').textContent = app.url ? `Open ${app.name}` : 'Copy instructions';
  $('#aiOpen').querySelector('.icon').textContent = app.url ? 'open_in_new' : 'content_copy';
  $('#aiCopy').hidden = !app.url;
  $('#aiAppHint').textContent = !app.url ? 'Paste the instructions into your AI app\'s chat, then bring its answer back here.'
    : app.q ? `${app.name} opens with the instructions filled in (they're copied too, in case they don't show up). Send them, then copy its answer.`
    : `${app.name} can't take the instructions in a link: they're copied, so paste them into its chat and send them.`;
  $('#aiAppHint').textContent += ' (Change the default provider in Settings.)';
}
function openAi() { renderAi(); $('#aiAnswer').value = ''; aiAnswerChanged(); $('#aiDialog').showModal(); }
/* Add stays greyed out until something is pasted */
function aiAnswerChanged() { $('#aiImport').disabled = !$('#aiAnswer').value.trim(); }
$('#aiAnswer').addEventListener('input', aiAnswerChanged);

/* the app's link with the instructions filled in. Lighter than URLSearchParams: punctuation a query may carry as it
   is (: , / ; @ $ ?) stays as it is, spaces are +, and everything else is %-escaped as usual; any server (and
   URLSearchParams itself) reads it back identically. Saves about 7% of the length. */
const aiQuery = text => encodeURIComponent(text).replace(/%20/g, '+').replace(/%(3A|2C|2F|3B|40|24|3F)/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
const aiLink = (app, text) => `${app.url}?${app.q}=${aiQuery(text)}`;
async function aiCopy(text) { try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; } }
function aiCheckInput() {
  if (AI_KIND === 'media' || $('#aiInput').value.trim()) return true;
  snack(`Add the ${AI_KINDS.find(x => x.id === AI_KIND).field.toLowerCase()} first.`); $('#aiInput').focus(); return false;
}
$('#aiOpen').addEventListener('click', async () => {
  if (!aiCheckInput()) return;
  const app = aiApp(), text = aiPrompt(AI_KIND, $('#aiInput').value);
  let url = app.url, filled = false;
  if (app.q) { const u = aiLink(app, text); if (u.length <= AI_Q_MAX) { url = u; filled = true; } }
  const copying = aiCopy(text);                               // both inside the tap, before anything is awaited
  if (url) window.open(url, '_blank', 'noopener');
  const copied = await copying;
  if (!copied && !filled) { showJson('Copy these instructions', text); snack('Select the text and copy it.'); return; }
  snack(filled ? `Opened ${app.name} with the instructions. Send them, then paste its answer here.`
    : url ? `Instructions copied. Paste them into ${app.name}'s chat and send them.` : 'Instructions copied. Paste them into your AI app.', 7000);
});
$('#aiCopy').addEventListener('click', async () => {
  if (!aiCheckInput()) return;
  const text = aiPrompt(AI_KIND, $('#aiInput').value);
  if (await aiCopy(text)) snack('Instructions copied'); else { showJson('Copy these instructions', text); snack('Select the text and copy it.'); }
});
$('#aiShow').addEventListener('click', () => showJson('Create with AI: the instructions', aiPrompt(AI_KIND, $('#aiInput').value)));
$('#aiEquip').addEventListener('click', e => {
  const b = e.target.closest('[data-aiequip]'); if (!b) return;
  const have = aiEquipChosen(), k = b.dataset.aiequip;
  if (have.has(k)) have.delete(k); else have.add(k);
  setPref(AI_EQUIP_KEY, JSON.stringify([...have].sort())); renderAi();
});
$('#aiKind').addEventListener('click', e => { const b = e.target.closest('[data-aikind]'); if (b) { AI_KIND = b.dataset.aikind; renderAi(); } });
/* the AI app is chosen in Settings › Create with AI ("Choose AI provider") and remembered */
function renderAiSetting() { const app = aiApp(); $('#setAiApp').innerHTML = AI_APPS.map(a => `<option value="${a.id}"${a.id === app.id ? ' selected' : ''}>${esc(aiAppLabel(a))}</option>`).join(''); }
function setAiApp(id) { if (!AI_APPS.some(a => a.id === id)) return; setPref(AI_KEY, id); renderAiSetting(); if ($('#aiDialog').open) renderAi(); }
$('#setAiApp').addEventListener('change', e => setAiApp(e.target.value));
renderAiSetting();
$('#aiImport').addEventListener('click', () => {
  const text = extractJson($('#aiAnswer').value);
  if (!text) { snack('Paste the AI\'s answer first.'); return; }
  let data = null; try { data = JSON.parse(text); } catch (e) { }
  if (data && typeof data.inLibrary === 'string' && Object.keys(data).length === 1) {
    const ex = exById(data.inLibrary);
    if (!ex) { snack(`The AI named "${data.inLibrary}", which isn't in the library. Ask it to write the exercise instead.`, 7000); return; }
    $('#aiDialog').close(); go(`#/play/${encodeURIComponent(ex.id)}`); snack(`${ex.name} is already in the library`); return;
  }
  let other = [];
  // (a plan's answer is a workout; an exercise pasted while "Workout goal" is picked imports as usual)
  if (AI_KIND === 'plan' && data && data.format === 'nstructr/workout') {
    const p = planCheck(data); if (p.error) { snack(p.error, 8000); return; }
    other = p.other; delete data.exercises;
  }
  if (!importAndShow([[data && AI_KIND === 'plan' ? JSON.stringify(data) : text, 'The answer']])) return;
  $('#aiDialog').close();
  if (AI_KIND === 'plan' && IMPORTED_WORKOUTS.length) {
    const w = IMPORTED_WORKOUTS[0], min = Math.round(workoutSeconds(w) / 60);
    snack(`Planned: ${w.name}, about ${min} min${other.length ? `. Needs equipment you didn't pick: ${other.slice(0, 3).join(', ')}` : ''}`, other.length ? 9000 : 5000);
  }
});
/* a plan's answer: a workout of library exercises (or the user's own) only; any the chosen equipment doesn't allow
   are named after the import, not refused (the user may have it after all) */
function planCheck(data) {
  const wks = data.format === 'nstructr/workout' && Array.isArray(data.workouts) ? data.workouts : null;
  if (!wks || !wks.length) return { error: 'The answer isn\'t a workout. Ask the AI for the workout file again.' };
  const items = wks.flatMap(w => (w && w.blocks || []).flatMap(b => (b && b.items) || []));
  const unknown = [...new Set(items.map(i => i && i.ex).filter(id => !exById(id)))];
  if (unknown.length) return { error: `The AI used exercises that aren't in the library (${unknown.slice(0, 4).join(', ')}). Ask it to use only the library's.` };
  const have = aiEquipChosen();
  return { other: [...new Set(items.map(i => exById(i.ex)).filter(ex => !aiCanDo(ex, have)).map(ex => ex.name))] };
}
document.addEventListener('click', e => { if (e.target.closest('[data-act="ai"]')) { e.stopPropagation(); openAi(); } }, true);
