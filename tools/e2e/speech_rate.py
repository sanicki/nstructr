import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Settings: "Instruction" (was Sound) and Text-to-speech speed: 0.5-3 in 0.1 steps, remembered, used by every spoken
# line (say()), a sample at the new speed, in the backup.
STUB = """window.SPOKEN = []; speechSynthesis.speak = u => { SPOKEN.push([u.text, u.rate]); setTimeout(() => u.onend && u.onend(), 5); }; speechSynthesis.cancel = () => {};"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/settings', wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        await pg.evaluate(STUB)
        print('labels                  ', await pg.evaluate("[...document.querySelectorAll('#view-settings .setting .body-large')].map(x => x.textContent).filter(t => /Instruction|speed|Sound/.test(t))"))
        print('default                 ', await pg.evaluate("[$('#setRate').textContent, speechRate()]"))
        for _ in range(3): await pg.click('[data-rate-delta="1"]')
        await pg.wait_for_timeout(600)
        print('+0.3                    ', await pg.evaluate("[$('#setRate').textContent, speechRate(), SPOKEN]"))
        for _ in range(8): await pg.click('[data-rate-delta="-1"]')
        print('floor                   ', await pg.evaluate("[$('#setRate').textContent, document.querySelector('[data-rate-delta=\"-1\"]').disabled]"))
        await pg.evaluate("setRate(9, false)")
        print('ceiling                 ', await pg.evaluate("[$('#setRate').textContent, document.querySelector('[data-rate-delta=\"1\"]').disabled]"))
        await pg.evaluate("setRate(1.7, false)")
        await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_timeout(600); await pg.evaluate(STUB)
        print('after reload            ', await pg.evaluate("[$('#setRate').textContent, localStorage.getItem('nstructr-speech-rate-v1')]"))
        await pg.evaluate("setSound('voice'); SPOKEN.length = 0"); await pg.evaluate("say('Squat')"); await pg.wait_for_timeout(100)
        print('say() uses it           ', await pg.evaluate("SPOKEN"))
        print('backup                  ', await pg.evaluate("backupData().settings"))
        await pg.evaluate("restoreBackup({ ...backupData(), settings: { sound: 'voice', speechRate: 2.4 } })")
        print('restore                 ', await pg.evaluate("[speechRate(), $('#setRate').textContent]"))
        print('player button           ', await pg.evaluate("$('#wpSound').getAttribute('aria-label')"))
        await pg.set_viewport_size({'width': 360, 'height': 398})
        print('360 wide sideways       ', await pg.evaluate("document.documentElement.scrollWidth > innerWidth"))
        print('errors', errs); await b.close()
asyncio.run(main())
