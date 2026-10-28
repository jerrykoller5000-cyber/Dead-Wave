import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../../tools/camera.mjs';

const out=process.argv[2]||'handoffs/GP-19970/crt';
fs.mkdirSync(out,{recursive:true});
const e=new Engine({match:true,warm:'none',size:[1280,720]});
const states=[],shots=[];let watcher;
try{
 await Promise.race([e.open(),new Promise((resolve,reject)=>{watcher=setInterval(()=>{if(e.page?.errors?.length)reject(Error(e.page.errors[0]));},1000);})]);clearInterval(watcher);
 await e.page.evaluate(`(()=>{TT.runDevCommand('godmode');TT.clearZombies();TT.addCash(2000);const link=document.querySelector('link[href$="supply-terminal.css"]');if(link)link.disabled=true;return true;})()`);
 let integrated=false;
 for(const phase of ['before','after']){
  if(phase==='after')integrated=await e.page.evaluate(`(async()=>{
   let l=document.querySelector('link[href$="supply-terminal.css"]');const existed=!!l;
   if(!l){l=document.createElement('link');l.rel='stylesheet';l.href='/ui/supply-terminal.css';document.head.append(l);await new Promise((r,j)=>{l.onload=r;l.onerror=j;});}else l.disabled=false;
   return existed;
  })()`);
  for(const first of [false,true])for(const night of [false,true])for(const width of [1280,390]){
   await e.page.setViewport(width,width===390?844:720);
   await e.page.evaluate(`(async()=>{TT.closeShop();TT.setShotView(null);TT.setViewFirstDbg(${first});TT.setWorldTime(${night?.92:.5});await new Promise(r=>setTimeout(r,350));TT.openShop(true);})()`);
   for(const tab of ['supplies','loadout','builds']){
    const state=await e.page.evaluate(`(async()=>{
     TT.setShopTabDbg('${tab}');await new Promise(r=>setTimeout(r,250));
     const root=document.querySelector('#shop'),card=root.querySelector('.card'),b=card.getBoundingClientRect(),list=document.querySelector('#shopList');
     return {tab:'${tab}',first:TT.fpDbg().first,open:root.classList.contains('show'),pointer:!!document.pointerLockElement,
      bounds:{x:b.x,y:b.y,right:b.right,bottom:b.bottom},overflow:card.scrollWidth>card.clientWidth+1,
      cash:document.querySelector('#shopCash').textContent,
      controlsClickable:[...document.querySelectorAll('#shopTabs button,#shopClose')].every(b=>{const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===b||b.contains(hit);}),
      tabs:[...document.querySelectorAll('#shopTabs button')].map(x=>x.textContent),
      rows:[...list.querySelectorAll('.perk')].map(r=>({text:r.textContent,buttons:[...r.querySelectorAll('button')].map(b=>({text:b.textContent,disabled:b.disabled}))})),
      minimumText:Math.min(...[...card.querySelectorAll('button,.name,.desc,.shop-status,.hint')].filter(x=>x.getClientRects().length).map(x=>parseFloat(getComputedStyle(x).fontSize)))};
    })()`);
    const key=[first?'fp':'tp',night?'night':'day',width,tab].join('-');states.push({phase,key,...state});
    assert(state.open&&state.first===first,`${phase}/${key}: mode`);
    if(phase==='after'){
     assert(!state.overflow&&state.bounds.x>=0&&state.bounds.y>=0&&state.bounds.right<=width+1&&state.bounds.bottom<=(width===390?844:720)+1,`${phase}/${key}: clipped card`);
     const prior=states.find(s=>s.phase==='before'&&s.key===key);
     assert.deepEqual([state.cash,state.tabs,state.rows],[prior.cash,prior.tabs,prior.rows],`${key}: content/price/disabled state changed`);
     assert(state.minimumText>=11,`${key}: text below 11 px`);
     assert(!state.pointer,`${key}: pointer locked`);
     assert(state.controlsClickable,`${key}: terminal chrome covers a tab or the close control`);
    }
    const file=out+'/'+phase+'-'+key+'.png';await e.page.screenshot(file);shots.push(file);
   }
  }
 }
 const lookBefore=await e.page.evaluate('TT.otsDbg().yaw');
 for(const [x,y]of [[300,300],[330,310],[340,320]])await e.page.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
 const lookAfter=await e.page.evaluate('TT.otsDbg().yaw');
 assert.equal(lookAfter,lookBefore,'open shop must hold first-person look while moving the menu cursor');
 const close=await e.page.evaluate("(()=>{const r=document.querySelector('#shopClose').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
 for(const type of ['mousePressed','mouseReleased'])await e.page.send('Input.dispatchMouseEvent',{type,...close,button:'left',clickCount:1});
 await new Promise(r=>setTimeout(r,300));
 const resume=await e.page.evaluate("({open:document.querySelector('#shop').classList.contains('show'),first:TT.fpDbg().first,pointer:!!document.pointerLockElement})");
 assert(!resume.open&&resume.first&&resume.pointer,'real close click must close shop and restore first-person pointer lock');
 assert.deepEqual(e.page.errors,[]);
 fs.writeFileSync(out+'/report.json',JSON.stringify({renderer:e.renderer,integrated,states,shots,pointerInteraction:{lookBefore,lookAfter,resume},errors:e.page.errors},null,2));
 console.log(`PASS GP-19970 supply terminal: ${shots.length} native before/after shots, unchanged tabs/row copy/prices/button states, after text >=11 px, no clipping/locked pointer, zero page errors. Production stylesheet link: ${integrated}.`);
}catch(error){fs.writeFileSync(out+'/failure.json',JSON.stringify({error:String(error.stack||error),states,errors:e.page?.errors||[]},null,2));throw error;}
finally{clearInterval(watcher);await e.close();}
