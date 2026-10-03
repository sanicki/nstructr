import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
# Linked variations (library/progressions.json): the exercise page's Easier / Harder / Other equipment; a copy of a
# library exercise has its original's links; the workout editor swaps an item (sets, sides and measure handled); the
# workout player's Easier / Harder in the controls restart the item with NstructR's run-through, only for that session
# (Resume keeps them), history has both exercises, and "Keep these changes?" saves them (a library workout: in a copy).
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script("""Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak:u=>{ (window.SAID=window.SAID||[]).push(u.text); setTimeout(()=>u.onend&&u.onend(),30); },cancel:()=>{},get speaking(){return false},get pending(){return false}}});
          window.SpeechSynthesisUtterance=function(t){this.text=t};""")
        # --- exercise page
        await pg.goto(URL + '#/play/bw-pushup', wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        rows = await pg.evaluate("[...document.querySelectorAll('#aboutPanel .link-row')].map(r => [r.querySelector('.label-large').textContent, [...r.querySelectorAll('button')].map(x => x.textContent.replace(/^\\S+(?=[A-Z])/, ''))])")
        check('push-up page', rows, [['Easier', ['Knee Push-Up']], ['Harder', ['Decline Push-Up']]])
        await pg.click('#aboutPanel [data-openex="bench-decline-pushup"]'); await pg.wait_for_timeout(400)
        check('harder opens', await pg.evaluate("location.hash"), '#/play/bench-decline-pushup')
        await pg.goto(URL + '#/play/fw-db-deadlift'); await pg.wait_for_timeout(400)
        check('deadlift other equipment', await pg.evaluate("linksOf(exById('fw-db-deadlift')).other.map(x => x.id)"), ['fw-bb-deadlift', 'fw-kb-deadlift'])
        check('no links, no section', await pg.evaluate("linksHTML(exById('bw-burpee')) === ''"), True)
        check('copy has links (basedOn)', await pg.evaluate("(() => { const c = { ...exById('bw-pushup'), id: 'u-pu-copy', basedOn: 'bw-pushup' }; const l = linksOf(c); return [l.easier.map(x => x.id), l.harder.map(x => x.id)]; })()"), [['bw-knee-pushup'], ['bench-decline-pushup']])
        # --- swapItem rules
        check('swap reps->reps keeps', await pg.evaluate("(() => { const it = { ...newItem(exById('bw-pushup')), sets: 3, reps: 7 }; const n = swapItem(it, exById('bw-knee-pushup')); return [n.ex, n.sets, n.reps]; })()"), ['bw-knee-pushup', 3, 7])
        check('swap time->reps defaults', await pg.evaluate("(() => { const it = { ...newItem(exById('bar-dead-hang')), sets: 2, seconds: 45 }; const n = swapItem(it, exById('bar-chin-up')); return [n.ex, n.sets, n.reps, exById('bar-chin-up').defaults.reps]; })()"), ['bar-chin-up', 2, 5, 5])
        check('swap sides kept / dropped', await pg.evaluate("(() => { const a = swapItem({ ...newItem(exById('bw-split-squat')), sides: 'L' }, exById('bw-reverse-lunge')); const c = swapItem({ ...newItem(exById('bw-reverse-lunge')), sides: 'L' }, exById('fw-db-reverse-lunge')); const d = swapItem({ ...newItem(exById('bw-pushup')) }, exById('bw-knee-pushup')); return [a.sides, c.sides, d.sides]; })()"), ['L', 'L', None])
        # --- editor
        await pg.goto(URL + '#/workouts'); await pg.wait_for_timeout(300)
        await pg.evaluate("""(() => { const mk = (id, o) => ({ ...newItem(exById(id)), ...o });
          WK.list.push({ id: 'v', name: 'Vary', blocks: [{ id: 'b', name: 'Main', items: [mk('bw-pushup', { uid: 'p', sets: 2, reps: 5 }), mk('core-forearm-plank', { uid: 'k', seconds: 20 })] }] }); saveWorkouts(); })()""")
        await pg.goto(URL + '#/workout/v'); await pg.wait_for_timeout(400)
        await pg.click('[data-iedit="p"]'); await pg.wait_for_timeout(300)
        check('dialog swap rows', await pg.evaluate("[...document.querySelectorAll('#itemForm .link-row .label-large')].map(x => x.textContent)"), ['Easier', 'Harder'])
        await pg.click('#itemForm [data-swapto="bw-knee-pushup"]'); await pg.wait_for_timeout(200)
        check('after swap title / note', await pg.evaluate("[$('#itemTitle').textContent, ($('#itemForm .note') || {}).textContent]"), ['Knee Push-Up', 'swap_horizSwapped from Push-Up. Save to keep it.'])
        await pg.click('#itemSave'); await pg.wait_for_timeout(300)
        check('saved item', await pg.evaluate("(() => { const it = wkById('v').blocks[0].items[0]; return [it.ex, it.sets, it.reps, it.uid]; })()"), ['bw-knee-pushup', 2, 5, 'p'])
        await pg.click('[data-iedit="p"]'); await pg.wait_for_timeout(200)
        await pg.click('#itemForm [data-swapto="bw-pushup"]'); await pg.click('#itemDialog [data-close]'); await pg.wait_for_timeout(300)
        check('cancel keeps the item', await pg.evaluate("wkById('v').blocks[0].items[0].ex"), 'bw-knee-pushup')
        # --- player (cover screen size), NstructR on
        await pg.set_viewport_size({'width': 360, 'height': 398})
        await pg.evaluate("setSound('coach'); window.SAID = []; startWorkout(wkById('v'))"); await pg.wait_for_timeout(600)
        await pg.evaluate("showControls(true)"); await pg.wait_for_timeout(300)
        pills = await pg.evaluate("[...document.querySelectorAll('#wpSwap .ov-pill')].map(x => [x.dataset.wact, x.getAttribute('aria-label')])")
        check('player pills (knee p-u)', pills, [['easier', 'Easier: Incline Push-Up'], ['harder', 'Harder: Push-Up']])
        geo = await pg.evaluate("(() => { const r = $('#wpSwap').getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom), Math.round(innerHeight * 0.78)]; })()")
        check('pills top/bottom vs 78%', geo, lambda g: g[1] <= g[2], 'bottom above the last number (78%)')
        await pg.evaluate("WP.set = 1; WP.rep = 3"); await pg.wait_for_timeout(100)
        await pg.evaluate("LAST_DOWN_AT = performance.now() + 1; CTRL_SHOWN_AT = 0")
        await pg.click('#wpSwap [data-wact="harder"]'); await pg.wait_for_timeout(500)
        check('after Harder', await pg.evaluate("[exById(current().item.ex).id, WP.set, WP.rep, WP.swaps, (S.planMeta[S.idx] || {}).guided, (window.SAID || []).slice(-1)[0]]"), ['bw-pushup', 1, 0, {'p': 'bw-pushup'}, None, 'Knee Push-Up. Watch me first. Body straight from knees to head.'])
        check('workout untouched', await pg.evaluate("wkById('v').blocks[0].items[0].ex"), 'bw-knee-pushup')
        check('session saved', await pg.evaluate("loadSession()"), {'wid': 'v', 'i': 0, 'swaps': {'p': 'bw-pushup'}})
        check('history so far', await pg.evaluate("WP.log.done.map(d => [d.ex, d.sets])"), [['bw-knee-pushup', 1]])
        await pg.evaluate("wpAction('nextItem')"); await pg.wait_for_timeout(300)
        check('history after next', await pg.evaluate("WP.log.done.map(d => [d.ex, d.sets])"), [['bw-knee-pushup', 1]])
        check('plank: easier and harder', await pg.evaluate("[...document.querySelectorAll('#wpSwap .ov-pill')].map(x => x.dataset.wact)"), ['easier', 'harder'])
        # leave: asked to keep
        await pg.evaluate("exitWorkout()"); await pg.wait_for_timeout(800)
        check('asked', await pg.evaluate("[$('#askDialog').open, $('#askTitle').textContent, $('#askText').textContent, $('#askYes').textContent, $('#askNo').textContent]"), [True, 'Keep these changes in the workout?', 'Knee Push-Up → Push-Up', 'Keep', "Don't keep"])
        await pg.click('#askYes'); await pg.wait_for_timeout(300)
        check('kept in the workout', await pg.evaluate("wkById('v').blocks[0].items.map(i => [i.ex, i.sets, i.reps])"), [['bw-pushup', 2, 5], ['core-forearm-plank', 1, 10]])
        # a library workout: a swap kept goes in a copy; Resume keeps a session's swaps
        await pg.evaluate("(() => { const w = LIB_WK.find(w => w.blocks.some(b => b.items.some(i => linksOf(exById(i.ex)).harder.length))); window.LW = w; const i = flattenWorkout(w).findIndex(e => linksOf(exById(e.item.ex)).harder.length); startWorkout(w, i); swapCurrent('harder'); })()"); await pg.wait_for_timeout(300)
        s = await pg.evaluate("loadSession()")
        await pg.evaluate("go('#/workouts')"); await pg.wait_for_timeout(700)
        await pg.click('#askNo'); await pg.wait_for_timeout(200)
        check('library: not kept, count', await pg.evaluate("WK.list.length"), 1)
        await pg.evaluate(f"confirmStart(wkById({s['wid']!r}), {s['i']}, {s.get('swaps')!r})"); await pg.wait_for_timeout(300)
        check('resumed with the swap', await pg.evaluate("[exById(current().item.ex).id, WP.swaps]"), lambda v: v[0] == 'band-roll-up' and list(v[1].values()) == ['band-roll-up'], 'band-roll-up, swapped in this session')
        await pg.evaluate("go('#/workouts')"); await pg.wait_for_timeout(700)
        n0 = await pg.evaluate("WK.list.length")
        await pg.click('#askYes'); await pg.wait_for_timeout(300)
        check('library: kept in a copy', await pg.evaluate(f"(() => {{ const c = WK.list[WK.list.length - 1], ids = w => w.blocks.flatMap(b => b.items).map(i => i.ex); return [WK.list.length - {n0}, c.name, ids(c).includes('band-roll-up'), ids(LW).includes('band-roll-up')]; }})()"), [1, "20-Minute Beginner's Pilates (copy)", True, False], 'copy has it, library workout not')
        check('errors', errs, []); await b.close()
asyncio.run(main())
