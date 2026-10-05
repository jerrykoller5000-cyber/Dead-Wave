const fs=require('node:fs');
const dir='review/marine-reference',css=fs.readFileSync('review/trapper/index.html','utf8').match(/<style>([\s\S]*?)<\/style>/)[1];
const views=[
 ['back','Fixed homes for the weapons','Uzis cross the backpack. Revolvers point downward on the lower rear mounts, with fitted leather sleeves and straps returning to the pack.'],
 ['head','Connected helmet equipment','Rail arms and pivot hubs support the earcups. A curved microphone boom reaches the lower-face wrap. The rhino mount has a hinge, paired arms, sliding shoe and bridge.'],
 ['nvg-side','Night vision lowered','The articulated arm connects the helmet shroud to the binocular bridge. Tubes remain aligned with the eyes.'],
 ['head-side','Night vision raised','The same assembly pivots upward around the shroud axle; the helmet crown is clear of the old duplicate goggle ornament.'],
 ['nvg','Front-quarter night vision','Paired lenses, rear eyecups and the mounting hardware share the existing deploy/stow control.'],
 ['cover','Eight-point cover','A tapered eight-sided crown, fitted band and curved bill replace the rounded box and straight plank.'],
 ['boonie','Boonie','A softer crown, foliage band, side vents and gently uneven drooping brim.'],
 ['ballcap','Ballcap','A domed crown with panel seams, top button and a curved bill.'],
 ['ballcap-back','Ballcap reversed','The same shaped cap worn backward retains the wardrobe option and adjustment strap.'],
 ['belt','Belts and bandoliers','Continuous straps follow the chest and shoulder, with ammunition loops and adjusters. The waist belt has bound edges, keepers and a framed buckle.'],
 ['boots','Boots and protective pads','Shaped toe soles, narrow heels, a welt and angled laces. Rounded knee shells sit on padded backing with wraparound straps. Elbow guards share the softer shape.'],
 ['pack','Soft equipment','A tapered pack crown, zipper piping, compression straps and MOLLE rows. Magazine pouches now have softer bodies.'],
 ['reversed','Loadout order check','Swapping the secondary slots keeps the Uzis on the backpack and the revolvers on the lower mounts.'],
 ['quarter','Rear quarter','The new pack and retention details seen around the carried weapons.'],
 ['front','Full equipment','The reference-inspired changes at a full-body review distance.'],
 ['side','Side silhouette','Equipment attachment and silhouette checked from the side.'],
 ['pair','One purchased pair','The additional owned Uzi stays on its matching backpack mount.'],
 ['pair-drawn','Akimbo drawn','Both Uzis leave their mounts when the pair is drawn.'],
 ['pair-single','One Uzi drawn','The other owned Uzi remains stowed.'],
 ['two-pairs','Both pairs owned','Both secondary pairs and the extra issued pistol remain represented.'],
 ['heavy','Heavy loadout','Inspected with the minigun and flamethrower carried beside the pack.'],
 ['walk','Walking pose','Checked on the production walking clip.'],
 ['run','Running pose','Checked on the production running clip.'],
 ['bare','Without armor','The existing clothing and equipment visibility controls remain in use.'],
 ['survivor','Brandt','A linked ammunition belt now drapes around the torso, with shaped rounds instead of square blocks. Shared hats, boots and soft gear also apply.'],
 ['okafor','Okafor','The aid bag has rounded sides and two attachment straps. His uncovered face and existing clothing choices remain.'],
 ['pike','Pike','The reversed cap, boots and pack share the updated shapes. His wrench and individual clothing remain.']
];
const article=([id,title,note])=>`<article><h2>${title}</h2><figure><div class="pair">${['before','after'].map(p=>`<div class="${p}"><div class="label">${p==='before'?'Before':'After'}</div><img loading="lazy" src="${p}-${id}.jpg" alt="${title}: ${p}"></div>`).join('')}</div><figcaption>${note}</figcaption></figure></article>`;
fs.writeFileSync(dir+'/index.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Marine equipment — reference pass</title><style>${css}</style><main><header><small>DEAD-WAVE / MARINE EQUIPMENT / OCTOBER 2, 2026</small><h1>Shaped, fitted, attached.</h1><p>Your references applied to the shared marine equipment: lower-face wrap, shaped headwear and soft gear, connected helmet hardware, and fixed Uzi/revolver mounting locations.</p></header><nav>${[['after','After'],['before','Before'],['compare','Side by side']].map(([id,label])=>`<button data-mode="${id}" aria-pressed="${id==='after'}">${label}</button>`).join('')}</nav>${article(views[0])}<div class="grid">${views.slice(1).map(article).join('')}</div><footer><p>27 matching production-renderer comparisons. Existing carry checks, wardrobe and draw unit checks passed. Fixed mounting and muzzle direction checked with reordered, duplicated and drawn loadouts.</p><p>Independent crew visual acceptance, final hand-to-holster choreography, full suite and load/FPS checks remain pending.</p></footer></main><script>for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{document.body.className=b.dataset.mode==='after'?'':b.dataset.mode+'-mode';for(const x of document.querySelectorAll('[data-mode]'))x.setAttribute('aria-pressed',String(x===b));};</script></html>`);
console.log('27 before/after comparisons built');
