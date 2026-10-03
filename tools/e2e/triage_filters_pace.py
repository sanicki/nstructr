import asyncio, os, json
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
# Exercises filters: type and equipment on their own rows, equipment kept across collections;
# workout item settings: seconds per rep (0.1 s) instead of a speed multiplier, rest between sets only with 2+ sets
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860})
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/exercises', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        rows = "[$('#fType').hidden, $('#fEquip').hidden, E.equip, [...document.querySelectorAll('#fEquip .filter')].length]"
        check('All collections', await pg.evaluate(rows), [True, False, 'Any', 20], '[type hidden, equip hidden, choice, chips]')
        await pg.click('#fEquip [data-equip="Resistance band"]'); await pg.wait_for_timeout(200)
        for c in ['Pilates', 'Stretches', 'Chair-based', 'Bodyweight']:
            await pg.click(f'#fCollection [data-coll="{c}"]'); await pg.wait_for_timeout(200)
            vis = await pg.evaluate("(()=>{const r=$('#fEquip').getBoundingClientRect(); return !$('#fEquip').hidden && r.height > 0})()")
            print(f'{c:<24}', await pg.evaluate(rows), '| equipment row visible:', vis)
        # workout item settings
        await pg.evaluate("WK.list.push({id:'p',name:'Pace',blocks:[{id:'b',name:'B',items:[newItem(exById('star-excursion-4-point')), newItem(exById('core-forearm-plank'))]}]}); saveWorkouts(); go('#/workout/p')"); await pg.wait_for_timeout(300)
        uid = await pg.evaluate("WK.list.find(w=>w.id==='p').blocks[0].items[0].uid")
        await pg.evaluate(f"openItemSettings('{uid}')"); await pg.wait_for_timeout(200)
        check('Star Excursion pace', await pg.evaluate("[repSeconds(exById('star-excursion-4-point')), $('#st-repSec').value, !$('#st-rest'), $('#itemEst').textContent]"), [10, '10', True, '62 s'], 'no rest-between-sets stepper')
        await pg.fill('#st-repSec', '4.5'); await pg.dispatch_event('#st-repSec', 'change'); await pg.wait_for_timeout(100)
        await pg.click('[data-rep-delta="-0.1"]'); await pg.wait_for_timeout(100)
        await pg.click('[data-step-key="sets"][data-delta="1"]'); await pg.wait_for_timeout(100)
        check('4.4 s per rep, 2 sets', await pg.evaluate("[$('#st-repSec').value, ITEM_EDIT.tempo, restSets(), $('#itemEst').textContent]"), ['4.4', 2.273, 10, '66 s'])
        await pg.fill('#st-repSec', '0.1'); await pg.dispatch_event('#st-repSec', 'change'); await pg.wait_for_timeout(100)
        check('too fast is clamped', await pg.evaluate("[$('#st-repSec').value, ITEM_EDIT.tempo]"), ['2.5', 4])
        await pg.fill('#st-repSec', '4.4'); await pg.dispatch_event('#st-repSec', 'change'); await pg.click('#itemSave'); await pg.wait_for_timeout(200)
        check('saved, summary', await pg.evaluate("[WK.list.find(w=>w.id==='p').blocks[0].items[0].tempo, document.querySelector('#wkBlocks .items li').textContent.replace(/\\s+/g,' ').trim().slice(0,80)]"), [2.273, 'drag_indicator 4-Point Star Excursion2 sets of 3 circuits, per side, 4.4 s per r'])
        uid2 = await pg.evaluate("WK.list.find(w=>w.id==='p').blocks[0].items[1].uid")
        await pg.evaluate(f"openItemSettings('{uid2}')"); await pg.wait_for_timeout(200)
        check('timed: no pace control', await pg.evaluate("!$('#st-repSec')"), True)
        await pg.evaluate("$('#itemDialog').close()")
        # the workout plays at that pace: first rep of the Star Excursion ~4.4 s of animation
        await pg.evaluate("WK.hinted=true; setSound('off'); startWorkout(wkById('p'), 0)"); await pg.wait_for_timeout(300)
        check('player tempo', await pg.evaluate("S.tempo"), 2.273)
        # rest between exercises: 1 s steps, hold to repeat
        await pg.evaluate("exitWorkout(); go('#/settings')"); await pg.wait_for_timeout(300)
        r0 = await pg.evaluate("restGap()")
        await pg.click('[data-rest-delta="1"]'); await pg.wait_for_timeout(100)
        r1 = await pg.evaluate("restGap()")
        btn = await pg.evaluate("(()=>{const r=$('[data-rest-delta=\"1\"]').getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]})()")
        await pg.mouse.move(*btn); await pg.mouse.down(); await pg.wait_for_timeout(1000); await pg.mouse.up(); await pg.wait_for_timeout(150)
        rh = await pg.evaluate("restGap()")
        await pg.fill('#setRest', '7'); await pg.dispatch_event('#setRest', 'change')
        print('rest 1 s steps, hold    ', r0, '->', r1, '-> hold 1 s:', rh, '| typed 7:', await pg.evaluate("[restGap(), $('#setRest').value]"))
        check('errors', errs, []); await b.close()
asyncio.run(main())
