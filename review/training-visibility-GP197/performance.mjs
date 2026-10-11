import fs from 'node:fs';
import { Engine } from '../../tools/camera.mjs';
const before=process.argv.includes('--before'),dir='review/training-visibility-GP197';
const E=new Engine({training:true,warm:'none',size:'1200x850'});
E.load=async function(){const goto=this.page.goto.bind(this.page);this.page.goto=(url,...args)=>goto(url.replace('/index.html?',`/${dir}/${before?'before':'index'}.html?`),...args);try{await Engine.prototype.load.call(this);}finally{this.page.goto=goto;}};
try{
  await E.open();
  await E.ev('R.release();const D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);T.player.position.set(-26,D.tg().floorY,-632);T.rotateCamera(-Math.PI/2);await wait(1500);return true;');
  const result=await E.ev('const samples=[];for(let i=0;i<120;i++)await new Promise(resolve=>requestAnimationFrame(t=>{samples.push(t);resolve();}));const seconds=(samples.at(-1)-samples[0])/1000;return {fps:119/seconds,seconds,loadSeconds:'+E.loadSec+',drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles,errors:document.getElementById("errorCard").textContent};');
  result.pageErrors=E.page.errors;
  fs.writeFileSync(`${dir}/${before?'before':'after'}-performance.json`,JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
}finally{await E.close();}
process.exit(0);
