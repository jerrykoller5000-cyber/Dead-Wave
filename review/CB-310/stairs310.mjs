// CB-310 (claude2): J141's filmstrip for Jerry: half pace on stairs (STAIR_SPEED_SCALE 0.5). A flight of build stairs on
// level ground; he walks and sprints up it and down it, pictured from the side every 0.1 s of game time (real frames, not
// stepped), and once in first person going up. 'before' is index.html with STAIR_SPEED_SCALE = 1 (the old full pace),
// 'after' is index.html as it is. Writes review/CB-310/frames2/<phase>-<run>-<i>.png and stairs310.json.
// Run through the slot: node tools/game-test-slot.mjs run claude2 CB-310 --checks "stairs filmstrip" -- node review/CB-310/stairs310.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/CB-310');
fs.mkdirSync(path.join(out, 'frames2'), { recursive: true });
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const key = 'const STAIR_SPEED_SCALE = 0.5,';
if (source.indexOf(key) < 0) throw Error('STAIR_SPEED_SCALE line missing');
const pages = { before: source.replace(key, 'const STAIR_SPEED_SCALE = 1,'), after: source };
const phases = (process.env.PHASES || 'before,after').split(',');
for (const ph of phases) fs.writeFileSync(path.join(out, `live-${ph}.html`), pages[ph].replace('<head>', '<head>\n  <base href="/">'), 'utf8');
const RUNS = (process.env.RUNS || 'walk-up,walk-down,sprint-up,sprint-down,fp-walk-up').split(',');
const server = await serve(root, 0);
const browser = await launch({ headless: true, args: ['--window-size=1280,720'] });
const results = {};
try {
  for (const phase of phases) {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await page.goto(`${server.origin}/review/CB-310/live-${phase}.html?debug=1&raf=timer`, { timeout: 400000 });
    if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 400000 })) throw Error(`${phase} load failed`);
    await page.evaluate('DWOpening.dismissForTesting()');
    if (!await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 500000 })) throw Error(`${phase}: the opening stayed up`);
    await page.evaluate(`(()=>{ document.getElementById('playerName').value='CB-310 stairs'; document.getElementById('modeHunt').click();
      const fr=document.getElementById('firstRunCard'), pa=document.getElementById('firstRunPlay'); if (fr && !fr.hidden && pa) pa.click(); })()`);
    if (!await page.waitFor('TT.getPhase && TT.getPhase() === "prep" && !document.body.classList.contains("deploying")', { timeout: 400000 })) throw Error(`${phase}: no prep`);
    const setup = await page.evaluate(`(async()=>{ const T=TT; T.clearZombies && T.clearZombies(); T.setHp(100000); T.setViewFirstDbg(false);
      const SX=18, SZ=18, G0=T.sampleHeight(SX,SZ); T.levelGroundRect(SX-14,SZ-14,SX+14,SZ+14,G0,6);
      const st=T.placeBuildAt('stairs', Math.round((SX-6)/2), Math.round((SZ-6)/2), 0); if(!st||!st.deck) return {ok:false};
      const d=st.deck; window.__fl={cx:d.x, cz:d.z, half:d.hl, g:G0, rise:st.rise}; window.__aim=null;
      window.__sim=async(s)=>{const s0=T.getSimTime(),w0=Date.now(); while(T.getSimTime()-s0<s&&Date.now()-w0<120000) await new Promise(r=>setTimeout(r,20));};
      setInterval(()=>{ const a=window.__aim; if(!a) return; const p=T.player.position; T.aimPointDbg(p.x+Math.sin(a)*6,p.y+1.3,p.z+Math.cos(a)*6); T.setAimYawDbg(a); },5);
      return {ok:true, ...window.__fl, scale: T.stairSpeedDbg().scale}; })()`, 120000);
    console.log(phase, 'setup', JSON.stringify(setup));
    results[phase] = { setup, runs: {} };
    const key = (code, down) => page.evaluate(`document.dispatchEvent(new KeyboardEvent('${down ? 'keydown' : 'keyup'}', { code: '${code}', key: '${code}', bubbles: true }))`);
    // The game held and stepped at 1/30 s (as tcb310), a picture every third frame (0.1 s of game time). Each step draws.
    await page.evaluate(`(()=>{ const T=TT; window.__pinX=null; window.__step=(n=1)=>{ for(let i=0;i<n;i++){ const a=window.__aim; if(a!=null){ const p=T.player.position; if(window.__pinX!=null) p.x=window.__pinX; T.aimPointDbg(p.x+Math.sin(a)*6,p.y+1.3,p.z+Math.cos(a)*6); T.setAimYawDbg(a); } T.stepFrame(1/30); } };   // __pinX: the third-person camera turns a little as he goes and he drifts off a 1.3 m wide flight; kept on its middle line
      window.__camYaw=()=>{ const d=T.camera.getWorldDirection(new T.THREE.Vector3()); return Math.atan2(d.x,d.z); }; window.__aim=null; T.flightHold(true); })()`);
    for (const run of RUNS) {
      const sprint = run.includes('sprint'), up = run.endsWith('up'), fp = run.startsWith('fp');
      await key('KeyW', false); await key('ShiftLeft', false);
      const z0info = await page.evaluate(`(()=>{ const T=TT, F=__fl; T.setViewFirstDbg(${fp}); const up=${up};
        const z0 = up ? F.cz-F.half-2.4 : F.cz+F.half-0.15, yaw = up ? 0 : Math.PI, wrap=(a)=>Math.atan2(Math.sin(a),Math.cos(a));
        const put=()=>{ T.setVelDbg(0,0); T.player.position.set(F.cx, T.entityGroundY(F.cx, z0, F.g+(up?0.3:F.rise+0.6)), z0); };
        T.setShotView(null); put(); window.__aim=yaw; __step(10); for(let k=0;k<4&&Math.abs(wrap(__camYaw()-yaw))>0.03;k++){ T.rotateCamera(wrap(yaw-__camYaw())); for(let i=0;i<60&&Math.abs(wrap(__camYaw()-yaw))>0.03;i++) __step(1); } const camOk=+__camYaw().toFixed(2); put(); window.__pinX=${fp}?null:F.cx; __step(6);
        ${fp ? 'T.setShotView(null);' : 'T.setShotView({x:F.cx+5.2, y:F.g+1.9, z:F.cz, tx:F.cx, ty:F.g+1.2, tz:F.cz, fov:45});'} __step(2);
        return {z0, y: T.player.position.y, cam: camOk}; })()`, 120000);
      await key('KeyW', true); if (sprint) await key('ShiftLeft', true);
      const rows = []; const n = up ? (sprint ? 14 : 18) : (sprint ? 12 : 16);
      for (let i = 0; i < n; i++) {
        const r = await page.evaluate(`(()=>{ __step(3); const T=TT,p=T.player.position,v=T.smoothDbg.vel(),s=T.stairSpeedDbg(); return { t:+(${i + 1}*0.1).toFixed(1), x:+(p.x-__fl.cx).toFixed(3), y:+(p.y-__fl.g).toFixed(3), z:+(p.z-__fl.cz).toFixed(3), v:+Math.hypot(v.x,v.z).toFixed(2), w:+s.w.toFixed(2), on:s.on }; })()`);
        const name = `${phase}-${run}-${String(i).padStart(2, '0')}.png`;
        await page.screenshot(path.join(out, 'frames2', name));
        rows.push({ ...r, name });
      }
      await key('KeyW', false); await key('ShiftLeft', false);
      await page.evaluate('__step(10)');
      results[phase].runs[run] = { start: z0info, rows };
      console.log(phase, run, JSON.stringify(z0info), rows.map((r) => `${r.t}s x${r.x} z${r.z} y${r.y} v${r.v} w${r.w}`).join(' | ').slice(0, 900));
    }
    await page.close();
  }
  fs.writeFileSync(path.join(out, 'stairs310.json'), JSON.stringify(results, null, 2));
} finally { await browser.close(); await server.close(); }
