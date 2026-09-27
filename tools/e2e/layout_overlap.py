import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
SIZES=[('cover',{'width':360,'height':398},2.63),('open phone',{'width':412,'height':915},2.625),('landscape',{'width':915,'height':412},2.625)]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); shots=[]; errs=[]
        for name,vp,dsf in SIZES:
            pg=await b.new_page(viewport=vp, device_scale_factor=dsf); pg.on('pageerror',lambda e: errs.append(str(e)))
            await pg.goto(URL, wait_until='domcontentloaded'); await pg.wait_for_timeout(400)
            await pg.evaluate("WK.hinted=true; setSound('coach'); startWorkout(WK.list[0], 3)"); await pg.wait_for_timeout(300)
            await pg.evaluate("caption('Drive through your front heel and lift the back foot.')"); await pg.wait_for_timeout(300)
            r=await pg.evaluate("""(()=>{const b=s=>document.querySelector(s).getBoundingClientRect();
               const t=b('#wpRoot .ov-top'), c=b('#wpCaption span'), f=b('#scene'); 
               const fig=[...document.querySelectorAll('#scene .head, #scene line.bone')].map(e=>e.getBoundingClientRect()).filter(x=>x.width||x.height);
               const figTop=Math.min(...fig.map(x=>x.top));
               return {titleBottom:Math.round(t.bottom), captionTop:Math.round(c.top), captionBottom:Math.round(c.bottom), figureTop:Math.round(figTop)};})()""")
            ok = r['captionTop']>=r['titleBottom'] and r['figureTop']>=r['captionBottom']
            print(f'{name:10}', r, 'no overlap' if ok else 'OVERLAP')
            p_=f'/tmp/ov_{name}.png'; await pg.screenshot(path=p_); shots.append(p_); await pg.close()
        print(errs); await b.close()
        from PIL import Image
        ims=[Image.open(s) for s in shots]; ims=[i.resize((int(i.width*300/i.height),300)) for i in ims]
        o=Image.new('RGB',(sum(i.width for i in ims)+20,300),'white');x=0
        for i in ims: o.paste(i,(x,0)); x+=i.width+10
        o.save('/tmp/overlap.png')
asyncio.run(main())
