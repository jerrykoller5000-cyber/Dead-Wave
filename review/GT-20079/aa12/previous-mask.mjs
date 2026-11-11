import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Replay the previous Breacher material selection for this local comparison.
// Leave the game files and all other model builders untouched.
export async function previousMask(page,origin) {
  const path='/studio/weapon-longarms.js';
  const source=await readFile(new URL('../../../studio/weapon-longarms.js',import.meta.url),'utf8');
  const start=source.indexOf('export function makeAa12Model');
  const end=source.indexOf('return finishGun(gun);',start);
  assert(start>=0 && end>start);
  const model=source.slice(start,end);
  assert(model.includes('gun.userData.partFinish = true'));
  // Shadow the imported paint marker in this builder alone and restore its old opt-in flag.
  const old=model.replace('  const gun = new THREE.Group();','  const markPaintSurface = () => {};\n  const gun = new THREE.Group();')
    .replace('  gun.userData.partFinish = true;','');
  const body=Buffer.from(source.slice(0,start)+old+source.slice(end)).toString('base64');
  const target=origin+path;
  page.conn.onEvent(msg=>{
    if(msg.sessionId!==page.sessionId || msg.method!=='Fetch.requestPaused')return;
    const {requestId,request}=msg.params;
    const action=request.url===target
      ? page.send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript; charset=utf-8'}],body})
      : page.send('Fetch.continueRequest',{requestId});
    action.catch(e=>page.errors.push(String(e)));
  });
  await page.send('Fetch.enable',{patterns:[{urlPattern:target}]});
}
