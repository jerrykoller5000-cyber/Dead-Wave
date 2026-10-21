import fs from 'node:fs';
import path from 'node:path';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
const dir='review/training-cutaway-GP19851',baseline=process.argv.includes('--before');
const src=fs.readFileSync(baseline?`${dir}/before.html`:'index.html','utf8');
const fake=src.replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>').replace('<head>','<head><base href="/">');
const pageFile=`${dir}/${baseline?'before':'after'}-fake.html`;fs.writeFileSync(pageFile,fake);
const server=await serve(path.resolve('.'),0),browser=await launch({headless:true});
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/${pageFile}?debug=1&raf=timer`,{timeout:120000});
  if(!await page.waitFor('!!window.TT',{timeout:120000}))throw Error(page.errors[0]||'no TT');
  await page.evaluate("(() => { if(window.DWOpening?.dismissForTesting)DWOpening.dismissForTesting();return true;})()");
  await page.waitFor('!window.DWOpening || window.DWOpening.active===false',{timeout:30000});
  await page.evaluate(fs.readFileSync('tools/tests/lib.js','utf8'));
  // Keep the test and its condition intact; only add the observed values to its label.
  const test=fs.readFileSync('tools/tests/t219.js','utf8').replace("'the light is what it was, the strips lit again'","'the light is what it was, the strips lit again '+JSON.stringify({sun:T.sun.intensity,sunLit,glow:strips.emissiveIntensity,color:strips.color.getHexString()})");
  const out=await page.evaluate(test,180000);fs.writeFileSync(`${dir}/${baseline?'before':'after'}-t219.txt`,out);
  console.log(out.split('\n').filter(l=>l.startsWith('FAIL')||l.includes('the light is what it was')).join('\n'));
  console.log(JSON.stringify({before:baseline,pass:out.split('\n').filter(l=>l.startsWith('PASS')).length,fail:out.split('\n').filter(l=>l.startsWith('FAIL')).length,errors:page.errors}));
}finally{await browser.close();await server.close();}
process.exit(0);
