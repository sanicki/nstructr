import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Settings > Import & tools: Backup (Export everything), Import (Choose file: a backup, workouts, or exercises), then
# Advanced exercise editor; with it on, Export your exercises and the JSON format reference show, off they're hidden.
ROWS = "[...document.querySelectorAll('#view-settings section[aria-labelledby=setToolsTitle] > *')].filter(x => x.offsetParent !== null).map(x => (x.querySelector('.body-large, .title-medium, h2') || x).textContent.trim())"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 360, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/settings', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        print('authoring off           ', await pg.evaluate(ROWS))
        print('buttons                 ', await pg.evaluate("[...document.querySelectorAll('#view-settings section[aria-labelledby=setToolsTitle] button')].filter(x => x.offsetParent !== null).map(x => x.textContent.replace(/^(download|upload_file|data_object)/, ''))"))
        print('import text             ', await pg.evaluate("[...document.querySelectorAll('#view-settings .body-large')].find(x => x.textContent === 'Import').nextElementSibling.textContent"))
        await pg.evaluate("$('#setAuthoring').click()")
        await pg.wait_for_timeout(200)
        print('authoring on            ', await pg.evaluate(ROWS))
        print('Display has no authoring', await pg.evaluate("!document.querySelector('section[aria-labelledby=setDisplayTitle] #setAuthoring')"))
        print('errors', errs); await b.close()
asyncio.run(main())
