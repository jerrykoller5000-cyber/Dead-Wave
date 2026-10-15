// GP-19924: one deformation field on both sides of an anatomical join.
// Run once at bind time; animation still moves the original joint groups.
// No additional geometry, draws, animation callbacks or per-frame CPU work.
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };

export function zombieJoinRules(T, g, scale = 1) {
  const u = g.userData, r = u.rig, rules = [];
  const add = (parent, child, axis, low, high, radius, label) => {
    if (!parent || !child) return;
    rules.push({parent, child, axis, low:low * scale, high:high * scale,
      radius:radius * scale, label});
  };
  if (r) {
    for (const [a,b] of [['pelvis','spine1'],['spine1','spine2'],['spine2','chest'],['chest','neck'],['neck','head']])
      add(r[a],r[b],'z',-.17,.14,b==='head'?.29:.38,b);
    add(r.head,r.jaw,'z',-.08,.13,.23,'jaw hinge');
    for (const S of ['L','R']) {
      const side=S==='L'?-1:1;
      add(r.chest,r['shoulder'+S],'x',-.25*side,.12*side,.30,'shoulder'+S);
      add(r['shoulder'+S],r['elbow'+S],'y',.13,-.18,.23,'elbow'+S);
      add(r['elbow'+S],r['wrist'+S],'y',.15,-.09,.20,'wrist'+S);
      add(r.pelvis,r['hip'+S],'y',.13,-.18,.28,'hip'+S);
      add(r['hip'+S],r['knee'+S],'y',.12,-.16,.22,'knee'+S);
      add(r['knee'+S],r['ankle'+S],'y',.13,-.09,.19,'ankle'+S);
      for (const [i,fin] of (r['fingers'+S] || []).entries()) {
        add(r['wrist'+S],fin,'z',-.065,.075,.065,'knuckle'+S+i);
        add(fin,fin.userData.tip,'z',-.055,.065,.060,'finger'+S+i);
      }
      const th=r['thumb'+S];
      add(r['wrist'+S],th,'z',-.06,.07,.09,'thumb'+S);
      add(th,th?.userData.tip,'z',-.05,.06,.055,'thumb tip'+S);
    }
  } else if (u.typeKey === 'spider') {
    // Chitin plates stay rigid; the dark joint sockets close the articulated gaps.
    return rules;
  } else {
    const heavy=['brute','colossus','demon'].includes(u.typeKey), m=heavy?1.5:1;
    add(u.hips,u.torso,'y',-.12,.035,.31,'waist');
    add(u.torso,u.head,'y',-.20,-.025,.17,'neck');
    add(u.head,u.spitterJaw,'z',-.045,.075,.14,'spitter jaw hinge');
    add(u.head,u.screamerJaw,'z',-.05,.08,.15,'screamer jaw hinge');
    for (const S of ['L','R']) {
      const arm=u['arm'+S+'G'],leg=u['leg'+S+'G'];
      const side=S==='L'?-1:1;
      add(u.torso,arm,'x',-.20*m*side,.10*m*side,.15*m,'shoulder'+S);
      add(arm,arm?.userData.elbowG,'y',.075,-.095,.105*m,'elbow'+S);
      add(u.hips,leg,'y',.065,-.105,.14*m,'hip'+S);
      add(leg,leg?.userData.shinG,'y',.07,-.10,.115*m,'knee'+S);
    }
  }
  g.updateMatrixWorld(true);
  for (const rule of rules) rule.local=new T.Matrix4().copy(rule.child.matrixWorld).invert().multiply(g.matrixWorld);
  return rules;
}

export function blendZombieJoins(T, g, skin, scale = 1) {
  if (!skin?.isSkinnedMesh || skin.userData.joinBlend) return 0;
  const geo=skin.geometry,P=geo.attributes.position,I=geo.attributes.skinIndex,W=geo.attributes.skinWeight;
  const bones=skin.skeleton.bones,indices=new Map(bones.map((b,i)=>[b,i]));
  const rules=zombieJoinRules(T,g,scale).filter(r=>indices.has(r.parent)&&indices.has(r.child));
  const owners=new Uint16Array(P.count),p=new T.Vector3();let changed=0;
  for(let i=0;i<P.count;i++) {
    const owner=owners[i]=I.getX(i),bone=bones[owner];let best=null,bestDistance=Infinity;
    for(const r of rules) {
      if(bone!==r.parent&&bone!==r.child)continue;
      p.fromBufferAttribute(P,i).applyMatrix4(r.local);
      const along=p[r.axis],lo=Math.min(r.low,r.high),hi=Math.max(r.low,r.high);
      if(along<lo||along>hi)continue;
      const radial2=p.lengthSq()-along*along;
      if(radial2>r.radius*r.radius)continue;
      const distance=radial2/(r.radius*r.radius)+Math.abs((along-r.low)/(r.high-r.low)-.5)*.15;
      // Fade to rigid ownership outside the socket, avoiding a hard deformation
      // boundary on broad chests or fingers adjacent to the selected joint.
      const fade=1-smooth((Math.sqrt(radial2)/r.radius-.70)/.30);
      const target=smooth((along-r.low)/(r.high-r.low)),own=bone===r.child?1:0;
      if(distance<bestDistance){bestDistance=distance;best={r,weight:own+(target-own)*fade};}
    }
    if(best){const {r,weight:w}=best;I.setXYZW(i,indices.get(r.parent),indices.get(r.child),0,0);W.setXYZW(i,1-w,w,0,0);changed++;}
  }
  if(!changed)return 0;
  I.needsUpdate=true;W.needsUpdate=true;
  skin.userData.joinBlend={owners,indices:I.array.slice(),weights:W.array.slice(),changed};
  // Keep the references on the root, never on a severable source group (cloneLean).
  (g.userData.zombieJoinSkins ||= []).push(skin);
  return changed;
}

// Restore rigid ownership at any lost joint before its bone is collapsed. This
// prevents blended vertices leaving ribbons between a stump and a severed limb.
// Recompute only on dismemberment or pool reset, never during a render frame.
export function refreshZombieJoinLoss(g) {
  for(const skin of g?.userData?.zombieJoinSkins || []) {
    const d=skin.userData.joinBlend,I=skin.geometry.attributes.skinIndex,W=skin.geometry.attributes.skinWeight;
    I.array.set(d.indices);W.array.set(d.weights);
    const lost=skin.skeleton.bones.map(b=>{for(let p=b;p&&p!==g;p=p.parent)if(p.userData._skinCollapsed)return true;return false;});
    for(let i=0;i<d.owners.length;i++)if(lost[I.getX(i)]||lost[I.getY(i)]) {
      I.setXYZW(i,d.owners[i],0,0,0);W.setXYZW(i,1,0,0,0);
    }
    I.needsUpdate=true;W.needsUpdate=true;
  }
}
