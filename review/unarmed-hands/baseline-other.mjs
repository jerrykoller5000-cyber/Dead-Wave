import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
const E=new Engine({warm:'none',size:'900x650'});
const load=E.load.bind(E);
E.load=async()=>{const go=E.page.goto.bind(E.page);E.page.goto=(url,opts)=>go(url.replace('/index.html?','/review/unarmed-hands/before.html?'),opts);try{return await load();}finally{E.page.goto=go;}};
try {
  await E.open();
  const lib=fs.readFileSync('tools/tests/lib.js','utf8');
  for (const id of ['t188','t195']) {
  const check=fs.readFileSync('tools/tests/'+id+'.js','utf8');
  const result=await E.page.evaluate(`(async()=>{${lib}\nconst result=${check};return await result;})()`,120000);
  fs.writeFileSync('review/unarmed-hands/baseline-'+id+'.log',result+'\n','utf8');
  console.log(id+": "+result);
  }
}finally{await E.close();}
process.exit(0);
