import fs from 'node:fs';import assert from 'node:assert/strict';import {Engine} from '../../tools/camera.mjs';
const E=new Engine({match:true,warm:'none',size:'1280x900'}),dir='review/dive-GP19915';let output='';
try{await E.open();await E.ev(`R.release();T.AudioSys.setMuted(true);window.startMatch=async()=>true;`);output=await E.page.evaluate(fs.readFileSync('tools/tests/t253.js','utf8'),120000);console.log(output);assert(!output.includes('FAIL '));assert.deepEqual(E.page.errors,[]);}finally{fs.writeFileSync(`${dir}/t253-native.txt`,output+'\n');await E.close();}process.exit(0);
