// GP-79: HUD projection of the per-gun magazine inventory.
export function ammoReserveUnit(weapon, hasMagazine) {
  if (weapon === 'revolver') return 'rounds';
  if (weapon === 'shotgun') return 'shells';
  if (weapon === 'launcher') return 'rounds';
  return hasMagazine ? 'mags' : 'rounds';
}

export function magazineHudItems(snapshot) {
  if (!snapshot || snapshot.reserveKind === 'rounds') return [];
  return snapshot.spare.map(rounds => ({
    rounds,
    size: snapshot.size,
    fullness: Math.max(0, Math.min(100, Math.round(rounds / snapshot.size * 100)))
  }));
}

// The snapshot can contain a second gun that is not currently drawn.
function spareCue(weapon, snapshot) {
  if (weapon === 'flamer' || snapshot?.loaded?.length !== 1 || snapshot.loaded[0] >= snapshot.size) return null;
  if (!snapshot.spare.length) return {key:'noSpares'};
  const fullest = Math.max(...snapshot.spare);
  if (fullest <= snapshot.loaded[0]) return {key:'noFuller'};
  return {key:'fuller', rounds:fullest, index:snapshot.spare.indexOf(fullest)};
}

// GP-144: restore GP-79 beside the later, explicitly requested Bullets total.
// This view never writes the magazine store. Unchanged spare lists reuse the DOM.
export function createMagazineHud({ammo, text}) {
  const doc=ammo.ownerDocument, host=doc.defaultView;
  const root=doc.createElement('div');root.id='ammoMags';root.hidden=true;root.setAttribute('role','img');
  ammo.insertBefore(root,ammo.querySelector('#reloadPrompt'));
  let signature=null;
  const measure=()=>ammo.parentElement?.style.setProperty('--ammo-hud-height',Math.ceil(ammo.getBoundingClientRect().height)+'px');
  const observer=host.ResizeObserver?new host.ResizeObserver(measure):null;
  observer?.observe(ammo,{box:'border-box'});
  return {
    render(weapon,snapshot) {
      if (weapon === 'revolver' || weapon === 'launcher' || snapshot?.reserveKind === 'rounds') snapshot = null;
      const cue = spareCue(weapon,snapshot);
      const next=snapshot?weapon+':'+snapshot.size+':'+snapshot.spare.join(',')+':'+(cue?.key??''):'';
      if(next===signature)return;signature=next;root.replaceChildren();root.hidden=!snapshot;
      if(!snapshot){root.removeAttribute('aria-label');measure();return;}
      const items=magazineHudItems(snapshot),unit=ammoReserveUnit(weapon,true);
      const count = cue?.key === 'noSpares' ? text('hud.ammo.magNoSpares') :
        text('hud.ammo.magCount',{count:items.length,unit:text('hud.ammo.'+unit)});
      const summary = doc.createElement('span'); summary.className = 'mag-summary';
      const label = doc.createElement('span'); label.className = 'mag-count'; label.textContent = count;
      summary.append(label);
      let advice = '';
      if (cue && cue.key !== 'noSpares') {
        advice = text(cue.key === 'fuller' ? 'hud.ammo.magFuller' : 'hud.ammo.magNoFuller',{rounds:cue.rounds});
        const hint = doc.createElement('span');
        hint.className = 'mag-advice';
        hint.textContent = advice;
        summary.append(hint);
      }
      const list=doc.createElement('span');list.className='mag-list';list.setAttribute('aria-hidden','true');
      for(const [index,item] of items.entries()){
        const glyph=doc.createElement('span');glyph.className='mag-glyph'+(weapon==='revolver'?' loader':'')+(item.fullness<100?' partial':'');
        if (index === cue?.index) glyph.classList.add('mag-next');
        glyph.dataset.rounds=String(item.rounds);glyph.style.setProperty('--fill',item.fullness+'%');glyph.textContent=String(item.rounds);
        glyph.title=text('hud.ammo.magFill',item);list.append(glyph);
      }
      const inventory = items.map(item=>text('hud.ammo.magFill',item)).join(', ');
      root.setAttribute('aria-label',[count,advice,inventory].filter(Boolean).join('. '));
      root.append(summary);
      if (items.length) root.append(list);
      measure();
    },
    dispose(){observer?.disconnect();root.remove();ammo.parentElement?.style.removeProperty('--ammo-hud-height');}
  };
}
