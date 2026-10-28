import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
const phase=process.argv[2]||'before';
const e=new Engine({warm:'none',size:[1280,720]});
try{
 await e.open();
 const output=await e.page.evaluate(fs.readFileSync('tools/tests/t57.js','utf8'));
 fs.writeFileSync(`handoffs/GP-19976/t57-native-${phase}.log`,String(output));
 console.log(output);
 const counts={pass:(output.match(/^PASS /gm)||[]).length,fail:(output.match(/^FAIL /gm)||[]).length};
 fs.writeFileSync(`handoffs/GP-19976/native-${phase}.json`,JSON.stringify({renderer:e.renderer,...counts,pageErrors:e.page.errors},null,2));
 if(counts.fail||e.page.errors.length)process.exitCode=1;
}finally{await e.close();}
