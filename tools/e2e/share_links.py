import asyncio, os, json
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# share links: a workout (library-only and with the sender's own exercise) and an exercise travel inside the link;
# the receiver sees what it is and adds it only on Add; ids never overwrite the receiver's own; QR codes for short
# links; library exercises share as #/play/<id>; damaged links; browsers without CompressionStream
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        sender = await b.new_context(viewport={'width': 412, 'height': 860}); pg = await sender.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        # a library-only workout (the library routine, customised)
        await pg.click('[data-wtoggle="lib:full-body-routine"]'); await pg.click('[data-wcustom="lib:full-body-routine"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-share-wk="@edit"]'); await pg.wait_for_timeout(400)
        url1 = await pg.input_value('#shareUrl')
        print('library workout link    ', len(url1), 'chars |', url1[:60] + '…', '| QR:', await pg.evaluate("!!$('#shareQr svg')"))
        await pg.click('#shareDialog [data-close]')
        # library workouts aren't shared (everyone has them); a link naming one still opens
        await pg.evaluate("go('#/workouts')"); await pg.wait_for_timeout(300)
        print('library card share      ', await pg.evaluate("document.querySelectorAll('#libWkList [data-share-wk]').length"), 'buttons')
        url0 = await pg.evaluate("shareBase() + '#/link/l1.full-body-routine'")
        # a workout using an exercise of the sender's own
        own = await pg.evaluate("JSON.stringify({...findInDb('bw-squat'), id:'u-wide-squat', name:'Wide Squat', description:'Squat with feet wide.'})")
        await pg.evaluate(f"""(()=>{{ S.lib.items.push(JSON.parse({json.dumps(own)})); saveLib();
          WK.list.push({{id:'mine', name:'Legs Day', restBetween:10, blocks:[{{id:'b', name:'Main', rounds:2, roundRest:45, items:[{{...newItem(exById('u-wide-squat')), reps:12}}, {{...newItem(exById('core-forearm-plank')), seconds:40, sets:2, rest:15}}]}}]}}); saveWorkouts(); go('#/workouts'); }})()""")
        await pg.wait_for_timeout(300)
        await pg.click('[data-wtoggle="mine"]'); await pg.click('[data-share-wk="mine"]'); await pg.wait_for_timeout(400)
        url2 = await pg.input_value('#shareUrl')
        print('workout + own exercise  ', len(url2), 'chars | QR:', await pg.evaluate("!!$('#shareQr svg')"), '|', await pg.inner_text('#shareWhat'))
        await pg.click('#shareDialog [data-close]')
        # an exercise: library one = plain link, own one = packed
        await pg.evaluate("go('#/play/bw-reverse-lunge')"); await pg.wait_for_timeout(400)
        print('library exercise share  ', await pg.evaluate("[$('#shareExBtn').hidden, !!document.querySelector('#aboutPanel [data-act=shareEx]')]"), '<- hidden')
        await pg.evaluate("go('#/play/u-wide-squat')"); await pg.wait_for_timeout(400)
        await pg.click('#shareExBtn'); await pg.wait_for_timeout(300)
        url3 = await pg.input_value('#shareUrl')
        print('own exercise link       ', len(url3), 'chars', url3.split('#')[1][:14] + '…')
        # --- a different phone (fresh storage) opens the links ---
        recv = await b.new_context(viewport={'width': 412, 'height': 860}); rp = await recv.new_page()
        rp.on('pageerror', lambda e: errs.append(str(e)))
        await rp.goto(url2, wait_until='domcontentloaded'); await rp.wait_for_timeout(700)
        print('open workout link       ', await rp.evaluate("[$('#linkDialog').open, location.hash, WK.list.length]"), '|', (await rp.inner_text('#linkBody')).split('\n')[0:2])
        await rp.click('#linkDialog [data-close]'); await rp.wait_for_timeout(200)
        print('Not now adds nothing    ', await rp.evaluate("[WK.list.length, S.lib.items.length]"))
        await rp.goto(url2.replace('#', '?again#'), wait_until='domcontentloaded'); await rp.wait_for_timeout(700)
        await rp.click('#linkAdd'); await rp.wait_for_timeout(500)
        print('Add                     ', await rp.evaluate("[location.hash.slice(0,11), WK.list.map(w=>w.name), WK.list[0].blocks[0].rounds, WK.list[0].blocks[0].items.map(i=>[i.ex, exById(i.ex).measure==='time' ? i.seconds+' s' : i.reps+' reps', i.sets]), S.lib.items.map(x=>x.id)]"))
        # the receiver already has a different "u-wide-squat": the shared one gets a new id
        await rp.evaluate("S.lib.items[0].description='Mine, not yours.'; saveLib()")
        await rp.goto(url3.replace('#', '?x#'), wait_until='domcontentloaded'); await rp.wait_for_timeout(700)
        print('open exercise link      ', await rp.evaluate("$('#linkTitle').textContent"))
        await rp.click('#linkAdd'); await rp.wait_for_timeout(500)
        print('id clash                ', await rp.evaluate("[location.hash, S.lib.items.map(x=>x.id+':'+(x.description||'').slice(0,8))]"))
        # the library routine link
        await rp.goto(url1.replace('#', '?y#'), wait_until='domcontentloaded'); await rp.wait_for_timeout(700)
        await rp.click('#linkAdd'); await rp.wait_for_timeout(400)
        print('library workout added   ', await rp.evaluate("[WK.list.length, WK.list[WK.list.length-1].name, WK.list[WK.list.length-1].blocks.flatMap(b=>b.items).length]"))
        await rp.goto(url0.replace('#', '?v#'), wait_until='domcontentloaded'); await rp.wait_for_timeout(700)
        await rp.click('#linkAdd'); await rp.wait_for_timeout(400)
        print('library card link added ', await rp.evaluate("[WK.list.length, WK.list[WK.list.length-1].name, WK.list[WK.list.length-1].blocks.flatMap(b=>b.items).length]"))
        # damaged link
        await rp.goto(url2[:-25].replace('#', '?z#'), wait_until='domcontentloaded'); await rp.wait_for_timeout(700)
        print('damaged link            ', await rp.evaluate("[$('#linkDialog').open, $('#snackbar').textContent]"))
        # a browser without CompressionStream makes (and reads) plain links
        await pg.click('#shareDialog [data-close]')
        await pg.evaluate("delete window.CompressionStream; go('#/workouts')"); await pg.wait_for_timeout(300)
        await pg.click('[data-share-wk="mine"]'); await pg.wait_for_timeout(300)
        url4 = await pg.input_value('#shareUrl')
        await rp.goto(url4.replace('#', '?w#'), wait_until='domcontentloaded'); await rp.wait_for_timeout(700)
        print('plain (no compression)  ', len(url4), 'chars', url4.split('#')[1][:10] + '…', '| opens:', await rp.evaluate("$('#linkDialog').open"))
        print('errors', errs); await b.close()
asyncio.run(main())
