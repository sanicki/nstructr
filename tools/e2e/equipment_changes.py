import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Equipment changes (src/app/4-workouts.js, Oct 2026): from one exercise to the next with other equipment the rest gets an
# allowance (the longest of what changes, +3 s for each other item) and says what to put down and get; a workout with
# equipment starts with a "Get ready" checklist; the time estimate counts both; "Pause at equipment changes" (Settings,
# under Words of encouragement) waits for Ready instead. Works on the cover screen.
SAY = "window.SAID = []; say = t => { SAID.push(t); return Promise.resolve(); };"
WK = """((ids, rest) => { localStorage.setItem('nstructr-rest-between-v1', String(rest)); WK.hinted = true;
  WK.list = WK.list.filter(w => w.id !== 't'); WK.list.push({ id: 't', name: 'T', blocks: [{ id: 'b', name: 'B', items: ids.map(id => ({ ...newItem(exById(id)), reps: 1 })) }] });
  saveWorkouts(); startWorkout(wkById('t'), 0); })"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx = await b.new_context(viewport={'width': 412, 'height': 860}, service_workers='block'); pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/settings', wait_until='domcontentloaded'); await pg.wait_for_function("typeof equipPauseOn === 'function'"); await pg.wait_for_timeout(300)
        print('setting under encouragement', await pg.evaluate("$('#setEncourageRow').nextElementSibling.id"), '<- setEquipPauseRow')
        print('  off at first          ', await pg.evaluate("$('#setEquipPause').checked"), '<- False')
        print('changes                 ', await pg.evaluate("""[['fw-db-curl', 'chair-arm-raises'], ['bw-squat', 'bw-glute-bridge'], ['band-standing-row', 'band-face-pull'], ['band-overhead-triceps', 'band-standing-row'], ['fw-db-curl', 'fw-db-rdl']]
          .map(([a, c]) => { const x = equipmentChange(exById(a), exById(c)); return x && [x.seconds, x.lines.join(' / ')]; })"""))
        print("  <- [13, put the dumbbells down / bring a chair], none (no equipment), none (the same), [20, set up the door anchor], none (dumbbells both)")
        print('estimate counts it      ', await pg.evaluate("""(() => { const w = { id: 'e', name: 'E', blocks: [{ id: 'b', name: 'B', items: ['fw-db-curl', 'chair-arm-raises'].map(id => ({ ...newItem(exById(id)), reps: 1 })) }] };
          return [equipmentSeconds(w), Math.round(workoutSeconds(w) - w.blocks.reduce((s, x) => s + blockSeconds(x, w), 0))]; })()"""), '<- [23, 23] (10 s checklist + 13 s change)')
        # timed: the checklist, then the change
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_function("typeof equipPauseOn === 'function'"); await pg.wait_for_timeout(300); await pg.evaluate(SAY)
        await pg.evaluate(WK + "(['fw-db-curl', 'chair-arm-raises'], 5)"); await pg.wait_for_timeout(300)
        print('get ready               ', await pg.evaluate("[WP.phase, $('#wpRestLabel').textContent, $('#wpRestNext').textContent, $('#wpRestEquip').textContent, $('#wpRestTime').textContent]"))
        print("  <- ['rest', 'Get ready', 'First: Dumbbell Biceps Curl'-ish, \"You'll need: dumbbells and chair\", '0:10']")
        print('  said                  ', await pg.evaluate("SAID.slice(-1)"))
        await pg.evaluate("wpAction('restSkip')"); await pg.wait_for_timeout(300)
        await pg.evaluate("S.speed = 20"); await pg.wait_for_function("WP.phase === 'rest'", timeout=20000); await pg.evaluate("S.speed = 1")
        print('change rest             ', await pg.evaluate("[$('#wpRestLabel').textContent, $('#wpRestEquip').textContent, Math.round(WP.restLeft), $('[data-wact=\"restSkip\"]').textContent]"), "<- ['Rest', 'Put the dumbbells down · Bring a chair', 18 (5 + 13), 'Skip']")
        print('  said                  ', await pg.evaluate("SAID.slice(-1)"))
        # pause at equipment changes: waits for Ready
        await pg.evaluate("hush(); WP.phase = 'done'; setPref(EQUIP_PAUSE_KEY, 'on')")
        await pg.evaluate(WK + "(['fw-db-curl', 'chair-arm-raises'], 0)"); await pg.wait_for_timeout(300)
        print('pause: get ready waits  ', await pg.evaluate("[WP.phase, WP.waitReady, $('#wpRestTime').hidden, $('[data-wact=\"restSkip\"]').textContent, $('[data-wact=\"restMore\"]').hidden]"), "<- ['rest', True, True, 'Ready', True]")
        await pg.wait_for_timeout(12000)
        print('  12 s later, still     ', await pg.evaluate("WP.phase"), '<- rest')
        await pg.evaluate("wpAction('restSkip')"); await pg.wait_for_timeout(300)
        await pg.evaluate("S.speed = 20"); await pg.wait_for_function("WP.phase === 'rest'", timeout=20000); await pg.evaluate("S.speed = 1")
        print('  change: waits, says   ', await pg.evaluate("[WP.waitReady, SAID.slice(-1)[0]]"), "<- [True, '… Bring a chair. Tap Ready when you're set.']")
        await pg.wait_for_timeout(2500)
        await pg.evaluate("wpAction('restSkip')"); await pg.wait_for_function("WP.phase === 'work'", timeout=10000)
        print('  Ready: next exercise  ', await pg.evaluate("S.ex.id"), '<- chair-arm-raises')
        # no equipment: no checklist; the same equipment: a plain rest
        await pg.evaluate("hush(); WP.phase = 'done'"); await pg.evaluate(WK + "(['bw-squat', 'bw-pushup'], 5)"); await pg.wait_for_timeout(300)
        print('no equipment: no list   ', await pg.evaluate("WP.phase"), '<- work')
        # backup
        print('backup                  ', await pg.evaluate("backupData().settings.equipPause"), '<- True')
        await b.close()
        # the cover screen: everything on the rest screen in view
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width': 360, 'height': 398}, device_scale_factor=2.63, has_touch=True, service_workers='block'); pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_function("typeof equipPauseOn === 'function'"); await pg.wait_for_timeout(300)
        await pg.evaluate(WK + "(['band-overhead-triceps', 'band-standing-row'], 5)"); await pg.wait_for_timeout(500)
        await pg.evaluate("wpAction('restSkip')"); await pg.wait_for_timeout(300)
        await pg.evaluate("S.speed = 20"); await pg.wait_for_function("WP.phase === 'rest'", timeout=20000); await pg.evaluate("S.speed = 1"); await pg.wait_for_timeout(300)
        print('cover: all in view      ', await pg.evaluate("""['#wpRestLabel', '#wpRestTime', '#wpRestNext', '#wpRestEquip', '[data-wact="restSkip"]'].map(q => { const r = $(q).getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; })"""), '<- all True')
        await pg.screenshot(path='/tmp/equip_cover.png')
        print('errors', errs); await b.close()
asyncio.run(main())
