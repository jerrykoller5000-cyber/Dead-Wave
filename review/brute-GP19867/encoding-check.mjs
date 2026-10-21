import fs from 'node:fs';import assert from 'node:assert/strict';import {Engine} from '../../tools/camera.mjs';
const E=new Engine({warm:'none',size:'900x650'}),proof={};
try{await E.open();await E.page.evaluate(fs.readFileSync('tools/tests/lib.js','utf8'));
 for(const id of ['t215']){const raw=await E.page.evaluate(fs.readFileSync('tools/tests/'+id+'.js','utf8'),240000);proof[id]={raw,pass:String(raw).split('\n').filter(l=>l.startsWith('PASS ')).length,fail:String(raw).split('\n').filter(l=>l.startsWith('FAIL '))};console.log(JSON.stringify({id,...proof[id]}));assert.equal(proof[id].fail.length,0);}
 proof.errors=E.page.errors;assert.equal(proof.errors.length,0);
}finally{fs.writeFileSync('review/brute-GP19867/encoding-proof.json',JSON.stringify(proof,null,2));await E.close();}process.exit(0);
