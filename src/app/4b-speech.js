/* ===================== Workout player: sound and speech (beeps, the voice, captions, the spoken lines and words of encouragement) ===================== */
/* sound: beeps (Web Audio) and speech (the browser's built-in voice) */
let AC = null;
function unlockAudio() {
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); AC.resume(); } catch (e) { }
  try { if ('speechSynthesis' in window) speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch (e) { }
}
function beep(freq = 880, ms = 120) {
  if (WK.sound === 'off' || !AC) return;
  try {
    const o = AC.createOscillator(), g = AC.createGain();
    o.frequency.value = freq; o.connect(g); g.connect(AC.destination);
    g.gain.setValueAtTime(0.0001, AC.currentTime); g.gain.exponentialRampToValueAtTime(0.25, AC.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + ms / 1000);
    o.start(); o.stop(AC.currentTime + ms / 1000 + 0.02);
  } catch (e) { }
}
/* Speak a line. Lines queue up instead of cutting each other off. Returns a promise that resolves when the
   line has been spoken (or straight away if sound is off), so the guided run-through can wait for it.
   dropIfBusy: skip this line if something is still being said (rep counts, milestones). NstructR and NstructR+ say the
   same lines (counts, milestones, encouragement since Oct 2026); only NstructR+ adds the walk-through. */
let SAY_UNTIL = 0;                                               // when the lines queued so far should all have been said
function say(text, { dropIfBusy = false } = {}) {
  if (!/[\p{L}\p{N}]/u.test(text || '')) return Promise.resolve();   // nothing to say (a voice reads a lone "." as "dot")
  caption(text);
  const on = (WK.sound === 'voice' || WK.sound === 'coach') && 'speechSynthesis' in window;
  if (!on || !text) return Promise.resolve();
  try {
    if (dropIfBusy && (speechSynthesis.speaking || speechSynthesis.pending)) return Promise.resolve();
    return new Promise(res => {
      let done = false, timer = 0; const fin = () => { if (!done) { done = true; clearTimeout(timer); res(); } };
      const u = new SpeechSynthesisUtterance(text); u.lang = LANG; u.rate = speechRate();   // the voice for the text's language, not the phone's
      u.onend = fin; u.onerror = fin;
      // never wait forever on a voice that doesn't report back: give up this long after the line starts (or, with no
      // start reported, after the lines queued before it should be done too). Oct 2026: counted from when it was
      // queued, a line behind others gave up before it was said: "Ready… Begin." let the count start early, "1" came
      // late and "2" was dropped as it was still talking ("1. 3.")
      // (generous: 1.5 s plus an eighth more than the estimate, and never shorter than at 1.0×)
      const ms = 1500 + 1125 * speechSeconds(text, Math.min(1, speechRate())), now = performance.now();
      SAY_UNTIL = Math.max(now, SAY_UNTIL) + ms;
      timer = setTimeout(fin, SAY_UNTIL - now);
      u.onstart = () => { clearTimeout(timer); timer = setTimeout(fin, ms); };
      try { speechSynthesis.speak(u); } catch (e) { fin(); }        // a throw here would otherwise leave a guided step waiting forever
    });
  } catch (e) { return Promise.resolve(); }
}
let CAP_T = 0;
function caption(text) {
  const el = $('#wpCaption'); if (!el) return;
  el.innerHTML = `<span>${esc(text)}</span>`; el.classList.add('show');
  clearTimeout(CAP_T); CAP_T = setTimeout(() => el.classList.remove('show'), 1800 + 950 * speechSeconds(text, 1));
}
function hush() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { } WP.speaking = false; SAY_UNTIL = 0; }
/* the Instruction setting. Stored values stay as they were (HANDOFF §11); the names changed twice in Oct 2026: 'voice' is
   shown as "NstructR" (was "Voice", then "Coach"), 'coach' as "NstructR+" (was "Coach", then "Instructor") */
const SOUND_MODES = [['off', 'volume_off', 'Silent'], ['beeps', 'notifications', 'Beeps'], ['voice', 'record_voice_over', 'NstructR'], ['coach', 'sports', 'NstructR+']];
function setSound(mode) {
  WK.sound = mode; try { localStorage.setItem(SOUND_KEY, mode); } catch (e) { }
  const m = SOUND_MODES.find(x => x[0] === mode) || SOUND_MODES[1];
  if ($('#wpSound')) { $('#wpSound .icon').textContent = m[1]; $('#wpSoundLabel').textContent = m[2]; $('#wpSound').setAttribute('aria-label', `Instruction: ${m[2]}. Tap to change.`); }
  if (mode === 'off' && 'speechSynthesis' in window) speechSynthesis.cancel();
}

