import {text} from './strings.js';
import {recordingFrame,RECORDING_SECONDS,RECORDING_KINDS} from './story-aftermath.js';

const cameraFrames=Object.fromEntries(['camp','lake','mine'].map(id=>[id,new URL(`./assets/story/${id}.jpg`,import.meta.url).href]));
export function buildRecoveredCamera(T) {
 const group=new T.Group();group.name='hikers-recovered-camera';
 const body=new T.MeshStandardMaterial({color:0x333b37,roughness:.88});
 const metal=new T.MeshStandardMaterial({color:0x777b71,roughness:.65,metalness:.3});
 const glass=new T.MeshStandardMaterial({color:0x18282b,roughness:.3});
 const box=(w,h,d,x,y,z,mat)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);group.add(m);return m;};
 box(.22,.14,.085,0,.11,0,body);box(.05,.024,.04,.065,.192,0,metal);
 box(.12,.074,.006,-.018,.12,-.046,glass);
 const lens=new T.Mesh(new T.CylinderGeometry(.044,.044,.05,12),metal);lens.rotation.x=Math.PI/2;lens.position.set(-.027,.115,.06);group.add(lens);
 const optic=new T.Mesh(new T.CylinderGeometry(.032,.032,.008,12),glass);optic.rotation.x=Math.PI/2;optic.position.set(-.027,.115,.089);group.add(optic);
 group.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});
 return group;
}
export function mountStoryPlayback({doc=document,onClose=()=>{},onFinish=()=>{},onSound=()=>{},isValid=()=>true}={}) {
 const dialog=doc.createElement('dialog');dialog.id='storyPlayback';dialog.className='story-playback';
 const plate=doc.createElement('header'),title=doc.createElement('h2'),clock=doc.createElement('span');
 title.id='storyPlaybackTitle';dialog.setAttribute('aria-labelledby',title.id);plate.append(title,clock);
 const screen=doc.createElement('div');screen.className='story-playback-screen';
 const image=doc.createElement('img');image.alt='';screen.append(image);
 const caption=doc.createElement('p');caption.className='story-playback-caption';caption.setAttribute('aria-live','polite');
 const footer=doc.createElement('footer'),replay=doc.createElement('button'),close=doc.createElement('button');
 replay.type=close.type='button';replay.textContent=text('story.recording.replay');close.textContent=text('story.recording.close');
 footer.append(replay,close);dialog.append(plate,screen,caption,footer);doc.body.append(dialog);
 let kind=null,frame=0,start=0,finished=false,lastCaption='',token=0;
 const images=new Map();let loading=null;
 function preload(){
  if(loading)return loading;
  loading=Promise.all(Object.entries(cameraFrames).map(([id,src])=>new Promise((resolve,reject)=>{
   const im=new doc.defaultView.Image();im.onload=()=>{images.set(id,im);resolve();};im.onerror=()=>reject(Error('Recording frame: '+id));im.src=src;
  }))).catch(error=>{loading=null;throw error;});return loading;
 }
 function paint(seconds){
  const state=recordingFrame(kind,seconds);if(!state)return;
  dialog.dataset.kind=kind;dialog.dataset.frame=state.frame;dialog.dataset.finished=String(state.finished);
  clock.textContent=String(Math.floor(state.at)).padStart(2,'0')+' / 08';
  const key=state.captionKey;if(lastCaption!==key){caption.textContent=text(key);lastCaption=key;}
  if(kind==='hiker-camera'){
   const src=cameraFrames[state.frame];if(image.getAttribute('src')!==src)image.src=src;
   image.hidden=false;screen.style.setProperty('--drift-x',(Math.sin(state.at*1.6)*.6).toFixed(2)+'%');
   screen.style.setProperty('--drift-y',(Math.sin(state.at*2.2)*.35).toFixed(2)+'%');
  }else image.hidden=true;
  if(state.finished&&!finished){finished=true;replay.disabled=false;onFinish(kind);}
 }
 function tick(now){if(!dialog.open||!kind)return;if(!isValid()){hide();return;}paint((now-start)/1000);if(!finished)frame=requestAnimationFrame(tick);}
 function play(){if(!kind)return;cancelAnimationFrame(frame);finished=false;replay.disabled=true;lastCaption='';start=performance.now();paint(0);onSound(kind);frame=requestAnimationFrame(tick);}
 function hide(notify=true){token++;cancelAnimationFrame(frame);const was=kind;kind=null;if(dialog.open)dialog.close();if(was&&notify)onClose(was);}
 // A lock requested just before opening can resolve after showModal. Release
 // that late lock too; the owner's close restores its prior view intent.
 const releasePointer=()=>{if(dialog.open&&doc.pointerLockElement)doc.exitPointerLock?.();};
 doc.addEventListener('pointerlockchange',releasePointer);
 close.addEventListener('click',()=>hide());replay.addEventListener('click',play);
 dialog.addEventListener('cancel',event=>{event.preventDefault();hide();});
 dialog.addEventListener('keydown',event=>{if((event.code==='KeyE'&&!event.repeat)||event.code==='Escape'){event.preventDefault();event.stopPropagation();hide();}});
 return {
  async open(next){
   if(!RECORDING_KINDS.includes(next)||dialog.open)return false;const request=++token;kind=next;
   title.textContent=text(next==='hiker-camera'?'story.recording.cameraTitle':'story.recording.radioTitle');
   caption.textContent=text('story.recording.loading');clock.textContent='00 / 08';image.hidden=true;screen.hidden=next==='convoy-radio';replay.disabled=true;dialog.showModal();releasePointer();close.focus();
   try{if(next==='hiker-camera')await preload();if(request!==token||!dialog.open)return false;play();return true;}
   catch(error){if(request===token){caption.textContent=text('story.recording.unavailable');replay.disabled=true;}console.warn(error);return false;}
  },
  close:()=>hide(),isOpen:()=>dialog.open,
  destroy(){hide(false);doc.removeEventListener('pointerlockchange',releasePointer);dialog.remove();}
 };
}
