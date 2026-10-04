import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':360,'height':398}, device_scale_factor=2.63, has_touch=True, is_mobile=True); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto(URL, wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        await pg.evaluate("WK.hinted=true; setSound('beeps'); startWorkout(LIB_WK[0], 4); if (WP.phase === 'rest' && WP.restKind === 'start') wpAction('restSkip')"); await pg.wait_for_timeout(600)
        st=lambda: pg.evaluate("({playing:S.playing, exercise:WP.i, controls:$('#wpControls').classList.contains('show')})")
        nb=await pg.evaluate("(()=>{const r=document.querySelector('[data-wact=nextItem]').getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]})()")
        pb=await pg.evaluate("(()=>{const r=$('#wpPlay').getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]})()")
        check('start', await st(), {'playing': True, 'exercise': 4, 'controls': False})
        await pg.touchscreen.tap(*nb); await pg.wait_for_timeout(250)
        check('1st tap where Next appears', await st(), {'playing': True, 'exercise': 4, 'controls': True}, 'only shows controls')
        await pg.touchscreen.tap(*pb); await pg.wait_for_timeout(250)
        check('2nd tap on Play (pause)', await st(), {'playing': False, 'exercise': 4, 'controls': True})
        await pg.touchscreen.tap(*pb); await pg.wait_for_timeout(250)
        check('tap Play again (resume)', await st(), {'playing': True, 'exercise': 4, 'controls': True})
        await pg.touchscreen.tap(180, 60); await pg.wait_for_timeout(250)
        check('tap empty space', await st(), {'playing': True, 'exercise': 4, 'controls': False}, 'hides controls')
        await pg.touchscreen.tap(*pb); await pg.wait_for_timeout(250)
        check('1st tap where Play appears', await st(), {'playing': True, 'exercise': 4, 'controls': True}, 'only shows controls')
        await pg.touchscreen.tap(*nb); await pg.wait_for_timeout(250)
        check('2nd tap on Next', await st(), {'playing': True, 'exercise': 5, 'controls': True})
        await pg.wait_for_timeout(4500)
        check('4.5 s later', await st(), {'playing': True, 'exercise': 5, 'controls': False}, 'controls hide')
        # a sloppy tap with some drift must not count as a swipe
        async def drag(x0,x1,steps=6):
            await pg.dispatch_event('#wpRoot','pointerdown',{'clientX':x0,'clientY':230,'pointerId':7,'bubbles':True})
            await pg.dispatch_event('#wpRoot','pointerup',{'clientX':x1,'clientY':232,'pointerId':7,'bubbles':True})
        await pg.touchscreen.tap(180, 60); await pg.wait_for_timeout(250)      # hide controls first
        await drag(250,170); await pg.wait_for_timeout(200)
        check('80 px drift', await st(), {'playing': True, 'exercise': 5, 'controls': True}, 'not a swipe')
        await pg.touchscreen.tap(*pb); await pg.wait_for_timeout(250)          # resume
        await pg.touchscreen.tap(180, 60); await pg.wait_for_timeout(250)      # hide the controls
        await drag(320,60); await pg.wait_for_timeout(200)
        check('deliberate 260 px swipe', await st(), {'playing': True, 'exercise': 6, 'controls': True}, 'next exercise')
        # Start goes straight into the workout (no "before you start" sheet)
        await pg.evaluate("exitWorkout()"); await pg.wait_for_timeout(300)
        await pg.evaluate("go('#/workout/' + customizeWorkout(LIB_WK[0]).id)"); await pg.wait_for_timeout(300)
        await pg.click('[data-wact="start"]'); await pg.wait_for_timeout(300)
        check('Start in the editor', await pg.evaluate("[location.hash.slice(0, 8), WP.phase, WP.restKind]"), ['#/wplay/', 'rest', 'start'], 'straight into the player, at the workout title card')
        check('errors', errs, []); await b.close()
asyncio.run(main())
