// Disposable audit instrumentation: record who changes the normal source's
// visibility when a carry copy unexpectedly contains zero rendered geometry.
export function observe(T) {
  const trace=window.visibilityTrace={initial:{},events:[]};
  const watched=new WeakSet();
  for(const id of ['m4','ak','aa12']){
    const root=T.weaponMeshes[id], meshes=[],all=[];
    root.traverse(o=>{
      if(!o.isMesh || !o.geometry?.attributes?.position)return;
      let n=o;while(n!==root && n.visible)n=n.parent;
      all.push(o);if(n===root)meshes.push(o);
    });
    const watch=meshes.length?meshes:all;
    watch.sort((a,b)=>b.geometry.attributes.position.count-a.geometry.attributes.position.count);
    trace.initial[id]={relativeVisible:meshes.length,rootVisible:root.visible,watched:watch.slice(0,3).map(o=>o.name)};
    for(const mesh of watch.slice(0,3)){
      let node=mesh;
      while(node!==root){
        const target=node;node=node.parent;
        if(watched.has(target))continue;
        watched.add(target);
        const name=target.name || target.type,vertices=target.geometry?.attributes?.position?.count||0;
        let value=target.visible;
        Object.defineProperty(target,'visible',{configurable:true,enumerable:true,get(){return value;},set(next){
          if(value!==next){
            trace.events.push({id,name,vertices,next,ms:Math.round(performance.now()),progress:window.weaponSeatProgress,
              active:T.trainingDbg.state().active,blackout:document.getElementById('trainingBlackout')?.classList.contains('on'),
              stack:new Error().stack.split('\n').slice(2,8).map(line=>line.replace(/\?[^\s)]*?(?=:\d+:\d+)/g,''))});
            if(trace.events.length>800)trace.events.shift();
          }
          value=next;
        }});
      }
    }
  }
}
