import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{const page=await browser.newPage({width:1280,height:720});await page.goto(server.origin+'/index.html?debug=1&raf=timer');
assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));
const rows=await page.evaluate(`(()=>{const rows=[];for(const[k,g]of Object.entries(TT.offhandMeshes)){const f=g.userData.flash;if(!f)continue;const m=f.material,d=Object.getOwnPropertyDescriptor(m,'opacity'),old=m.opacity;m.opacity=.8;const row={gun:k,setter:!!d?.set,litVisible:m.visible,litOpacity:m.opacity};m.opacity=0;row.restVisible=m.visible;m.opacity=old;rows.push(row);}return rows;})()`);
assert.equal(rows.length,3);for(const r of rows){assert(r.setter);assert(r.litVisible);assert.equal(r.litOpacity,.8);assert.equal(r.restVisible,false);}
await writeFile(new URL('flash-clone-gate.json',import.meta.url),JSON.stringify({rows,errors:page.errors},null,2));assert.deepEqual(page.errors,[]);console.log('PASS three native clone lit/rest gates '+JSON.stringify(rows));
}finally{await browser.close();await server.close();}
