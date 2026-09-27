import asyncio, os, json
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# the exercise player follows the Sound setting: Silent/Beeps say nothing; Voice/Coach read each step's cue on the
# first pass (the step waits for it), then count reps; pausing stops the voice; a new side restarts the first pass
FAKE = """window.SPOKEN=[]; window.CANCELS=0; Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
  speaking:false, pending:false, getVoices(){ return []; }, speak(u){ SPOKEN.push(u.text); this.speaking=true; this._u=u; setTimeout(()=>{ if(this._u===u){ this.speaking=false; this._u=null; u.onend&&u.onend(); } }, 1500); },
  cancel(){ CANCELS++; this.speaking=false; const u=this._u; this._u=null; u&&u.onend&&u.onend(); }}});"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860})
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/exercises', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        await pg.evaluate(FAKE)
        for snd, ex in [('off', 'calf-raise'), ('beeps', 'core-forearm-plank')]:
            await pg.evaluate(f"setSound('{snd}'); SPOKEN.length=0; go('#/play/{ex}')"); await pg.wait_for_timeout(400)
            await pg.evaluate("setPlaying(true)"); await pg.wait_for_timeout(2500)
            print(f'{snd:<6} says            ', await pg.evaluate("SPOKEN"))
            await pg.evaluate("setPlaying(false); go('#/exercises')"); await pg.wait_for_timeout(300)
        await pg.evaluate("setSound('voice'); SPOKEN.length=0; go('#/play/bw-squat')"); await pg.wait_for_timeout(700)
        n = await pg.evaluate("S.resolved.length")
        print('voice: first cue       ', await pg.evaluate("[SPOKEN, S.idx, XS.speaking]"), '<- step waits while speaking')
        await pg.wait_for_timeout(1500 * n + 3000)
        cues = await pg.evaluate("S.resolved.map(r=>r.quiet ? null : (r.cue||r.name)).filter(Boolean)")
        said = await pg.evaluate("SPOKEN")
        print('first pass reads cues  ', said[:len(cues)] == cues, '|', len(cues), 'cues')
        await pg.wait_for_timeout(6000)
        print('then counts reps       ', await pg.evaluate(f"SPOKEN.slice({len(cues)})"), '| rep', await pg.evaluate("S.rep"))
        c0 = await pg.evaluate("CANCELS")
        await pg.evaluate("setPlaying(false)"); await pg.wait_for_timeout(200)
        print('pause stops voice      ', await pg.evaluate(f"[CANCELS > {c0}, speechSynthesis.speaking, XS.speaking]"))
        # a bilateral exercise: switching side starts the first pass again
        await pg.evaluate("SPOKEN.length=0; go('#/play/bw-reverse-lunge')"); await pg.wait_for_timeout(400)
        side = await pg.evaluate("!$('#sideCtl').hidden")
        await pg.evaluate("setPlaying(true)"); await pg.wait_for_timeout(500)
        first = await pg.evaluate("SPOKEN.slice()")
        other = await pg.evaluate("document.querySelector('#sideSeg button[aria-pressed=false]')?.dataset.side || ''")
        await pg.click(f'#sideSeg [data-side="{other}"]'); await pg.wait_for_timeout(500)
        print('side switch restarts   ', side, first, '->', await pg.evaluate(f"[S.side, S.rep, SPOKEN.slice({len(first)})]"))
        # leaving the player stops speech
        c1 = await pg.evaluate("CANCELS")
        await pg.evaluate("go('#/exercises')"); await pg.wait_for_timeout(300)
        print('leave stops voice      ', await pg.evaluate(f"CANCELS > {c1}"))
        print('errors', errs); await b.close()
asyncio.run(main())
