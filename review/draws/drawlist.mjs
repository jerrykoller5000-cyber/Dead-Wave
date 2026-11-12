// draws (claude2, t38's gate): every visible mesh of each equipped gun's copy (as t38 counts them), with why it is
// its own draw: its parent part (kept/named), its material (painted role, held furniture, textured, transparent),
// and whether it came from studio/weapon-detail.js. Writes review/draws/drawlist-<tag>.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/draws'); fs.mkdirSync(out, { recursive: true });
const tag = process.env.TAG || 'now';
const server = await serve(root, 0);
const browser = await launch({ headless: true, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 400000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 400000 })) throw Error('load failed');
  const res = await page.evaluate(`(()=>{ const T=TT, out={};
    for (const [key, gun] of Object.entries(T.weaponMeshes)) {
      const keep=new Set(); for (const v of Object.values(gun.userData||{})) { if (Array.isArray(v)) v.forEach(x=>x&&x.isObject3D&&keep.add(x)); else if (v&&v.isObject3D) keep.add(v); }
      const rows=[]; const copy=T.cloneLean(gun); copy.visible=true;
      const walk=(o, chain)=>{ if (!o.visible) return; const name=o.name||(o.isMesh?'':'(group)');
        if (o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position) { const m=o.material||{}; rows.push({ part: chain.join('/'), mesh: o.name||'', mat: (m.name||m.type||'')+(m.userData&&m.userData.gunPaintId?' paint:'+m.userData.gunPaintId:'')+(m.userData&&m.userData.weaponFinishRole?' role:'+m.userData.weaponFinishRole:'')+(m.map?' map':'')+(m.transparent?' transp':'')+(m.vertexColors?' vc':''), detail: !!(o.userData&&o.userData.weaponDetail), tris: (o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3|0 }); }
        for (const c of o.children) walk(c, o===copy?chain:[...chain, c.name||'·']); };
      walk(copy, []);
      out[key]={ draws: rows.length, rows };
    }
    return out; })()`, 300000);
  const sum = Object.values(res).reduce((s, g) => s + g.draws, 0);
  fs.writeFileSync(path.join(out, `drawlist-${tag}.json`), JSON.stringify({ tag, sum, guns: res }, null, 1));
  console.log(tag, 'visible meshes', sum, Object.fromEntries(Object.entries(res).map(([k, g]) => [k, g.draws])));
} finally { await browser.close(); await server.close(); }
