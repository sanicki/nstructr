import asyncio, os, json, urllib.parse
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# submitting an exercise to the library (src/app/5-submit.js): a copy renamed only -> another name; an unchanged copy
# -> nothing to submit; a changed copy -> changes to it; one that moves the same as a library exercise -> name /
# changes / new with a needed note; something new -> new. Continue opens the prefilled GitHub issue form.
SETUP = """(()=>{ const sq = findInDb('bw-squat');
  const put = x => { S.lib.items = S.lib.items.filter(i => i.id !== x.id); S.lib.items.push(x); };
  put({ ...clone(sq), id: 'u-renamed', name: 'Air Squat', basedOn: 'bw-squat' });
  put({ ...clone(sq), id: 'u-same', name: sq.name + ' (copy)', basedOn: 'bw-squat' });
  put({ ...clone(sq), id: 'u-changed', name: sq.name + ' (copy)', basedOn: 'bw-squat', cues: ['Sit back.', 'Chest up.'] });
  put({ ...clone(sq), id: 'u-dup', name: 'Chair Squat Thing', collections: undefined });
  const odd = clone(findInDb('wu-arm-circles')); odd.keyframes.forEach((k, i) => { k.pose.kneeL = 20 + 40 * i; k.pose.hipR = [30 * i, 10, 0]; });
  put({ ...odd, id: 'u-new', name: 'Windmill Knee Arms' });
  saveLib(); })()"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx = await b.new_context(viewport={'width': 412, 'height': 860}, permissions=['clipboard-read', 'clipboard-write']); pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/exercises', wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        await pg.evaluate(SETUP)
        await pg.evaluate("window.open = (u) => { window.OPENED = u; }")
        async def plan(id):
            await pg.evaluate(f"go('#/play/{id}')"); await pg.wait_for_timeout(400)
            await pg.click('#shareExBtn'); await pg.wait_for_timeout(300)
            hint = await pg.inner_text('#shareSoon'); dis = await pg.evaluate("$('#shareSubmit').disabled")
            await pg.click('#shareSubmit'); await pg.wait_for_timeout(300)
            r = await pg.evaluate("[$('#submitDialog').open, $('#submitBody').innerText.replace(/\\s+/g,' ').trim(), [...document.querySelectorAll('#submitChoices .choice')].map(l => l.innerText), $('#submitGo').disabled]")
            print(f'{id:10}', 'button disabled:', dis, '|', r[1][:110], '|', r[2], '| go disabled:', r[3])
            return r
        await plan('u-renamed')
        await pg.click('#submitGo'); await pg.wait_for_timeout(400)
        u = await pg.evaluate('window.OPENED'); q = urllib.parse.parse_qs(urllib.parse.urlparse(u).query)
        print('  issue link', len(u), 'chars |', {k: v[0][:40] for k, v in q.items()})
        # the exercise link inside decodes back to the exercise
        back = await pg.evaluate(f"unpackLink({json.dumps(q['exercise'][0].split('#/link/')[1])}).then(r => [r.kind, r.data.exercises[0].name, r.data.exercises[0].basedOn])")
        print('  decodes to', back)
        await plan('u-same'); await pg.click('#submitDialog [data-close]')
        await plan('u-changed'); await pg.click('#submitDialog [data-close]')
        await plan('u-dup')
        # "new" needs a note when it moves the same as a library exercise
        await pg.click('#submitChoices .choice:last-child'); await pg.wait_for_timeout(100)
        print('  new: note label', repr(await pg.inner_text('#submitNoteLabel')))
        await pg.evaluate('window.OPENED = null'); await pg.click('#submitGo'); await pg.wait_for_timeout(300)
        print('  without a note: opened', await pg.evaluate('window.OPENED'), '| still open', await pg.evaluate("$('#submitDialog').open"))
        await pg.fill('#submitNote', 'Feet on a wobble board.'); await pg.click('#submitGo'); await pg.wait_for_timeout(300)
        q = urllib.parse.parse_qs(urllib.parse.urlparse(await pg.evaluate('window.OPENED')).query)
        print('  with a note:', q['kind'], q.get('target'), q['note'], q['title'])
        await plan('u-new'); await pg.click('#submitDialog [data-close]')
        # workouts can't be submitted yet
        await pg.evaluate("go('#/workouts')"); await pg.wait_for_timeout(300)
        await pg.click('[data-wtoggle="lib:full-body-routine"]'); await pg.click('[data-wcustom="lib:full-body-routine"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-share-wk="@edit"]'); await pg.wait_for_timeout(300)
        print('workout    ', await pg.evaluate("[$('#shareSubmit').disabled, $('#shareSoon').textContent]"))
        # the cover screen
        await pg.set_viewport_size({'width': 360, 'height': 398})
        await pg.click('#shareDialog [data-close]'); await pg.evaluate("go('#/play/u-dup')"); await pg.wait_for_timeout(300)
        await pg.click('#shareExBtn'); await pg.click('#shareSubmit'); await pg.wait_for_timeout(300)
        print('360x398     sideways scroll:', await pg.evaluate("(() => { const d = $('#submitDialog'); return d.scrollWidth > d.clientWidth; })()"))
        await pg.screenshot(path=os.environ.get('SHOT', '/tmp/submit.png'))
        print('errors', errs)
        await b.close()
asyncio.run(main())
