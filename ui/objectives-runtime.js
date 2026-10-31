// GP-11: adapters use D-16 / D-17 / CL-15. No TT, world mutation or inventory writes.
import {createObjectives,OBJECTIVE_IDS} from '../game/objectives.js';
import {mountObjectives} from './objectives.js';
import {text} from './strings.js';
import {drawCacheRestock} from './cache-restock.js';
import {storySiteState} from './story-leads.js';
const RADIO='objective:radio-repair';
const fixed={
  'objective:medical-convoy':{id:'medpen',kind:'medpen',quantity:2},
  'objective:hikers-cache':{id:'medpen',kind:'medpen',quantity:1},
  'objective:trapper-cache':{id:'grenade',kind:'grenade',quantity:1}
};
function description(pack,amount=pack?.quantity) {
  if(pack?.kind==='blueprint')return {key:'shop.blueprint',params:{name:text('build.'+pack.id+'.name')}};
  if(!pack)return {key:'objectives.choosePack'};
  if(pack.kind==='medpen')return {key:'supply.medpens',params:{count:amount}};
  if(pack.kind==='grenade')return {key:'ammo.quantity.grenades',params:{count:amount}};
  if(pack.caliber==='chainsaw')return {key:'shop.ammo.fuelHelp',params:{seconds:Math.round(amount*100)/100}};
  const unit=pack.caliber==='Fuel'?'fuel':pack.caliber==='12ga'||pack.caliber==='60mm'?'shells':pack.caliber==='40mm'?'grenades':'rounds';
  return {key:'shop.ammo.pack',params:{quantity:Math.round(amount*100)/100,unit:text('ammo.unit.'+unit)}};
}
function choiceDescription(pack) {
  const keys={'.45':'45','5.56mm':'556','7.62mm':'762','.44':'44','.338':'338','7.62 belt':'belt762',Fuel:'fuel'};
  const calibre=pack.caliber==='chainsaw'?text('weapon.chainsaw.name'):text('calibre.'+(keys[pack.caliber]||pack.caliber));
  const d=description(pack);return {key:'objectives.packChoice',params:{calibre,pack:text(d.key,d.params)}};
}
export function mountObjectiveRuntime({runId,getProps,getInteraction,listChoices,grantSupply,grantBlueprint=()=>null,getRestockBlueprint=()=>null,getStory=()=>null,getPlayer,mapRoot,hudRoot,project,onComplete=()=>{},onRead=()=>{}}) {
  const model=createObjectives(runId),choices=new Map();
  let damageRevision=0,lastNear=null,disposed=false,frame=0,lastPoll=0,lastPaint='',lastSnapshot=model.snapshot();
  let pendingTrack=null,lastRadioDay=null,lastRadioPhase=null,lastRadioAlarm=null;
  let readRevision=-1,readSnapshot=null;
  function freezeRead(value) {
    if(value&&typeof value==='object'&&!Object.isFrozen(value)){
      for(const child of Object.values(value))freezeRead(child);
      Object.freeze(value);
    }
    return value;
  }
  function read() {
    const revision=model.revision();
    if(!readSnapshot||revision!==readRevision){readSnapshot=freezeRead(model.snapshot());readRevision=revision;}
    return readSnapshot;
  }
  const view=mountObjectives({mapRoot,hudRoot,project,onChoose:(id,choice)=>{choices.set(id,choice);lastPaint='';update();}});
  function idleFarFromObjectives(world,player) {
    if(!lastSnapshot?.player||pendingTrack||lastNear||view.tracked()||player.active!==lastSnapshot.player.active||player.caliber!==lastSnapshot.player.caliber)return false;
    for(const site of lastSnapshot.sites) {
      if(['claimed','unavailable'].includes(site.state)||site.storyClosed)continue;
      if(site.state==='active'||site.state==='ready-to-claim')return false;
      const prop=world.props[site.id];
      if(!prop||prop.exists===false)return false;
      const at=prop.pickup?.approach||prop.approach||prop.centre;
      if(!at||Math.hypot(player.x-at.x,player.z-at.z)<4)return false;
    }
    return true;
  }
  function options(id) {
    return listChoices().filter(p=>id==='objective:fuel-depot'||!['Fuel','chainsaw'].includes(p.caliber))
      .map(p=>({id:p.id,caliber:p.caliber,kind:['Fuel','chainsaw'].includes(p.caliber)?'fuel':'ammo',quantity:p.packQty}));
  }
  function update(pressed=false,fromPoll=false) {
    if(disposed)return;
    const world=getProps(),player=getPlayer();if(!world?.props)return;
    if(fromPoll&&!pressed&&idleFarFromObjectives(world,player))return;
    const story=getStory();
    const facts=OBJECTIVE_IDS.map(id=>({id,prop:world.props[id],interaction:getInteraction(id)}));
    const active=player.active===true&&!facts.some(f=>['modal','dead'].includes(f.interaction?.blockedBy));
    const current=lastSnapshot;
    const near=facts.filter(f=>f.prop?.exists&&f.interaction?.reachable&&!['claimed','unavailable'].includes(current.sites.find(s=>s.id===f.id).state))
      .sort((a,b)=>a.interaction.distance-b.interaction.distance)[0];
    const radio=facts.find(f=>f.id===RADIO).interaction;
    model.update({runId:current.runId,active,damageRevision,targetId:near?.id,
      held:!!radio?.eHeld&&radio.cancelled===null,holdSeconds:radio?.holdSeconds,
      sites:facts.map(f=>({id:f.id,exists:!!f.prop?.exists,
        discovered:active&&(f.interaction?.reachable===true||storySiteState(story,f.id)==='open'),reachable:!!f.interaction?.reachable}))});
    const choosePack=(site)=>{
      if(site.pack)return site.pack;
      if(fixed[site.id])return fixed[site.id];
      const opts=options(site.id),selected=opts.find(p=>p.id===choices.get(site.id))||opts.find(p=>p.caliber===player.caliber)||opts[0];
      if(selected)choices.set(site.id,selected.id);return selected;
    };
    // E edge is still checked against the owner's snapshot after the core listener.
    let settledId=null;
    if(active&&pressed&&near?.interaction.ePressed) {
      onRead(near.id);
      const site=current.sites.find(s=>s.id===near.id),pack=choosePack(site);
      const request=model.beginClaim({id:site.id,choiceId:pack?.id,choices:options(site.id)});
      if(request) {
        const receiptId=String(request.runId)+':'+request.receiptId;
        let result;
        if(request.pack.kind==='blueprint') {
          const granted=grantBlueprint(request.pack.id);
          if(granted?.granted||granted?.alreadyOwned)result={ok:true,accepted:[{qty:1}],remaining:[]};
        } else result=grantSupply({receiptId,source:'objective',items:[{id:request.pack.id==='medpen'?'medkit':request.pack.id,qty:request.quantity}]});
        if(result?.ok) {
          const accepted=result.accepted.reduce((n,item)=>n+item.qty,0),remaining=result.remaining.reduce((n,item)=>n+item.qty,0);
          if(model.settleClaim({...request,accepted,remaining}))settledId=site.id;
        }
      }
    }
    const state=model.snapshot();
    if(settledId&&state.sites.find(s=>s.id===settledId).state==='claimed')onComplete(settledId);
    const display={runId:state.runId,sequence:state.sequence,active,player,sites:state.sites.map(site=>{
      const prop=world.props[site.id],pack=choosePack(site),opts=site.pack?[site.pack]:options(site.id);
      if(prop){const next=world.stateFor(site.state,site.id,site.feedback==='partial');if(next&&prop.state!==next)prop.setState(next);}
      const at=prop?.pickup&&site.id===RADIO&&['ready-to-claim','claimed'].includes(site.state)?prop.pickup.centre:prop?.centre;   // CL-127: the radio's supplies wait in a locker apart
      const leadState=storySiteState(story,site.id);
      return {...site,storyClosed:leadState==='closed',navigable:leadState==='open'&&!!at,
        position:at?{x:at.x,z:at.z}:{x:0,z:0},progress:site.progress/6,
        reward:description(pack),remaining:site.remaining===null?null:description(pack,site.remaining),
        choices:fixed[site.id]||site.restockDay?[]:opts.map(p=>({id:p.id,reward:choiceDescription(p)})),choiceId:pack?.id,choiceLocked:!!site.pack};
    })};
    // Refresh labels at 10 Hz, while keeping input handling synchronous. Avoid DOM
    // rebuilding when only the sequence changed.
    const signature=JSON.stringify({...display,sequence:0});
    if(signature!==lastPaint){lastPaint=signature;view.update(display);}
    if(active&&pendingTrack&&view.track(pendingTrack))pendingTrack=null;
    if(active&&near&&lastNear!==near.id){view.track(near.id);lastNear=near.id;}
    if(!near)lastNear=null;
    lastSnapshot=display;
  }
  const onKey=e=>{if(e.code==='KeyE'&&!e.repeat)queueMicrotask(()=>update(true));};
  const onGame=({detail:d})=>{
    if(d?.type==='run-reset'){model.reset(d.runId);readSnapshot=null;lastSnapshot=model.snapshot();choices.clear();view.reset(d.runId);lastNear=null;lastPaint='';damageRevision=0;pendingTrack=null;lastRadioDay=lastRadioPhase=lastRadioAlarm=null;update();}
    else if(d?.type==='story-lead'&&d.runId===lastSnapshot.runId){
      if(d.phase==='open'&&d.site&&storySiteState(getStory(),d.site)==='open')pendingTrack=d.site;
      lastPaint='';update();
    }
    else if(d?.type==='prep-state'){
      if(d.runId!==lastSnapshot.runId)return;
      const alarm=d.alarm===true;
      if(d.day!==lastRadioDay||d.phase!==lastRadioPhase||alarm!==lastRadioAlarm){
        if(model.setRadioDay({...d,alarm})){lastRadioDay=d.day;lastRadioPhase=d.phase;lastRadioAlarm=alarm;}
      }
      if(d.phase==='prep'&&!alarm&&d.day>=2) {
        const snapshot=model.snapshot();
        if(d.day<=snapshot.restockDay)return;
        const ammo=options('objective:ranger-cache');
        const picks=drawCacheRestock(snapshot,ammo,getRestockBlueprint());
        if(model.restock(d.day,picks)){lastPaint='';update();}
      }
    }
    else if(d?.type==='alarm-started'){if(model.setRadioDay({...d,phase:'wave',alarm:true})){lastRadioDay=d.day;lastRadioPhase='wave';lastRadioAlarm=true;}}
    else if(d?.type==='player-damaged'){damageRevision++;update();}
  };
  window.addEventListener('keydown',onKey);window.addEventListener('dw-game',onGame);
  function poll(t){if(disposed)return;if(t-lastPoll>=100){lastPoll=t;update(false,true);}frame=requestAnimationFrame(poll);}
  frame=requestAnimationFrame(poll);update();
  return {update,track:id=>{update();return view.track(id);},beginRadioCall:request=>model.beginRadioCall(request),read,markers:()=>view.read().markers,
    save:()=>({state:model.save(),choices:[...choices],trackedId:view.read().tracker?.id??null}),
    restore:blob=>{if(!blob||!model.restore(blob.state))return false;readSnapshot=null;lastSnapshot=model.snapshot();lastRadioDay=lastRadioPhase=lastRadioAlarm=null;choices.clear();for(const pair of blob.choices||[])if(Array.isArray(pair)&&pair.length===2)choices.set(...pair);view.reset(blob.state.runId);lastPaint='';update();if(blob.trackedId)view.track(blob.trackedId);return true;},
    snapshot:()=>lastSnapshot,
    destroy:()=>{disposed=true;cancelAnimationFrame(frame);window.removeEventListener('keydown',onKey);window.removeEventListener('dw-game',onGame);view.destroy();}};
}
