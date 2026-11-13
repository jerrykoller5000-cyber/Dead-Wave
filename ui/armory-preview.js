// On-demand presentation only. The owner supplies a picture of the actual gun at each angle.
export function createArmoryPreview({doc=document, render, labels}) {
  const host=doc.defaultView, element=doc.createElement('div'); element.className='armory-preview';
  const stage=doc.createElement('div'); stage.className='armory-preview-stage'; stage.tabIndex=0;
  const picture=doc.createElement('img'); picture.alt='';picture.draggable=false;picture.hidden=true;stage.append(picture);
  const hint=doc.createElement('p');hint.className='armory-preview-hint';hint.textContent=labels.hint;
  const actions=doc.createElement('div');actions.className='armory-preview-actions';
  const buttons=[['left',labels.left],['front',labels.front],['right',labels.right]].map(([action,label])=>{
    const b=doc.createElement('button');b.type='button';b.dataset.turn=action;b.textContent=label;actions.append(b);return b;
  });
  element.append(stage,hint,actions);
  let kind=null,yaw=0,pitch=0,zoom=1,zoomTo=1,zoomFrame=0,zoomLast=0,active=false,disposed=false,revision=0,frame=0,busy=false,dirty=false,drag=null;
  const pointers=new Map();
  let pinch=null;
  const clampZoom=value=>Math.max(1,Math.min(2.5,value));
  function schedule() {
    if(!active||disposed||!kind)return;
    dirty=true;
    if(!busy&&!frame)frame=host.requestAnimationFrame(draw);
  }
  async function draw() {
    frame=0;if(!active||disposed||!dirty)return;
    dirty=false;busy=true;const request=revision,gun=kind,view={yaw,pitch,zoom};
    let url=null;try{url=await render(gun,view);}catch(_){/* A failed preview must not block the workbench. */}
    if(!disposed&&active&&request===revision){
      picture.hidden=!url;if(url)picture.src=url;
      hint.textContent=url?labels.hint:labels.unavailable;
      for(const b of buttons)b.disabled=!url;
      stage.dataset.ready=String(!!url);
    }
    busy=false;if(dirty&&active&&!disposed&&!frame)frame=host.requestAnimationFrame(draw);
  }
  function turn(dx,dy=0) {
    yaw=((yaw+dx)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
    pitch=Math.max(-Math.PI/3,Math.min(Math.PI/3,pitch+dy));schedule();
  }
  function front(){yaw=0;pitch=0;schedule();}
  function easeZoom(now) {
    zoomFrame=0;
    if(!active||disposed)return;
    const dt=zoomLast?Math.min(.1,(now-zoomLast)/1000):1/60;zoomLast=now;
    zoom+=(zoomTo-zoom)*(1-Math.exp(-13*dt));
    if(Math.abs(zoomTo-zoom)<.002)zoom=zoomTo;
    schedule();
    if(zoom!==zoomTo)zoomFrame=host.requestAnimationFrame(easeZoom);
    else zoomLast=0;
  }
  function setZoom(value) {
    zoomTo=clampZoom(value);
    if(!zoomFrame&&zoom!==zoomTo)zoomFrame=host.requestAnimationFrame(easeZoom);
  }
  function pinchDistance() {
    const [a,b]=[...pointers.values()];return Math.hypot(a.x-b.x,a.y-b.y);
  }
  stage.addEventListener('wheel',e=>{
    if(!active)return;
    e.preventDefault();
    setZoom(zoomTo*Math.exp(-e.deltaY*.0015));
  },{passive:false});
  stage.addEventListener('pointerdown',e=>{
    if(!active||e.pointerType!=='touch'&&e.button!==0)return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===1)drag={id:e.pointerId,x:e.clientX,y:e.clientY};
    else {drag=null;pinch={distance:Math.max(1,pinchDistance()),zoom:zoomTo};}
    stage.setPointerCapture(e.pointerId);stage.focus({preventScroll:true});e.preventDefault();
  });
  stage.addEventListener('pointermove',e=>{
    if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinch&&pointers.size>=2){setZoom(pinch.zoom*pinchDistance()/pinch.distance);return;}
    if(!drag||drag.id!==e.pointerId)return;
    turn((e.clientX-drag.x)*.012,(e.clientY-drag.y)*.008);drag.x=e.clientX;drag.y=e.clientY;
  });
  function release(e){
    pointers.delete(e.pointerId);if(drag?.id===e.pointerId)drag=null;
    if(pointers.size<2)pinch=null;
    if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
  }
  stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);stage.addEventListener('lostpointercapture',release);
  stage.addEventListener('keydown',e=>{
    const moves={ArrowLeft:[-.2,0],ArrowRight:[.2,0],ArrowUp:[0,-.15],ArrowDown:[0,.15]};
    if(e.key==='Home')front();else if(moves[e.key])turn(...moves[e.key]);
    else if(e.key==='+'||e.key==='=')setZoom(zoomTo*1.2);
    else if(e.key==='-'||e.key==='_')setZoom(zoomTo/1.2);
    else return;
    e.preventDefault();e.stopPropagation();
  });
  buttons[0].addEventListener('click',()=>turn(-.3));buttons[1].addEventListener('click',front);buttons[2].addEventListener('click',()=>turn(.3));
  return {
    element,
    show(next,label) {
      if(disposed)return;
      // A changed gun or fit invalidates pending artwork. Pointer angles do not:
      // present each completed angle while the next requested angle is rendering.
      revision++;
      if(kind!==next){kind=next;yaw=0;pitch=0;zoom=zoomTo=1;picture.hidden=true;picture.removeAttribute('src');}
      active=true;stage.dataset.ready='false';stage.setAttribute('aria-label',label);stage.setAttribute('role','group');
      for(const b of buttons)b.disabled=true;schedule();
    },
    hide(){active=false;stage.dataset.ready='false';dirty=false;revision++;drag=null;pinch=null;pointers.clear();if(frame)host.cancelAnimationFrame(frame);if(zoomFrame)host.cancelAnimationFrame(zoomFrame);frame=zoomFrame=0;zoomLast=0;},
    dispose(){this.hide();disposed=true;element.remove();}
  };
}
