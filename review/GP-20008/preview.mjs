import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20008');
const server = await serve(root, 0);
const browser = await launch({ headless: true });
const page = await browser.newPage({ width: 1280, height: 720 });
try {
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer&renderer=webgl&quarterwalls=1`);
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { DWOpening.dismissForTesting(); return true; })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
  }
  if (!await page.waitFor('!!window.TT', { timeout: 300000 })) throw new Error(`TT timeout: ${page.errors.slice(0, 3)}`);
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  await page.evaluate('new Promise(r => setTimeout(r, 700))');
  const facts = await page.evaluate(`(() => {
    const T = TT, bands = T.wallBandsDbg.bands().filter(b => b.kind.startsWith('quarter-'));
    const wetSolids = T.worldSolids.filter(s => s.wallBand?.kind?.startsWith('quarter-') && T.waterDepthAt(s.x, s.z) > .05);
    const gaps = bands.flatMap(b => b.gaps.filter(g => g.kind === 'walk').map(g => ({ band:b.kind, ...g })));
    const below = T.resolveStaticProps(91.54, 69.7, .35, T.sampleHeight(91.54, 69.7) - 20);
    return { enabled:T.wallBandsDbg.quartersOn, count:bands.length, bands,
      wetSolids:wetSolids.length, gaps, below, draws:T.wallBandsDbg.draws(),
      errors:window.__errors || [] };
  })()`);
  fs.writeFileSync(path.join(out, 'preview-facts.json'), JSON.stringify(facts, null, 2));
  console.log(JSON.stringify({ enabled:facts.enabled, count:facts.count, wetSolids:facts.wetSolids,
    draws:facts.draws, bands:facts.bands.map(b => ({kind:b.kind,solids:b.solids,gaps:b.gaps.map(g=>g.id)})),
    below:facts.below }));
  if (!facts.enabled || facts.count !== 4 || facts.wetSolids) throw new Error('Quarter-band registration or wet placement failed');
  await page.evaluate(`(() => {
    const c = [...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0];
    const keep = new Set(); for(let e=c;e && e!==document.body;e=e.parentElement) keep.add(e);
    for(const child of document.body.children) if(!keep.has(child)) child.style.setProperty('display','none','important');
    return true;
  })()`);
  const views = [
    ['ne', -70, 110], ['nw', 105, 90], ['sw', 105, -95], ['se', -55, -60],
  ];
  for (const [name,x,z] of views) {
    await page.evaluate('TT.setWorldTime(.42)');
    await page.evaluate(`TT.setShotView(${JSON.stringify({x:x+1,y:150,z:z+1,tx:x,ty:0,tz:z,fov:55})})`);
    await page.evaluate('new Promise(r => setTimeout(r, 700))');
    await page.screenshot(path.join(out, `quarter-${name}-top.png`));
  }
  if (page.errors.length) throw new Error(`Page errors: ${page.errors.slice(0,3)}`);
} finally {
  await browser.close();
  await server.close();
}
