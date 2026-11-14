// CC-350 (claude3, cloud only): one game instance kept open in the Training Ground, third person. Evaluates
// /home/claude/repl/in/*.js in order (each an expression, may be async) -> /home/claude/repl/out/<name>.txt.
// shot-<name>.json {cam,look,fov,light,pre,wait,game} -> /home/claude/repl/out/<name>.png (game:true = the game's own 3P camera).
import fs from 'node:fs';
import path from 'node:path';
import { boot } from './boot.mjs';
const IN = '/home/claude/repl/in', OUT = '/home/claude/repl/out';
fs.mkdirSync(IN, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
const { page, close } = await boot();
try {
  fs.writeFileSync(path.join(OUT, 'READY'), 'ready'); console.log('READY');
  for (;;) {
    const files = fs.readdirSync(IN).filter(f => !f.endsWith('.tmp')).sort();
    if (!files.length) { await new Promise((r) => setTimeout(r, 300)); continue; }
    const f = files[0], full = path.join(IN, f), name = f.replace(/\.(js|json)$/, '');
    const src = fs.readFileSync(full, 'utf8'); fs.unlinkSync(full);
    if (f === 'quit.js') break;
    let res;
    try {
      if (f.startsWith('shot-')) {
        const S = JSON.parse(src);
        await page.evaluate(`(async (S)=>{ const T=TT; const LT={noon:0.42,overcast:0.5,dusk:0.74,night:0.02}; T.setWorldTime(LT[S.light||'noon']); T.weather.raining=S.light==='overcast';
          if (S.pre) await (0,eval)(S.pre);
          if (S.game) T.setShotView(null); else {
          const p=T.player.position, yaw=T.player.rotation.y, c=Math.cos(yaw), s=Math.sin(yaw), h=window.__home; const tw=(o)=>({x:p.x+o[0]*c+o[2]*s, y:h.y+o[1], z:p.z-o[0]*s+o[2]*c});
          const a=tw(S.cam), b=tw(S.look); T.setShotView({x:a.x,y:a.y,z:a.z,tx:b.x,ty:b.y,tz:b.z,fov:S.fov||30}); }
          T.stepFrame(0); await new Promise(r=>setTimeout(r,S.wait||400)); if (S.pre2) await (0,eval)(S.pre2); })(${JSON.stringify(S)})`, 170000);
        await page.screenshot(path.join(OUT, name + '.png'));
        res = 'shot';
      } else res = await page.evaluate(src, 170000);
    } catch (e) { res = 'ERR ' + (e && e.stack || e); }
    fs.writeFileSync(path.join(OUT, name + '.txt'), typeof res === 'string' ? res : JSON.stringify(res, null, 1));
  }
} catch (e) { console.log('ERR', e && e.stack || e); } finally { await close(); }
