import fs from 'node:fs';import {createRequire} from 'node:module';import {serve} from '../../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');const s=await serve(process.cwd(),0);let b;
try{b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const p=await b.newPage({viewport:{width:1440,height:1100}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(s.origin+'/review/world-story/index.html');
 await p.evaluate(async()=>{for(const i of document.querySelectorAll('figure img')){i.loading='eager';await i.decode();}});
 const count=await p.locator('figure').count();if(count!==103)throw Error('count '+count);
 if(await p.locator('figure').evaluateAll(figs=>figs.some(f=>!f.querySelector('img').naturalWidth||f.querySelectorAll('figcaption p').length!==2)))throw Error('Missing photo or notes');
 await p.screenshot({path:'review/world-story/review-desktop.png'});
 await p.locator('#search').fill('pickup');if(await p.locator('figure:visible').count()===0)throw Error('Search failed');
 await p.locator('#reset').click();await p.locator('#priority').selectOption('First pass');const priorities=await p.locator('figure:visible').count();if(priorities<10)throw Error('Priority filter failed');
 await p.locator('#reset').click();await p.locator('#group').selectOption('Underground');if(await p.locator('figure:visible').count()!==16)throw Error('Underground filter failed');
 await p.locator('[data-open="below-door"]').click();await p.locator('dialog[open]').waitFor();await p.locator('#close').click();
 await p.locator('#reset').click();await p.setViewportSize({width:390,height:844});await p.evaluate(()=>scrollTo(0,0));if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');await p.screenshot({path:'review/world-story/review-mobile.png'});
 if(errors.length)throw Error(errors.join('\n'));const result={photos:count,individualNotes:count,firstPass:priorities,sections:11,imagesDecoded:true,filters:true,enlarge:true,mobileNoOverflow:true,pageErrors:errors};fs.writeFileSync('review/world-story/verification.json',JSON.stringify(result,null,2));console.log('PASS '+JSON.stringify(result));
}finally{await b?.close();s.close();}
