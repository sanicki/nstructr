import asyncio, os, json
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
# share links: a workout (library-only and with the sender's own exercise) and an exercise travel inside the link;
# the receiver sees what it is and adds it only on Add; ids never overwrite the receiver's own; QR codes for short
# links; library exercises share as #/play/<id>; damaged links; browsers without CompressionStream
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        sender = await b.new_context(viewport={'width': 412, 'height': 860}, permissions=['clipboard-read', 'clipboard-write']); pg = await sender.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        # a library-only workout (the library routine, customised)
        await pg.click('[data-wtoggle="lib:beginner-yoga-20"]'); await pg.click('[data-wcustom="lib:beginner-yoga-20"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-share-wk="@edit"]'); await pg.wait_for_timeout(400)
        url1 = await pg.evaluate('SHARING.url')
        check('library workout link', [len(url1) < 1000, '#/link/w1z.' in url1, await pg.evaluate("!!$('#shareQr svg')")], [True, True, True], 'short, compressed (w1z), with a QR code')
        await pg.click('#shareDialog [data-close]')
        # library workouts aren't shared (everyone has them); a link naming one still opens
        await pg.evaluate("go('#/workouts')"); await pg.wait_for_timeout(300)
        check('library card share', await pg.evaluate("document.querySelectorAll('#libWkList [data-share-wk]').length"), 0, 'buttons')
        url0 = await pg.evaluate("shareBase() + '#/link/l1.beginner-yoga-20'")
        # a workout using an exercise of the sender's own
        own = await pg.evaluate("JSON.stringify({...findInDb('bw-squat'), id:'u-wide-squat', name:'Wide Squat', description:'Squat with feet wide.'})")
        await pg.evaluate(f"""(()=>{{ S.lib.items.push(JSON.parse({json.dumps(own)})); saveLib();
          WK.list.push({{id:'mine', name:'Legs Day', blocks:[{{id:'b', name:'Main', rounds:2, roundRest:45, items:[{{...newItem(exById('u-wide-squat')), reps:12}}, {{...newItem(exById('core-forearm-plank')), seconds:40, sets:2, rest:15}}]}}]}}); saveWorkouts(); go('#/workouts'); }})()""")
        await pg.wait_for_timeout(300)
        await pg.click('[data-wtoggle="mine"]'); await pg.click('[data-share-wk="mine"]'); await pg.wait_for_timeout(400)
        url2 = await pg.evaluate('SHARING.url')
        check('workout + own exercise', [await pg.evaluate("!!$('#shareQr svg')"), await pg.inner_text('#shareWhat')], [False, '2 exercises, about 6 min, including 1 of your own.'], 'too long for a QR code; says what it shares')
        await pg.click('#shareDialog [data-close]')
        # an exercise: library one = plain link, own one = packed
        await pg.evaluate("go('#/play/bw-reverse-lunge')"); await pg.wait_for_timeout(400)
        check('library exercise share', await pg.evaluate("[$('#shareExBtn').hidden, !!document.querySelector('#aboutPanel [data-act=shareEx]')]"), [True, False], 'hidden')
        await pg.evaluate("go('#/play/u-wide-squat')"); await pg.wait_for_timeout(400)
        await pg.click('#shareExBtn'); await pg.wait_for_timeout(300)
        url3 = await pg.evaluate('SHARING.url')
        check('own exercise link', url3.split('#')[1][:10], '/link/e1z.', 'an exercise link, compressed')
        # --- a different phone (fresh storage) opens the links ---
        recv = await b.new_context(viewport={'width': 412, 'height': 860}); rp = await recv.new_page()
        rp.on('pageerror', lambda e: errs.append(str(e)))
        await rp.goto(url2, wait_until='domcontentloaded'); await rp.wait_for_timeout(700)
        check('open workout link', [await rp.evaluate("[$('#linkDialog').open, location.hash, WK.list.length]"), (await rp.inner_text('#linkBody')).split('\n')[0]], [[True, '#/workouts', 0], 'Legs Day'], 'asks first; adds nothing yet')
        await rp.click('#linkDialog [data-close]'); await rp.wait_for_timeout(200)
        check('Not now adds nothing', await rp.evaluate("[WK.list.length, S.lib.items.length]"), [0, 0])
        await rp.goto(url2.replace('#', '?again#'), wait_until='domcontentloaded'); await rp.wait_for_timeout(700)
        await rp.click('#linkAdd'); await rp.wait_for_timeout(500)
        check('Add', await rp.evaluate("[location.hash.slice(0,10), WK.list.map(w=>w.name), WK.list[0].blocks[0].rounds, WK.list[0].blocks[0].items.map(i=>[i.ex, exById(i.ex).measure==='time' ? i.seconds+' s' : i.reps+' reps', i.sets]), S.lib.items.map(x=>x.id)]"), ['#/workout/', ['Legs Day'], 2, [['u-wide-squat', '12 reps', 1], ['core-forearm-plank', '40 s', 2]], ['u-wide-squat']])
        # the receiver already has a different "u-wide-squat": the shared one gets a new id
        await rp.evaluate("S.lib.items[0].description='Mine, not yours.'; saveLib()")
        await rp.goto(url3.replace('#', '?x#'), wait_until='domcontentloaded'); await rp.wait_for_timeout(700)
        check('open exercise link', await rp.evaluate("$('#linkTitle').textContent"), 'An exercise was shared with you')
        await rp.click('#linkAdd'); await rp.wait_for_timeout(500)
        check('id clash', await rp.evaluate("[location.hash, S.lib.items.map(x=>x.id+':'+(x.description||'').slice(0,8))]"), ['#/play/u-wide-squat-2', ['u-wide-squat:Mine, no', 'u-wide-squat-2:Squat wi']])
        # the library routine link
        await rp.goto(url1.replace('#', '?y#'), wait_until='domcontentloaded'); await rp.wait_for_timeout(700)
        await rp.click('#linkAdd'); await rp.wait_for_timeout(400)
        check('library workout added', await rp.evaluate("[WK.list.length, WK.list[WK.list.length-1].name, WK.list[WK.list.length-1].blocks.flatMap(b=>b.items).length]"), [2, "20-Minute Beginner's Yoga (copy)", 16])
        await rp.goto(url0.replace('#', '?v#'), wait_until='domcontentloaded'); await rp.wait_for_timeout(700)
        await rp.click('#linkAdd'); await rp.wait_for_timeout(400)
        check('library card link added', await rp.evaluate("[WK.list.length, WK.list[WK.list.length-1].name, WK.list[WK.list.length-1].blocks.flatMap(b=>b.items).length]"), [3, "20-Minute Beginner's Yoga (copy)", 16])
        # damaged link
        await rp.goto(url2[:-25].replace('#', '?z#'), wait_until='domcontentloaded'); await rp.wait_for_timeout(700)
        check('damaged link', await rp.evaluate("[$('#linkDialog').open, $('#snackbar').textContent]"), [False, 'This link is damaged or incomplete. Ask for it again.'])
        # a browser without CompressionStream makes (and reads) plain links
        await pg.click('#shareDialog [data-close]')
        await pg.evaluate("delete window.CompressionStream; go('#/workouts')"); await pg.wait_for_timeout(300)
        await pg.click('[data-share-wk="mine"]'); await pg.wait_for_timeout(300)
        url4 = await pg.evaluate('SHARING.url')
        await rp.goto(url4.replace('#', '?w#'), wait_until='domcontentloaded'); await rp.wait_for_timeout(700)
        check('plain (no compression)', [url4.split('#')[1][:10], await rp.evaluate("$('#linkDialog').open")], ['/link/w1j.', True], 'a w1j link opens too')
        # the dialog: four equal buttons; QR recommended (filled) when there is one, else the link is; Submit not yet
        st = "[...document.querySelectorAll('.share-grid .btn')].map(b=>[b.textContent.replace(/^[a-z_0-9]+/,''), b.classList.contains('filled') ? 'filled' : 'tonal', b.disabled, Math.round(b.getBoundingClientRect().width), Math.round(b.getBoundingClientRect().height)])"
        check('long link (no QR)', await pg.evaluate(st), [['Share QR code', 'filled', True, 330, 40], ['Share link', 'filled', False, 330, 40], ['Export workout', 'tonal', False, 330, 40], ['Submit to library', 'tonal', True, 330, 40]])
        await pg.click('#shareDialog [data-close]')
        await pg.evaluate("openShare({workout: {id:'s', name:'Short', blocks:[{id:'b', name:'B', items:[newItem(exById('bw-squat'))]}]}})"); await pg.wait_for_timeout(300)
        check('short workout (QR)', [await pg.evaluate(st), await pg.evaluate("!!$('#shareQr svg')")], [[['Share QR code', 'filled', False, 330, 40], ['Share link', 'tonal', False, 330, 40], ['Export workout', 'tonal', False, 330, 40], ['Submit to library', 'tonal', True, 330, 40]], True])
        await pg.click('#shareDialog [data-close]')
        await pg.evaluate("go('#/play/u-wide-squat')"); await pg.wait_for_timeout(300); await pg.click('#shareExBtn'); await pg.wait_for_timeout(300)
        check('own exercise', await pg.evaluate("$('#shareFileLabel').textContent"), 'Export exercise')
        check('no Link field / Close / Copy', await pg.evaluate("[!document.querySelector('#shareDialog input'), [...document.querySelectorAll('#shareDialog button')].filter(b=>/Close$|Copy link/.test(b.textContent)).length, $('#shareDialog [data-close]').getAttribute('aria-label')]"), [True, 0, 'Close'])
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(150)
        check('Esc closes', await pg.evaluate("!$('#shareDialog').open"), True)
        await pg.click('#shareExBtn'); await pg.wait_for_timeout(300)
        await pg.evaluate("delete navigator.__proto__.share; window.navigator.share = undefined")
        await pg.click('#shareSend'); await pg.wait_for_timeout(200)
        check('Share link, no share sheet', await pg.evaluate("$('#snackbar').textContent"), 'Link copied: paste it anywhere')
        check('errors', errs, []); await b.close()
asyncio.run(main())
