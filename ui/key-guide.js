import {text} from './strings.js';
export const KEY_GUIDE_STORAGE_KEY='dw.keyGuide.v1';
export const KEY_GUIDES=Object.freeze(['map','movement','weapons','support','gear','build','mortar','camera','menus']);
// Extra lessons only after the core loop is learned, during a quiet prep. The
// urgent coach owns the same slot and always wins; no extra timers or HUD box.
export function createKeyGuide({load=()=>null,save=()=>{}}={}) {
  const seen=new Set();try{const stored=JSON.parse(load());if(stored?.version===1&&Array.isArray(stored.seen))for(const id of stored.seen)if(KEY_GUIDES.includes(id))seen.add(id);}catch{}
  let runId=null,ready=false,card=null,remaining=0,gap=30,visible=false;
  const persist=()=>{try{save(JSON.stringify({version:1,seen:[...seen]}));}catch{}};
  const read=()=>visible&&card?{id:'keyGuide.'+card,title:text('guide.'+card+'.title'),body:text('guide.'+card+'.body')}:null;
  return {
    handle(event={}) {
      if(event.type==='run-reset'){runId=event.runId;ready=false;card=null;remaining=0;gap=30;visible=false;return;}
      if(event.runId!=null&&runId!=null&&event.runId!==runId)return;
      if(event.type==='controls-ready')ready=true;
    },
    tick(frame={}) {
      visible=ready&&frame.active===true&&frame.learnedLoop===true&&frame.day>=2&&frame.phase==='prep'&&!frame.building&&!frame.priority&&frame.skulls===0&&!frame.pendingDeposit;
      if(!visible)return null;
      const dt=Number.isFinite(frame.dt)&&frame.dt>0?Math.min(1,frame.dt):0;
      if(!card){gap=Math.max(0,gap-dt);if(gap>0)return null;card=KEY_GUIDES.find(id=>!seen.has(id));if(!card)return null;seen.add(card);remaining=8;persist();}
      const view=read();remaining-=dt;if(remaining<=0){card=null;gap=30;}
      return view;
    },read,
    seen:()=>[...seen]
  };
}
