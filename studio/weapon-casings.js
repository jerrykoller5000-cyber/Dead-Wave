// Spent cases in game-world metres, centred on Y with the open mouth at +Y.
// The chamber model can scale the same mesh into its own gun-local units.
const shapes = {
  // length, rim radius, body radius, mouth radius and start of the shoulder, in millimetres
  pistol:   [22.8, 6.0, 6.0, 6.0],
  uzi:      [19, 5.0, 4.95, 4.75],
  revolver: [33, 6.55, 5.80, 5.75],
  m4:       [45, 4.8, 4.78, 3.20, 35],
  ak:       [39, 5.7, 5.62, 4.30, 29],
  minigun:  [51, 6.0, 5.95, 4.30, 39],
  sniper:   [70, 7.45, 7.45, 4.75, 52],
  shotgun:  [70, 11.3, 10.3, 10.2],
  launcher: [46, 21.9, 20.5, 20.1]
};
const sharedShape = { aa12: 'shotgun', m240: 'minigun' };
const geometryByThree = new WeakMap();
const launcherSilver = 0xbcc3c3;

// Visible portion of a carrier sliding behind the rear edge of a receiver window.
// The view gun calls the same pose on its copy. The rear edge conceals the steel
// progressively, including the face, without displaying it outside the receiver.
export function fitPortCarrier(gun, K, {x, y, rear, front, height}, steel, faceMetal) {
  const bolt = K.group(0, 0, 0);
  bolt.name = 'recoil-bolt';
  const faceLength = (front - rear) * 0.16;
  const bodyLength = front - rear - faceLength;
  const side = K.box(0.0022, height, bodyLength, steel, x, y, rear + bodyLength / 2, 0, 0, 0, bolt, 0.0004);
  const face = K.box(0.0025, height, faceLength, faceMetal, x, y, front - faceLength / 2, 0, 0, 0, bolt, 0.0004);
  gun.userData.recoilBolt = bolt;
  gun.userData.recoilBoltParts = [side, face];
  gun.userData.portStroke = front - rear;
  gun.userData.recoilBoltPose = (copy, travel) => {
    const tip = Math.max(rear, front - Math.max(0, travel));
    const split = Math.max(rear, tip - faceLength);
    const pose = (mesh, lo, hi, length) => {
      mesh.visible = hi > lo;
      mesh.position.z = (lo + hi) / 2;
      mesh.scale.z = Math.max(1e-6, hi - lo) / length;
    };
    pose(copy.children[0], rear, split, bodyLength);
    pose(copy.children[1], split, tip, faceLength);
  };
}

// These are exterior render props. A shallow dark cup and a creased cap
// distinguish a spent hull from a live one in the reload and ejection views.
const shellArt = {
  birdshot: { color: 0xa43e37, headFraction: .12, bands: 0 },
  buckshot: { color: 0x497ba0, headFraction: .25, bands: 1 },
  slug: { color: 0xc9c3a2, headFraction: .25, bands: 2 }
};

