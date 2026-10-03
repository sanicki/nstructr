import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
import json
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); errs=[]
        pg=await b.new_page(viewport={'width':360,'height':398}, device_scale_factor=2.63, has_touch=True)
        pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto(URL, wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        await pg.evaluate("setSound('beeps'); WK.hinted=true")
        n=await pg.evaluate("flattenWorkout(LIB_WK[0]).length")
        worst=[]; shots=[]
        for i in range(n):
            await pg.evaluate(f"startWorkout(LIB_WK[0], {i})"); await pg.wait_for_timeout(250)
            await pg.evaluate("S.speed=5"); await pg.wait_for_timeout(700)
            # where the floor line lands on the screen, as a share of the screen height from the bottom
            gap=await pg.evaluate("""(()=>{const l=scene.querySelector('.floor-line').getBoundingClientRect(); return (innerHeight - l.top)/innerHeight;})()""")
            name=await pg.evaluate("S.ex.name"); worst.append((round(gap*100,1), name))
            if i in (0,3,11,12,14,23): p_=f'/tmp/fl_{i}.png'; await pg.screenshot(path=p_); shots.append(p_)
        worst.sort()
        print('lowest five', worst[:5], '| highest', worst[-1])
        check('floor height above the bottom edge (% of screen), lowest', worst[0][0], at_least(20))
        check('floor height, highest', worst[-1][0], below(40))
        check('errors', errs, []); await b.close()
        from PIL import Image
        ims=[Image.open(s).resize((180,199)) for s in shots]
        o=Image.new('RGB',(190*len(ims),199),'white')
        for k,i in enumerate(ims): o.paste(i,(k*190,0))
        o.save('/tmp/floor.png')
asyncio.run(main())
