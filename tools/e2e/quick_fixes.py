import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# the small fixes: start sheet without sound/full screen, no history export, Duplicate needs exercises, JSON views
# only in Authoring mode, collections alphabetical after Bookmarked, "Other names", QR picture, incline push-up head
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx = await b.new_context(viewport={'width': 412, 'height': 860}, accept_downloads=True); pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        await pg.click('[data-wstart="lib:full-body-routine"]'); await pg.wait_for_timeout(300)
        print('start sheet             ', await pg.evaluate("[!!$('#startSound'), !!$('#fsToggle'), $('#startBody').textContent.includes('Sound: ')]"), '<- no sound/full-screen controls')
        await pg.click('#startDialog [data-close]')
        print('history export          ', await pg.evaluate("!!document.querySelector('[data-wact=exportLog]')"))
        await pg.click('[data-wact="new"]'); await pg.wait_for_timeout(300)
        print('Duplicate (empty)       ', await pg.evaluate("$('#view-workout [data-wact=duplicateWorkout]').disabled"))
        bid = await pg.evaluate("EDIT.blocks[0].id")
        await pg.evaluate(f"EDIT.blocks[0].items.push(newItem(exById('bw-squat'))); commitEdit()")
        print('Duplicate (1 exercise)  ', await pg.evaluate("$('#view-workout [data-wact=duplicateWorkout]').disabled"))
        vis = "(sel => { const el = document.querySelector(sel); return !!el && el.checkVisibility(); })"
        print('JSON button, off        ', await pg.evaluate(vis + "('#view-workout [data-wact=export]')"))
        await pg.evaluate("go('#/play/bw-squat')"); await pg.wait_for_timeout(300)
        print('exercise JSON, off      ', await pg.evaluate(vis + "('#aboutPanel [data-act=json]')"), '| edit panel', await pg.evaluate("!$('#adjustPanel').hidden"))
        await pg.evaluate("go('#/settings')"); await pg.wait_for_timeout(200)
        print('export card, off        ', await pg.evaluate(vis + "('[data-act=exportAll]')"))
        await pg.click('#setAuthoring'); await pg.wait_for_timeout(100)
        print('export card, on         ', await pg.evaluate(vis + "('[data-act=exportAll]')"))
        await pg.evaluate("go('#/play/bw-squat')"); await pg.wait_for_timeout(300)
        print('exercise JSON, on       ', await pg.evaluate(vis + "('#aboutPanel [data-act=json]')"), '| edit panel', await pg.evaluate("!$('#adjustPanel').hidden"))
        # turning Authoring mode off while an exercise is open hides the editor when you come back
        await pg.evaluate("go('#/settings')"); await pg.wait_for_timeout(200); await pg.click('#setAuthoring'); await pg.wait_for_timeout(100)
        await pg.evaluate("history.back()"); await pg.wait_for_timeout(300)
        print('back, authoring off     ', await pg.evaluate("[S.view, !$('#adjustPanel').hidden, !$('#editPoseBtn').hidden]"))
        await pg.evaluate("localStorage.setItem('nstructr-authoring-v1','on'); go('#/play/bw-squat')"); await pg.wait_for_timeout(300)
        await pg.click('#editPoseBtn'); await pg.wait_for_timeout(200)
        print('"Other names" label     ', await pg.evaluate("[...document.querySelectorAll('#textForm .field-label')].map(x=>x.textContent)[1]"))
        await pg.evaluate("go('#/exercises')"); await pg.wait_for_timeout(300)
        print('collections             ', await pg.evaluate("[...document.querySelectorAll('#fCollection .filter')].map(x=>x.textContent)"))
        # QR picture
        await pg.evaluate("WK.list.push({id:'q',name:'QR Test',restBetween:0,blocks:[{id:'b',name:'B',items:[newItem(exById('bw-squat'))]}]}); saveWorkouts(); go('#/workouts')"); await pg.wait_for_timeout(300)
        await pg.click('[data-share-wk="q"]'); await pg.wait_for_timeout(300)
        async with pg.expect_download() as dl: await pg.click('#shareQrImg')
        d = await dl.value; path = await d.path()
        from PIL import Image
        im = Image.open(path); print('QR picture              ', d.suggested_filename, im.size, im.mode)
        # the chair incline push-up keeps its head in front of the chair back
        print('incline push-up head    ', await pg.evaluate("""(() => { selectExercise('chair-incline-pushup'); const back = CX + 32 + 35;
          return S.resolved.map(r => { const pos = place(r.pose, r.v, S.seg, r.rule), P = fk(r.pose, r.v, S.seg, pos.x, pos.y); return Math.round(P.head.x + S.seg.head) + ' < ' + back; }); })()"""))
        print('errors', errs); await b.close()
asyncio.run(main())
