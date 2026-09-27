import asyncio, os, json
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Bookmarked vs My exercises: the one-time move from "Saved", the Exercises tab (chips and shelves, in order),
# bookmarks as a flag, deleting your own (asks, names the workouts using it), imports
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx = await b.new_context(viewport={'width': 412, 'height': 860}); pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e))); asked = []
        pg.on('dialog', lambda d: (asked.append(d.message.split('\n')[-1][:70]), asyncio.ensure_future(d.accept())))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(400)
        # an install from before bookmarks: "Saved" holds an unchanged library copy, one changed with the old pose
        # editor, and an exercise of the user's own; there's no bookmark list yet
        old = await pg.evaluate("""(() => { const same = clone(findInDb('bw-squat')), changed = clone(findInDb('bw-reverse-lunge')); changed.keyframes[0].pose.neck = 20;
          const own = {...clone(findInDb('calf-raise')), id: 'u-my-raise', name: 'My Raise'}; delete own.library;
          return JSON.stringify({ items: [same, changed, own] }); })()""")
        await pg.evaluate(f"localStorage.setItem('pose-player-library-v1', {json.dumps(old)}); localStorage.removeItem('nstructr-bookmarks-v1')")
        await pg.goto(URL + '#/exercises', wait_until='domcontentloaded'); await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        print('after the move          ', await pg.evaluate("[S.lib.items.map(x=>x.id+':'+x.name), [...BOOKMARKS]]"))
        print('changed copy kept       ', await pg.evaluate("[exById('u-bw-reverse-lunge-copy').keyframes[0].pose.neck, exById('u-bw-reverse-lunge-copy').basedOn]"))
        print('chips                   ', await pg.evaluate("[...document.querySelectorAll('#fCollection .filter')].slice(0,5).map(x=>x.textContent.replace('check',''))"))
        print('shelves                 ', await pg.evaluate("[...document.querySelectorAll('#exploreBody .section-head h2')].slice(0,4).map(x=>x.textContent)"))
        await pg.click('[data-coll="My exercises"]'); await pg.wait_for_timeout(200)
        print('My exercises            ', await pg.evaluate("[...document.querySelectorAll('#exploreBody .pose-card .t')].map(x=>x.textContent)"))
        # the move happens once: a second load changes nothing
        await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        print('second load             ', await pg.evaluate("[S.lib.items.length, BOOKMARKS.size]"))
        # unbookmarking your own keeps it in My exercises
        await pg.evaluate("go('#/play/u-my-raise')"); await pg.wait_for_timeout(300)
        print('kicker                  ', await pg.evaluate("$('#exKicker').textContent"))
        await pg.click('#saveBtn'); await pg.wait_for_timeout(150)
        await pg.evaluate("E.coll='My exercises'; go('#/exercises')"); await pg.wait_for_timeout(200)
        print('unbookmarked, still mine', await pg.evaluate("[isBookmarked('u-my-raise'), [...document.querySelectorAll('#exploreBody .pose-card .t')].map(x=>x.textContent)]"))
        await pg.evaluate("E.coll='Bookmarked'; renderExplore()"); await pg.wait_for_timeout(100)
        print('Bookmarked              ', await pg.evaluate("[...document.querySelectorAll('#exploreBody .pose-card .t')].map(x=>x.textContent)"))
        # deleting: asks, and names the workouts that use it
        await pg.evaluate("WK.list.push({id:'w1',name:'Calves',blocks:[{id:'b',name:'B',items:[newItem(exById('u-my-raise'))]}]}); saveWorkouts(); go('#/play/u-my-raise')"); await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelector('#aboutPanel [data-del]').click()"); await pg.wait_for_timeout(300)
        print('delete                  ', asked, await pg.evaluate("[S.lib.items.map(x=>x.id), location.hash, E.coll]"))
        # importing an unchanged library exercise just bookmarks it; your own lands in My exercises
        lib = await pg.evaluate("JSON.stringify({format:'nstructr/exercise', version:1, exercises:[findInDb('core-forearm-plank')]})")
        await pg.evaluate(f"importAndShow([[{json.dumps(lib)}, 'x.json']])"); await pg.wait_for_timeout(300)
        print('import library exercise ', await pg.evaluate("[isBookmarked('core-forearm-plank'), S.lib.items.some(x=>x.id==='core-forearm-plank')]"))
        print('errors', errs); await b.close()
asyncio.run(main())
