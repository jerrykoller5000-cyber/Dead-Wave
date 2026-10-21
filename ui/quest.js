// GP-70: a run-local word. No world dice, storage, DOM or combat mutation.
import { mulberry32 } from '../core/math.js';
const dayOK = n => Number.isSafeInteger(n) && n > 0;
const wordOK = w => Array.isArray(w) && w.length === 5 && w.every(k => Number.isInteger(k) && k >= 0 && k < 8) && new Set(w).size === 5;
const clone = s => ({ ...s, order: [...s.order], known: [...s.known], heart: s.heart && { ...s.heart } });
export function createQuest({ emit = () => {} } = {}) {
  let state = null;
  const event = (kind, extra = {}) => emit({ type: 'quest', kind, runId: state.runId, ...extra });
  const read = () => state && clone(state);
  const view = () => state && ({ runId: state.runId, day: state.day, unlocked: state.unlocked,
    triedDay: state.triedDay, silenced: state.silenced, done: state.done,
    known: state.known.map((yes, i) => yes ? state.order[i] : null) });
  return {
    read, view,
    reset({runId, seed} = {}) {
      if (!(typeof runId === 'string' && runId || Number.isSafeInteger(runId)) || !Number.isInteger(seed)) throw new TypeError('Quest needs run identity and seed');
      const rnd = mulberry32(seed >>> 0), stones = Array.from({length:8}, (_,i) => i);
      for (let i=7;i>0;i--) { const j=Math.floor(rnd()*(i+1)); [stones[i],stones[j]]=[stones[j],stones[i]]; }
      state={runId,day:0,order:stones.slice(0,5),unlocked:false,triedDay:-1,known:[false,false,false,false,false],silencedDay:-1,silenced:false,heart:null,done:false};
      event('word',{order:[...state.order]}); return read();
    },
    restore(raw) {
      if (!raw || !wordOK(raw.order) || !Array.isArray(raw.known) || raw.known.length!==5 || !raw.known.every(x=>typeof x==='boolean') ||
          !Number.isSafeInteger(raw.day) || raw.day<0 || !['unlocked','silenced','done'].every(k=>typeof raw[k]==='boolean') ||
          !Number.isInteger(raw.triedDay) || raw.triedDay < -1 || raw.triedDay>raw.day ||
          !Number.isInteger(raw.silencedDay) || raw.silencedDay < -1 || raw.silencedDay>raw.triedDay ||
          (raw.silenced && !raw.done && raw.silencedDay!==raw.day) ||
          !(typeof raw.runId==='string' && raw.runId || Number.isSafeInteger(raw.runId))) return false;
      if(raw.heart!==null && (!raw.heart || typeof raw.heart.entered!=='boolean' || ![1,2,3].includes(raw.heart.phase) || !Number.isFinite(raw.heart.guardianHp) || raw.heart.guardianHp<0))return false;
      state=clone(raw); event('word',{order:[...state.order]}); if(state.done)event('ending'); else if(state.silenced)event('silenced'); return true;
    },
    dawn(day) {
      if(!state || !dayOK(day) || day<=state.day || state.done)return false;
      const was=state.silenced;state.day=day;state.silenced=false;
      if(was)event('dawn'); return true;
    },
    hear(dispatch) {
      if(!state || state.unlocked || !dispatch)return false;
      if(!(dispatch.lines || [dispatch]).some(x=>x.number===14))return false;
      state.unlocked=true;return true;
    },
    learn(place) {
      if(!state || !Number.isInteger(place) || place<0 || place>=5 || state.known[place])return null;
      state.known[place]=true;return {place,glyph:state.order[place]};
    },
    submit(glyphs) {
      if(!state || state.done || !state.unlocked || !dayOK(state.day) || state.day>=20 || state.triedDay===state.day || !wordOK(glyphs))return null;
      const ok=glyphs.every((k,i)=>k===state.order[i]); state.triedDay=state.day;
      if(ok){state.silencedDay=state.day;state.silenced=true;}
      event('sent',{ok});if(ok)event('silenced');return ok;
    },
    setHeart(heart) {
      if(!state || state.done || !heart || typeof heart.entered!=='boolean' || ![1,2,3].includes(heart.phase) || !Number.isFinite(heart.guardianHp) || heart.guardianHp<0)return false;
      state.heart={entered:heart.entered,phase:heart.phase,guardianHp:heart.guardianHp};return true;
    },
    complete() { if(!state || state.done)return false; state.done=true;state.silenced=true;return true; }
  };
}
