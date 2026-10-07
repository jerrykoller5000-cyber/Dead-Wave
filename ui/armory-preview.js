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
  let kind=null,yaw=0,pitch=0,active=false,disposed=false,revision=0,frame=0,busy=false,dirty=false,drag=null;
  function schedule() {
    if(!active||disposed||!kind)return;
    dirty=true;revision++;
    if(!busy&&!frame)frame=host.requestAnimationFrame(draw);
  }
  async function draw() {
    frame=0;if(!active||disposed||!dirty)return;
    dirty=false;busy=true;const request=revision,gun=kind,view={yaw,pitch};
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
  stage.addEventListener('pointerdown',e=>{
    if(!active||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};
    stage.setPointerCapture(e.pointerId);stage.focus({preventScroll:true});e.preventDefault();
  });
  stage.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    turn((e.clientX-drag.x)*.012,(e.clientY-drag.y)*.008);drag.x=e.clientX;drag.y=e.clientY;
  });
  function release(e){if(drag?.id===e.pointerId){drag=null;if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);}}
  stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);stage.addEventListener('lostpointercapture',()=>{drag=null;});
  stage.addEventListener('keydown',e=>{
    const moves={ArrowLeft:[-.2,0],ArrowRight:[.2,0],ArrowUp:[0,-.15],ArrowDown:[0,.15]};
    if(e.key==='Home')front();else if(moves[e.key])turn(...moves[e.key]);else return;
    e.preventDefault();e.stopPropagation();
  });
  buttons[0].addEventListener('click',()=>turn(-.3));buttons[1].addEventListener('click',front);buttons[2].addEventListener('click',()=>turn(.3));
  return {
    element,
    show(next,label) {
      if(disposed)return;
      if(kind!==next){kind=next;yaw=0;pitch=0;picture.hidden=true;picture.removeAttribute('src');}
      active=true;stage.dataset.ready='false';stage.setAttribute('aria-label',label);stage.setAttribute('role','group');
      for(const b of buttons)b.disabled=true;schedule();
    },
    hide(){active=false;stage.dataset.ready='false';dirty=false;revision++;drag=null;if(frame)host.cancelAnimationFrame(frame);frame=0;},
    dispose(){this.hide();disposed=true;element.remove();}
  };
}
