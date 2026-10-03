import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Equipment changes (src/app/4-workouts.js, Oct 2026): from one exercise to the next with other equipment the time is what
# it takes to say what to do, with half a second of silence before and after (0.5 + words / 2.5 a second + 0.5). With a
# rest it's added to the rest, which shows and says it after the rest line; with no rest there's no rest screen: it's
# said while the move into the next exercise, slowed to last at least that long, plays. A workout with equipment starts
# with a title card (its name and what you'll need, not the first exercise) timed the same way; the time estimate counts both; "Pause at equipment changes" (Settings,
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
        print('no transition setting   ', await pg.evaluate("!!document.querySelector('#setEquipTime')"), '<- False (the time is the words)')
        print('changes                 ', await pg.evaluate("""[['fw-db-curl', 'chair-arm-raises'], ['bw-squat', 'bw-glute-bridge'], ['band-standing-row', 'band-face-pull'], ['band-overhead-triceps', 'band-standing-row'], ['fw-db-curl', 'fw-db-rdl'], ['chair-arm-raises', 'bw-squat']]
          .map(([a, c]) => { const x = equipmentChange(exById(a), exById(c)); return x && [x.seconds, x.lines.join(' / ')]; })"""))
        print("  <- [4.6 (0.5 + 9 words at 2.5 a second + 0.5), put the dumbbells down / position yourself by your chair], none (no equipment), none (the same), [3, set up your door anchor], none (dumbbells both), none (a chair to nothing: nothing to say)")
        print('estimate counts it      ', await pg.evaluate("""(() => { const w = { id: 'e', name: 'E', blocks: [{ id: 'b', name: 'B', items: ['fw-db-curl', 'chair-arm-raises'].map(id => ({ ...newItem(exById(id)), reps: 1 })) }] };
          return [equipmentSeconds(w), Math.round(workoutSeconds(w) - w.blocks.reduce((s, x) => s + blockSeconds(x, w), 0))]; })()"""), '<- [8, 8] (3.4 s title card: "E. You\'ll need: dumbbells and chair." + 4.6 s change)')
        # timed: the checklist, then the change
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_function("typeof equipPauseOn === 'function'"); await pg.wait_for_timeout(300); await pg.evaluate(SAY)
        await pg.evaluate(WK + "(['fw-db-curl', 'chair-arm-raises'], 5)"); await pg.wait_for_timeout(300)
        print('title card              ', await pg.evaluate("[WP.phase, $('#wpRestLabel').textContent, $('#wpRestTitle').textContent, [...document.querySelectorAll('#wpRestEquip li')].map(l => l.textContent), $('#wpRestNext').hidden, $('#wpRestTime').hidden, $('[data-wact=\"restSkip\"]').textContent]"))
        print("  <- ['rest', 'Workout', 'T', ['Dumbbells', 'Chair'] (You'll need: as bullets), True (no exercise name), True (no countdown), 'Start']")
        await pg.wait_for_timeout(700); print('  said (then 0.5 s, the list)', await pg.evaluate("SAID.slice(-2)"), "<- ['T.', \"You'll need: dumbbells and chair.\"]")
        await pg.evaluate("wpAction('restSkip')"); await pg.wait_for_timeout(300)
        await pg.evaluate("S.speed = 20"); await pg.wait_for_function("WP.phase === 'rest'", timeout=20000); await pg.evaluate("S.speed = 1")
        print('change rest             ', await pg.evaluate("[$('#wpRestLabel').textContent, $('#wpRestEquip').textContent, Math.round(WP.restLeft), $('[data-wact=\"restSkip\"]').textContent]"), "<- ['Rest', 'Put the dumbbells down · Position yourself by your chair', 10 (5 + 4.6), 'Skip']")
        await pg.wait_for_timeout(700); print('  said                  ', await pg.evaluate("SAID.slice(-2)"), "<- ['Rest 10 seconds. Next: …', 'Put the dumbbells down. Position yourself by your chair.']")
        # no rest between exercises: no rest screen; the move into the chair exercise takes at least as long as the words
        await pg.evaluate("hush(); WP.phase = 'done'"); await pg.evaluate(WK + "(['fw-db-curl', 'chair-arm-raises'], 0)"); await pg.wait_for_timeout(300)
        await pg.evaluate("wpAction('restSkip')"); await pg.wait_for_timeout(300)
        await pg.evaluate("S.speed = 20"); await pg.wait_for_function("S.ex.id === 'chair-arm-raises'", timeout=20000); await pg.evaluate("S.speed = 1"); await pg.wait_for_timeout(800)
        print('no rest: no rest screen ', await pg.evaluate("[WP.phase, $('#wpRest').hidden, S.trans > 0, S.resolved.slice(0, S.trans + 1).reduce((t, r, i) => t + r.dur + (i < S.trans ? r.hold : 0), 0) >= 4600]"), '<- [work, True, True, True] (the move lasts >= 4.6 s)')
        print('  said while moving     ', await pg.evaluate("SAID.slice(-2)"), "<- [..., 'Put the dumbbells down. Position yourself by your chair.'] (NstructR+ names it in the walk-through)")
        # pause at equipment changes: waits for Ready
        await pg.evaluate("hush(); WP.phase = 'done'; setPref(EQUIP_PAUSE_KEY, 'on')")
        await pg.evaluate(WK + "(['fw-db-curl', 'chair-arm-raises'], 0)"); await pg.wait_for_timeout(300)
        print('pause (no rest): waits  ', await pg.evaluate("[WP.phase, WP.waitReady, $('#wpRestTime').hidden, $('[data-wact=\"restSkip\"]').textContent, $('[data-wact=\"restMore\"]').hidden]"), "<- ['rest', True, True, 'Ready', True]")
        await pg.wait_for_timeout(12000)
        print('  12 s later, still     ', await pg.evaluate("WP.phase"), '<- rest')
        await pg.evaluate("wpAction('restSkip')"); await pg.wait_for_timeout(300)
        await pg.evaluate("S.speed = 20"); await pg.wait_for_function("WP.phase === 'rest'", timeout=20000); await pg.evaluate("S.speed = 1")
        await pg.wait_for_timeout(700)
        print('  change: waits, says   ', await pg.evaluate("[WP.waitReady, SAID.slice(-1)[0]]"), "<- [True, '… Position yourself by your chair. Tap Ready when you're set.']")
        await pg.wait_for_timeout(2500)
        await pg.evaluate("wpAction('restSkip')"); await pg.wait_for_function("WP.phase === 'work'", timeout=10000)
        print('  Ready: next exercise  ', await pg.evaluate("S.ex.id"), '<- chair-arm-raises')
        # no equipment: no checklist; the same equipment: a plain rest
        await pg.evaluate("hush(); WP.phase = 'done'"); await pg.evaluate(WK + "(['bw-squat', 'bw-pushup'], 5)"); await pg.wait_for_timeout(300)
        print('no equipment: no list   ', await pg.evaluate("WP.phase"), '<- work')
        # backup
        # leaving a chair for an exercise with no equipment: nothing to say (it said a lone ".", read out as "dot")
        await pg.evaluate("hush(); WP.phase = 'done'; setPref(EQUIP_PAUSE_KEY, 'off'); SAID.length = 0"); await pg.evaluate(WK + "(['chair-arm-raises', 'bw-squat'], 5)"); await pg.wait_for_timeout(300)
        await pg.evaluate("wpAction('restSkip')"); await pg.wait_for_timeout(300)
        await pg.evaluate("S.speed = 20"); await pg.wait_for_function("WP.phase === 'rest'", timeout=20000); await pg.evaluate("S.speed = 1"); await pg.wait_for_timeout(800)
        print('chair -> none: no "."   ', await pg.evaluate("[$('#wpRestEquip').hidden, SAID.every(t => /[\\p{L}\\p{N}]/u.test(t)), SAID.slice(-1)[0]]"), "<- [True, True, 'Rest 5 seconds. Next: Squat.']")
        await pg.evaluate("setPref(EQUIP_PAUSE_KEY, 'on')")
        print('backup                  ', await pg.evaluate("[backupData().settings.equipPause, 'equipTime' in backupData().settings]"), '<- [True, False]')
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
