import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
const dir='review/spitter-GP19870',tag=process.argv[2]||'after';
const E=new Engine({warm:'none',size:'1200x800'});
if(tag==='before'){
 const load=E.load.bind(E);E.load=async()=>{const go=E.page.goto.bind(E.page);
 E.page.goto=(url,opts)=>go(url.replace('/index.html?','/review/spitter-GP19870/baseline.html?'),opts);
 try{return await load();}finally{E.page.goto=go;}};
}
try{
 await E.open();
 const lib=fs.readFileSync('tools/tests/lib.js','utf8');
 const results={};
 for(const id of ['t80','t215']){
  const check=fs.readFileSync(`tools/tests/${id}.js`,'utf8');
  const result=await E.page.evaluate(`(async()=>{${lib}\nconst result=${check};return await result;})()`,120000);
  fs.writeFileSync(`${dir}/${tag}-${id}.log`,result+'\n');
  results[id]={pass:(result.match(/^PASS /gm)||[]).length,fail:(result.match(/^FAIL /gm)||[]).length};
  console.log(tag,id,JSON.stringify(results[id]));if(results[id].fail)console.log(result.split('\n').filter(l=>l.startsWith('FAIL ')).join('\n'));
 }
 const performanceProof=await E.ev(`T.clearZombies();T.setHp(100000);T.AudioSys.setMuted(true);
 const x=T.player.position.x,z=T.player.position.z;window.__pin=setInterval(()=>{T.player.position.x=x;T.player.position.z=z;},2);
 const key=(c,d)=>document.body.dispatchEvent(new KeyboardEvent(d?'keydown':'keyup',{code:c,key:c,bubbles:true}));
 if(!T.isUnarmed())T.toggleHolster();await new Promise(r=>setTimeout(r,1500));key('KeyW',true);key('ShiftLeft',true);
 const times=[];let last=performance.now();const start=last;while(performance.now()-start<5000){await new Promise(r=>requestAnimationFrame(r));const now=performance.now();times.push(now-last);last=now;}
 key('KeyW',false);key('ShiftLeft',false);clearInterval(__pin);const sorted=[...times].sort((a,b)=>a-b);
 return {frames:times.length,seconds:(last-start)/1000,fps:times.length/((last-start)/1000),p95:sorted[Math.floor(sorted.length*.95)]};`,15000);
 fs.writeFileSync(`${dir}/${tag}-checks.json`,JSON.stringify({results,performance:performanceProof,loadSeconds:E.loadSec,errors:E.page.errors},null,2)+'\n');
 console.log(tag,JSON.stringify({performance:performanceProof,errors:E.page.errors}));
}finally{await E.close();}process.exit(0);
