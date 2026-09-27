import asyncio, json, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
# imported / shared content can't inject HTML or script: every text field of an exercise and a workout carries an
# <img onerror> payload through import, the lists, the editor, the exercise page, the workout player (Coach) and a
# share link; and a source link that isn't http(s) isn't shown as a link
from playwright.async_api import async_playwright
P = lambda k: f'<img src=x onerror="window.PWNED=(window.PWNED||[]).concat(\'{k}\')">'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':412,'height':860})
        await pg.goto(URL + '#/workouts'); await pg.wait_for_timeout(500)
        ex = json.loads(await pg.evaluate("JSON.stringify(findInDb('bw-reverse-lunge'))"))
        ex.update(id='u-x', name=P('name'), otherName=P('other'), description=P('desc'), focus=P('focus'), category=P('cat'), repName=P('rep'),
                  equipment=[P('equip')], setup=[P('setup')], cues=[P('cues')], prescription={'reps': P('presc'), 'note': P('note')},
                  source={'url': 'javascript:window.PWNED=1', 'title': P('srctitle'), 'note': P('srcnote')},
                  bilateral={'labels': {'L': P('bl'), 'R': P('br')}})
        for k in ex['keyframes']: k['name'] = P('kname'); k['cue'] = P('kcue')
        wk = {'format':'nstructr/workout','version':1,'workouts':[{'version':1,'name':P('wname'),'description':P('wdesc'),'blocks':[{'name':P('bname'),'items':[{'ex':'u-x','reps':2,'sides':'alternate'}]}]}],'exercises':[ex]}
        await pg.evaluate(f"importAndShow([[{json.dumps(json.dumps(wk))}, 'x']])"); await pg.wait_for_timeout(500)
        w = await pg.evaluate("WK.list[WK.list.length-1].id")
        for h in ['#/workouts', f'#/workout/{w}', '#/exercises', '#/play/' + (await pg.evaluate("S.lib.items.find(x=>x.name.includes('img')).id")), '#/settings']:
            await pg.evaluate(f"go('{h}')"); await pg.wait_for_timeout(500)
        await pg.evaluate("E.coll='My exercises'; go('#/exercises')"); await pg.wait_for_timeout(300)
        await pg.evaluate("go('#/workouts')"); await pg.wait_for_timeout(300)
        await pg.evaluate(f"document.querySelector('[data-wtoggle=\"{w}\"]').click(); openShare({{workout: wkById('{w}')}})"); await pg.wait_for_timeout(500)
        link = await pg.evaluate("SHARING.url"); await pg.evaluate("$('#shareDialog').close()")
        await pg.evaluate(f"WK.hinted=true; setSound('coach'); startWorkout(wkById('{w}'), 0)"); await pg.wait_for_timeout(3000)
        await pg.evaluate("startRest(5,'item')"); await pg.wait_for_timeout(800); await pg.evaluate("exitWorkout()")
        print('PWNED before link:', await pg.evaluate("window.PWNED || 'none'"))
        await pg.evaluate("go('#/play/' + S.lib.items.find(x=>x.name.includes('img')).id)"); await pg.wait_for_timeout(400)
        print('javascript: hrefs:', await pg.evaluate("[...document.querySelectorAll('a[href^=javascript]')].length"))
        await pg.goto(link.replace('#','?z#')); await pg.wait_for_timeout(1000)
        print('PWNED after link:', await pg.evaluate("window.PWNED || 'none'"), '| dialog:', await pg.evaluate("$('#linkDialog').open"))
        # also look for the source link as javascript:
        await pg.evaluate("go('#/workouts')")
        await b.close()
asyncio.run(main())
