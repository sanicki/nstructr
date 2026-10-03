import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
# NstructR's and NstructR+'s words of encouragement (Settings > Instruction > NstructR or NstructR+ > Words of encouragement, on at first):
# the count starts at "1" (after "Ready… Begin.", never varied; Oct 2026), "Last one" from its synonyms; a count (never the first or last) replaced 20% of the time, 10% for the
# rep after one that was (until one isn't); during a hold, every 10 s a 40% chance, never at halfway or in the last 10 s.
# As each set (and side) ends, after its last animation: a finished phrase (Great job! / Fantastic! / Finished! / …; on only).
# Holds have their own cheers too (Stay with it, Hold it there …); "Halfway", "10 seconds" and the end of the workout are
# varied as well (Oct 2026). The lists: COACH_WORDS in src/app/4b-speech.js; the first of each is the plain word.
# An alternating rep's other half says "and" ("1 and 2 and 3"), which a cheer can replace too.
# A word is never the same as the last one picked for that moment. Off: the plain words. WP.random is stubbed.
SAY = "window.SAID = []; say = t => { if (WK.sound === 'voice' || WK.sound === 'coach') SAID.push(t); return Promise.resolve(); }; renderWpCount = renderWpCount;"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/settings', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        W = await pg.evaluate("COACH_WORDS"); LAST, CHEER = W['last'], W['cheer']
        no_repeat = lambda xs: all(a != b for a, b in zip(xs, xs[1:]))
        # a count of 8: "1", then counts or cheers, then a last word
        def counts(cheer_at):
            def f(said):
                mid = said[1:-1]
                return said[0] == '1' and said[-1] in LAST and len(said) == 8 and all((w in CHEER) if i + 2 in cheer_at else w == str(i + 2) for i, w in enumerate(mid)) and no_repeat([w for w in mid if w in CHEER])
            f.describe = f'1, {"cheers at " + str(sorted(cheer_at)) if cheer_at else "2 … 7"}, a last word'; return f
        await pg.click('[data-setsound="beeps"]')
        check('Beeps: toggle hidden', await pg.evaluate("$('#setEncourageRow').hidden"), True)
        await pg.click('[data-setsound="voice"]')
        check('NstructR: toggle shown', await pg.evaluate("$('#setEncourageRow').hidden"), False)
        await pg.click('[data-setsound="coach"]')
        check('NstructR+: toggle, on', await pg.evaluate("[$('#setEncourageRow').hidden, $('#setEncourage').checked]"), [False, True])
        # reps: 8 reps, the random numbers cycle; < 0.2 swaps a count (< 0.1 right after a swap)
        await pg.evaluate(SAY)
        async def reps(rand):
            return await pg.evaluate(f"""(() => {{ const r = {rand}; let i = 0; WP.random = () => r[i++ % r.length]; SAID.length = 0;
              const keep = renderWpCount; renderWpCount = () => {{}};
              for (let k = 1; k <= 8; k++) {{ S.planMeta = [{{ repNo: k, repOf: 8 }}]; onWorkStep(0); }}
              renderWpCount = keep; return SAID.slice(); }})()""")
        check('reps, random 0.15', await reps('[0.15]'), counts({2, 4, 6}), 'the rep after a cheer needs < 0.1')
        check('reps, random 0.05', await reps('[0.05]'), counts({2, 3, 4, 5, 6, 7}), 'a cheer every middle rep, never the same twice in a row')
        check('reps, random 0.5', await reps('[0.5]'), counts(set()))
        check('reps, random 0.9', await reps('[0.9]'), counts(set()))
        # alternating sides: each rep is one side then the other; the other half says "and" (a cheer can replace it)
        async def alt(rand):
            return await pg.evaluate(f"""(() => {{ const r = {rand}; let i = 0; WP.random = () => r[i++ % r.length]; SAID.length = 0;
              const keep = renderWpCount; renderWpCount = () => {{}};
              for (let k = 1; k <= 4; k++) for (const a of [0, 1]) {{ S.planMeta = [{{ repNo: k, repOf: 4, alt: a }}]; onWorkStep(0); }}
              renderWpCount = keep; return SAID.slice(); }})()""")
        check('alternating, random 0.5', await alt('[0.5]'), lambda x: x[:6] == ['1', 'and', '2', 'and', '3', 'and'] and x[6] in LAST and x[7] == 'and', "['1', 'and', '2', 'and', '3', 'and', a last word, 'and']")
        check('alternating, random 0.15', await alt('[0.15]'), lambda x: x[0] == '1' and x[1] in CHEER and x[2] == '2' and x[3] in CHEER and x[4] == '3' and x[5] in CHEER and x[6] in LAST, '1, cheer, 2, cheer, 3, cheer, a last word: an and can be a cheer')
        await pg.evaluate("setSound('voice')")
        check('NstructR counts too', await reps('[0.5]'), counts(set()))
        await pg.evaluate("setSound('coach')")
        # a 60 s hold, random always 0 (always cheers where allowed): which seconds speak?
        await pg.evaluate("go('#/workouts')"); await pg.wait_for_timeout(300)
        await pg.evaluate("localStorage.setItem('nstructr-rest-between-v1','0'); WK.hinted = true; WK.list.push({id:'h',name:'H',blocks:[{id:'b',name:'B',items:[{...newItem(exById('core-forearm-plank')),seconds:60}]}]}); saveWorkouts(); startWorkout(wkById('h'),0)")
        await pg.wait_for_timeout(300); await pg.evaluate(SAY)
        async def hold(rand):
            return await pg.evaluate(f"""(() => {{ WP.random = () => {rand}; SAID.length = 0; setPlaying(false);
              const i = S.planMeta.findIndex(m => m.phase === 'hold'), r = S.resolved[i]; S.idx = i; WP.beeped = {{}}; const out = [];
              for (let s = 0; s <= 60; s++) {{ S.t = r.dur + s * 1000 * (S.tempo || 1); const n = SAID.length; renderWpCount(); if (SAID.length > n) out.push(s + 's ' + SAID.slice(n).join('/')); }}
              return out; }})()""")
        check('hold 60 s, random 0', await hold(0), lambda x: [w.split(' ', 1)[0] for w in x] == ['10s', '20s', '30s', '40s', '50s'] and x[2][4:] in W['half'] and x[4][4:] in W['ten'] and all(x[i][4:] in W['holdCheer'] for i in (0, 1, 3)), '10, 20, 40 s a cheer; 30 s halfway; 50 s 10 seconds')
        check('hold 60 s, random 0.5', await hold(0.5), lambda x: len(x) == 2 and x[0][:4] == '30s ' and x[0][4:] in W['half'] and x[1][:4] == '50s ' and x[1][4:] in W['ten'], 'no cheers (40% chance missed)')
        await pg.evaluate("setPref(ENCOURAGE_KEY, 'off')")
        check('off: hold', await hold(0), ['30s Halfway', '50s 10 seconds'])
        check('off: reps', await reps('[0.05]'), ['1', '2', '3', '4', '5', '6', '7', 'Last one'])
        # a finished phrase as each set (and side) ends: when its last animation is over, before any move to what's next
        # (on only): "Last one. … Finished!"
        async def done(on):
            await pg.evaluate(f"""(() => {{ hush(); WP.phase = 'done'; setPref(ENCOURAGE_KEY, '{on}'); WP.random = () => 0.5; SAID.length = 0;
              const keep = say; window.WHEN = []; say = (t, o) => {{ WHEN.push([t, S.ex && S.ex.id, S.idx, S.resolved.length, S.planDone, WP.phase]); return keep(t, o); }};
              WK.list = WK.list.filter(w => w.id !== 'd'); WK.list.push({{ id: 'd', name: 'D', blocks: [{{ id: 'b', name: 'B', items: [{{ ...newItem(exById('core-dead-bug')), reps: 2, sides: 'both' }}] }}] }});
              saveWorkouts(); startWorkout(wkById('d'), 0); S.speed = 20; }})()""")
            await pg.wait_for_function("WP.phase === 'done'", timeout=60000)
            return await pg.evaluate("WHEN.filter(w => COACH_WORDS.done.includes(w[0])).map(w => [w[0], 'plan over: ' + (w[4] && w[2] === w[3] - 1)])")
        check('finished phrase, on', await done('on'), lambda x: len(x) == 2 and all(w in W['done'] and over == 'plan over: true' for w, over in x), '2 finished phrases, each after the last animation')
        check('finished phrase, off', await done('off'), [])
        # the other lists: which words each moment can pick (random over the whole range), on and off
        check('words, on', await pg.evaluate("""(() => { setPref(ENCOURAGE_KEY, 'on'); const out = {};
          for (const k of ['last', 'done', 'cheer', 'holdCheer', 'half', 'ten', 'end']) { const seen = new Set(); for (let i = 0; i < 400; i++) { WP.random = () => (i * 0.6180339) % 1; seen.add(coachWord(k)); } out[k] = seen.size + '/' + COACH_WORDS[k].length; }
          return out; })()"""), lambda d: all(a == b for a, b in (v.split('/') for v in d.values())), 'every word of every list is used (n/n)')
        check('words, off', await pg.evaluate("""(() => { setPref(ENCOURAGE_KEY, 'off'); return ['last', 'half', 'ten', 'end'].map(k => coachWord(k)); })()"""), ['Last one', 'Halfway', '10 seconds', 'Workout complete. Well done.'])
        check('Keep it up! gone', await pg.evaluate("Object.values(COACH_WORDS).flat().includes('Keep it up!')"), False)
        check('errors', errs, []); await b.close()
asyncio.run(main())