/* NstructR's and NstructR+'s words: "Ready… Begin." before the count (it starts at "1"; Oct 2026), varied when words of
   encouragement are on: a random "Last one", and now and then a word of encouragement in place of a count (never the
   first or last) or of an alternating rep's "and", or every 10 s of a hold (never at halfway or in the last 10 s), and
   a finished phrase as each set (and side) ends ("Last one. Finished!"; Oct 2026).
   WP.random can be replaced (tests). */
/* Every fixed line the workout player says, by what it's for (the words of encouragement are COACH_WORDS; what to do
   with equipment is EQUIP; cues, calls and names come from the exercise). A function takes what changes. */
const SAY = {
  readyBegin: 'Ready… Begin.',                                   // before the count
  watchFirst: 'Watch me first.',                                 // NstructR+'s first demonstration of an appearance
  readyHold: n => `Ready… ${plural(n, { one: 'Hold for # second.', other: 'Hold for # seconds.' })}`,
  and: 'and',                                                     // the other half of an alternating rep
  set: n => `Set ${fmtNum(n)}`,                                   // the next set of the same exercise
  switchSides: 'Switch sides', switchDir: 'Switch direction', switchBoth: 'Switch sides and direction',
  rest: n => plural(n, { one: 'Rest # second.', other: 'Rest # seconds.' }),
  roundDone: n => `Round ${fmtNum(n)} done.`,
  next: name => `Next: ${name}.`,
  tapReady: "Tap Ready when you're set.",                         // "Pause at equipment changes"
  need: list => `You'll need: ${list}`,                           // the title card's checklist
};
// the first of each is the plain word, said when words of encouragement are off. Cheers stay short: one in place of a
// count that is still being said when the next count comes drops it. (More words, owner, Oct 2026.)
const CHEERS = ['Good', 'Keep going', 'Breathe', 'Doing great', 'Nice', 'Steady', "That's it", 'Nice work', 'Looking good'];
const COACH_WORDS = {
  done: ['Great job!', 'Fantastic!', 'Finished!', 'Well done!', 'Nice work!', 'Excellent!', 'Way to go!', 'Nailed it!'],
  last: ['Last one', 'One more', 'Last rep', 'Final rep'],
  cheer: CHEERS,
  holdCheer: [...CHEERS, 'Stay with it', 'Hold it there', 'Breathe easy', 'Relax your shoulders'],   // (a hold only)
  half: ['Halfway', 'Halfway there', 'Halfway. Keep it up'],
  ten: ['10 seconds', '10 seconds left', 'Last 10 seconds'],
  end: ['Workout complete. Well done.', 'Workout complete. Great work today.', "That's the workout. Well done!"],
};
const coachRandom = () => (WP.random || Math.random)();
// a word isn't picked twice in a row for the same moment ("Good. Breathe. Good.", never "Good. Good.")
const COACH_LAST = {};
const coachWord = kind => {
  if (!encourageOn()) return COACH_WORDS[kind][0];
  const all = COACH_WORDS[kind], pick = all.length > 1 ? all.filter(w => w !== COACH_LAST[kind]) : all;
  return (COACH_LAST[kind] = pick[Math.floor(coachRandom() * pick.length)]);
};
const cheerChance = p => encourageOn() && coachRandom() < p;
// a count swapped for a cheer: 20%, halved for the rep right after one that cheered (and for as long as they keep cheering)
const REP_CHEER = 0.2;
function repCheer() { const hit = cheerChance(WP.cheered ? REP_CHEER / 2 : REP_CHEER); WP.cheered = hit; return hit; }
/* the guided run-through: a step waits until its cue has been read out */
function speakGuided(text) {
  WP.speaking = true;
  const token = WP.speakToken = (WP.speakToken || 0) + 1;
  say(text).then(() => { if (WP.speakToken === token) WP.speaking = false; });
}
/* the equipment words, after half a second of silence */
function sayEquipment(ch, tail = '') { return new Promise(res => setTimeout(() => say(`${ch.lines.join('. ')}.${tail}`).then(res), EQUIP_PAD * 1000)); }
