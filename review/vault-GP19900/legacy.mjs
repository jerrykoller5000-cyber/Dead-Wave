import fs from 'node:fs';
import {Engine as Live} from '../../tools/camera.mjs';
import {Engine as Staged} from './camera.mjs';
const dir='review/vault-GP19900',proof={};
for(const [name,C] of [['before',Live],['after',Staged]]) {
 const E=new C({warm:'none',size:'1000x750'}),p=proof[name]={};
 try {
  await E.open();await E.page.evaluate(fs.readFileSync('tools/tests/lib.js','utf8'));
  p.result=await E.page.evaluate(fs.readFileSync('tools/tests/t142.js','utf8'),120000);
  p.errors=E.page.errors;console.log(name+'\n'+p.result);console.log(JSON.stringify(p.errors));
 }finally{fs.writeFileSync(dir+'/legacy-proof.json',JSON.stringify(proof,null,2));await E.close();}
}
process.exit(0);
