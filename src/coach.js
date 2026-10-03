/* ===== The coaching script (the workout player, its time estimates and the tests use it) =====
   One set of one exercise (or one side or direction of it) as a list of steps: which keyframe of which version comes
   next, its phase, and the lines said as it starts. Each line has a gate:
     wait  the next step waits until it has been said (NstructR+'s run-through cues, "Ready… Begin.")
     hold  the hold's countdown waits until it has been said ("Ready… Hold for 30 seconds.")
     keep  said even while something else is (queued after it): the first count
     drop  skipped if it's still talking (the other counts, an alternating rep's "and", step calls)
   A count is { count: n, of: reps } (the player says "1", the number, "Last one" or a word of encouragement), "and" is
   { and: true }; everything else is { text }. Pure: keyframes and options in, data out (no browser, no app state); the
   words come in as options (the app's SAY table), so this runs under Node too. */
(function (root) {
  const C = typeof module !== 'undefined' ? require('./core.js') : { phaseInfo };
  const CALL_OK = /^[^0-9\s]+( [^0-9\s]+){0,2}$/;                // a step call: 1-3 words, no numbers (an imported one too)
  const WPS = 2.5;                                                // words a second at 1.0× (the app's speechSeconds)
  const cueOf = k => k.cue || k.name || '';
  // a keyframe's move and pause as the engine plays them (resolveKeyframe's defaults)
  const moveMs = k => (k.durationMs == null ? 1000 : Math.max(0, +k.durationMs));
  const pauseMs = k => (k.holdMs == null ? 500 : Math.max(0, +k.holdMs));

  /* versions: the keyframes of each version played in turn (one; two for alternating sides or directions), already
     mirrored or reversed for the side and direction.
     o: { measure: 'reps'|'time', reps, seconds, holdStep, voiced (NstructR or NstructR+), guided (NstructR+
     demonstrates this one), title ("Squat" or "Squat, left leg"), watch (say "Watch me first."), words: { readyBegin,
     watchFirst, readyHold(n) } }.
     A step: { v, k, phase, lines, ... } plus what the player shows: guided, ready, say (a waited-for line), seconds
     (a hold), repNo, repOf, alt (which half of an alternating rep), call; still (the ready step: no move, no pause, where
     the figure is) and noPause (the ready step with nothing before it: it moves into the rep's end pose). */
  function setScript(versions, o) {
    const V0 = versions[0], n = versions.length, ph = C.phaseInfo(V0), steps = [];
    const push = (v, k, m) => steps.push({ v, k, lines: [], ...m });
    const h = o.measure === 'time' ? (o.holdStep != null ? o.holdStep : ph.start) : null;
    let holdCued = false;                                       // the run-through already read the held step's cue
    if (o.guided) {
      // the run-through: each step waits for its move and its cue. Its first line names it; this appearance's first
      // demonstration also says to watch, not join in ("Squat. Watch me first. Feet hip-width apart."). An instant
      // step (the seam where a circle starts again) has nothing to show, so it only carries the title.
      let first = true;
      const g = (v, k) => {
        const kf = versions[v][k];
        const text = ((first ? `${o.title}. ${o.watch ? o.words.watchFirst + ' ' : ''}` : '') + (moveMs(kf) && !kf.quiet ? cueOf(kf) : '')).trim();
        push(v, k, { phase: 'guide', guided: true, say: text, lines: text ? [{ text, gate: 'wait' }] : [] }); first = false;
      };
      ph.setup.forEach(k => g(0, k));
      if (o.measure === 'time') ph.rep.filter(k => k !== h).forEach(k => g(0, k));
      else versions.forEach((_, v) => ph.rep.forEach(k => g(v, k)));
      if (first) { g(0, ph.start); holdCued = ph.start === h; }
    } else ph.setup.forEach(k => push(0, k, { phase: 'setup' }));
    if (o.measure === 'time') {
      // with a voice the countdown starts after "Ready… Hold for N seconds." (NstructR+ first reads the held step's own
      // cue, how to get into the pose, unless the run-through just did)
      const cue = o.guided && !holdCued && !V0[h].quiet ? cueOf(V0[h]).trim() : '';
      const text = `${cue ? cue + (/[.!?…]$/.test(cue) ? ' ' : '. ') : ''}${o.words.readyHold(o.seconds)}`;
      ph.rep.forEach(k => push(0, k, k === h ? { phase: 'hold', seconds: o.seconds, ...(o.voiced ? { say: text, lines: [{ text, gate: 'hold' }] } : {}) } : { phase: 'rep' }));
    } else {
      // with a voice, "Ready… Begin." and the count starts once it's said. It waits where the figure is (the end of the
      // setup or the demonstration); with nothing before it, in the position a rep ends in, as before every other rep
      if (o.voiced) {
        const before = steps[steps.length - 1], text = o.words.readyBegin;
        push(before ? before.v : 0, before ? before.k : ph.end, { phase: 'ready', ready: true, say: text, lines: [{ text, gate: 'wait' }], ...(before ? { still: true } : { noPause: true }) });
      }
      for (let i = 0; i < o.reps * n; i++) {
        const v = i % n, V = versions[v], alt = n > 1 ? v : null;
        ph.rep.forEach((k, j) => {
          const repNo = j === 0 ? Math.floor(i / n) + 1 : null, lines = [];
          // the count on a rep's first step ("1" is never dropped); an alternating rep's other half is "and"
          if (repNo && alt !== 1) lines.push({ count: repNo, of: o.reps, gate: repNo === 1 ? 'keep' : 'drop' });
          else if (repNo) lines.push({ and: true, gate: 'drop' });
          // a step's call ("Forward", "Out to the right") as it starts; never on the rep's first step, where the count is
          const call = o.voiced && j > 0 && CALL_OK.test(V[k].call || '') ? V[k].call : null;
          if (call) lines.push({ text: call, gate: 'drop' });
          push(v, k, { phase: 'rep', repNo, repOf: o.reps, alt, ...(call ? { call } : {}), lines });
        });
      }
    }
    ph.finish.forEach(k => push(n - 1, k, { phase: 'finish' }));
    return steps;
  }

  /* how long the steps take, in seconds: each step's move and pause (a hold: its seconds), or longer when the next step
     waits for a line (a hold's countdown starts once its line has been said). speech(text) -> seconds. */
  function scriptSeconds(steps, versions, { tempo = 1, speech = text => String(text).split(/\s+/).filter(Boolean).length / WPS } = {}) {
    let t = 0;
    for (const st of steps) {
      const kf = versions[st.v][st.k], move = st.still ? 0 : moveMs(kf) / 1000 / tempo;
      const said = l => (l.text ? speech(l.text) : 0);
      const wait = st.lines.filter(l => l.gate === 'wait').reduce((s, l) => s + said(l), 0);
      const hold = st.lines.filter(l => l.gate === 'hold').reduce((s, l) => s + said(l), 0);
      if (st.phase === 'hold') t += Math.max(move, hold) + st.seconds;
      else t += Math.max(move + (st.still || st.noPause ? 0 : pauseMs(kf) / 1000 / tempo), wait);
    }
    return t;
  }

  /* what's said, in order, with the counts as the plain words (for tests and estimates): ["Squat. Feet …", "Ready… Begin.",
     "1", "2", "Last one"] */
  function scriptLines(steps, { last = 'Last one', and = 'and' } = {}) {
    return steps.flatMap(st => st.lines.map(l => (l.count ? (l.count === 1 ? '1' : l.count === l.of ? last : String(l.count)) : l.and ? and : l.text)));
  }

  const api = { setScript, scriptSeconds, scriptLines, CALL_OK };
  if (typeof module !== 'undefined') module.exports = api; else root.COACH = api;
})(typeof window !== 'undefined' ? window : globalThis);
