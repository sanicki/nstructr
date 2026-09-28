import asyncio, json, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Create with AI, "A goal: plan a workout": equipment chips (remembered), a prompt listing only the exercises that
# equipment allows (no exercise format), and an import that takes only library exercises and names any that need
# equipment the user didn't pick.
def wk(items): return json.dumps({'format': 'nstructr/workout', 'version': 2, 'workouts': [{'version': 2, 'name': 'Legs 30', 'blocks': [{'name': 'Main', 'items': items}]}]})
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(700)
        await pg.evaluate("window.open = u => { window.OPENED = u; }")
        await pg.evaluate("openAi()"); await pg.click('[data-aikind="plan"]'); await pg.wait_for_timeout(100)
        chips = await pg.evaluate("[...document.querySelectorAll('#aiEquip [data-aiequip]')].map(x => x.dataset.aiequip + (x.getAttribute('aria-pressed') === 'true' ? '*' : ''))")
        print('equipment chips         ', chips, '<- wall picked at first')
        await pg.click('#aiEquip [data-aiequip="dumbbell"]'); await pg.wait_for_timeout(100)
        print('remembered              ', await pg.evaluate("localStorage.getItem('nstructr-ai-equipment-v1')"))
        await pg.fill('#aiInput', 'a 30-minute leg workout')
        t = await pg.evaluate("aiPrompt('plan', $('#aiInput').value)")
        print('prompt                  ', len(t), 'chars |', t.splitlines()[0], '| fw-db-squat:', 'fw-db-squat' in t, '| band ones:', 'bhf-squat' in t,
              '| exercise format:', 'EXERCISE:' in t, '| paces:', 'calf-raise 7s: Calves' in t)
        await pg.select_option('#aiApp', 'claude'); await pg.click('#aiOpen'); await pg.wait_for_timeout(200)
        print('opened                  ', (await pg.evaluate('window.OPENED || ""'))[:60], len(await pg.evaluate('window.OPENED || ""')))
        # answers: a made-up exercise is refused; one needing a band is imported and named; the total time is shown
        await pg.fill('#aiAnswer', wk([{'ex': 'bw-squat', 'reps': 10}, {'ex': 'u-jump-lunge', 'reps': 8}])); await pg.click('#aiImport'); await pg.wait_for_timeout(300)
        print('made-up refused         ', await pg.evaluate("[$('#aiDialog').open, $('#snackbar').textContent]"))
        await pg.fill('#aiAnswer', wk([{'ex': 'bw-squat', 'reps': 10}, {'ex': 'fw-db-squat', 'reps': 10}, {'ex': 'bhf-squat', 'reps': 12}])); await pg.click('#aiImport'); await pg.wait_for_timeout(500)
        print('imported, named         ', await pg.evaluate("[$('#aiDialog').open, location.hash.slice(0, 10), WK.list.at(-1).name, $('#snackbar').textContent]"))
        await pg.reload(); await pg.wait_for_timeout(600); await pg.evaluate("openAi()"); await pg.click('[data-aikind="plan"]')
        print('after reload            ', await pg.evaluate("[...document.querySelectorAll('#aiEquip [aria-pressed=true]')].map(x => x.dataset.aiequip)"))
        await pg.set_viewport_size({'width': 360, 'height': 398}); await pg.wait_for_timeout(200)
        print('360x398 sideways scroll ', await pg.evaluate("[...document.querySelectorAll('.ai-body')].some(x => x.scrollWidth > x.clientWidth)"))
        print('errors', errs); await b.close()
asyncio.run(main())
