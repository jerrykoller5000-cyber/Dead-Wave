import path from 'node:path'; import { pathToFileURL } from 'node:url';
if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('slot');
const ROOT='C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT,'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT,'tools/cdp.mjs')).href);
const srv = await serve(ROOT, 0);
const origin = srv.origin;

const attempts=[];
for(let n=0;n<3;n++){
  let browser=null; for(let w=0;w<30&&!browser;w++){ try{ browser = await launch({ headless:false, args:['--window-position=-3800,-3800','--window-size=1280,720','--disable-features=CalculateNativeWinOcclusion'] }); }catch(e){ if(!/one game instance already exists/.test(String(e))) throw e; await new Promise(r=>setTimeout(r,2000)); } }
  if(!browser) throw new Error('other agent browser never exited (60 s)');
  try {
    const page = await browser.newPage({ width:1280, height:720 });
    await page.goto(`${origin}/index.html?debug=1`, { timeout:120000 });
    await page.waitFor('!!window.DWOpening',{timeout:30000});
    await page.evaluate(`(()=>{window.DWOpening?.dismissForTesting?.();})()`);
    await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready" && !window.DWOpening?.active',{timeout:120000});
    const out = await page.evaluate(`(async()=>{
      const T=TT,H=T.inspectHost(),R=T.renderer,B=R.backend,res={created:[],slow:[],nb:[]}; let lifted=false,t00=performance.now();
      const chain=(o)=>{const c=[];let n=o;while(n&&c.length<6){c.push((n.name||n.type));n=n.parent;}return c.join('<');};
      const oR=R.render; R.render=function(s,c){const t=performance.now();const r=oR.call(this,s,c);const d=performance.now()-t; if(lifted&&d>30)res.slow.push([Math.round(t-t00),Math.round(d)]); return r;}; const nbs=()=>R._nodes&&R._nodes.nodeBuilderCache?R._nodes.nodeBuilderCache.size:-1; const onc=R._nodes.getForRender?R._nodes.getForRender.bind(R._nodes):null; if(onc) R._nodes.getForRender=function(ro){const n0=nbs();const s=performance.now();const r=onc(ro);const d=performance.now()-s; if(lifted&&nbs()>n0){const o=ro.object,m=ro.material;res.nb.push({ms:+d.toFixed(0),obj:chain(o),mat:m&&m.type,skinned:!!(o&&o.isSkinnedMesh),inst:!!(o&&o.isInstancedMesh),mname:m&&m.name});} return r;};
      const oc=B.createRenderPipeline; B.createRenderPipeline=function(ro,...a){const s=performance.now();const r=oc.call(this,ro,...a);const d=performance.now()-s; if(lifted){const o=ro.object,m=ro.material; res.created.push({ms:+d.toFixed(0),at:+(s-t00).toFixed(0),obj:chain(o),mat:m&&m.type,skinned:!!(o&&o.isSkinnedMesh),inst:!!(o&&o.isInstancedMesh),shadowCast:!!(o&&o.castShadow),name:m&&m.name,layers:o&&o.layers&&o.layers.mask,pass:(ro.context&&ro.context.material&&'ctx')||''});} return r;};
      document.getElementById('playerName').value='AG309'; try{T.setViewFirstDbg(true);}catch(e){} H.enterTraining();
      const tE=performance.now(); let sawB=false;
      while(performance.now()-tE<60000){const on=!!document.getElementById('trainingBlackout')?.classList.contains('on'); if(on)sawB=true; if(sawB&&!on){lifted=true;res.liftAt=Math.round(performance.now()-t00);break;} await new Promise(r=>setTimeout(r,20));}
      await new Promise(r=>setTimeout(r,4000));
      return JSON.stringify(res);
    })()`);
    attempts.push(JSON.parse(out));
  } finally { await browser.close().catch(()=>{}); }
}
console.log('PROBE', JSON.stringify(attempts.map(x=>({liftAt:x.liftAt,n:x.created.length,created:x.created.slice(0,8),slow:x.slow,nb:x.nb.slice(0,8)}))));
try{srv.close?.();}catch(_){}
process.exit(0);




