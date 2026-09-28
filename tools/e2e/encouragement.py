import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Coach's words of encouragement (Settings > Instruction > Coach > Words of encouragement, on at first):
# "Begin" and "Last one" from their synonyms; a count (never the first or last) replaced 20% of the time; during a
# hold, every 10 s a 40% chance, never at halfway or in the last 10 s. Off: the plain words. WP.random is stubbed.
SAY = "window.SAID = []; say = (t, coachOnly) => { if (!coachOnly || WK.sound === 'coach') SAID.push(t); return Promise.resolve(); }; renderWpCount = renderWpCount;"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/settings', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        await pg.click('[data-setsound="voice"]')
        print('Voice: toggle hidden    ', await pg.evaluate("$('#setEncourageRow').hidden"))
        await pg.click('[data-setsound="coach"]')
        print('Coach: toggle, on       ', await pg.evaluate("[$('#setEncourageRow').hidden, $('#setEncourage').checked]"), '<- [False, True]')
        # reps: 8 reps, the random numbers cycle; < 0.2 swaps a count
        await pg.evaluate(SAY)
        async def reps(rand):
            return await pg.evaluate(f"""(() => {{ const r = {rand}; let i = 0; WP.random = () => r[i++ % r.length]; SAID.length = 0;
              const keep = renderWpCount; renderWpCount = () => {{}};
              for (let k = 1; k <= 8; k++) {{ S.planMeta = [{{ repNo: k, repOf: 8 }}]; onWorkStep(0); }}
              renderWpCount = keep; return SAID.slice(); }})()""")
        print('reps, random 0.1        ', await reps('[0.1]'), '<- Begin, cheers, Last one')
        print('reps, random 0.5        ', await reps('[0.5]'), '<- Ready, counts, One more')
        print('reps, random 0.9        ', await reps('[0.9]'), '<- Go … Last rep')
        # a 60 s hold, random always 0 (always cheers where allowed): which seconds speak?
        await pg.evaluate("go('#/workouts')"); await pg.wait_for_timeout(300)
        await pg.evaluate("localStorage.setItem('nstructr-rest-between-v1','0'); WK.hinted = true; WK.list.push({id:'h',name:'H',blocks:[{id:'b',name:'B',items:[{...newItem(exById('core-forearm-plank')),seconds:60}]}]}); saveWorkouts(); startWorkout(wkById('h'),0)")
        await pg.wait_for_timeout(300); await pg.evaluate(SAY)
        async def hold(rand):
            return await pg.evaluate(f"""(() => {{ WP.random = () => {rand}; SAID.length = 0; setPlaying(false);
              const i = S.planMeta.findIndex(m => m.phase === 'hold'), r = S.resolved[i]; S.idx = i; WP.beeped = {{}}; const out = [];
              for (let s = 0; s <= 60; s++) {{ S.t = r.dur + s * 1000 * (S.tempo || 1); const n = SAID.length; renderWpCount(); if (SAID.length > n) out.push(s + 's ' + SAID.slice(n).join('/')); }}
              return out; }})()""")
        print('hold 60 s, random 0     ', await hold(0), '<- 10, 20, 40 s cheer; 30 s Halfway; 50 s 10 seconds')
        print('hold 60 s, random 0.5   ', await hold(0.5), '<- no cheers (40% chance missed)')
        await pg.evaluate("setPref(ENCOURAGE_KEY, 'off')")
        print('off: hold               ', await hold(0), '<- Halfway and 10 seconds only')
        print('off: reps               ', await reps('[0.1]'), '<- plain Begin, numbers, Last one')
        print('errors', errs); await b.close()
asyncio.run(main())
