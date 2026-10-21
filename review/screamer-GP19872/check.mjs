import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
const dir='review/screamer-GP19872',tag=process.argv[2]||'after';
const E=new Engine({warm:'none',size:'1200x800'});
if(tag==='before'){
 const load=E.load.bind(E);E.load=async()=>{const go=E.page.goto.bind(E.page);
 E.page.goto=(url,opts)=>go(url.replace('/index.html?','/review/screamer-GP19872/baseline.html?'),opts);
 try{return await load();}finally{E.page.goto=go;}};
}
try{
 await E.open();
 const lib=fs.readFileSync('tools/tests/lib.js','utf8');
 const results={};
 for(const id of (tag==='before'?['t93']:['t108','t210','t215','t249'])){
  const check=fs.readFileSync(`tools/tests/${id}.js`,'utf8');
  const result=await E.page.evaluate(`(async()=>{${lib}\nconst result=${check};return await result;})()`,120000);
  fs.writeFileSync(`${dir}/${tag}-${id}.log`,result+'\n');
  results[id]={pass:(result.match(/^PASS /gm)||[]).length,fail:(result.match(/^FAIL /gm)||[]).length};
  console.log(tag,id,JSON.stringify(results[id]));if(results[id].fail)console.log(result.split('\n').filter(l=>l.startsWith('FAIL ')).join('\n'));
 }
 fs.writeFileSync(dir+'/'+tag+'-checks.json',JSON.stringify({results,loadSeconds:E.loadSec,errors:E.page.errors},null,2)+'\n');
}finally{await E.close();}process.exit(0);
