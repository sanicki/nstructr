import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Equipment is matched without case: an import's "resistance band" takes the library's spelling, and one saved
# before that shows under the library's "Resistance band" filter (not as equipment of its own).
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/exercises', wait_until='domcontentloaded'); await pg.wait_for_timeout(800)
        print('import respelled        ', await pg.evaluate("""normalizeImport({ exercises: [{ ...findInDb('band-clamshell'), id: 'u-new', name: 'New',
          equipment: ['RESISTANCE  band', 'mat', 'Resistance band', 'Foam roller'] }] })[0].equipment"""), "<- ['Resistance band', 'Mat', 'Foam roller']")
        await pg.evaluate("""S.lib.items.push({ ...findInDb('band-clamshell'), id: 'u-old', name: 'Banded Lying Leg Abduction', equipment: ['resistance band'] });
          E.coll = 'All'; renderExplore()""")
        await pg.click('#fEquip [data-equip="Resistance band"]'); await pg.wait_for_timeout(200)
        print('one band filter, listed ', await pg.evaluate("""[[...document.querySelectorAll('#fEquip [data-equip]')].map(x => x.dataset.equip).filter(x => /band/i.test(x)),
          $('#exploreBody').innerText.includes('Banded Lying Leg Abduction')]"""), "<- [['Resistance band'], True]")
        print('errors', errs); await b.close()
asyncio.run(main())
