// Production tab-renderer/CSS fixture; live shop economy and GPU are not exercised.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/Zero/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const server=await serve(process.cwd(),0);let browser;
try {
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const source=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('ui/hud-layout.css','utf8');
 let html=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,m=>m.includes('type="importmap"')?m:'');
 html=html.replace('</head>','<style>body{background:#14221b}body>*:not(#hud){display:none!important}#hud>*:not(#shop){display:none!important}</style></head>');
 const tabs=source.slice(source.indexOf('const SHOP_TABS ='),source.indexOf('const SHOP_HINT ='));
 const start=source.indexOf('      if (shopTabsEl) {',source.indexOf('    function renderShop()'));
 const render=source.slice(start,source.indexOf('      if (shopHintEl)',start));
 let after=false;await page.route('**/gp140-fixture',r=>r.fulfill({contentType:'text/html',body:html}));
 await page.route('**/ui/hud-layout.css',r=>r.fulfill({contentType:'text/css',body:after?css:css.split('/* GP-140:')[0]}));
 const dir='handoffs/2026-10-06-chatgpt-GP-140-integration-shots';fs.mkdirSync(dir,{recursive:true});
 for(const width of [1280,390])for(const mode of ['before','after']){
  after=mode==='after';await page.setViewportSize({width,height:800});await page.goto(server.origin+'/gp140-fixture');
  await page.evaluate(async({tabs,render})=>{
   const {text}=await import('/ui/strings.js');document.body.className='playing';document.getElementById('shop').classList.add('show');
   for(const el of document.querySelectorAll('#shop [data-dw-text]'))el.textContent=text(el.dataset.dwText,{interact:'E',pause:'Esc'});
   const boot=new Function('dwText',`${tabs}let shopTab='weapons';const shopTabsEl=document.getElementById('shopTabs'),shopListEl=document.getElementById('shopList'),AudioSys={kioskTab(){}};function renderShop(){${render}}renderShop();`);boot(text);
  },{tabs,render});
  for(const category of ['weapons','build','ammo','gear']){
   await page.locator(`#shopTabs [data-shop-page="${category}"]`).click();
   await page.screenshot({path:`${dir}/${mode}-${category}-${width}.png`});
   const state=await page.evaluate(()=>{
    const nodes=[...document.querySelectorAll('#shopTabs button,#shopSubtabs button')];
    return {bounds:nodes.map(b=>{const r=b.getBoundingClientRect();return {right:r.right,y:r.y};}),colours:nodes.map(b=>getComputedStyle(b).backgroundColor),overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert(!state.overflow);assert(state.bounds.every(b=>b.right<=width));assert(state.bounds.slice(0,4).every(b=>b.y===state.bounds[0].y));
   if(category==='weapons')assert.equal(await page.locator('#shopSubtabs button').first().innerText(),'GUNS');
   if(['weapons','build'].includes(category)){
    assert.equal(await page.locator('#shopSubtabs button').count(),2);
    if(after)assert.equal(new Set(state.colours.slice(4)).size,2,'children visibly differ');
    await page.locator('#shopSubtabs button').last().click();
    assert.equal(await page.locator('#shopSubtabs button').last().getAttribute('aria-pressed'),'true');
   }else assert.equal(await page.locator('#shopSubtabs').isVisible(),false);
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS 1280/390 all four categories, both pairs of child tabs, selected state and no overflow; page errors 0. Guns child label verified.');
}finally{await browser?.close();await server.close();}
