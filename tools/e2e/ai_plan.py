import asyncio, json, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
# Create with AI, "Workout goal" (plan a workout): equipment chips (remembered), a prompt listing only the exercises that
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
        check('equipment chips', chips, lambda c: {'dumbbell', 'band', 'wall', 'chair'} <= set(c) and not any(x.endswith('*') for x in c), 'the usual kinds, none picked')
        await pg.click('#aiEquip [data-aiequip="dumbbell"]'); await pg.wait_for_timeout(100)
        check('remembered', await pg.evaluate("localStorage.getItem('nstructr-ai-equipment-v1')"), '["dumbbell"]')
        await pg.fill('#aiInput', 'a 30-minute leg workout')
        t = await pg.evaluate("aiPrompt('plan', $('#aiInput').value)")
        check('prompt', [t.splitlines()[0], 'fw-db-squat' in t, 'bhf-squat' in t, 'EXERCISE:' in t], ['Plan a workout for my exercise app: a 30-minute leg workout', True, False, False], 'first line, dumbbell ones in, band ones and the exercise format out')
        check('prompt size', len(t), below(20000))
        await pg.evaluate("setAiApp('claude')"); await pg.click('#aiOpen'); await pg.wait_for_timeout(200)
        check('opened', await pg.evaluate('window.OPENED || ""'), lambda u: u.startswith('https://claude.ai/new?q=Plan+a+workout+for+my+exercise+app:+'))
        # answers: a made-up exercise is refused; one needing a band is imported and named; the total time is shown
        await pg.fill('#aiAnswer', wk([{'ex': 'bw-squat', 'reps': 10}, {'ex': 'u-jump-lunge', 'reps': 8}])); await pg.click('#aiImport'); await pg.wait_for_timeout(300)
        check('made-up refused', await pg.evaluate("[$('#aiDialog').open, $('#snackbar').textContent]"), [True, "The AI used exercises that aren't in the library (u-jump-lunge). Ask it to use only the library's."])
        await pg.fill('#aiAnswer', wk([{'ex': 'bw-squat', 'reps': 10}, {'ex': 'fw-db-squat', 'reps': 10}, {'ex': 'bhf-squat', 'reps': 12}])); await pg.click('#aiImport'); await pg.wait_for_timeout(500)
        check('imported, named', await pg.evaluate("[$('#aiDialog').open, location.hash.slice(0, 10), WK.list.at(-1).name, $('#snackbar').textContent]"), lambda v: v[:3] == [False, '#/workout/', 'Legs 30'] and v[3].startswith('Planned: Legs 30, about ') and v[3].endswith("Needs equipment you didn't pick: Band Squat"))
        await pg.reload(); await pg.wait_for_timeout(600); await pg.evaluate("openAi()"); await pg.click('[data-aikind="plan"]')
        check('after reload', await pg.evaluate("[...document.querySelectorAll('#aiEquip [aria-pressed=true]')].map(x => x.dataset.aiequip)"), ['dumbbell'])
        await pg.set_viewport_size({'width': 360, 'height': 398}); await pg.wait_for_timeout(200)
        check('360x398 sideways scroll', await pg.evaluate("[...document.querySelectorAll('.ai-body')].some(x => x.scrollWidth > x.clientWidth)"), False)
        check('errors', errs, []); await b.close()
asyncio.run(main())
