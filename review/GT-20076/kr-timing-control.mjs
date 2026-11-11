import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {replayArtwork} from './replay-artwork.mjs';

export async function prepareKrComparison(page,origin,original) {
  const path='/studio/weapon-longarms.js';
  let source=await readFile(new URL('../../studio/weapon-longarms.js',import.meta.url),'utf8');
  if (original) {
    const edits=[
      ['K.slab([[-.2, .028], [.155, .028], [.155, topCorner[1]]','K.slab([[-.2, .027], [.155, .027], [.155, topCorner[1]]'],
      ['[.022, -.19], [.022, topCorner[0]]];','[.022, -.19]];'],
      ['  cover.geometry = trimRoundedArtwork(THREE, cover.geometry, coverProfile,\n    z => Math.min(rise, (z - rearCorner[0]) * slope), 20);','']
    ];
    for (const [current,old] of edits) {
      assert.equal(source.split(current).length,2,'KR-7 comparison source changed');
      source=source.replace(current,old);
    }
  }
  const verifyServed=await replayArtwork(page,origin,path,source);
  return async ()=>{
    const fingerprint=await page.evaluate(`(async()=>{
      const {currentModel}=await import('/review/GT-20076/rank-visibility.mjs');
      const {artworkFingerprint}=await import('/tools/tests/weapon-seating.js');
      return artworkFingerprint(currentModel(TT,'ak'));
    })()`);
    assert.equal(fingerprint,original?'52331cae':'6c5a4c64','Captured artwork differs from strict catalog');
    verifyServed();
    return fingerprint;
  };
}
