import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const root=fileURLToPath(new URL('../../',import.meta.url));
const server=await serve(root,0);
const current=await readFile(new URL('../../studio/weapon-heavy.js',import.meta.url),'utf8');
let original=current;
for (const [now,old] of [
  ['gunDark, 0.1675, 0.047 + Math.sin','gunDark, 0.169, 0.047 + Math.sin'],
  ['[[-0.395, 0.062], [-0.393, 0.045]','[[-0.393, 0.045]'],
  ['0, 0.0995, -0.444','0, 0.101, -0.444'],
  ['[[0.089, -0.055], [0.13, -0.06]','[[0.09, -0.06], [0.13, -0.06]'],
  ['0.012, 0.012, 0.0675, gunDark, 0.14375, 0.12, -0.22','0.012, 0.012, 0.06, gunDark, 0.14, 0.12, -0.22']
]) {
  assert.equal(original.split(now).length,2,now);
  original=original.replace(now,old);
}
try {
  for(const [name,source] of [['before',original],['after',current]]) {
    const browser=await launch({headless:false});
    try {
      const p=await browser.newPage({width:1280,height:720});
      let loaded=0;
      p.conn.onEvent(msg=>{
        if(msg.sessionId!==p.sessionId || msg.method!=='Fetch.requestPaused') return;
        loaded++;
        void p.send('Fetch.fulfillRequest',{requestId:msg.params.requestId,responseCode:200,
          responseHeaders:[{name:'Content-Type',value:'text/javascript; charset=utf-8'}],body:Buffer.from(source).toString('base64')});
      });
      await p.send('Fetch.enable',{patterns:[{urlPattern:'*/studio/weapon-heavy.js*'}]});
      await p.goto(server.origin+'/index.html?debug=1&raf=timer');
      assert(await p.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
      await p.evaluate('DWOpening.dismissForTesting()');
      await p.evaluate(await readFile(new URL('../../tools/tests/lib.js',import.meta.url),'utf8'));
      const probe=await readFile(new URL('../../tools/tests/clip-check.js',import.meta.url),'utf8');
      const body=probe.replace('export async function clipCheck','async function clipCheck')
        .replace("where = sd + ' ' + mk + ' in ' + pt.name;", "where = sd+' '+mk+' in '+pt.name+' at gun-local '+V.gun.root.worldToLocal(v.clone()).toArray().map(n=>n.toFixed(4)).join(',');");
      const report=await p.evaluate('(async()=>{'+body+"\nconst lines=[];await clipCheck(TT,['chainsaw'],(ok,msg)=>lines.push((ok?'PASS ':'FAIL ')+msg),lines);return lines.join('\\n');})()",180000);
      assert(loaded>0); assert.deepEqual(p.errors,[]);
      console.log(name,report.split('\n').find(l=>l.includes('deepest per gun')));
      await writeFile(new URL('./'+name+'/chainsaw-hand.txt',import.meta.url),report+'\n');
    } finally {await browser.close();}
  }
} finally {await server.close();}
