import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {replayArtwork} from '../GT-20076/replay-artwork.mjs';

export function handleSource(live,version) {
  assert(['legacy','panels','fitted'].includes(version));
  const current="  part(THREE,sawFrontHandle(THREE,'metal'),gunDark,gun).name='chainsaw front rail metal';\n  part(THREE,sawFrontHandle(THREE,'rubber'),gunRubber,gun).name='chainsaw front rail rubber';\n  part(THREE,sawFrontHandle(THREE,'caps'),gunMid,gun).name='chainsaw front rail caps';";
  const old=`  const hoop = [[-.15,.018,-.14],[-.15,.115,-.13],[-.14,.218,-.085],[-.08,.246,-.035],[.06,.246,-.035],[.13,.216,.018],[.13,.027,.055]];
  for (let i=0;i<hoop.length-1;i++) rod(THREE,K,hoop[i],hoop[i+1],.014,gunDark);
  K.cyl(.018,.018,.132,gunRubber,-.01,.246,-.035,null,14,'x');
  for(let i=-2;i<=2;i++) K.cyl(.02,.02,.008,gunPoly,-.01+i*.025,.246,-.035,null,14,'x');
  for(const [x,y,z] of [hoop[0],hoop[6]]) K.box(.032,.035,.04,gunPoly,x,y,z,0,0,0,null,.006);`;
  const backing='K.box(0.0135, 0.082, 0.082, gunMid, -0.15025';
  assert.equal(live.split(current).length,2);assert.equal(live.split(backing).length,2);
  let source=live;
  if(version!=='fitted')source=source.replace(current,old).replace(backing,'K.box(0.012, 0.082, 0.082, gunMid, -0.151');
  if(version==='legacy'){
    const marker='    cover.geometry.computeBoundingSphere();';
    const start=source.indexOf('    // The concealed bevel rings flatten against the backing.');
    const end=source.indexOf(marker,start);assert(start>0 && end>start);
    source=source.slice(0,start)+source.slice(end+marker.length);
  }
  return source;
}

export async function prepareHandleTiming(page,origin,version) {
  const path='/studio/weapon-heavy.js';
  const live=await readFile(new URL('../../studio/weapon-heavy.js',import.meta.url),'utf8');
  const verify=await replayArtwork(page,origin,path,handleSource(live,version));
  return async ()=>{
    const hash=await page.evaluate("Promise.all([import('/review/GT-20076/rank-visibility.mjs'),import('/tools/tests/weapon-seating.js')]).then(([r,s])=>s.artworkFingerprint(r.currentModel(TT,'chainsaw')))");
    const baseline={legacy:'catalog-fix-revolver-strip',panels:'catalog-fix-saw-panels',fitted:'catalog-fix-front-rail-boss'}[version];
    const catalog=JSON.parse(await readFile(new URL('../GT-20076/'+baseline+'/audit.json',import.meta.url),'utf8'));
    assert.equal(hash,catalog.chainsaw.artworkFingerprint);verify();return hash;
  };
}
export const originalHandle=(page,origin)=>prepareHandleTiming(page,origin,'panels');
