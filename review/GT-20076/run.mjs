import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';

assert(process.env.DW_GAME_TEST_TOKEN,'Use crew slot run');
const root=fileURLToPath(new URL('../../',import.meta.url));
const phase=process.argv[2];
assert(['before','after','resumed','catalog-nov11','catalog-chain-skin','catalog-visibility','catalog-panels'].includes(phase) || /^catalog-fix-[a-z0-9-]+$/.test(phase));
const out=path.join(root,'review/GT-20076',phase);
await fs.mkdir(out,{recursive:true});
const server=await serve(root,0);
const browser=await launch({headless:false});
try {
  const p=await browser.newPage({width:960,height:540});
  await p.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await p.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await p.evaluate('window.DWOpening?.dismissForTesting?.()');
  await p.evaluate('window.captureWeaponSources=true');
  const code=await fs.readFile(path.join(root,'tools/tests/tgt20076.js'),'utf8');
  const lines=await p.evaluate(code,480000);
  const data=await p.evaluate('window.weaponSeatAudit');
  const slings=await p.evaluate('window.weaponSlingAudit');
  await fs.writeFile(path.join(out,'slings.json'),JSON.stringify(slings,null,2)+'\n');
  await fs.writeFile(path.join(out,'audit.json'),JSON.stringify(data,null,2)+'\n');
  await fs.writeFile(path.join(out,'audit.txt'),lines+'\n');
  console.log(lines.split('\n').filter(l=>!l.startsWith('INFO')).join('\n'));
  await fs.writeFile(path.join(out,'renderer-errors.json'),JSON.stringify(p.errors,null,2)+'\n');
  assert.deepEqual(p.errors,[]);
  if(/^FAIL/m.test(lines)) process.exitCode=1;
} finally {await browser.close(); await server.close();}
