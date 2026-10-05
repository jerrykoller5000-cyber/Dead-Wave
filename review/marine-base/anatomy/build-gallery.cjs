const fs=require('node:fs'),path=require('node:path'),dir=__dirname;
const css=fs.readFileSync('review/trapper/index.html','utf8').match(/<style>([\s\S]*?)<\/style>/)[1];
const views=[
 ['survivors','The three survivors','Okafor, Brandt and Pike share the refined body while keeping their own face, hair, uniform and equipment.'],
 ['uniform','The player','Rounder shoulders and a fuller upper chest flow into a fitted waist. The balaclava remains on.'],
 ['quarter','Shoulders and torso','The shoulder cap blends into a narrower upper arm, and the pelvis has a softer transition into the thighs.'],
 ['profile','The side silhouette','The calf sits behind the shin. A shaped heel, instep and toe replace the stacked boot upper.'],
 ['rolled','Forearms, hands and lower legs','Exposed limbs show the anatomical taper. The palms narrow at the wrist and the fingers follow a sloping knuckle line.'],
 ['kit','With armor on','The same proportions carry through the vest, helmet and pads. Existing clothing choices remain available.'],
 ['okafor','Okafor','Smaller eye surrounds, subtler brows and cheeks, and a continuous nose surface soften the face.'],
 ['brandt','Brandt','The fitted beard and aviators remain part of his identity. The shared facial refinement sits beneath them.'],
 ['pike','Pike','A close look at the softer facial details. Pike remains male, with his existing blond hair and green eyes.'],
 ['walk','Walking pose','The new geometry shown in the existing studio walk pose. This is a posed still, not a new animation.'],
 ['run','Running pose','Thigh and calf contours remain readable with the legs bent in the existing studio run pose.'],
 ['rifle','Rifle hold','The original joints and hand targets are retained. The checked rifle grip still meets the hand.'],
 ['crouch','Crouched rifle hold','The anatomy pass uses the current crouch pose; it does not replace the recent crouch animation work.']
];
const article=([id,title,note])=>`<article><h2>${title}</h2><figure><div class="pair">${['before','after'].map(p=>`<div class="${p}"><div class="label">${p==='before'?'Before':'After'}</div><img loading="lazy" src="data:image/jpeg;base64,${fs.readFileSync(path.join(dir,p+'-'+id+'.jpg')).toString('base64')}" alt="${title} ${p}"></div>`).join('')}</div><figcaption>${note}</figcaption></figure></article>`;
fs.writeFileSync(path.join(dir,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Soldier anatomy · Before and after</title><style>${css}</style><main><header><small>DEAD-WAVE / SOLDIER ANATOMY / OCTOBER 2, 2026</small><h1>Another pass on the soldiers</h1><p>More natural body contours and softer facial details, keeping the game's stylized look.</p></header><nav>${[['after','After'],['before','Before'],['compare','Side by side']].map(([id,label])=>`<button data-mode="${id}" aria-pressed="${id==='after'}">${label}</button>`).join('')}</nav>${article(views[0])}<div class="grid">${views.slice(1).map(article).join('')}</div><footer><p>Production models staged for comparison, with foreground foliage and rocks hidden only in the review scene. The camera and clothing match between each pair. Static geometry refinement; existing rig, dressing hooks, weapon grips and survivor identities retained.</p><p>Focused checks passed. Independent crew review, the full integration suite and load/FPS verification remain pending.</p></footer></main><script>for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{document.body.className=b.dataset.mode==='after'?'':b.dataset.mode+'-mode';for(const x of document.querySelectorAll('[data-mode]'))x.setAttribute('aria-pressed',String(x===b));};</script></html>`);
console.log('Built 13-comparison soldier anatomy gallery.');
