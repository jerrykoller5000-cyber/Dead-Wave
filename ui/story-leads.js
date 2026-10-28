// GP-19969: presentation of CL-263's authoritative lead snapshot. No quest mutation.
import {LEADS, leadOf, leadForSite} from '../game/story-chain.js';
import {text} from './strings.js';

export function storySiteState(story, site) {
  const lead=leadForSite(site);
  if(!lead || !Array.isArray(story?.leads))return null;
  const state=story.leads.find(row=>row.id===lead.id)?.state;
  return ['closed','open','done'].includes(state)?state:'closed';
}

export function leadCard(id, state='open') {
  const lead=leadOf(id);
  if(!lead || !['open','done'].includes(state))return null;
  return {id,site:lead.site,state,title:text(`story.lead.${id}.title`),
    line:text(`story.lead.${id}.line`),location:text(`story.lead.${id}.location`),
    status:text(state==='done'?'story.lead.done':'story.lead.open'),
    canTrack:state==='open'&&!!lead.site};
}

export function buildStoryBoard(story) {
  if(!Array.isArray(story?.leads))return [];
  return LEADS.flatMap(lead=>{
    const rows=story.leads.filter(row=>row.id===lead.id);
    const card=rows.length===1?leadCard(lead.id,rows[0].state):null;
    return card?[card]:[];
  });
}

// Run identity and once-per-lead notices prevent a repeated event or a new run
// from replaying old dawn cards. The bus adds runId to story-lead events.
export function createLeadNotices() {
  let runId=null;const seen=new Set();
  return {receive(event) {
    if(event?.type==='run-reset'){runId=event.runId;seen.clear();return null;}
    if(event?.type!=='story-lead'||event.phase!=='open'||runId===null||
      event.runId!==runId||!Number.isSafeInteger(event.day)||event.day<2||seen.has(event.id))return null;
    const card=leadCard(event.id);if(!card)return null;
    seen.add(event.id);return {...card,day:event.day};
  }};
}