function shotgunShell(THREE, load, spent) {
  const type = load === 'buck' || load === 'buckshot' ? 'buckshot' : load === 'slug' ? 'slug' : 'birdshot';
  const art = shellArt[type];
  const key = type + (spent ? '-spent' : '-live');
  let cache = geometryByThree.get(THREE);
  if (!cache) geometryByThree.set(THREE, cache = new Map());
  if (cache.has(key)) return cache.get(key);

  const [openLength, rim, body, mouth] = shapes.shotgun;
  const head = openLength * art.headFraction;
  const length = spent ? openLength : openLength - 7;
  const profile = [[0,spent ? .45 : 0],[body * .20,0],[body * .37,0],
    [body * .40,.35],[body * .44,0],[rim,0],[rim,2],[body,3],
    [body,head],[body,head+.2],[body * .99,head+.4]];
  // Short moulded bands also distinguish the three colours under dim light.
  for (let i = 0; i < art.bands; i++) {
    const y = length * .57 + i * 4;
    profile.push([body,y],[body * .99,y+.25],[body * .99,y+2],[body,y+2.25]);
  }
  profile.push([mouth,length-4],[mouth,length-.6],[mouth*.98,length]);
  if (spent) profile.push([mouth*.90,length-.2],[mouth*.86,length-7],[0,length-8]);
  else profile.push([mouth*.89,length-.5],[mouth*.55,length-.9],[mouth*.15,length-1.6],[0,length-1.7]);

  const points = profile.map(([r,y]) => new THREE.Vector2(r/1000,(y-length/2)/1000));
  const geometry = new THREE.LatheGeometry(points,24);
  const positions = geometry.attributes.position, colors = [];
  const hull = new THREE.Color(art.color), brass = new THREE.Color(0xc29b5f);
  const base = new THREE.Color(0x9c8d79), interior = new THREE.Color(0x302c29);
  for (let i=0; i<positions.count; i++) {
    const x=positions.getX(i), z=positions.getZ(i), y=positions.getY(i)*1000+length/2;
    const radius=Math.hypot(x,z)*1000;
    const crease=(1+Math.cos(6*Math.atan2(x,z)))/2;
    let color=hull, shade=1;
    if (y < head+.3) color=y<.5 && radius<body*.42 ? base : brass;
    else if (spent && radius < mouth*.91 && y>length-9) color=interior;
    else if (!spent && y>length-2 && radius<mouth*.9) {
      const relief=crease*(1-Math.abs(radius/mouth-.52));
      positions.setY(i,positions.getY(i)-.0015*relief);
      shade=.96-.43*relief;
    } else {
      for(let band=0;band<art.bands;band++){
        const start=length*.57+band*4;
        if(y>start+.1 && y<start+2.1)shade=.48;
      }
    }
    if (spent && y>length-1) positions.setY(i,positions.getY(i)-.0014*crease);
    colors.push(color.r*shade,color.g*shade,color.b*shade);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  cache.set(key,geometry);
  return geometry;
}

// Closed silhouette from the game's loose palm prop. The colour bands distinguish
// a loaded insert even when its outline is lost against the glove.
function launcherRound(THREE) {
  let cache = geometryByThree.get(THREE);
  if (!cache) geometryByThree.set(THREE, cache = new Map());
  if (cache.has('launcher-live')) return cache.get('launcher-live');

  const silver = new THREE.Color(launcherSilver), band = new THREE.Color(0xb89c4d);
  const olive = new THREE.Color(0x626a43), centre = new THREE.Color(0x626b6a);
  const outline = [
    [0, 0, centre], [.13, 0, centre], [.17, 0, silver], [.90, 0, silver],
    [1, .05, silver], [1, .15, silver],
    [.94, .16, olive], [.92, .18, olive], [.92, .19, band], [.92, .23, band],
    [.92, .24, olive], [.91, .65, olive], [.80, .80, olive], [.51, .96, olive], [0, 1, olive]
  ];
  const radius = shapes.launcher[1] * .001;
  const points = outline.map(([r, y]) => new THREE.Vector2(r * radius, (y - .5) * radius * 3.8));
  const geo = new THREE.LatheGeometry(points, 16), colors = [];
  for (let i = 0; i < geo.attributes.position.count; i++) {
    const color = outline[i % outline.length][2];
    colors.push(color.r, color.g, color.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  cache.set('launcher-live', geo);
  return geo;
}

export function roundGeometry(THREE, weapon, load) {
  if (weapon === 'launcher') return launcherRound(THREE);
  if (weapon === 'shotgun') return shotgunShell(THREE, load, false);
  if (weapon === 'aa12') return shotgunShell(THREE, 'birdshot', false);
  if (weapon === 'ak' || weapon === 'revolver' || weapon === 'uzi' || weapon === 'sniper' || weapon === 'minigun') return metallicCartridge(THREE, weapon, true);
  return null;
}

export function spentCaseGeometry(THREE, weapon, load) {
  const kind = sharedShape[weapon] || weapon;
  if (kind === 'shotgun') return shotgunShell(THREE, weapon === 'shotgun' ? load : 'birdshot', true);
  if (!Object.hasOwn(shapes, kind)) return null;
  return metallicCartridge(THREE, kind, false);
}

function metallicCartridge(THREE, kind, live) {
  let cache = geometryByThree.get(THREE);
  if (!cache) geometryByThree.set(THREE, cache = new Map());
  const key = live ? kind + '-live' : kind;
  if (cache.has(key)) return cache.get(key);

  const [length, rim, body, mouth, shoulder] = shapes[kind];
  const rimmed = kind === 'revolver' || kind === 'launcher';
  const wall = mouth * 0.09;
  const primer = body * 0.38;
  const profile = [
    [0, live ? 0 : 0.38], [primer * 0.27, 0], [primer, 0], [primer * 1.05, 0.28],
    [primer * 1.14, 0], [rim, 0], [rim, length * 0.045]
  ];
  if (!rimmed) profile.push([body * 0.83, length * 0.065], [body * 0.83, length * 0.086]);
  profile.push([body, length * 0.105]);
  if (shoulder) profile.push([body * 0.91, shoulder], [mouth, length * 0.86]);
  const rounded = kind === 'revolver' || kind === 'uzi';
  let tip = 0;
  if (live) {
    tip = rounded ? mouth * 1.45 : length * .43;
    if (kind === 'uzi') tip = 29.7 - length;
  }
  if (live && rounded) {
    // Broad, rounded crown on the sidearm prop, legible when only its nose shows.
    profile.push([mouth,length],[mouth*.96,length+tip*.12],[mouth*.91,length+tip*.46],
      [mouth*.78,length+tip*.79],[mouth*(kind === 'uzi' ? .24 : .56),length+tip*.99],[0,length+tip]);
  } else if (live) {
    // A closed, copper-coloured silhouette, continuous with the brass prop.
    profile.push([mouth,length],[mouth*.92,length+.12],[mouth*.91,length+tip*.18],
      [mouth*.75,length+tip*.48],[mouth*.43,length+tip*.77],[0,length+tip]);
  } else {
    profile.push([mouth, length], [mouth - wall, length], [mouth - wall, length * 0.76],
      [body * 0.76, length * 0.20], [0, length * 0.20]);
  }
  const centre = (length + tip) / 2;
  const points = profile.map(([r, y]) => new THREE.Vector2(r * 0.001, (y - centre) * 0.001));
  const geometry = new THREE.LatheGeometry(points, 20);
  const position = geometry.attributes.position;
  const colors = [];
  const shell = kind === 'launcher' ? new THREE.Color(launcherSilver) : null;
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i) * 1000 + centre;
    const r = Math.hypot(position.getX(i), position.getZ(i)) * 1000;
    if (live && y > length + .05) colors.push(.58, .22, .105);
    else if ((kind === 'ak' || kind === 'revolver' || kind === 'sniper') && !live && y >= length*.19 && (r <= mouth-wall+.001 || (Math.abs(y-length*.2)<.001 && r<=body*.77))) colors.push(.15,.095,.048);
    else if (kind === 'launcher') {
      const inside = y >= length * .19 && r <= mouth - wall + .001;
      if (inside) colors.push(.075, .082, .080);
      else colors.push(shell.r, shell.g, shell.b);
    }
    else if (y < 0.4 && r <= primer * 1.06) colors.push(0.73, 0.63, 0.49);
    else colors.push(0.88, 0.60, 0.27);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  cache.set(key, geometry);
  return geometry;
}
