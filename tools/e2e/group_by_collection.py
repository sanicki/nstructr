import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Exercises tab, "Group by collection": off (default since Sep 2026) = one A–Z list of everything that matches;
# on = a row per collection, or with filters a section per collection. Remembered; shown only for All collections.
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/exercises', wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        state = """(() => { const names = [...document.querySelectorAll('#exploreBody .pose-card .t')].map(x => x.textContent);
          return { toggle: !$('#groupWrap').hidden, on: $('#groupColl').checked, sections: document.querySelectorAll('#exploreBody .section').length,
                   carousels: document.querySelectorAll('#exploreBody .carousel').length, cards: names.length,
                   sorted: names.join('|') === [...names].sort((a, b) => a.localeCompare(b)).join('|'), first: names.slice(0, 3) }; })()"""
        print('default: one A-Z list   ', await pg.evaluate(state), '| library', await pg.evaluate('POSE_DB.exercises.length'))
        await pg.click('#groupWrap'); await pg.wait_for_timeout(200)
        print('on: row per collection  ', await pg.evaluate(state))
        await pg.fill('#search', 'squat'); await pg.wait_for_timeout(200)
        print('on + search (sections)  ', await pg.evaluate(state))
        await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        print('remembered after reload ', await pg.evaluate("[$('#groupColl').checked, localStorage.getItem('nstructr-group-collections-v1')]"))
        await pg.click('#groupWrap'); await pg.fill('#search', 'squat'); await pg.wait_for_timeout(200)
        print('off + search (A-Z)      ', await pg.evaluate(state), await pg.evaluate("[...document.querySelectorAll('#exploreBody .section h2')].map(h => h.textContent)"))
        await pg.fill('#search', ''); await pg.click('[data-coll="Yoga"]'); await pg.wait_for_timeout(200)
        print('one collection          ', await pg.evaluate(state))
        await pg.set_viewport_size({'width': 360, 'height': 398})
        print('360 wide: sideways      ', await pg.evaluate("document.documentElement.scrollWidth > innerWidth"))
        print('errors', errs); await b.close()
asyncio.run(main())
