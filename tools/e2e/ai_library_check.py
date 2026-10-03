import asyncio, os, json, urllib.parse
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
# After an import (src/app/5-libcheck.js): a new exercise that moves the same as a library one -> "use the library's"
# (the workout points at it, the copy goes); names the library doesn't know (the new exercise's, and each item's
# "calledInSource" from Create with AI) -> "Suggest it" (a prefilled GitHub issue); an item whose "equipmentInSource"
# doesn't match the library exercise the AI chose -> the library's version with that equipment, or an own copy with it.
# calledInSource and equipmentInSource aren't kept.
ANSWER = """(() => {
  const hip = { ...clone(findInDb('bw-glute-bridge')), id: 'u-hip-raise', name: 'Hip Raise' }; delete hip.collections; delete hip.otherNames;
  const odd = clone(findInDb('wu-arm-circles')); odd.keyframes.forEach((k, i) => { k.pose.kneeL = 20 + 40 * i; });
  Object.assign(odd, { id: 'u-knee-arms', name: 'Knee Arm Windmill' }); delete odd.collections;
  return JSON.stringify({ format: 'nstructr/workout', version: 2, workouts: [{ name: 'From a video', blocks: [{ name: 'Main', items: [
    { ex: 'bw-squat', calledInSource: 'Squats', equipmentInSource: [], reps: 10 },
    { ex: 'yoga-bridge', calledInSource: 'Bridge Lift', equipmentInSource: ['Yoga mat'], seconds: 30 },
    { ex: 'bw-squat', calledInSource: 'Resistance Band Squat', equipmentInSource: ['Resistance band'], reps: 12 },
    { ex: 'bw-glute-bridge', calledInSource: 'Dumbbell Hip Thrust', equipmentInSource: ['Dumbbells', 'Bench'], reps: 10 },
    { ex: 'u-hip-raise', calledInSource: 'Hip Raise', reps: 12 },
    { ex: 'u-knee-arms', calledInSource: 'Knee Arm Windmill', reps: 8 } ] }] }], exercises: [hip, odd] });
})()"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        await pg.evaluate("window.open = u => { window.OPENED = u; }")
        answer = await pg.evaluate(ANSWER)
        await pg.evaluate("AI_KIND = 'link'")   # (from a video; "Workout goal" would only take library exercises)
        await pg.evaluate("openAi()"); await pg.fill('#aiAnswer', answer); await pg.click('#aiImport'); await pg.wait_for_timeout(600)
        body = await pg.evaluate("[$('#checkDialog').open, $('#checkTitle').textContent, [...document.querySelectorAll('#checkBody .choice')].map(x => x.innerText), [...document.querySelectorAll('#checkBody .check-name span')].map(x => x.innerText)]")
        check('dialog', body[:2], [True, 'Check against the library'])
        check('choices', body[2], ['Use Glute Bridge instead of your new “Hip Raise”', 'Use Band Squat. “Resistance Band Squat” uses Resistance band; Squat uses no equipment.',
              'Make your own copy of Glute Bridge with Dumbbells, Bench. “Dumbbell Hip Thrust” uses Dumbbells, Bench; Glute Bridge uses no equipment.'])
        check('names', body[3], ['“Bridge Lift” for Bridge Pose'])
        await pg.click('#checkBody [data-suggest="0"]'); await pg.wait_for_timeout(400)
        q = urllib.parse.parse_qs(urllib.parse.urlparse(await pg.evaluate('window.OPENED')).query)
        check('suggest', [q['kind'], q['target'], q['title'], await pg.inner_text('#checkBody [data-suggest="0"]')], [['name'], ['yoga-bridge'], ['Other name for Bridge Pose: Bridge Lift'], 'Suggested'])
        await pg.click('#checkDone'); await pg.wait_for_timeout(400)
        check('after Done', await pg.evaluate("[$('#checkDialog').open, WK.list.at(-1).blocks[0].items.map(i => i.ex), WK.list.at(-1).blocks[0].items.some(i => 'calledInSource' in i || 'equipmentInSource' in i), S.lib.items.map(x => x.id), location.hash.slice(0, 10)]"), [False, ['bw-squat', 'yoga-bridge', 'bhf-squat', 'u-dumbbell-hip-thrust', 'bw-glute-bridge', 'u-knee-arms'], False, ['u-knee-arms', 'u-dumbbell-hip-thrust'], '#/workout/'])
        check('the copy', await pg.evaluate("(x => [x.name, x.basedOn, x.equipment])(S.lib.items.find(x => x.basedOn === 'bw-glute-bridge'))"), ['Dumbbell Hip Thrust', 'bw-glute-bridge', ['Dumbbells', 'Bench']])
        # "Keep as imported" changes nothing
        await pg.evaluate("openAi()"); await pg.fill('#aiAnswer', answer.replace('From a video', 'Second')); await pg.click('#aiImport'); await pg.wait_for_timeout(600)
        await pg.click('#checkKeep'); await pg.wait_for_timeout(300)
        check('Keep as imported', await pg.evaluate("[WK.list.at(-1).blocks[0].items.map(i => i.ex), S.lib.items.map(x => x.id)]"), [['bw-squat', 'yoga-bridge', 'bw-squat', 'bw-glute-bridge', 'u-hip-raise', 'u-knee-arms'], ['u-knee-arms', 'u-dumbbell-hip-thrust', 'u-hip-raise']])
        # importing the same again: exercises the user has aren't new -> only names left
        await pg.evaluate("openAi()"); await pg.fill('#aiAnswer', answer.replace('From a video', 'Third')); await pg.click('#aiImport'); await pg.wait_for_timeout(600)
        check('again', await pg.evaluate("[$('#checkDialog').open, $('#checkTitle').textContent, document.querySelectorAll('#checkBody .choice').length, $('#checkKeep').hidden]"), [True, 'Check against the library', 2, False])
        await pg.click('#checkDone')
        # one exercise that moves the same as a library one: Done opens the library's page
        one = await pg.evaluate("JSON.stringify({ ...clone(findInDb('bw-squat')), id: 'u-air-squat', name: 'Air Squat', collections: undefined })")
        await pg.evaluate("openAi()"); await pg.fill('#aiAnswer', one); await pg.click('#aiImport'); await pg.wait_for_timeout(600)
        await pg.click('#checkDone'); await pg.wait_for_timeout(500)
        check('single exercise', await pg.evaluate("[location.hash, S.lib.items.some(x => x.id === 'u-air-squat')]"), ['#/play/bw-squat', False])
        # nothing to say: no dialog
        await pg.evaluate("openAi()"); await pg.fill('#aiAnswer', json.dumps({'version': 2, 'name': 'Plain', 'blocks': [{'name': 'A', 'items': [{'ex': 'bw-squat', 'reps': 5}]}]})); await pg.click('#aiImport'); await pg.wait_for_timeout(500)
        check('nothing to check', await pg.evaluate("$('#checkDialog').open"), False)
        await pg.set_viewport_size({'width': 360, 'height': 398})
        await pg.evaluate("openAi()"); await pg.fill('#aiAnswer', answer.replace('From a video', 'Cover').replace('u-hip-raise', 'u-hip-raise-2')); await pg.click('#aiImport'); await pg.wait_for_timeout(600)
        check('360x398 sideways scroll', await pg.evaluate("(() => { const d = $('#checkDialog'); return [d.open, d.scrollWidth > d.clientWidth]; })()"), [True, False])
        await pg.screenshot(path=os.environ.get('SHOT', '/tmp/check.png'))
        check('errors', errs, []); await b.close()
asyncio.run(main())
