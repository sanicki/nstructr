import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
import json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':900}); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        # new workout -> rename -> add exercises via picker
        await pg.click('[data-wact="new"]'); await pg.wait_for_timeout(300)
        await pg.fill('#wkName','Morning Mobility'); await pg.wait_for_timeout(100)
        bid=await pg.evaluate("EDIT.blocks[0].id")
        await pg.click(f'[data-addto="{bid}"]'); await pg.wait_for_timeout(200)
        await pg.fill('#pickSearch','squat'); await pg.wait_for_timeout(150)
        boxes=await pg.query_selector_all('#pickList input'); 
        for bx in boxes[:3]: await bx.check()
        await pg.fill('#pickSearch','plank'); await pg.wait_for_timeout(150)
        bx=await pg.query_selector('#pickList input'); await bx.check()
        await pg.click('#pickAdd'); await pg.wait_for_timeout(300)
        names=await pg.evaluate("EDIT.blocks[0].items.map(i=>exById(i.ex).name)")
        print('added:', names)
        # drag the last item to the top
        handles=await pg.query_selector_all('#wkBlocks .wi [data-handle]')
        src=await handles[-1].bounding_box(); dst=await handles[0].bounding_box()
        await pg.mouse.move(src['x']+src['width']/2, src['y']+src['height']/2); await pg.mouse.down()
        for k in range(1,12):
            y=src['y']+(dst['y']-10-src['y'])*k/11
            await pg.mouse.move(src['x']+src['width']/2, y); await pg.wait_for_timeout(20)
        await pg.mouse.up(); await pg.wait_for_timeout(200)
        print('after drag:', await pg.evaluate("EDIT.blocks[0].items.map(i=>exById(i.ex).name)"))
        # menu: move down + duplicate + remove
        u=await pg.evaluate("EDIT.blocks[0].items[0].uid")
        await pg.click(f'[data-imenu="{u}"]'); await pg.click('[data-mact="down"]'); await pg.wait_for_timeout(100)
        await pg.click(f'[data-imenu="{u}"]'); await pg.click('[data-mact="dup"]'); await pg.wait_for_timeout(100)
        print('after move down + duplicate:', await pg.evaluate("EDIT.blocks[0].items.map(i=>exById(i.ex).name)"))
        # add block + move an item across blocks by menu
        await pg.click('[data-wact="addBlock"]'); await pg.wait_for_timeout(100)
        last=await pg.evaluate("EDIT.blocks[0].items[EDIT.blocks[0].items.length-1].uid")
        await pg.click(f'[data-imenu="{last}"]'); await pg.click('[data-mact="down"]'); await pg.wait_for_timeout(100)
        print('blocks:', await pg.evaluate("EDIT.blocks.map(b=>[b.name,b.items.map(i=>exById(i.ex).name)])"))
        # export -> delete -> re-import
        exported=await pg.evaluate("workoutJSON(EDIT)")
        await pg.click('[data-wact="deleteWorkout"]'); await pg.wait_for_timeout(300)
        print('after delete:', await pg.evaluate("WK.list.map(w=>w.name)"))
        await pg.evaluate(f"importAndShow([[{json.dumps(exported)}, 'w.json']])"); await pg.wait_for_timeout(300)
        print('after import:', await pg.evaluate("WK.list.map(w=>w.name)"), await pg.evaluate("location.hash.slice(0,12)"))
        # persistence across reload + resume
        await pg.evaluate("startWorkout(WK.list[0], 0)"); await pg.wait_for_timeout(300)
        await pg.evaluate("WP.i=5; saveSession()")
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        print('resume banner:', await pg.inner_text('#resumeSlot'))
        print('workouts after reload:', await pg.evaluate("WK.list.map(w=>w.name)"))
        print('errors', errs); await b.close()
asyncio.run(main())
