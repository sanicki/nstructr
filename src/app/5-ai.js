
/* ===================== Create with AI ===================== */
/* No keys and no server: NstructR writes the instructions (the prompt), opens the chosen AI app with them filled in
   (or copied, where the app can't take them in its link), and the user pastes the answer (JSON) back.
   One prompt: the AI answers with an exercise file or a workout file, whichever fits what the user has. */
const AI_KEY = 'nstructr-ai-app-v1';
const AI_Q_MAX = 15000;          // longest link we fill in (Cloudflare, in front of most of these, refuses URLs over 16 KB); longer ones are only copied
const AI_APPS = [                // A–Z, "other" last. q: the link parameter that fills in the message, where the app has one
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/', q: 'q' },
  { id: 'claude', name: 'Claude', url: 'https://claude.ai/new', q: 'q' },
  { id: 'copilot', name: 'Copilot', url: 'https://copilot.microsoft.com/', q: 'q' },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com/' },
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app' },
  { id: 'grok', name: 'Grok', url: 'https://grok.com/' },                           // refuses the long link (header too large): copy
  { id: 'mistral', name: 'Vibe', url: 'https://chat.mistral.ai/chat' },             // Mistral's, formerly Le Chat; refuses the long link too
  { id: 'other', name: 'Other LLM' },
];
const AI_KINDS = [
  { id: 'name', label: 'The name of the exercise', field: 'Exercise name', ph: 'e.g. Pilates leg circles', hint: 'The AI uses what it knows, and looks it up on the web where it can to check it.' },
  { id: 'routine', label: 'Written routine', field: 'The routine', ph: 'Paste or type it: exercises, reps, sets, rests…', hint: 'A list of exercises makes a workout; one exercise makes an exercise.' },
  { id: 'link', label: 'Video or web link', field: 'Link', ph: 'https://www.youtube.com/watch?v=…', hint: 'Gemini can watch YouTube videos; most other apps only read the page.' },
  { id: 'media', label: 'Photo or video', field: '', ph: '', hint: 'Attach your photo or video in the AI app after it opens (a link can\'t carry it). Pick an app that accepts them.' },
];
const aiApp = () => AI_APPS.find(a => a.id === pref(AI_KEY, 'gemini')) || AI_APPS.find(a => a.id === 'gemini');   // the last one picked
let AI_KIND = 'name';

