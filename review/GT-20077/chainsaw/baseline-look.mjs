import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Replay only this task's previous saw artwork. Other models, current hand poses,
// viewport, camera code and the on-disk production module stay on the live tree.
export async function originalSawForPage(page,origin) {
  const path='/studio/weapon-heavy.js';
  let source=await readFile(new URL('../../../studio/weapon-heavy.js',import.meta.url),'utf8');
  const edits=[
  [
    "  bodyMat.name = 'chainsaw motor enamel';\n  bodyMat.color.setHex(0x985632);\n  bodyMat.roughness = .69;",
    "  bodyMat.color.setHex(0xa85225);"
  ],
  [
    "  coverMat.name = 'chainsaw moulded covers';\n  coverMat.color.setHex(0xbd733e);\n  coverMat.roughness = .74;\n  coverMat.metalness = .025;\n  coverMat.map = sawCoverTexture(THREE);",
    "  coverMat.color.setHex(0xc66b2e);"
  ],
  [
    "  barMat.name = 'chainsaw satin bar';\n  barMat.color.setHex(0x87908c);\n  barMat.roughness = .65;\n  barMat.metalness = .47;",
    "  barMat.color.setHex(0xb1b9b2);\n  barMat.roughness = 0.55;"
  ],
  [
    "  addTriggerArtwork(gun, K, gunBand([[-0.395, 0.062], [-0.393, 0.045]",
    "  K.slab(gunBand([[-0.395, 0.062], [-0.393, 0.045]"
  ]
];
  for(const [current,old] of edits){
    assert.equal(source.split(current).length,2,'Current saw artwork changed during comparison');
    source=source.replace(current,old);
  }
  // Later per-part registration belongs to the revised visual look too.
  source=source.replace("  gun.userData.partFinish = true;\n  coverMat.userData.weaponFinishRole = 'furniture';\n",'');
  const body=Buffer.from(source).toString('base64');
  let served=0;
  page.conn.onEvent(msg=>{
    if(msg.sessionId!==page.sessionId||msg.method!=='Fetch.requestPaused')return;
    const {requestId,request}=msg.params;
    if(new URL(request.url).origin!==origin||new URL(request.url).pathname!==path)throw Error('Unexpected comparison asset');
    served++;
    page.send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript; charset=utf-8'}],body}).catch(e=>page.errors.push(e.message));
  });
  await page.send('Fetch.enable',{patterns:[{urlPattern:origin+path+'*'}]});
  return ()=>assert.equal(served,1,'Expected a single baseline art module');
}
