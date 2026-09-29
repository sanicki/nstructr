import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Install the app: offered once, after the first workout that was started (finished or left early), never during one;
# only where the browser can install it (a beforeinstallprompt event, faked here) or on iPhone Safari (told in words).
# Settings > Import & tools keeps an Install row while installing is possible.
FAKE = """window.fakeInstall = () => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompted = 0;
  e.prompt = () => { window.PROMPTED = (window.PROMPTED || 0) + 1; return Promise.resolve(); }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); dispatchEvent(e); return e.defaultPrevented; }; 0"""
SNACK = "[$('#snackbar').classList.contains('show'), $('#snackbar').textContent.replace('close', ' ✕')]"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        await pg.evaluate(FAKE)
        print('no workout yet: event   ', await pg.evaluate("fakeInstall()"), '(default prevented) | tip', await pg.evaluate(SNACK), '| key', await pg.evaluate("localStorage.getItem('nstructr-install-hint-v1')"))
        await pg.goto(URL + '#/settings'); await pg.wait_for_timeout(300)
        print('Settings row            ', await pg.evaluate("[!$('#installRow').hidden, !$('#installBtn').hidden, $('#installHow').textContent]"))
        await pg.goto(URL + '#/workouts'); await pg.wait_for_timeout(300)
        await pg.evaluate("WK.hinted = true; startWorkout(LIB_WK[0], 0)"); await pg.wait_for_timeout(1200)
        await pg.evaluate("fakeInstall()"); await pg.wait_for_timeout(1000)
        print('during the workout      ', await pg.evaluate(SNACK), '| view', await pg.evaluate("S.view"), '| key', await pg.evaluate("localStorage.getItem('nstructr-install-hint-v1')"))
        await pg.evaluate("exitWorkout()"); await pg.wait_for_timeout(1500)
        print('left early: the tip     ', await pg.evaluate(SNACK), '| key', await pg.evaluate("localStorage.getItem('nstructr-install-hint-v1')"))
        await pg.set_viewport_size({'width': 360, 'height': 398}); await pg.wait_for_timeout(300)
        print('360x398: tip in view    ', await pg.evaluate("(() => { const r = $('#snackbar').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.top), Math.round(r.bottom), innerWidth, innerHeight]; })()"))
        await pg.click('#snackbar .snack-act'); await pg.wait_for_timeout(300)
        print('Install tapped          ', await pg.evaluate("[window.PROMPTED, $('#snackbar').classList.contains('show'), $('#installRow').hidden]"), '<- [1, false, true: a prompt is used once]')
        await pg.set_viewport_size({'width': 412, 'height': 860})
        await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_timeout(600); await pg.evaluate(FAKE); await pg.evaluate("fakeInstall()"); await pg.wait_for_timeout(1200)
        print('next visit: once only   ', await pg.evaluate(SNACK))
        # a finished workout: offered when leaving the Done screen
        await pg.evaluate("localStorage.removeItem('nstructr-install-hint-v1'); WK.hinted = true; startWorkout(LIB_WK[0], 0)"); await pg.wait_for_timeout(600)
        await pg.evaluate("finishWorkout()"); await pg.wait_for_timeout(1200)
        print('Done screen: not yet    ', await pg.evaluate(SNACK), await pg.evaluate("[S.view, WP.phase]"))
        await pg.evaluate("exitWorkout()"); await pg.wait_for_timeout(1500)
        print('after Done              ', await pg.evaluate(SNACK))
        await pg.click('#snackbar .snack-close'); await pg.wait_for_timeout(300)
        print('closed with ✕           ', await pg.evaluate("$('#snackbar').classList.contains('show')"))
        # a browser that can't install (no event, not iPhone): nothing, and the row stays hidden
        pg2 = await b.new_page(); pg2.on('pageerror', lambda e: errs.append(str(e)))
        await pg2.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg2.wait_for_timeout(500)
        await pg2.evaluate("WK.hinted = true; startWorkout(LIB_WK[0], 0)"); await pg2.wait_for_timeout(500); await pg2.evaluate("exitWorkout()"); await pg2.wait_for_timeout(1500)
        print('cannot install          ', await pg2.evaluate(SNACK), await pg2.evaluate("[$('#installRow').hidden, localStorage.getItem('nstructr-install-hint-v1')]"), '<- still owed, in case it becomes installable')
        # iPhone Safari: no event; told how
        ctx = await b.new_context(user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', viewport={'width': 390, 'height': 800})
        pi = await ctx.new_page(); pi.on('pageerror', lambda e: errs.append(str(e)))
        await pi.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pi.wait_for_timeout(500)
        await pi.evaluate("WK.hinted = true; startWorkout(LIB_WK[0], 0)"); await pi.wait_for_timeout(500); await pi.evaluate("exitWorkout()"); await pi.wait_for_timeout(1500)
        print('iPhone: the tip         ', await pi.evaluate(SNACK))
        await pi.click('#snackbar .snack-act'); await pi.wait_for_timeout(300)
        print('iPhone: How             ', await pi.evaluate(SNACK), '| Settings row', await pi.evaluate("[!$('#installRow').hidden, $('#installBtn').hidden, $('#installHow').textContent]"))
        print('errors', errs); await b.close()
asyncio.run(main())
