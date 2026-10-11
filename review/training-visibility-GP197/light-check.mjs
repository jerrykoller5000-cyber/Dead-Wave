import fs from 'node:fs';
import { Engine } from '../../tools/camera.mjs';
const fake=process.argv.includes('--fake');
const E=new Engine({warm:'none',size:'1200x850',soft:fake});
if(fake){
  let html=fs.readFileSync('index.html','utf8');
  html=html.replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>');
  html=html.replace('<head>','<head><base href="/">');
  fs.writeFileSync('review/training-visibility-GP197/light-fake.html',html);
  E.load=async function(){const goto=this.page.goto.bind(this.page);this.page.goto=(url,...args)=>goto(url.replace('/index.html?','/review/training-visibility-GP197/light-fake.html?'),...args);try{await Engine.prototype.load.call(this);}finally{this.page.goto=goto;}};
}
try {
  await E.open();
  const src=fs.readFileSync('tools/tests/t219.js','utf8').replace("'the light is what it was, the strips lit again'", "'the light is what it was, the strips lit again '+JSON.stringify({sun:T.sun.intensity,sunLit,glow:strips.emissiveIntensity,color:strips.color.getHexString(),buildGlow:tg.buildLamp.emissiveIntensity,buildColor:tg.buildLamp.color.getHexString()})");
  const result=await E.page.evaluate(src,120000);
  fs.writeFileSync('review/training-visibility-GP197/light-'+(fake?'fake':'live')+'-diagnostic.txt',result);
  console.log(result);
}finally{await E.close();}
process.exit(0);
