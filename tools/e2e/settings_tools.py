import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
# Settings > Import & tools: Backup (Export everything), Import (Choose file: a backup, workouts, or exercises), then
# Advanced exercise editor; with it on, Export your exercises and the JSON format reference show, off they're hidden.
ROWS = "[...document.querySelectorAll('#view-settings section[aria-labelledby=setToolsTitle] > *')].filter(x => x.offsetParent !== null).map(x => (x.querySelector('.body-large, .title-medium, h2') || x).textContent.trim())"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 360, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/settings', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        check('authoring off', await pg.evaluate(ROWS), ['Import & tools', 'Backup', 'Import', 'Advanced exercise editor'])
        check('buttons', await pg.evaluate("[...document.querySelectorAll('#view-settings section[aria-labelledby=setToolsTitle] button')].filter(x => x.offsetParent !== null).map(x => x.textContent.replace(/^(download|upload_file|data_object)/, ''))"), ['Export everything', 'Choose file'])
        check('import text', await pg.evaluate("[...document.querySelectorAll('#view-settings .body-large')].find(x => x.textContent === 'Import').nextElementSibling.textContent"), 'Restore a backup, add workouts, or exercises from a JSON file.')
        await pg.evaluate("$('#setAuthoring').click()")
        await pg.wait_for_timeout(200)
        check('authoring on', await pg.evaluate(ROWS), ['Import & tools', 'Backup', 'Import', 'Export your exercises', 'Advanced exercise editor', 'JSON format reference'])
        check('Display has no authoring', await pg.evaluate("!document.querySelector('section[aria-labelledby=setDisplayTitle] #setAuthoring')"), True)
        check('errors', errs, []); await b.close()
asyncio.run(main())
