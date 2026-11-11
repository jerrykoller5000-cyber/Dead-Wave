import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Only the selected local studio asset is supplied to this review page.
export async function replayArtwork(page,origin,path,source) {
  assert(['/studio/weapon-heavy.js','/studio/weapon-longarms.js'].includes(path));
  const body=Buffer.from(source).toString('base64');
  let served=0;
  page.conn.onEvent(msg=>{
    if(msg.sessionId!==page.sessionId || msg.method!=='Fetch.requestPaused')return;
    const {requestId,request}=msg.params, url=new URL(request.url);
    assert.equal(url.origin,origin); assert.equal(url.pathname,path);
    served++;
    page.send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript; charset=utf-8'}],body})
      .catch(error=>page.errors.push(error.message));
  });
  await page.send('Fetch.enable',{patterns:[{urlPattern:origin+path+'*'}]});
  return ()=>assert.equal(served,1,'Expected a single replayed artwork module');
}

export async function originalSawCovers(page,origin) {
  const path='/studio/weapon-heavy.js';
  const source=await readFile(new URL('../../studio/weapon-heavy.js',import.meta.url),'utf8');
  const start=source.indexOf('    // The concealed bevel rings flatten against the backing.');
  const end=source.indexOf('    cover.geometry.computeBoundingSphere();',start);
  assert(start>0 && end>start);
  const baseline=source.slice(0,start)+source.slice(end+'    cover.geometry.computeBoundingSphere();'.length);
  const verifyServed=await replayArtwork(page,origin,path,baseline);
  return async ()=>{
    const hash=await page.evaluate(`(async()=>{
      const {currentModel}=await import('/review/GT-20076/rank-visibility.mjs');
      const {artworkFingerprint}=await import('/tools/tests/weapon-seating.js');
      return artworkFingerprint(currentModel(TT,'chainsaw'));
    })()`);
    assert.equal(hash,'5a077773','Expected original saw cover artwork');
    verifyServed();
  };
}
