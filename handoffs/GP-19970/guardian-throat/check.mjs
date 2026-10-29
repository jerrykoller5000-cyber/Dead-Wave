import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../../tools/camera.mjs';

const e=new Engine({inspect:true,warm:'none',size:[1280,720]});
try{
  await e.open();
  const rows=await e.page.evaluate("DWInspect.check({only:/^zombie\\.(guardian|caveguard)$/,frames:5,thumbs:0})",120000);
  assert.equal(rows.length,2);
  assert(rows.every(r=>r.ok),JSON.stringify(rows));
  const errors=await e.page.evaluate('DWInspect.errors()');
  assert.deepEqual(errors,[]);assert.deepEqual(e.page.errors,[]);
  fs.writeFileSync('handoffs/GP-19970/guardian-throat/check.json',JSON.stringify({renderer:e.renderer,rows,errors,pageErrors:e.page.errors},null,2));
  console.log('PASS native Inspector guardian and caveguard build check 2/0, zero errors.');
}finally{await e.close();}
