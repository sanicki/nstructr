import asyncio, os, json
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# three tabs, old links, the Saved filter, Settings (persisted), the exercise player's tap-for-controls overlay
# and its pull-up details panel
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}, has_touch=True)
        # checks the shelves: grouped by collection (off by default since Sep 2026)
        await pg.add_init_script("if (localStorage.getItem('nstructr-group-collections-v1') === null) localStorage.setItem('nstructr-group-collections-v1', 'on')")
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        print('tabs                    ', await pg.evaluate("[...document.querySelectorAll('.navbar .nav-item .label')].map(x=>x.textContent)"))
        for old in ['#/explore', '#/saved', '#/create']:
            await pg.evaluate(f"location.hash='{old}'"); await pg.wait_for_timeout(250)
            print(f'old link {old:<14} ', await pg.evaluate("[location.hash, S.view, E.coll]"))
        # a bookmarked library exercise and an imported one of your own (bookmarked too)
        own = await pg.evaluate("JSON.stringify({...findInDb('bw-squat'), id:'u-my-squat', name:'My Squat'})")
        await pg.evaluate(f"S.lib.items.push(JSON.parse({json.dumps(own)})); saveLib(); BOOKMARKS.add('bw-reverse-lunge'); BOOKMARKS.add('u-my-squat'); saveBookmarks(); E.coll='All'; go('#/exercises')"); await pg.wait_for_timeout(300)
        print('first shelf             ', await pg.evaluate("document.querySelector('#exploreBody .section-head h2').textContent"))
        await pg.fill('#search', 'my squat'); await pg.wait_for_timeout(200)
        print('search finds own        ', await pg.evaluate("[...document.querySelectorAll('#exploreBody .pose-card .t')].map(x=>x.textContent)"))
        await pg.fill('#search', ''); await pg.click('[data-coll="Bookmarked"]'); await pg.wait_for_timeout(200)
        print('Saved filter            ', await pg.evaluate("[...document.querySelectorAll('#exploreBody .pose-card .t')].map(x=>x.textContent)"))
        # Settings
        await pg.evaluate("go('#/settings')"); await pg.wait_for_timeout(300)
        await pg.click('[data-settheme="dark"]'); await pg.click('[data-setsound="voice"]')
        print('no speed setting        ', await pg.evaluate("!document.querySelector('[data-setspeed]')"))
        await pg.click('#setAuthoring'); await pg.click('#setFullscreen'); await pg.wait_for_timeout(100)
        await pg.evaluate("go('#/settings')"); await pg.wait_for_timeout(200)
        await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        print('settings after reload   ', await pg.evaluate("[document.documentElement.dataset.theme, WK.sound, authoring(), wantFullscreen()]"),
              await pg.evaluate("[...document.querySelectorAll('#view-settings [aria-pressed=true]')].map(x=>x.textContent)"))
        # exercise player
        await pg.evaluate("go('#/play/bw-reverse-lunge')"); await pg.wait_for_timeout(500)
        st = "[S.playing, $('#exControls').classList.contains('show'), S.idx, S.speed, !$('#adjustPanel').hidden]"
        print('open (speed, editor)    ', await pg.evaluate(st))
        box = await pg.evaluate("(()=>{const r=$('#playBtn').getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]})()")
        await pg.touchscreen.tap(*box); await pg.wait_for_timeout(250)
        print('1st tap on Play spot    ', await pg.evaluate(st), '<- only shows the controls')
        await pg.touchscreen.tap(*box); await pg.wait_for_timeout(250)
        print('2nd tap: pause          ', await pg.evaluate(st))
        await pg.wait_for_timeout(3000)
        print('3 s later, paused       ', await pg.evaluate(st), '<- stay up while paused')
        nb = await pg.evaluate("(()=>{const r=$('#nextBtn').getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]})()")
        i0 = await pg.evaluate("S.idx"); await pg.touchscreen.tap(*nb); await pg.wait_for_timeout(200)
        print('Next step               ', i0, '->', await pg.evaluate("S.idx"))
        await pg.touchscreen.tap(*box); await pg.wait_for_timeout(200)   # play
        await pg.touchscreen.tap(206, 130); await pg.wait_for_timeout(250)  # empty stage area
        print('tap figure while playing', await pg.evaluate(st), '<- hides')
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(200)
        print('Space pauses            ', await pg.evaluate(st))
        # the details are part of the page, in order: Side, About, How to do it (with the time), Steps, (Edit)
        order = "[...document.querySelectorAll('#sideSeg, #aboutTitle, #howTitle, #exTime, #stepsPanel')].map(e=>Math.round(e.getBoundingClientRect().top))"
        tops = await pg.evaluate(order)
        print('page order (tops)       ', tops, '<- increasing' if tops == sorted(tops) else '<- OUT OF ORDER')
        print('labels                  ', await pg.evaluate("[...document.querySelectorAll('.controls-row .ctl:not([hidden]) .ctl-label')].map(x=>x.textContent)"))
        print('steps collapsed         ', await pg.evaluate("!$('#stepsPanel').open"))
        # wide screens: the details are a column beside the figure
        await pg.set_viewport_size({'width': 1280, 'height': 800}); await pg.wait_for_timeout(300)
        print('wide: details column    ', await pg.evaluate("Math.round($('#exInfo').getBoundingClientRect().left) > Math.round($('#stageBox').getBoundingClientRect().right)"))
        # Edit (for everyone): the words; Authoring mode adds the poses. The figure stays pinned while editing
        await pg.set_viewport_size({'width': 412, 'height': 860}); await pg.wait_for_timeout(300)
        await pg.click('#editPoseBtn'); await pg.wait_for_timeout(600)
        print('Edit                    ', await pg.evaluate("[S.playing, !$('#adjustPanel').hidden, $('#exControls').classList.contains('show'), $('#edTitle').textContent, !!$('#edStepName').checkVisibility(), $('#editor .joints').checkVisibility()]"))
        print('figure pinned on screen ', await pg.evaluate("(()=>{const r=$('#stageBox').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.bottom > 100})()"))
        await pg.click('[data-act="edNext"]'); await pg.wait_for_timeout(200)
        print('editor next step        ', await pg.evaluate("$('#edTitle').textContent"))
        await pg.click('[data-act="edDone"]'); await pg.wait_for_timeout(200)
        print('Done                    ', await pg.evaluate("[$('#adjustPanel').hidden, document.body.classList.contains('ex-editing')]"))
        # the cover screen: tabs at the top
        await pg.set_viewport_size({'width': 360, 'height': 398}); await pg.evaluate("go('#/exercises')"); await pg.wait_for_timeout(300)
        print('cover: tabs (top,bottom)', await pg.evaluate("[...document.querySelectorAll('.navbar .nav-item')].map(a=>{const r=a.getBoundingClientRect();return [a.dataset.nav,Math.round(r.top),Math.round(r.bottom)]})"))
        # the workout player still borrows the stage, without the exercise controls
        await pg.set_viewport_size({'width': 360, 'height': 398})
        await pg.evaluate("WK.hinted=true; setSound('off'); startWorkout(LIB_WK[0], 1)"); await pg.wait_for_timeout(500)
        print('workout player stage    ', await pg.evaluate("[$('#stageBox').parentElement.id, !!$('#wpStageSlot #exControls')]"))
        print('errors', errs); await b.close()
asyncio.run(main())
