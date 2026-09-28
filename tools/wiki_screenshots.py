"""Screenshots for the user wiki (wiki/images/*.png), taken from a served build.

    node tools/build.mjs && python3 -m http.server 8000 -d _site
    NSTRUCTR_URL=http://127.0.0.1:8000/nstructr.html python3 tools/wiki_screenshots.py

Google Fonts (Roboto Flex, Material Symbols) are fetched once by Python (which honours HTTPS_PROXY and
SSL_CERT_FILE) and served to the browser from memory, so icons render even where the browser itself can't
reach Google. Needs Pillow for the palette compression."""
import asyncio, os, re, io, json, hashlib, ssl, urllib.request
from playwright.async_api import async_playwright
from PIL import Image

URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
OUT = os.path.join(os.path.dirname(__file__), '..', 'wiki', 'images')
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'
CACHE = {}

def fetch(url):
    if url not in CACHE:
        ctx = ssl.create_default_context(cafile=os.environ.get('SSL_CERT_FILE') or os.environ.get('REQUESTS_CA_BUNDLE') or None)
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, context=ctx, timeout=30) as r:
            CACHE[url] = (r.read(), r.headers.get('Content-Type', 'application/octet-stream'))
    return CACHE[url]

async def fonts(route):
    try:
        body, ctype = fetch(route.request.url)
        await route.fulfill(body=body, headers={'Content-Type': ctype, 'Access-Control-Allow-Origin': '*'})
    except Exception as e:
        print('font fetch failed', route.request.url[:80], e); await route.abort()

def save(png, name):
    img = Image.open(io.BytesIO(png)).convert('RGB').quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    img.save(os.path.join(OUT, name + '.png'), optimize=True)
    print('saved', name)

async def shot(pg, name, sel=None, full=False):
    await pg.wait_for_timeout(350)
    png = await (pg.locator(sel).screenshot() if sel else pg.screenshot(full_page=full))
    save(png, name)

async def page(b, w, h, touch=False):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, has_touch=touch,
                              reduced_motion='no-preference')
    await ctx.route(re.compile(r'https://fonts\.(googleapis|gstatic)\.com/.*'), fonts)
    pg = await ctx.new_page()
    pg.on('pageerror', lambda e: print('PAGE ERROR', e))
    await pg.goto(URL + '#/workouts', wait_until='domcontentloaded')
    await pg.evaluate("localStorage.setItem('nstructr-theme-v1','light'); document.documentElement.dataset.theme='light'")
    await pg.evaluate("document.fonts.ready"); await pg.wait_for_timeout(800)
    return pg

HIDE_SNACK = "$('#snackbar').classList.remove('show')"

