import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Muscle groups (HANDOFF §5.5): every library exercise has ratings; the exercise page's Muscles section (map, legend,
# list under the seven headings); stretched groups outlined; a copy without ratings shows its original's; the user's
# own exercise without ratings has no section; the dark theme uses the dark colours; fits the cover screen.
# Then (PR 3): a workout's total (set-equivalents) on its card and in the editor; the small map on exercise cards;
# the muscle filter (no maps on exercise cards: owner, Sep 2026); muscle fields in Edit details (a library exercise becomes a copy); imports drop bad ratings;
# Create with AI's muscle chips and the plan's muscle words.
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/play/bw-squat', wait_until='domcontentloaded'); await pg.wait_for_function("POSE_DB.exercises.length > 0 && document.querySelector('#musclesTitle')")
        print('library without ratings   ', await pg.evaluate("[POSE_DB.exercises.length, POSE_DB.exercises.filter(x => !x.muscles).map(x => x.id)]"), '(expect [354, []])')
        print('section title             ', await pg.evaluate("$('#musclesTitle').textContent"), '(expect Muscles worked)')
        print('map parts filled          ', await pg.evaluate("[...document.querySelectorAll('.mg-map [fill^=\"var(--mg-\"]')].map(e => e.getAttribute('fill')).filter(f => f !== 'var(--mg-empty)').length"), '(expect > 0)')
        print('squat list                ', await pg.evaluate("[...document.querySelectorAll('.mg-list li')].map(li => li.textContent)"))
        print('legend                    ', await pg.evaluate("$('.mg-legend').textContent"), '(expect Primary Secondary Stabilizer Stretched)')
        print('light primary colour      ', await pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--mg-3').trim()"), '(expect #9d2a20)')
        await pg.goto(URL + '#/play/yoga-low-lunge'); await pg.wait_for_timeout(500)
        print('low lunge title           ', await pg.evaluate("$('#musclesTitle').textContent"), '(expect Muscles worked and stretched)')
        print('stretched outlines        ', await pg.evaluate("document.querySelectorAll('.mg-map [stroke=\"var(--mg-stretch)\"]').length"), '(expect 2: both front thighs)')
        print('label                     ', await pg.evaluate("$('.mg-map').getAttribute('aria-label')"))
        await pg.goto(URL + '#/play/yoga-corpse'); await pg.wait_for_timeout(500)
        print('corpse: no section        ', await pg.evaluate("!document.querySelector('section.muscles')"))
        print('copy shows original       ', await pg.evaluate("(() => { const c = { ...exById('bw-pushup'), id: 'u-c', basedOn: 'bw-pushup' }; delete c.muscles; return musclesOf(c).muscles.chest; })()"), '(expect 3)')
        print('own without: no section   ', await pg.evaluate("musclesHTML({ id: 'u-x', name: 'Mine', keyframes: [] }) === ''"))
        # dark theme
        await pg.evaluate("document.documentElement.dataset.theme = 'dark'")
        print('dark primary colour       ', await pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--mg-3').trim()"), '(expect #ffb0a4)')
        # cover screen: no sideways scroll, map fits
        await pg.set_viewport_size({'width': 360, 'height': 398}); await pg.goto(URL + '#/play/bw-pushup'); await pg.wait_for_timeout(500)
        print('cover: map width / page   ', await pg.evaluate("[Math.round($('.mg-map').getBoundingClientRect().width), document.documentElement.scrollWidth]"), '(expect <= 360, 360)')
        # --- workout totals
        await pg.set_viewport_size({'width': 412, 'height': 860}); await pg.goto(URL + '#/workouts'); await pg.wait_for_timeout(500)
        print('3 x 12 push-ups           ', await pg.evaluate("(() => { const t = workoutMuscles({ blocks: [{ rounds: 1, items: [{ ...newItem(exById('bw-pushup')), sets: 3, reps: 12 }] }] }); return [t.chest, t.shoulders, t.core]; })()"), '(expect [3, 1.5, 0.75])')
        print('60 x 1 vs 1 x 60 push-ups ', await pg.evaluate("(() => { const f = (sets, reps) => workoutMuscles({ blocks: [{ items: [{ ...newItem(exById('bw-pushup')), sets, reps }] }] }).chest; return [f(60, 1), Math.round(f(1, 60) * 100) / 100]; })()"), '(expect [12: 60 reps / 5, the low end of its 5–15; about 1.4])')
        print('one side only counts half ', await pg.evaluate("(() => { const f = sides => workoutMuscles({ blocks: [{ items: [{ ...newItem(exById('bw-split-squat')), reps: 10, sides }] }] }).frontThigh; return [f('both'), f('L')]; })()"), '(expect [1, 0.5])')
        print('2 rounds, 30 s plank      ', await pg.evaluate("workoutMuscles({ blocks: [{ rounds: 2, items: [{ ...newItem(exById('core-forearm-plank')), seconds: 30 }] }] }).core"), '(expect 2)')
        print('stretch counts nothing    ', await pg.evaluate("JSON.stringify(workoutMuscles({ blocks: [{ items: [newItem(exById('mayo-hamstring'))] }] }))"), '(expect {})')
        print('colour bands              ', await pg.evaluate("[mgScale(0), mgScale(1).includes('g1'), mgScale(3).includes('a1'), mgScale(9).includes('r1) 100%')]"), '(expect [null, true, true, true])')
        await pg.click('#libWkList [data-wtoggle]'); await pg.wait_for_timeout(200)
        print('card: map and most work   ', await pg.evaluate("[!!document.querySelector('#libWkList .mg-card .mg-map'), $('#libWkList .mg-card p').textContent]"))
        await pg.evaluate("go('#/workout/' + customizeWorkout(LIB_WK[0]).id)"); await pg.wait_for_timeout(400)
        print('editor section            ', await pg.evaluate("[!$('#wkMusclesBox').hidden, !!$('#wkMuscles .mg-scale'), $('#wkMuscles .mg-list').children.length]"), '(expect [true, true, > 0])')
        # --- exercise cards and filter
        await pg.goto(URL + '#/exercises'); await pg.wait_for_timeout(400)
        await pg.evaluate("E.coll = 'All'; E.muscle = 'All'; renderExplore()")
        print('no mini maps on cards     ', await pg.evaluate("document.querySelectorAll('#exploreBody .pose-card svg.mg-map').length"), '(expect 0)')
        print('card label says works     ', await pg.evaluate("$('#exploreBody [data-open=bw-squat]').textContent.replace(/\s+/g, ' ').trim()"))
        await pg.click('#fMuscle [data-muscle="Chest"]'); await pg.wait_for_timeout(200)
        print('chest filter              ', await pg.evaluate("[$('#fMuscle [aria-pressed=true]').textContent, [...document.querySelectorAll('#exploreBody .pose-card')].every(c => worksHeading(exById(c.dataset.open), 'Chest')), document.querySelectorAll('#exploreBody .pose-card').length]"))
        await pg.fill('#search', 'triceps'); await pg.dispatch_event('#search', 'input'); await pg.wait_for_timeout(200)
        print('search finds muscle words ', await pg.evaluate("document.querySelectorAll('#exploreBody .pose-card').length > 0"))
        await pg.evaluate("Object.assign(E, { coll: 'All', type: 'All', equip: 'Any', muscle: 'All', q: '' }); $('#search').value = ''; renderExplore()")
        # --- Edit details: a library exercise's muscles, edited, make a copy
        await pg.goto(URL + '#/play/bw-squat'); await pg.wait_for_timeout(500)
        await pg.click('#editPoseBtn'); await pg.wait_for_timeout(400); await pg.evaluate("document.querySelector('details.text-edit').open = true")
        print('form rows                 ', await pg.evaluate("[document.querySelectorAll('.mg-edit-row').length, $('#mr-frontThigh').value]"), '(expect [11, "3"])')
        await pg.select_option('#mr-chest', '1'); await pg.wait_for_timeout(300)
        await pg.click('[data-mstretch="backThigh"]'); await pg.wait_for_timeout(300)
        print('edited copy               ', await pg.evaluate("[S.ex.id.startsWith('u-'), S.ex.basedOn, JSON.stringify(S.ex.muscles), JSON.stringify(S.ex.stretches), findInDb('bw-squat').muscles.chest]"), '(expect a u- copy of bw-squat with chest 1, stretches backThigh; library untouched)')
        print('page map updated          ', await pg.evaluate("$('#musclesTitle').textContent"), '(expect Muscles worked and stretched)')
        # --- import drops bad ratings
        print('import sanitised          ', await pg.evaluate("(() => { const ex = validateExercise({ ...clone(findInDb('bw-squat')), id: 'u-bad', muscles: { core: 3, chest: '2\" onload=\"x', neck: 2, glutes: 5 }, stretches: ['backThigh', 'x\"y'] }, 'test'); return [JSON.stringify(ex.muscles), JSON.stringify(ex.stretches)]; })()"), '(expect core 3 only, backThigh only)')
        # --- Create with AI
        await pg.goto(URL + '#/workouts'); await pg.wait_for_timeout(300)
        await pg.evaluate("openAi(); AI_KIND = 'plan'; renderAi()"); await pg.wait_for_timeout(200)
        await pg.click('#aiMuscle [data-aimuscle="Back"]'); await pg.wait_for_timeout(100)
        print('plan goal from chips      ', await pg.evaluate("planPrompt($('#aiInput').value).split('\\n')[0]"))
        print('plan line muscles         ', await pg.evaluate("planLines(new Set()).split('\\n').find(l => l.startsWith('bw-pushup '))"), '(expect chest)')
        print('exercise format has fields', await pg.evaluate("aiPrompt('name', 'x').includes('muscles:') && aiPrompt('name', 'x').includes('stretches:')"))
        print('errors', errs)
        await b.close()
asyncio.run(main())
