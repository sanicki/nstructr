import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':860}); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        await pg.screenshot(path='/tmp/w_list.png')
        await pg.click('a[href="#/workout/full-body-routine"]'); await pg.wait_for_timeout(400)
        await pg.screenshot(path='/tmp/w_edit.png', full_page=True)
        # settings dialog on the lunge
        uid=await pg.evaluate("EDIT.blocks[1].items[0].uid")
        await pg.click(f'[data-iedit="{uid}"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path='/tmp/w_item.png')
        await pg.click('#itemDialog [data-close]')
        # start: before-start sheet
        await pg.evaluate("WK.list[0].restBetween=1")
        await pg.click('[data-wact="start"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path='/tmp/w_start.png')
        await pg.click('#startGo'); await pg.wait_for_timeout(500)
        await pg.screenshot(path='/tmp/w_play.png')
        # fast-forward the whole routine, logging what happens
        log=[]; last=None
        for k in range(3000):
            await pg.evaluate("S.speed=40; if (WP.phase==='rest') WP.restLeft=Math.min(WP.restLeft,0.05)")
            await pg.wait_for_timeout(25)
            st=await pg.evaluate("[WP.phase, WP.i, WP.set, WP.seg, S.ex&&S.ex.id, $('#wpSet').textContent, $('#wpCount').textContent]")
            key=tuple(st[:5])
            if key!=last: log.append(st); last=key
            if st[0]=='done': break
        for l in log: print(l)
        await pg.screenshot(path='/tmp/w_done.png')
        print('errors', errs); await b.close()
asyncio.run(main())
