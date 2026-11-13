import test from 'node:test';
import assert from 'node:assert/strict';
import {createArmoryPreview} from '../../ui/armory-preview.js';
function fixture(){
 const frames=new Map(),pending=[];let id=0;
 const host={requestAnimationFrame:f=>(frames.set(++id,f),id),cancelAnimationFrame:i=>frames.delete(i)};
 const doc={defaultView:host,createElement(){const handlers={};return {children:[],dataset:{},hidden:false,append(...a){this.children.push(...a)},addEventListener(k,f){handlers[k]=f},fire(k,e){handlers[k]?.({preventDefault(){},stopPropagation(){},...e})},setAttribute(){},removeAttribute(k){delete this[k]},setPointerCapture(){},hasPointerCapture(){return false},focus(){},remove(){}}}};
 const preview=createArmoryPreview({doc,render:(gun,view)=>new Promise(resolve=>pending.push({gun,view,resolve})),labels:{hint:'Turn',left:'Left',front:'Front',right:'Right',unavailable:'Unavailable'}});
 const stage=preview.element.children[0],image=stage.children[0];
 const step=()=>{const a=[...frames.values()];frames.clear();for(const f of a)f(16);};
 const flush=async()=>{await Promise.resolve();await Promise.resolve();};
 return {preview,stage,image,pending,step,flush};
}
test('continuous pointer input presents completed angles while coalescing the next render',async()=>{
 const f=fixture();f.preview.show('m4','GW-4');f.step();
 f.stage.fire('pointerdown',{pointerType:'mouse',button:0,pointerId:1,clientX:0,clientY:0});
 f.stage.fire('pointermove',{pointerId:1,clientX:30,clientY:0});
 f.pending[0].resolve('angle-0');await f.flush();
 assert.equal(f.image.src,'angle-0','a completed frame must show during continuing drag');
 f.step();assert.equal(f.pending.length,2);assert(f.pending[1].view.yaw>0);
 f.stage.fire('pointermove',{pointerId:1,clientX:60,clientY:0});
 f.pending[1].resolve('angle-1');await f.flush();assert.equal(f.image.src,'angle-1');
 f.preview.dispose();
});
test('a completed old gun or old appearance cannot replace the current preview',async()=>{
 const f=fixture();f.preview.show('m4','GW-4');f.step();f.preview.show('uzi','Wasp');
 f.pending[0].resolve('old-gun');await f.flush();assert.notEqual(f.image.src,'old-gun');
 f.step();f.pending[1].resolve('current-gun');await f.flush();assert.equal(f.image.src,'current-gun');
 f.preview.show('uzi','Wasp repainted');f.step();f.preview.show('uzi','Wasp refitted');
 f.pending[2].resolve('old-appearance');await f.flush();assert.notEqual(f.image.src,'old-appearance');
 f.preview.hide();f.step();assert.notEqual(f.image.src,'old-appearance');
});