/* the library, one line per exercise, so the AI can use what's already there */
function libraryLines() {
  return allExercises().map(ex => {
    const bits = [];
    if (ex.measure === 'time') bits.push('time');
    if (ex.bilateral) bits.push('sides');
    if (ex.direction) bits.push(`dir A=${ex.direction.labels.A}/B=${ex.direction.labels.B}`);
    return ex.id + (bits.length ? ` (${bits.join(', ')})` : '');
  }).join('\n');
}
function aiPrompt(kind = AI_KIND, input = '') {
  const what = input.trim();
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
  Use LIBRARY ids where an exercise matches by movement (not just by name). For any exercise with no reasonable match, write it in "exercises" (EXERCISE FORMAT, id starting "u-") and use that id in the workout.

WORKOUT
{"version":2,"id":"kebab-case-name","name":"...","description":"one sentence","blocks":[
  {"name":"Warm-up","rounds":1,"roundRest":30,"items":[
    {"ex":"<exercise id>","calledInSource":"Hip Raise","sets":1,"reps":10,"sides":"both","dir":"both","tempo":1},
    {"ex":"<exercise id>","calledInSource":"...","seconds":30,"sides":"both"}]}]}
- "calledInSource" on every item: the name the source uses for that exercise, as it says it (any language). When you use a LIBRARY id for an exercise the source calls something else, the app suggests the source's name as another name for it.
- Rep-based exercises get "reps"; time-based ones get "seconds". Use the routine's numbers; for a range, use the lower end.
- "sides" (only for exercises marked sides): "L", "R", "both" (one side then the other) or "alternate". Reps count per side.
- "dir" (only for exercises marked dir): "A", "B", "both" or "alternate".
- "sets" defaults to 1 (rests between exercises and between sets are the user's settings). "tempo" is a speed multiplier (1 = the exercise's own pace, 2 = twice as fast).
- Keep the routine's sections as blocks, in order. For a circuit ("repeat 3 times"), set the block's "rounds" and "roundRest".
- Leave out "sides" and "dir" for exercises that don't list them, and "sets" and "tempo" when they're the defaults.

${aiPromptText()}
8. Write "description", "setup" and "cues" in your own words; short, plain directions. Put where it came from in "source".

LIBRARY (exercise ids; "time" = measured in seconds, otherwise reps; "sides"/"dir" = takes those options)
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
  $('#aiInputLabel').textContent = k.field;
  $('#aiInput').placeholder = k.ph;
  $('#aiInput').rows = AI_KIND === 'routine' ? 6 : 2;
  $('#aiKindHint').textContent = k.hint;
  $('#aiApp').innerHTML = AI_APPS.map(a => `<option value="${a.id}"${a.id === app.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('');
  $('#aiOpenLabel').textContent = app.url ? `Open ${app.name}` : 'Copy instructions';
  $('#aiOpen').querySelector('.icon').textContent = app.url ? 'open_in_new' : 'content_copy';
  $('#aiCopy').hidden = !app.url;
  $('#aiAppHint').textContent = !app.url ? 'Paste the instructions into your AI app\'s chat, then bring its answer back here.'
    : app.q ? `${app.name} opens with the instructions filled in (they're copied too, in case they don't show up). Send them, then copy its answer.`
    : `${app.name} can't take the instructions in a link: they're copied, so paste them into its chat and send them.`;
}
function openAi() { renderAi(); $('#aiAnswer').value = ''; $('#aiDialog').showModal(); }

async function aiCopy(text) { try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; } }
function aiCheckInput() {
  if (AI_KIND === 'media' || $('#aiInput').value.trim()) return true;
  snack(`Add the ${AI_KINDS.find(x => x.id === AI_KIND).field.toLowerCase()} first.`); $('#aiInput').focus(); return false;
}
$('#aiOpen').addEventListener('click', async () => {
  if (!aiCheckInput()) return;
  const app = aiApp(), text = aiPrompt(AI_KIND, $('#aiInput').value);
  let url = app.url, filled = false;
  if (app.q) { const u = `${app.url}?${new URLSearchParams({ [app.q]: text })}`; if (u.length <= AI_Q_MAX) { url = u; filled = true; } }
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
$('#aiKind').addEventListener('click', e => { const b = e.target.closest('[data-aikind]'); if (b) { AI_KIND = b.dataset.aikind; renderAi(); } });
$('#aiApp').addEventListener('change', e => { setPref(AI_KEY, e.target.value); renderAi(); renderSettings(); });
$('#aiPaste').addEventListener('click', async () => {
  try { const t = await navigator.clipboard.readText(); if (t) { $('#aiAnswer').value = t; return; } } catch (e) { }
  $('#aiAnswer').focus(); snack('Long-press the box and choose Paste.');
});
$('#aiImport').addEventListener('click', () => {
  const text = extractJson($('#aiAnswer').value);
  if (!text) { snack('Paste the AI\'s answer first.'); return; }
  let data = null; try { data = JSON.parse(text); } catch (e) { }
  if (data && typeof data.inLibrary === 'string' && Object.keys(data).length === 1) {
    const ex = exById(data.inLibrary);
    if (!ex) { snack(`The AI named "${data.inLibrary}", which isn't in the library. Ask it to write the exercise instead.`, 7000); return; }
    $('#aiDialog').close(); go(`#/play/${encodeURIComponent(ex.id)}`); snack(`${ex.name} is already in the library`); return;
  }
  if (importAndShow([[text, 'The answer']])) $('#aiDialog').close();
});
document.addEventListener('click', e => { if (e.target.closest('[data-act="ai"]')) { e.stopPropagation(); openAi(); } }, true);
