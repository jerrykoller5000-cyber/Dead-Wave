// GP-19968: canonical identity and canvas copy. Physical props stay with their owner.
import {text} from './strings.js';

export const HIKERS=Object.freeze([
 ['maya-costa',27],['theo-marsh',31],['sam-marsh',22],
 ['priya-raman',24],['jonas-weber',29],['ellis-byrne',34]
].map(([id,age])=>Object.freeze({id,age,portrait:new URL(`./assets/hikers/${id}.jpg`,import.meta.url).href})));

export function hikerById(id) {
 const h=HIKERS.find(h=>h.id===id);
 return h?{...h,name:text(`hikers.${id}.name`),line:text(`hikers.${id}.line`)}:null;
}

// Each image is requested once, independent of the number of world surfaces using it.
const loads=new WeakMap();
export function loadHikerPortraits(ImageCtor=globalThis.Image) {
 if(typeof ImageCtor!=='function')return Promise.reject(new TypeError('A browser Image constructor is required'));
 if(loads.has(ImageCtor))return loads.get(ImageCtor);
 const promise=Promise.all(HIKERS.map(h=>new Promise((resolve,reject)=>{
  const img=new ImageCtor();
  img.onload=()=>resolve([h.id,img]);
  img.onerror=()=>reject(new Error(`Hiker portrait did not load: ${h.id}`));
  img.src=h.portrait;
 }))).then(entries=>new Map(entries)).catch(error=>{loads.delete(ImageCtor);throw error;});
 loads.set(ImageCtor,promise);return promise;
}

export function drawHikerPortrait(ctx,id,box,portraits) {
 if(!hikerById(id))return false;
 const image=portraits?.get(id);if(!image)return false;
 const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
 if(!(iw>0&&ih>0))return false;
 const {x=0,y=0,w,h}=box,scale=Math.min(w/iw,h/ih);
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
 ctx.fillStyle='#d4cfbf';ctx.fillRect(x,y,w,h);
 ctx.drawImage(image,x+(w-iw*scale)/2,y+(h-ih*scale)/2,iw*scale,ih*scale);
 ctx.restore();return true;
}

function wrap(ctx,value,x,y,width,lineHeight) {
 let line='';for(const word of value.split(/\s+/)){
  const next=line?line+' '+word:word;
  if(line&&ctx.measureText(next).width>width){ctx.fillText(line,x,y);y+=lineHeight;line=word;}else line=next;
 }
 if(line)ctx.fillText(line,x,y);return y+lineHeight;
}

// Paper and ink only. All text is from strings.js; the images carry no baked-in words.
export function drawHikerPoster(ctx,id,{x=0,y=0,w=384,h=512,noteKey=null}={},portraits) {
 const person=hikerById(id);if(!person)return false;
 ctx.save();ctx.translate(x,y);ctx.scale(w/384,h/512);
 ctx.fillStyle='#e8dfc5';ctx.fillRect(0,0,384,512);
 ctx.strokeStyle='#9d9075';ctx.lineWidth=2;ctx.strokeRect(7,7,370,498);
 ctx.fillStyle='#753d31';ctx.fillRect(18,17,348,43);
 ctx.fillStyle='#f2ead6';ctx.textAlign='center';ctx.textBaseline='alphabetic';
 ctx.font='bold 32px Arial, sans-serif';ctx.fillText(text('hikers.poster.title'),192,49);
 const portrait=noteKey?{x:80,y:74,w:224,h:224}:{x:72,y:74,w:240,h:240};
 ctx.fillStyle='#b5ad9a';ctx.fillRect(portrait.x,portrait.y,portrait.w,portrait.h);
 drawHikerPortrait(ctx,id,portrait,portraits);
 ctx.strokeStyle='#7c735e';ctx.strokeRect(portrait.x,portrait.y,portrait.w,portrait.h);
 ctx.fillStyle='#252820';ctx.font='bold 25px Arial, sans-serif';ctx.fillText(person.name.toUpperCase(),192,noteKey?328:344);
 ctx.font='bold 17px Arial, sans-serif';ctx.fillText(text('hikers.poster.age',{age:person.age}),192,noteKey?349:368);
 if(noteKey){
  ctx.save();ctx.translate(26,375);ctx.rotate(-.018);ctx.textAlign='left';ctx.fillStyle='#49483f';
  ctx.font='italic 17px "Segoe Print", Georgia, serif';ctx.fillText(text(noteKey),0,0);ctx.restore();
 }
 ctx.textAlign='left';ctx.font='17px Arial, sans-serif';
 wrap(ctx,person.line,26,noteKey?407:396,332,22);
 ctx.strokeStyle='#a99b7d';ctx.beginPath();ctx.moveTo(26,474);ctx.lineTo(358,474);ctx.stroke();
 ctx.font='12px Arial, sans-serif';wrap(ctx,text('hikers.poster.contact'),26,491,332,15);
 ctx.restore();return true;
}

// A contact sheet for the rangers' search board and a copy left with the camp's kit.
export function drawHikerRoster(ctx,{x=0,y=0,w=1152,h=1120}={},portraits) {
 ctx.save();ctx.translate(x,y);ctx.scale(w/1152,h/1120);
 ctx.fillStyle='#d1c6a9';ctx.fillRect(0,0,1152,1120);
 ctx.fillStyle='#272b22';ctx.textAlign='left';ctx.font='bold 34px Arial, sans-serif';
 ctx.fillText(text('hikers.roster.title'),24,42);ctx.font='20px Arial, sans-serif';
 ctx.fillText(text('hikers.roster.subtitle'),24,72);
 HIKERS.forEach((h,i)=>drawHikerPoster(ctx,h.id,{x:12+(i%3)*380,y:90+Math.floor(i/3)*510,w:368,h:500},portraits));
 ctx.restore();return true;
}

// AG-125's existing planes: repaint their existing canvases, no geometry or placement change.
export async function paintHikerPosters(posters,{ImageCtor=globalThis.Image,notes={}}={}) {
 const portraits=await loadHikerPortraits(ImageCtor);let count=0;
 for(const poster of posters||[]){
  const d=poster?.userData,cv=d?.canvas,id=d?.hiker?.id;
  if(!cv||!hikerById(id))continue;
  // Keep the owner's allocation: resizing a CanvasTexture after its WebGPU upload
  // leaves the old GPU allocation unable to accept the larger copy.
  const ctx=cv.getContext('2d');if(!ctx)continue;
  if(drawHikerPoster(ctx,id,{w:cv.width,h:cv.height,noteKey:notes[id]||null},portraits)){
   if(d.tex)d.tex.needsUpdate=true;count++;
  }
 }
 return count;
}
