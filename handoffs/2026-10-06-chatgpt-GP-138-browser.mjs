// Production DOM/CSS fixture. No game renderer or GPU-performance claim.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/Zero/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const server=await serve(process.cwd(),0); let browser;
try {
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage(),errors=[]; page.on('pageerror',e=>errors.push(e.message));
 let html=fs.readFileSync('index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,m=>m.includes('type="importmap"')?m:'');
 html=html.replace('</head>','<style>body{background:#14221b}body>*:not(#hud){display:none!important}#hud>*:not(#cif){display:none!important}</style></head>');
 const css=fs.readFileSync('ui/cif.css','utf8'); let after=false;
 await page.route('**/gp138-fixture',r=>r.fulfill({contentType:'text/html',body:html}));
 await page.route('**/ui/cif.css',r=>r.fulfill({contentType:'text/css',body:after?css:css.split('/* GP-138:')[0]}));
 const dir='handoffs/2026-10-06-chatgpt-GP-138-shots'; fs.mkdirSync(dir,{recursive:true});
 for (const width of [1280,390]) for (const mode of ['before-style','after']) {
  after=mode==='after'; await page.setViewportSize({width,height:800}); await page.goto(server.origin+'/gp138-fixture');
  await page.evaluate(async()=>{
   const {text}=await import('/ui/strings.js'),{createCifMenu}=await import('/ui/cif.js');
   const root=document.getElementById('cif'); document.body.className='playing';root.classList.add('show');
   for(const node of root.querySelectorAll('[data-dw-text]'))node.textContent=text(node.dataset.dwText,{interact:'E',pause:'Esc'});
   document.getElementById('cifTabs').innerHTML='<button>Gravewalker</button><button class="on">Equipment</button><button>Clothing</button>';
   const items=document.getElementById('cifItems');
   for(const id of ['helmet','carrier','pads','boots']){const b=document.createElement('button');b.dataset.cifItem=id;b.textContent=text('cif.item.'+id);items.append(b);}
   window.fixtureGear={vest:true};window.fixtureItem='helmet';
   const menu=createCifMenu({root,text,freeCamos:['m81','coyoteBrown','marpat','oliveDrab'],getGear:()=>window.fixtureGear});
   window.fixtureRender=(item=window.fixtureItem)=>{
    window.fixtureItem=item;menu.prepare();const list=document.getElementById('cifList');list.replaceChildren();
    for(const key of ['m81','coyoteBrown','marpat','oliveDrab','dcu']){
     const b=document.createElement('button');b.dataset.camo=key;b.disabled=key==='dcu';b.className=key==='m81'?'on':'';
     const swatch=document.createElement('canvas');swatch.width=100;swatch.height=52;const ctx=swatch.getContext('2d');ctx.fillStyle=({m81:'#54633c',coyoteBrown:'#836b4b',marpat:'#4c533b',oliveDrab:'#646542',dcu:'#998466'})[key];ctx.fillRect(0,0,100,52);
     const name=document.createElement('span');name.textContent=text('cif.pattern.'+key);b.append(swatch,name,document.createElement('b'));list.append(b);
    }
    for(const b of items.children)b.classList.toggle('on',b.dataset.cifItem===item);
    menu.refresh({tab:'kit',item,current:'m81'});
   };
   for(const b of items.children)b.onclick=()=>window.fixtureRender(b.dataset.cifItem);
   window.fixtureRender();
   // Explicit placeholder: figure rendering belongs to CL-125, not this fixture.
   const canvas=document.getElementById('cifMarine'),ctx=canvas.getContext('2d');ctx.fillStyle='#bcc6ac';ctx.textAlign='center';ctx.font='14px sans-serif';ctx.fillText('Figure preview',120,160);ctx.fillText('verified separately',120,181);
  });
  await page.screenshot({path:dir+'/'+mode+'-'+width+'.png'});
  assert.equal(await page.locator('[data-camo="dcu"]').isVisible(),false);
  assert.equal(await page.locator('[data-cif-item="helmet"]').isVisible(),false);
  assert.equal(await page.locator('[data-cif-item="pads"]').isVisible(),false);
  assert.equal(await page.evaluate(()=>window.fixtureItem),'carrier','unavailable selected item falls back through owner handler');
  assert.equal(await page.locator('#cifFilters').innerText(),'Available · 4');
  const bounds=await page.locator('#cifClose').boundingBox();assert(bounds.y+bounds.height<=800);assert(bounds.x+bounds.width<=width);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.evaluate(()=>{window.fixtureGear.helmet=true;window.fixtureRender();});
  assert.equal(await page.locator('[data-cif-item="helmet"]').isVisible(),true);
  await page.evaluate(()=>{window.fixtureGear={};window.fixtureRender();});
  assert.equal(await page.evaluate(()=>window.fixtureItem),'boots');
 }
 assert.deepEqual(errors,[]);console.log('PASS 1280/390 unlocked finishes, gear ownership updates, selection fallback, footer bounds, no horizontal overflow; page errors 0');
} finally {await browser?.close();await server.close();}
