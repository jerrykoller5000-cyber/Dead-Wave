// GP-26 targeted headless runner. Does not replace or claim the shared npm suite.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
if(process.argv.includes('--supply')){
 const {chromium}=createRequire(import.meta.url)('playwright');
 const src=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script type="importmap">[\s\S]*?<\/script>/,
   ()=>'<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>');
 const server=await serve(root,0);let browser,timer;
 try{
   browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
   const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));
   await page.goto(server.origin+'/index.html?debug=1&raf=timer');
   await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});
   await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
   const code=fs.readFileSync(path.join(root,'tools/tests/t35.js'),'utf8');
   const result=await Promise.race([page.evaluate(code),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('t35 exceeded 180 seconds')),180000);})]);
   console.log(result);
   assert(!/^FAIL/m.test(result),'t35 must have no failures');assert.equal(result.split('\n').filter(l=>l.startsWith('PASS')).length,28,'all 28 supply assertions retained');
   assert.deepEqual(errors,[]);console.log('PASS GP-26 t35: 28/0; real production state, renderer stand-in.');
 }finally{clearTimeout(timer);if(browser)await browser.close();server.close();}
}else{
 const jobsArg=process.argv.indexOf('--jobs'),jobs=jobsArg<0?1:Number(process.argv[jobsArg+1]);
 assert([1,3].includes(jobs),'use --jobs 1 or --jobs 3');
 const queue=[['ui/hud-phase1.browser.mjs','--edges','--ember'],['ui/objectives-live.browser.mjs'],['ui/timing.browser.mjs','--supply']],results=[];
 const run=args=>new Promise(resolve=>{
   const child=spawn(process.execPath,args,{cwd:root,env:process.env,stdio:['ignore','pipe','pipe']});
   let output='';child.stdout.on('data',v=>output+=v);child.stderr.on('data',v=>output+=v);
   child.on('error',error=>{results.push(false);console.error(error);resolve();});
   child.on('exit',code=>{results.push(code===0);console.log(args.join(' ')+' => '+(code===0?'PASS':'FAIL')+'\n'+output);resolve();});
 });
 await Promise.all(Array.from({length:jobs},async()=>{while(queue.length)await run(queue.shift());}));
 assert(results.every(Boolean),'targeted browser checks failed');
 console.log(`PASS GP-26 targeted runner: ${results.length} checks with --jobs ${jobs}. Shared npm test is separate.`);
}
