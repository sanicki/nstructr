import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# fixes from the Sep 2026 audit: Material confirm dialog (Cancel keeps, Delete deletes, Esc = Cancel), leaving a
# workout without a hold (Esc, a screen reader's click), one <main>, the file picker's name, 48 px touch targets
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860})
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('dialog', lambda d: errs.append('native dialog: ' + d.message))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        await pg.evaluate("WK.list.push({id:'d', name:'Doomed', blocks:[{id:'b1', name:'Warm-up', items:[newItem(exById('bw-squat'))]}]}); saveWorkouts(); go('#/workout/d')"); await pg.wait_for_timeout(300)
        await pg.click('[data-wact="deleteWorkout"]'); await pg.wait_for_timeout(200)
        print('delete asks             ', await pg.evaluate("[$('#askDialog').open, $('#askTitle').textContent, $('#askYes').textContent, $('#askYes').classList.contains('danger-btn'), document.activeElement.id]"))
        await pg.click('#askNo'); await pg.wait_for_timeout(200)
        print('Cancel keeps it         ', await pg.evaluate("[$('#askDialog').open, WK.list.some(w=>w.id==='d')]"))
        await pg.click('[data-wact="deleteWorkout"]'); await pg.wait_for_timeout(200); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        print('Esc keeps it            ', await pg.evaluate("[$('#askDialog').open, WK.list.some(w=>w.id==='d')]"))
        await pg.click('[data-wact="deleteWorkout"]'); await pg.wait_for_timeout(200); await pg.click('#askYes'); await pg.wait_for_timeout(300)
        print('Delete deletes          ', await pg.evaluate("[WK.list.some(w=>w.id==='d'), location.hash, $('#snackbar').textContent]"))
        # leaving a workout without holding
        await pg.evaluate("WK.hinted=true; setSound('off'); startWorkout(LIB_WK[0], 0)"); await pg.wait_for_timeout(400)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        print('Esc leaves the workout  ', await pg.evaluate("location.hash"))
        await pg.evaluate("startWorkout(LIB_WK[0], 0)"); await pg.wait_for_timeout(400)
        await pg.evaluate("$('#wpExit').click()"); await pg.wait_for_timeout(300)
        print('screen-reader click     ', await pg.evaluate("location.hash"), '<- a click with no press (detail 0) exits')
        await pg.evaluate("startWorkout(LIB_WK[0], 0)"); await pg.wait_for_timeout(400)
        box = await pg.evaluate("(()=>{const r=$('#wpExit').getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]})()")
        await pg.mouse.click(*box); await pg.wait_for_timeout(100); await pg.mouse.click(*box); await pg.wait_for_timeout(300)
        print('a quick tap stays       ', await pg.evaluate("[location.hash.slice(0,8), $('#snackbar').textContent || document.querySelector('.toast, #wpToast')?.textContent || '']"))
        await pg.mouse.move(*box); await pg.mouse.down(); await pg.wait_for_timeout(1100); await pg.mouse.up(); await pg.wait_for_timeout(300)
        print('holding ✕ still exits   ', await pg.evaluate("location.hash"))
        # structure
        print('one main, file label    ', await pg.evaluate("[document.querySelectorAll('main').length, !!$('main #fileInput'), $('#fileInput').getAttribute('aria-label')]"))
        await pg.evaluate("go('#/settings')"); await pg.wait_for_timeout(300)
        print('touch target (Silent)   ', await pg.evaluate("(()=>{const a=getComputedStyle($('[data-setsound=off]'),'::after'); return [a.height, getComputedStyle($('#setSound')).overflow]})()"))
        print('errors', errs); await b.close()
asyncio.run(main())
