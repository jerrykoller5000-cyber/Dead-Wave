import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Replay the pre-change effect and its caller only in this review page.
export async function originalHeat(page,origin){
  const module=await readFile(new URL('./before/barrel-heat.original.js',import.meta.url));
  assert.equal(createHash('sha256').update(module).digest('hex'),'dfaf07cd0fe8a685c0f0f735695ec2540f762a3ca1089f426c52fcd04f8248db');
  const index=await readFile(new URL('../../index.html',import.meta.url),'utf8'),eol=index.includes('\r\n')?'\r\n':'\n';
  const lines=index.split(eol).filter(s=>!s.includes('Charge the gun that actually fired.')&&
    !s.includes('addShot(currentWeapon, !!suppressor[currentWeapon], 1, akimboOn()')&&
    !s.includes('offhandMesh: akimboOn() ? offhandMeshes[currentWeapon] : null'));
  const at=lines.findIndex(s=>s.includes('AudioSys.fireWeapon(currentWeapon, { suppressed:'));
  assert(at>0);
  if(!lines[at+1].includes('barrelHeat.addShot(currentWeapon, !!suppressor[currentWeapon])'))
    lines.splice(at+1,0,'          if (barrelHeat) barrelHeat.addShot(currentWeapon, !!suppressor[currentWeapon]);   // AG-290');
  const files=new Map([['/index.html',['text/html',Buffer.from(lines.join(eol))]],
    ['/game/barrel-heat.js',['text/javascript',module]]]);
  const served=new Set();
  page.conn.onEvent(msg=>{
    if(msg.sessionId!==page.sessionId||msg.method!=='Fetch.requestPaused')return;
    const url=new URL(msg.params.request.url);assert.equal(url.origin,origin);
    const [mime,data]=files.get(url.pathname);served.add(url.pathname);
    page.send('Fetch.fulfillRequest',{requestId:msg.params.requestId,responseCode:200,
      responseHeaders:[{name:'Content-Type',value:mime+'; charset=utf-8'}],body:data.toString('base64')}).catch(e=>page.errors.push(e.message));
  });
  await page.send('Fetch.enable',{patterns:[...files.keys()].map(p=>({urlPattern:origin+p+'*'}))});
  return ()=>assert.deepEqual([...served].sort(),[...files.keys()].sort());
}
