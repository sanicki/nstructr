import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Muscle groups (HANDOFF §5.5): every library exercise has ratings; the exercise page's Muscles section (map, legend,
# list under the seven headings); stretched groups outlined; a copy without ratings shows its original's; the user's
# own exercise without ratings has no section; the dark theme uses the dark colours; fits the cover screen.
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/play/bw-squat', wait_until='domcontentloaded'); await pg.wait_for_function("POSE_DB.exercises.length > 0 && document.querySelector('#musclesTitle')")
        print('library without ratings   ', await pg.evaluate("[POSE_DB.exercises.length, POSE_DB.exercises.filter(x => !x.muscles).map(x => x.id)]"), '(expect [354, []])')
        print('section title             ', await pg.evaluate("$('#musclesTitle').textContent"), '(expect Muscles worked)')
        print('map parts filled          ', await pg.evaluate("[...document.querySelectorAll('.mg-map [fill^=\"var(--mg-\"]')].map(e => e.getAttribute('fill')).filter(f => f !== 'var(--mg-empty)').length"), '(expect > 0)')
        print('squat list                ', await pg.evaluate("[...document.querySelectorAll('.mg-list li')].map(li => li.textContent)"))
        print('legend                    ', await pg.evaluate("$('.mg-legend').textContent"), '(expect Primary Secondary Stabilizer Stretched)')
        print('light primary colour      ', await pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--mg-3').trim()"), '(expect #9d2a20)')
        await pg.goto(URL + '#/play/yoga-low-lunge'); await pg.wait_for_timeout(500)
        print('low lunge title           ', await pg.evaluate("$('#musclesTitle').textContent"), '(expect Muscles worked and stretched)')
        print('stretched outlines        ', await pg.evaluate("document.querySelectorAll('.mg-map [stroke=\"var(--mg-stretch)\"]').length"), '(expect 2: both front thighs)')
        print('label                     ', await pg.evaluate("$('.mg-map').getAttribute('aria-label')"))
        await pg.goto(URL + '#/play/yoga-corpse'); await pg.wait_for_timeout(500)
        print('corpse: no section        ', await pg.evaluate("!document.querySelector('section.muscles')"))
        print('copy shows original       ', await pg.evaluate("(() => { const c = { ...exById('bw-pushup'), id: 'u-c', basedOn: 'bw-pushup' }; delete c.muscles; return musclesOf(c).muscles.chest; })()"), '(expect 3)')
        print('own without: no section   ', await pg.evaluate("musclesHTML({ id: 'u-x', name: 'Mine', keyframes: [] }) === ''"))
        # dark theme
        await pg.evaluate("document.documentElement.dataset.theme = 'dark'")
        print('dark primary colour       ', await pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--mg-3').trim()"), '(expect #ffb0a4)')
        # cover screen: no sideways scroll, map fits
        await pg.set_viewport_size({'width': 360, 'height': 398}); await pg.goto(URL + '#/play/bw-pushup'); await pg.wait_for_timeout(500)
        print('cover: map width / page   ', await pg.evaluate("[Math.round($('.mg-map').getBoundingClientRect().width), document.documentElement.scrollWidth]"), '(expect <= 360, 360)')
        print('errors', errs)
        await b.close()
asyncio.run(main())
