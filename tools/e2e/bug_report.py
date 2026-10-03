import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
# Settings > Documentation: the guide link, and "report it": GitHub's bug form (.github/ISSUE_TEMPLATE/bug.yml) with
# the phone and browser filled in (the "device" field) when tapped.
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx = await b.new_context(viewport={'width': 360, 'height': 398}); pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/settings', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        check('text', await pg.evaluate("$('#bugLink').closest('.body-medium').textContent"), 'A comprehensive user guide can be found here. If you discover a bug please report it. To support my work, make a donation.')
        # (the tap's link, kept from opening: the test has no network)
        await pg.evaluate("document.addEventListener('click', e => { if (e.target.closest('#bugLink')) { window.OPENED = e.target.closest('#bugLink').href; e.preventDefault(); } })")
        await pg.click('#bugLink')
        url = await pg.evaluate('window.OPENED')
        from urllib.parse import urlparse, parse_qs
        q = parse_qs(urlparse(url).query)
        print('opens                   ', url.split('&')[0], '| device:', q.get('device', ['-'])[0][-40:])
        check('errors', errs, []); await b.close()
asyncio.run(main())
