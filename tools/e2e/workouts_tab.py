import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# the Workouts tab: My workouts (heading, message, Import / New workout under it), cards collapsed by default and
# expandable, drag to reorder both lists (kept after a reload), swipe left then tap the trash can to delete
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx = await b.new_context(viewport={'width': 412, 'height': 860}, has_touch=True); pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        order = "[...document.querySelectorAll('#view-workouts h2, #wkEmpty, #view-workouts .wk-add button')].filter(x=>x.checkVisibility()).map(x=>x.textContent.trim().replace(/\\s+/g,' ').slice(0,28))"
        print('empty page, top down    ', await pg.evaluate(order))
        # three of my own, plus a second library workout (the library will grow)
        await pg.evaluate("""(()=>{ for (const n of ['Alpha','Bravo','Charlie']) WK.list.push({id:n,name:n,blocks:[{id:'b',name:'Main',items:[newItem(exById('bw-squat'))]}]});
          saveWorkouts(); LIBRARY_WORKOUTS.push({...LIBRARY_WORKOUTS[0], id:'second-routine', name:'Second Routine'}); hydrateLibrary(); renderWorkouts(); })()""")
        names = lambda sel: pg.evaluate(f"[...document.querySelectorAll('{sel} .wk-title .title-medium')].map(x=>x.textContent)")
        print('cards                   ', await names('#wkList'), await names('#libWkList'))
        print('collapsed by default    ', await pg.evaluate("[...document.querySelectorAll('.wk-details')].every(d=>d.hidden)"), '| start buttons', await pg.evaluate("document.querySelectorAll('.wk-card .wk-start').length"))
        await pg.click('[data-wtoggle="Bravo"]'); await pg.wait_for_timeout(150)
        print('tap name: expanded      ', await pg.evaluate("[!document.querySelector('[data-wk=Bravo] .wk-details').hidden, document.querySelector('[data-wtoggle=Bravo]').getAttribute('aria-expanded'), !!document.querySelector('[data-wk=Bravo] a[href=\"#/workout/Bravo\"]')]"))
        await pg.click('[data-wtoggle="Bravo"]'); await pg.wait_for_timeout(150)
        print('tap again: collapsed    ', await pg.evaluate("document.querySelector('[data-wk=Bravo] .wk-details').hidden"))
        # drag Charlie to the top, and the second library workout above the first
        async def drag(src, dst_card):
            h = await pg.evaluate(f"(()=>{{const r=document.querySelector('[data-wk=\"{src}\"] [data-wkhandle]').getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]}})()")
            t = await pg.evaluate(f"(()=>{{const r=document.querySelector('[data-wk=\"{dst_card}\"]').getBoundingClientRect(); return r.y+5}})()")
            await pg.mouse.move(*h); await pg.mouse.down()
            for k in range(1, 11): await pg.mouse.move(h[0], h[1] + (t - h[1]) * k / 10); await pg.wait_for_timeout(20)
            await pg.mouse.up(); await pg.wait_for_timeout(200)
        await drag('Charlie', 'Alpha'); await drag('lib:second-routine', 'lib:full-body-routine')
        print('after dragging          ', await names('#wkList'), await names('#libWkList'))
        await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        await pg.evaluate("LIBRARY_WORKOUTS.push({...LIBRARY_WORKOUTS[0], id:'second-routine', name:'Second Routine'}); hydrateLibrary(); renderWorkouts()")
        print('after reload            ', await names('#wkList'), await names('#libWkList'))
        # swipe left (touch) on Bravo: the trash can shows; tapping elsewhere hides it; tapping it deletes
        async def swipe(id, dist=140):
            r = await pg.evaluate(f"(()=>{{const r=document.querySelector('[data-wk=\"{id}\"] .wk-title').getBoundingClientRect(); return [r.x+r.width-30, r.y+r.height/2]}})()")
            cdp = await ctx.new_cdp_session(pg)
            await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': r[0], 'y': r[1]}]})
            for k in range(1, 11): await cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': r[0] - dist * k / 10, 'y': r[1]}]}); await pg.wait_for_timeout(16)
            await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); await pg.wait_for_timeout(300)
        await pg.evaluate("localStorage.setItem('motion-guide-session-v1', JSON.stringify({wid:'Bravo', i:0})); renderWorkouts()")
        await swipe('Bravo')
        st = "[document.querySelector('[data-wk=Bravo]')?.classList.contains('swiped'), document.querySelector('[data-wk=Bravo] [data-wdel]')?.checkVisibility({visibilityProperty:true}), document.querySelector('[data-wk=Bravo] .wk-details')?.hidden]"
        print('swipe left              ', await pg.evaluate(st), '<- swiped, trash showing, still collapsed')
        await pg.touchscreen.tap(200, 30); await pg.wait_for_timeout(300)
        print('tap elsewhere           ', await pg.evaluate(st), '<- closed')
        await swipe('Bravo', 30)
        print('short swipe             ', await pg.evaluate(st), '<- springs back')
        await swipe('Bravo')
        box = await pg.evaluate("(()=>{const r=document.querySelector('[data-wk=Bravo] [data-wdel]').getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]})()")
        await pg.touchscreen.tap(*box); await pg.wait_for_timeout(300)
        print('tap trash can           ', await names('#wkList'), '| saved', await pg.evaluate("WK.list.map(w=>w.name)"), '| resume card', await pg.evaluate("!!$('#resumeSlot .resume')"), '|', await pg.inner_text('#snackbar'))
        print('library cards swipe     ', await pg.evaluate("document.querySelectorAll('#libWkList [data-wdel]').length"), 'trash cans')
        await pg.evaluate("go('#/exercises')"); await pg.wait_for_timeout(300)
        print('filter labels           ', await pg.evaluate("[...document.querySelectorAll('.filters .filter')].map(x=>x.textContent.replace('check','')).filter(t=>t.startsWith('All'))"))
        print('errors', errs); await b.close()
asyncio.run(main())
