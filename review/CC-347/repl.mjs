// CC-347 (claude3, cloud only): one game instance kept open in the Training Ground, third person; evaluates
// /home/claude/repl/in/*.js in order (each an expression, may be async) and writes the result to /home/claude/repl/out/<name>.txt.
// A file named shot-<name>.json {view:{cam,look,fov},light} takes a picture to /home/claude/repl/out/<name>.png. quit.js ends it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const IN = '/home/claude/repl/in', OUT = '/home/claude/repl/out';
fs.mkdirSync(IN, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: true, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 600000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 600000 })) throw Error('load failed');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 600000 })) throw Error('opening stayed up');
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CC-347';document.getElementById('modeTraining').click();})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 600000 })) throw Error('Training failed');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 120000 });
  await page.evaluate(`(()=>{ const T=TT; T.setViewFirstDbg(false); const p=T.player.position; window.__home={x:p.x,y:p.y,z:p.z,yaw:T.player.rotation.y}; })()`);
  fs.writeFileSync(path.join(OUT, 'READY'), 'ready');
  console.log('READY');
  for (;;) {
    const files = fs.readdirSync(IN).sort();
    if (!files.length) { await new Promise((r) => setTimeout(r, 500)); continue; }
    const f = files[0], full = path.join(IN, f), name = f.replace(/\.(js|json)$/, '');
    const src = fs.readFileSync(full, 'utf8'); fs.unlinkSync(full);
    if (f === 'quit.js') break;
    let res;
    try {
      if (f.startsWith('shot-')) {
        const S = JSON.parse(src);
        await page.evaluate(`(async (S)=>{ const T=TT; const LT={noon:0.42,overcast:0.5,dusk:0.74,night:0.02}; T.setWorldTime(LT[S.light||'noon']); T.weather.raining=S.light==='overcast';
          const h=window.__home, c=Math.cos(h.yaw), s=Math.sin(h.yaw); const tw=(o)=>({x:h.x+o[0]*c+o[2]*s, y:h.y+o[1], z:h.z-o[0]*s+o[2]*c});
          const a=tw(S.cam), b=tw(S.look); T.setShotView({x:a.x,y:a.y,z:a.z,tx:b.x,ty:b.y,tz:b.z,fov:S.fov||30});
          if (S.pre) await (0,eval)(S.pre);
          await new Promise(r=>setTimeout(r,S.wait||600)); if (S.pre2) await (0,eval)(S.pre2); })(${JSON.stringify(S)})`, 120000);
        await page.screenshot(path.join(OUT, name + '.png'));
        res = 'shot';
      } else res = await page.evaluate(src, 170000);
    } catch (e) { res = 'ERR ' + (e && e.stack || e); }
    fs.writeFileSync(path.join(OUT, name + '.txt'), typeof res === 'string' ? res : JSON.stringify(res, null, 1));
  }
} catch (e) { console.log('ERR', e && e.stack || e); } finally {
  await browser.close(); server.close && server.close(); setTimeout(() => process.exit(0), 2000);
}
