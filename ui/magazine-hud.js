// GP-79: HUD projection of the per-gun magazine inventory.
export function ammoReserveUnit(weapon, hasMagazine) {
  if (weapon === 'revolver') return 'loaders';
  if (weapon === 'shotgun') return 'shells';
  if (weapon === 'launcher') return 'rounds';
  return hasMagazine ? 'mags' : 'rounds';
}

export function magazineHudItems(snapshot) {
  if (!snapshot) return [];
  return snapshot.spare.map(rounds => ({
    rounds,
    size: snapshot.size,
    fullness: Math.max(0, Math.min(100, Math.round(rounds / snapshot.size * 100)))
  }));
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
      const next=snapshot?weapon+':'+snapshot.size+':'+snapshot.spare.join(','):'';
      if(next===signature)return;signature=next;root.replaceChildren();root.hidden=!snapshot;
      if(!snapshot){root.removeAttribute('aria-label');measure();return;}
      const items=magazineHudItems(snapshot),unit=ammoReserveUnit(weapon,true);
      const count=text('hud.ammo.magCount',{count:items.length,unit:text('hud.ammo.'+unit)});
      const label=doc.createElement('span');label.className='mag-count';label.textContent=count;
      const list=doc.createElement('span');list.className='mag-list';list.setAttribute('aria-hidden','true');
      for(const item of items){
        const glyph=doc.createElement('span');glyph.className='mag-glyph'+(weapon==='revolver'?' loader':'')+(item.fullness<100?' partial':'');
        glyph.dataset.rounds=String(item.rounds);glyph.style.setProperty('--fill',item.fullness+'%');glyph.textContent=String(item.rounds);
        glyph.title=text('hud.ammo.magFill',item);list.append(glyph);
      }
      root.setAttribute('aria-label',count+(items.length?': '+items.map(item=>text('hud.ammo.magFill',item)).join(', '):''));
      root.append(label,list);measure();
    },
    dispose(){observer?.disconnect();root.remove();ammo.parentElement?.style.removeProperty('--ammo-hud-height');}
  };
}