async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await page(b, 412, 860)
        # --- some content of the user's own, so the pages look lived-in ---
        await pg.evaluate("""(()=>{ WK.list.length = 0;
          WK.list.push({id:'legs', name:'Leg Day', blocks:[
            {id:'b1', name:'Warm-up', items:[{...newItem(exById('wu-arm-circles')), reps:10, dir:'both'}, {...newItem(exById('bw-squat')), reps:10}]},
            {id:'b2', name:'Strength', rounds:3, roundRest:45, items:[{...newItem(exById('bw-reverse-lunge')), reps:8, sides:'alternate'}, {...newItem(exById('calf-raise')), reps:12}, {...newItem(exById('core-forearm-plank')), seconds:30}]}]});
          saveWorkouts(); BOOKMARKS.add('bw-reverse-lunge'); BOOKMARKS.add('pil-hundred'); saveBookmarks();
          saveLog([{id:'h1', wid:'legs', name:'Leg Day', start:Date.now()-86400000, seconds:1260, exercisesDone:5, exercisesTotal:5, completed:true}]);
          go('#/workouts'); })()""")
        await pg.wait_for_timeout(400)
        # Workouts tab
        await pg.click('[data-wtoggle="legs"]'); await pg.evaluate(HIDE_SNACK)
        await shot(pg, 'workouts')
        await pg.evaluate("go('#/workout/legs')"); await pg.wait_for_timeout(300); await pg.evaluate(HIDE_SNACK)
        await shot(pg, 'workout-editor')
        uid = await pg.evaluate("WK.list[0].blocks[1].items[0].uid")
        await pg.evaluate(f"openItemSettings('{uid}')"); await shot(pg, 'item-settings')
        await pg.evaluate("$('#itemDialog').close()")
        # Exercises tab
        await pg.evaluate("E.coll='All'; E.type='All'; E.equip='Any'; E.q=''; go('#/exercises'); scrollTo(0,0)"); await pg.wait_for_timeout(300)
        await shot(pg, 'exercises')
        await pg.click('#fCollection [data-coll="Bodyweight"]'); await pg.wait_for_timeout(200); await pg.evaluate("scrollTo(0,0)")
        await shot(pg, 'exercises-collection')
        # Exercise page
        await pg.evaluate("go('#/play/bw-reverse-lunge')"); await pg.wait_for_timeout(500)
        await pg.evaluate("setPlaying(false); jumpTo(2); scrollTo(0,0)"); await pg.wait_for_timeout(300)
        await pg.evaluate("hideExControls()"); await pg.evaluate(HIDE_SNACK)
        await shot(pg, 'exercise-page')
        await pg.evaluate("$('#stepsPanel').open=true; $('#aboutTitle').scrollIntoView({block:'start'}); scrollBy(0,-70)")
        await shot(pg, 'exercise-details')
        await pg.evaluate("$('#stepsPanel').open=false; scrollTo(0,0)")
        await pg.click('#editPoseBtn'); await pg.wait_for_timeout(600); await pg.evaluate(HIDE_SNACK)
        await shot(pg, 'edit-words')
        await pg.evaluate("closeEditor(); localStorage.setItem('nstructr-authoring-v1','on'); applyAuthoring(); go('#/play/bw-squat')"); await pg.wait_for_timeout(500)
        await pg.click('#editPoseBtn'); await pg.wait_for_timeout(600); await pg.evaluate(HIDE_SNACK)
        await pg.evaluate("jumpTo(1); updateEditor(); $('#editor .joints').scrollIntoView({block:'start'}); scrollBy(0,-420)")
        await shot(pg, 'edit-poses')
        await pg.evaluate("closeEditor(); localStorage.setItem('nstructr-authoring-v1','off'); applyAuthoring()")
        # Settings
        await pg.evaluate("go('#/settings'); scrollTo(0,0)"); await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelector('.navbar').style.display='none'")   # it's fixed: it would land mid-page in a full-page shot
        await shot(pg, 'settings', full=True)
        await pg.evaluate("document.querySelector('.navbar').style.display=''")
        # Create with AI
        await pg.evaluate("openAi()"); await pg.fill('#aiInput', 'Pilates leg circles'); await shot(pg, 'create-with-ai')
        await pg.evaluate("$('#aiAnswer').value='{ \"version\": 1, \"id\": \"u-leg-circles\", \"name\": \"Leg Circles\", … }'; $('#aiImport').scrollIntoView({block:'end'})")
        await shot(pg, 'create-with-ai-answer')
        await pg.evaluate("$('#aiDialog').close()")
        # Share
        await pg.evaluate("go('#/workouts')"); await pg.wait_for_timeout(300)
        await pg.click('[data-share-wk="legs"]'); await pg.wait_for_timeout(500); await shot(pg, 'share')
        await pg.evaluate("$('#shareDialog').close()")
        link = await pg.evaluate("SHARING.url")
        # Submit to library: an own exercise that moves the same as a library one
        await pg.evaluate("S.lib.items.push({...clone(findInDb('bw-squat')), id:'u-chair-squat', name:'Air Squat'}); saveLib(); go('#/play/u-chair-squat')")
        await pg.wait_for_timeout(500); await pg.click('#shareExBtn'); await pg.click('#shareSubmit'); await shot(pg, 'submit')
        await pg.evaluate("$('#submitDialog').close(); S.lib.items = S.lib.items.filter(x => x.id !== 'u-chair-squat'); saveLib(); go('#/workouts')")
        # the other phone opens the link
        pg2 = await page(b, 412, 860)
        await pg2.goto(link.replace('#', '?r#'), wait_until='domcontentloaded'); await pg2.wait_for_timeout(1200)
        await shot(pg2, 'link-received')
        await pg2.context.close()
        await pg.context.close()
        # --- the cover screen: 360 x 398 ---
        cv = await page(b, 360, 398, touch=True)
        await cv.evaluate("WK.list.length=0; saveWorkouts(); go('#/workouts')"); await cv.wait_for_timeout(300)
        await shot(cv, 'cover-workouts')
        await cv.evaluate("WK.hinted=true; setSound('voice'); startWorkout(LIB_WK[0], 6)"); await cv.wait_for_timeout(2500)
        await cv.evaluate(HIDE_SNACK); await shot(cv, 'cover-player')
        box = await cv.evaluate("(()=>{const r=document.querySelector('.fs').getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]})()")
        await cv.touchscreen.tap(*box); await cv.wait_for_timeout(400)
        await shot(cv, 'cover-player-controls')
        await cv.evaluate("startRest(20, 'item')"); await cv.wait_for_timeout(1300); await cv.evaluate(HIDE_SNACK)
        await shot(cv, 'cover-rest')
        await cv.evaluate("exitWorkout()"); await cv.wait_for_timeout(300)
        await cv.evaluate("go('#/play/star-excursion-4-point')"); await cv.wait_for_timeout(600)
        await cv.evaluate("setPlaying(false); jumpTo(3); scrollTo(0,0)"); await cv.wait_for_timeout(300)
        await cv.evaluate("hideExControls()"); await cv.evaluate(HIDE_SNACK)
        await shot(cv, 'cover-exercise')
        await b.close()

asyncio.run(main())
