import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Hanging (a pull-up bar, {type: "bar", y}; a hanging step anchors a hand with anchorY): as played, the hand stays on
# the bar through every move between hanging steps, the body hangs (feet off the floor) and nothing goes through the
# floor; the view grows to show the bar, and the bar is drawn (in the player and the thumbnail).
CHECK = """(() => { const R = S.resolved, out = { onBar: 0, worstHand: 0, lowest: 1e9, feetUp: 0 };
  for (let i = 0; i < R.length; i++) for (let j = 0; j < R.length; j++) {
    const a = R[i], b = R[j]; if (a === b || a.rule.y == null || b.rule.y == null) continue;
    for (let s = 0; s <= 20; s++) { const f = frameAt(a, b, easeInOut(s / 20), S.seg), P = fkAt(f.pose, S.seg, f.pos);
      out.worstHand = Math.max(out.worstHand, Math.abs(P.handR.y - a.rule.y)); out.onBar++;
      const low = Math.min(...CONTACT_POINTS.map(k => P[k].y)); out.lowest = Math.min(out.lowest, low); if (low > 5) out.feetUp++; } }
  const vb = $('#scene').viewBox.baseVal; out.viewTop = Math.round(vb.y); out.barY = Math.round(FLOOR - S.props.find(p => p.type === 'bar').y);
  out.drawn = $('#propsFront .bar') ? 1 : 0; return out; })()"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        for id in ['bar-pull-up', 'bar-chin-up', 'bar-dead-hang', 'bar-hanging-knee-raise']:
            await pg.goto(URL + '#/play/' + id, wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
            r = await pg.evaluate(CHECK)
            print(f"{id:24} hand off the bar at most {r['worstHand']:.1f} px over {r['onBar']} frames | lowest point {r['lowest']:.0f} (feet up in {r['feetUp']}) | view top {r['viewTop']} < bar {r['barY']} | drawn {r['drawn']}")
        await pg.goto(URL + '#/exercises', wait_until='domcontentloaded'); await pg.wait_for_timeout(400)
        print('thumbnail has the bar    ', await pg.evaluate("poseThumbSVG(exById('bar-pull-up'), exById('bar-pull-up').keyframes[1]).includes('tbar')"))
        await pg.goto(URL + '#/play/bw-squat', wait_until='domcontentloaded'); await pg.wait_for_timeout(400)
        print('usual view elsewhere     ', await pg.evaluate("$('#scene').getAttribute('viewBox')"))
        print('errors', errs); await b.close()
asyncio.run(main())
