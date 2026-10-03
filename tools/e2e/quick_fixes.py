import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
# the small fixes: start sheet without sound/full screen, no history export, Duplicate needs exercises, JSON views
# only in Advanced exercise editor, collections alphabetical after Bookmarked, "Other names", QR picture, incline push-up head
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx = await b.new_context(viewport={'width': 412, 'height': 860}, accept_downloads=True); pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        await pg.click('[data-wstart="lib:beginner-yoga-20"]'); await pg.wait_for_timeout(300)
        check('Start goes straight in', await pg.evaluate("[location.hash.slice(0,8), WP.phase, !!$('#startDialog')]"), ['#/wplay/', 'work', False])
        await pg.evaluate("exitWorkout()"); await pg.wait_for_timeout(300)
        check('Import on Workouts page', await pg.evaluate("!!document.querySelector('#view-workouts [data-act=import]')"), False)
        await pg.click('[data-wtoggle="lib:beginner-yoga-20"]'); await pg.wait_for_timeout(150)
        check('safety notes on the card', await pg.evaluate("document.querySelector('[data-wk=\"lib:beginner-yoga-20\"] .wk-safety')?.textContent.slice(0,60) || 'none'"), 'none')
        check('history export', await pg.evaluate("!!document.querySelector('[data-wact=exportLog]')"), False)
        await pg.click('[data-wact="new"]'); await pg.wait_for_timeout(300)
        check('Duplicate (empty)', await pg.evaluate("$('#view-workout [data-wact=duplicateWorkout]').disabled"), True)
        bid = await pg.evaluate("EDIT.blocks[0].id")
        await pg.evaluate(f"EDIT.blocks[0].items.push(newItem(exById('bw-squat'))); commitEdit()")
        check('Duplicate (1 exercise)', await pg.evaluate("$('#view-workout [data-wact=duplicateWorkout]').disabled"), False)
        vis = "(sel => { const el = document.querySelector(sel); return !!el && el.checkVisibility(); })"
        check('JSON button, off', await pg.evaluate(vis + "('#view-workout [data-wact=export]')"), False)
        await pg.evaluate("go('#/play/bw-squat')"); await pg.wait_for_timeout(300)
        await pg.click('#editPoseBtn'); await pg.wait_for_timeout(200)
        print('exercise JSON, off      ', await pg.evaluate(vis + "('#aboutPanel [data-act=json]')"), '| edit: words', await pg.evaluate(vis + "('#edStepName')"), '| poses', await pg.evaluate(vis + "('#editor .joints')"))
        await pg.evaluate("go('#/settings')"); await pg.wait_for_timeout(200)
        check('export card, off', await pg.evaluate(vis + "('[data-act=exportAll]')"), False)
        await pg.click('#setAuthoring'); await pg.wait_for_timeout(100)
        check('export card, on', await pg.evaluate(vis + "('[data-act=exportAll]')"), True)
        await pg.evaluate("go('#/play/bw-squat')"); await pg.wait_for_timeout(300)
        await pg.click('#editPoseBtn'); await pg.wait_for_timeout(200)
        print('exercise JSON, on       ', await pg.evaluate(vis + "('#aboutPanel [data-act=json]')"), '| edit: words', await pg.evaluate(vis + "('#edStepName')"), '| poses', await pg.evaluate(vis + "('#editor .joints')"))
        # turning Advanced exercise editor off while an exercise is open hides the editor when you come back
        await pg.evaluate("go('#/settings')"); await pg.wait_for_timeout(200); await pg.click('#setAuthoring'); await pg.wait_for_timeout(100)
        await pg.evaluate("history.back()"); await pg.wait_for_timeout(300)
        check('back, authoring off', await pg.evaluate("[S.view, $('#editor .joints').checkVisibility(), !$('#editPoseBtn').hidden]"), ['player', False, True], 'poses hidden, Edit still there')
        await pg.evaluate("localStorage.setItem('nstructr-authoring-v1','on'); go('#/play/bw-squat')"); await pg.wait_for_timeout(300)
        await pg.click('#editPoseBtn'); await pg.wait_for_timeout(200)
        check('"Other names" label', await pg.evaluate("[...document.querySelectorAll('#textForm .field-label')].map(x=>x.textContent)[1]"), 'Other names (separate with commas)')
        await pg.evaluate("go('#/exercises')"); await pg.wait_for_timeout(300)
        check('collections', await pg.evaluate("[...document.querySelectorAll('#fCollection .filter')].map(x=>x.textContent)"), ['checkAll collections', 'checkBookmarked', 'checkMy exercises', 'checkBalance', 'checkBodyweight', 'checkChair-based', 'checkCore', 'checkFree weights', 'checkPilates', 'checkResistance band', 'checkStretches', 'checkWarm-up', 'checkYoga'])
        # QR picture
        await pg.evaluate("WK.list.push({id:'q',name:'QR Test',blocks:[{id:'b',name:'B',items:[newItem(exById('bw-squat'))]}]}); saveWorkouts(); go('#/workouts')"); await pg.wait_for_timeout(300)
        await pg.click('[data-wtoggle="q"]'); await pg.click('[data-share-wk="q"]'); await pg.wait_for_timeout(300)
        async with pg.expect_download() as dl: await pg.click('#shareQrImg')
        d = await dl.value; path = await d.path()
        from PIL import Image
        im = Image.open(path); print('QR picture              ', d.suggested_filename, im.size, im.mode)
        # the chair incline push-up keeps its head in front of the chair back
        check('incline push-up head', await pg.evaluate("""(() => { selectExercise('chair-incline-pushup'); const back = Math.round(surfaceShapes(S.resolved.supports, 90)[0].x1);
          return S.resolved.map(r => { const Q = stepScreen(r); return Math.round(Q.head.x + S.seg.head) + ' < ' + back; }); })()"""), ['243 < 267', '254 < 267'])
        check('errors', errs, []); await b.close()
asyncio.run(main())
