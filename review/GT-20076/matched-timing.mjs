// One isolated browser, one live page at a time. All responses still pass the native game-test slot.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {handleSource} from '../GT-20083/original-handle.mjs';
import {originalSniperSource} from './replay-artwork.mjs';
import {sampleHigh,compiledBuild} from './frame-sample.mjs';
import {save} from './save.mjs';

const [id,run]=process.argv.slice(2);
assert(process.env.DW_GAME_TEST_TOKEN && ['chainsaw','sniper','pistol'].includes(id) && /^[a-z0-9-]+$/.test(run));
const isSaw=id==='chainsaw';
const artPath={chainsaw:'/studio/weapon-heavy.js',sniper:'/studio/weapon-longarms.js',pistol:'/studio/weapon-sidearms.js'}[id];
const audits=isSaw?{legacy:'catalog-fix-revolver-strip',panels:'catalog-fix-saw-panels',fitted:'catalog-fix-front-rail-boss'}:id==='sniper'?{original:'catalog-fix-front-rail-boss',current:'catalog-fix-sniper-seated'}:{original:'catalog-fix-sniper-seated',current:'catalog-fix-pistol-cover'};
const reverse=process.argv.includes('--reverse');
const order=isSaw?['fitted','panels','legacy','fitted']:reverse?['current','original','current']:['original','current','original'];
const root=fileURLToPath(new URL('../../',import.meta.url));
const documents=new Map();
function artwork(source,version){
  if(isSaw)return handleSource(source,version);
  if(version==='current')return source;
  if(id==='sniper')return originalSniperSource(source);
  const current='K.slab([[-0.0875, 0.006], [0.294, 0.006]';
  assert.equal(source.split(current).length,2);
  return source.replace(current,'K.slab([[-0.0875, 0.012], [0.294, 0.012]');
}
async function preserveResponses(page,origin,version){
  let supplied=0;
  async function respond(event){
    const {requestId,request,responseStatusCode}=event;
    const url=new URL(request.url);
    assert.equal(url.origin,origin);
    // Reuse only successful static responses. The normal server checks the lease for every game navigation.
    const path=url.pathname;
    if(responseStatusCode!==200 || !(path==='/index.html' || /\.m?js$/.test(path))){
      await page.send('Fetch.continueRequest',{requestId});
      return;
    }
    if(!documents.has(path)){
      const first=await page.send('Fetch.getResponseBody',{requestId});
      documents.set(path,Buffer.from(first.body,first.base64Encoded?'base64':'utf8'));
    }
    let bytes=documents.get(path);
    if(path===artPath){
      const original=bytes.toString('utf8');
      const source=artwork(original,version);
      bytes=Buffer.from(source);supplied++;
    }
    const type=path==='/index.html'?'text/html':'text/javascript';
    await page.send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[
      {name:'Content-Type',value:type+'; charset=utf-8'},{name:'Cache-Control',value:'no-store'}
    ],body:bytes.toString('base64')});
  }
  page.conn.onEvent(message=>{
    if(message.sessionId!==page.sessionId || message.method!=='Fetch.requestPaused')return;
    respond(message.params).catch(async error=>{
      page.errors.push(error.message);
      await page.send('Fetch.failRequest',{requestId:message.params.requestId,errorReason:'Failed'}).catch(()=>{});
    });
  });
  await page.send('Fetch.enable',{patterns:['Document','Script'].map(resourceType=>({urlPattern:origin+'/*',resourceType,requestStage:'Response'}))});
  return ()=>assert.equal(supplied,1,'Expected one copy of the selected artwork');
}
const out=new URL(isSaw?'../GT-20083/matched-'+run+'.json':'./visible-repairs/'+id+'/matched-'+run+'.json',import.meta.url);
const browser=await launch({headless:false}), results=[];
try{
  for(const version of order){
    const server=await serve(root,0);
    let page;
    try{
      page=await browser.newPage({width:1280,height:720});
      const verify=await preserveResponses(page,server.origin,version);
      const result=await sampleHigh(page,server.origin,id);
      const geometry=await page.evaluate("Promise.all([import('/review/GT-20076/rank-visibility.mjs'),import('/tools/tests/weapon-seating.js')]).then(([r,s])=>{const pieces=r.currentModel(TT,"+JSON.stringify(id)+");return {fingerprint:s.artworkFingerprint(pieces),pieces:pieces.length,triangles:pieces.reduce((sum,p)=>sum+p.faces.length,0)}})");
      const observed=geometry.fingerprint;result.geometry=geometry;
      const catalog=JSON.parse(await readFile(new URL('./'+audits[version]+'/audit.json',import.meta.url),'utf8'));
      assert.equal(observed,catalog[id].artworkFingerprint);verify();
      result.artworkFingerprint=observed;
      const compiled=await compiledBuild(page,server.origin,artPath);
      result.commonModules=Object.keys(compiled.modules).length;
      result.commonHash=compiled.common;
      if(results.length)assert.equal(result.commonHash,results[0].commonHash,'A compiled non-art module differs');
      assert.deepEqual(page.errors,[]);
      results.push({version,...result});
      await save(out,JSON.stringify(results,null,2)+'\n');
      console.log('PASS',version,observed,result.commonModules,'common scripts',result.fps,'fps',result.low,'low');
    }finally{if(page)await page.send('Page.close',{}).catch(()=>{});await server.close();}
  }
}finally{await browser.close();}
