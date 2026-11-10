// GP-20025 and GP-20065: standalone studies and the armory's fitted optics.
// Gun-local convention: +Z muzzle, +Y up. Origin: centre of the mounting foot.
import * as THREE from 'three';
import { markPaintSurface } from './weapon-finish.js';

// CL-329 (J92): black optics (paint was 0x303633; alloy 0x4b5354 at 0.83 metal: a light grey-green; edge 0x858b83 at 0.9)
const paint = new THREE.MeshStandardMaterial({ color: 0x24282a, metalness: 0.05, roughness: 0.74 });
const alloy = new THREE.MeshStandardMaterial({ color: 0x2e3234, metalness: 0.55, roughness: 0.5 });
const edge = new THREE.MeshStandardMaterial({ color: 0x70767a, metalness: 0.7, roughness: 0.45 });
const rimMetal = edge.clone(); rimMetal.side = THREE.DoubleSide;
const rubber = new THREE.MeshStandardMaterial({ color: 0x171c1c, metalness: 0, roughness: 0.9 });
const lens = new THREE.MeshPhysicalMaterial({ color: 0x77989a, metalness: 0, roughness: 0.14, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
const reticle = new THREE.MeshBasicMaterial({ color: 0xb1392c, transparent: true, opacity: 0.86, depthWrite: false, side: THREE.DoubleSide });
// CL-332 c: the inside of every open tube (seen through the lenses), dark and matte
const bore = new THREE.MeshStandardMaterial({ color: 0x0f1414, metalness: 0.08, roughness: 0.88, side: THREE.BackSide });

function box(root, name, mat, size, at, tilt = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.name = name;
  mesh.position.set(...at);
  mesh.rotation.x = tilt;
  mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
  return mesh;
}

function beveledBox(root, name, mat, size, at, bevel = 0.0012) {
  const [w, h, d] = size, b = Math.min(bevel, w / 5, h / 5, d / 5);
  const x = w / 2 - b, y = h / 2 - b;
  const shape = new THREE.Shape();
  shape.moveTo(-x, -y); shape.lineTo(x, -y); shape.lineTo(x, y); shape.lineTo(-x, y); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * b, steps: 1, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1 });
  geo.translate(0, 0, -d / 2 + b);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name; mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh);
  return mesh;
}

function cylinder(root, name, mat, r, length, at, axis = 'z', sides = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, length, sides), mat);
  mesh.name = name;
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  else if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  mesh.position.set(...at);
  mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
  return mesh;
}

function glass(root, width, height, y, z, round = false) {
  const pane = new THREE.Mesh(round ? new THREE.CircleGeometry(width / 2, 24) : new THREE.PlaneGeometry(width, height), lens);
  pane.name = 'faint blue-gray optical glass';
  pane.position.set(0, y, z);
  root.add(pane);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(round ? 0.0016 : 0.0013, 8), reticle);
  dot.name = 'low-intensity virtual dot';
  dot.position.set(0, y, z - 0.0004);
  root.add(dot);
}

function foot(root, width, length) {
  beveledBox(root, 'chamfered alloy clamp foot', alloy, [width, 0.004, length], [0, 0.002, 0], 0.0008);
  beveledBox(root, 'painted riser', paint, [width * 0.84, 0.007, length * 0.72], [0, 0.007, 0]);
  for (const side of [-1, 1]) {
    box(root, 'rail clamp lip', edge, [0.0025, 0.005, length * 0.85], [side * (width / 2 - 0.001), 0.001, 0]);
    cylinder(root, 'recessed clamp screw', rubber, 0.002, 0.001, [side * (width / 2 + 0.0005), 0.004, -length * 0.18], 'x', 8);
  }
}

function mini(root) {
  foot(root, 0.029, 0.049);
  beveledBox(root, 'low emitter housing', paint, [0.026, 0.009, 0.023], [0, 0.014, -0.009], 0.0015);
  for (const side of [-1, 1]) {
    box(root, 'cast window cheek', alloy, [0.0035, 0.016, 0.009], [side * 0.0145, 0.024, 0.011], -0.12);
    box(root, 'worn outer bevel', edge, [0.001, 0.013, 0.007], [side * 0.0168, 0.024, 0.011], -0.12);
  }
  box(root, 'window top bridge', alloy, [0.034, 0.003, 0.007], [0, 0.032, 0.011]);
  glass(root, 0.026, 0.014, 0.024, 0.011);
  box(root, 'rubberized brightness key', rubber, [0.004, 0.003, 0.008], [0.014, 0.019, -0.014]);
  return { eye: [0, 0.024, -0.036], dot: [0, 0.024, 0.011] };
}

function tube(root) {
  foot(root, 0.046, 0.065);
  for (const z of [-0.020, 0.020]) beveledBox(root, 'ring cradle', alloy, [0.042, 0.012, 0.011], [0, 0.015, z]);
  // Open-ended rolled tube; dark inner wall and two slim metal rims show real wall thickness.
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.070, 24, 1, true), paint);
  shell.name = 'open-ended cylindrical housing'; shell.rotation.x = Math.PI / 2; shell.position.y = 0.042; shell.castShadow = true; root.add(shell);
  const inside = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.069, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x0f1717, metalness: 0.08, roughness: 0.86, side: THREE.BackSide }));
  inside.name = 'anti-glare bore'; inside.rotation.x = Math.PI / 2; inside.position.y = 0.042; root.add(inside);
  for (const z of [-0.034, 0.034]) {
    const rim = new THREE.Mesh(new THREE.RingGeometry(0.0205, 0.024, 20), rimMetal);
    rim.name = 'exposed machined rim'; rim.position.set(0, 0.042, z); root.add(rim);
  }
  glass(root, 0.041, 0.041, 0.042, 0.029, true);
  cylinder(root, 'elevation turret', alloy, 0.009, 0.009, [0, 0.070, -0.010], 'y', 16);
  cylinder(root, 'windage turret', alloy, 0.007, 0.008, [0.028, 0.042, -0.010], 'x', 12);
  return { eye: [0, 0.042, -0.041], dot: [0, 0.042, 0.029] };
}

function holo(root) {
  foot(root, 0.052, 0.105);
  // Keep the emitter in the low chassis; the glass above it occupies nearly the whole face.
  // CL-329 (J92): a closed hood round the window (it was a roof plate on four thin posts, open at the sides): a solid
  // wall each side of the window, the roof over them, a sloped brace back to the chassis each side; the battery cap on
  // the chassis' front, two buttons on its rear. The window, the eye and the dot are where they were.
  beveledBox(root, 'polymer battery and emitter chassis', paint, [0.054, 0.019, 0.090], [0, 0.019, -0.008], 0.0025);
  for (const side of [-1, 1]) {
    beveledBox(root, 'hood side wall', alloy, [0.0045, 0.050, 0.034], [side * 0.0262, 0.053, 0.026], 0.001);
    box(root, 'hood rear brace', alloy, [0.0045, 0.056, 0.005], [side * 0.0262, 0.0535, -0.006], 0.52);
    box(root, 'front window upright', edge, [0.002, 0.042, 0.003], [side * 0.0235, 0.055, 0.0335]);
  }
  beveledBox(root, 'hood roof', alloy, [0.057, 0.0055, 0.040], [0, 0.0805, 0.024], 0.0015);
  box(root, 'window lower sill', alloy, [0.049, 0.004, 0.009], [0, 0.031, 0.032]);
  glass(root, 0.046, 0.043, 0.055, 0.032);
  cylinder(root, 'battery cap', alloy, 0.0085, 0.006, [0, 0.019, 0.0385], 'z', 16);
  cylinder(root, 'battery cap slot', rubber, 0.006, 0.0012, [0, 0.019, 0.0418], 'z', 12);
  for (const sx of [-0.012, 0.012]) beveledBox(root, 'rear button', rubber, [0.010, 0.006, 0.003], [sx, 0.021, -0.0535], 0.0008);
  cylinder(root, 'brightness dial', rubber, 0.007, 0.005, [0.0295, 0.026, -0.027], 'x', 12);   // GB-297: seated on the chassis side (half-width 0.027)
  return { eye: [0, 0.055, -0.061], dot: [0, 0.055, 0.032] };
}

function openTube(root, name, mat, radius, length, y, z, sides = 20, innerRadius = radius * 0.83) {
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, sides, 1, true), mat);
  shell.name = name; shell.rotation.x = Math.PI / 2; shell.position.set(0, y, z);
  shell.castShadow = true; root.add(shell);
  // CL-332 c (Jerry: "the transparent glitch in the prism"): the bore, so the tube has an inside through the lens
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(innerRadius, innerRadius, length, sides, 1, true), bore);
  inner.name = `${name} anti-glare bore`; inner.rotation.x = Math.PI / 2; inner.position.set(0, y, z); root.add(inner);
  for (const end of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.RingGeometry(innerRadius, radius, sides), rimMetal);
    rim.name = `${name} machined rim`; rim.position.set(0, y, z + end * length / 2); root.add(rim);
  }
  return shell;
}

function objective(root, name, radius, y, z) {
  const pane = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), lens);
  pane.name = name; pane.position.set(0, y, z); root.add(pane);
}

// The cradle is cut to the tube, so its bearing surface follows the cylinder.
// A plate above the tube uses the same cut upside down.
function cradle(root, name, radius, axisY, plateY, z, depth) {
  const shape = new THREE.Shape();
  const side = Math.sign(plateY - axisY);
  const halfWidth = radius * Math.sin(Math.PI / 3);
  shape.moveTo(-halfWidth, plateY);
  shape.lineTo(halfWidth, plateY);
  for (let i = 0; i <= 8; i++) {
    const angle = (4 - i) * Math.PI / 12;
    shape.lineTo(radius * Math.sin(angle), axisY + side * radius * Math.cos(angle));
  }
  shape.closePath();
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), alloy);
  mesh.name = name;
  mesh.position.z = z - depth / 2;
  mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
}

function boredHousing(root, name, radius, outside, axisY, z, depth, round = false) {
  // Connect the bore, outer surface and both end faces with matching vertices.
  // Extruding two tangent arc paths can silently omit the annular ends.
  const sides=24, faces=[], uvs=[];
  const rim=(i,inner,front)=>{
    const a=(i%sides)*2*Math.PI/sides, x=Math.cos(a), y=Math.sin(a);
    const r=inner?radius:round?outside:outside/Math.max(Math.abs(x),Math.abs(y));
    return [x*r,y*r,front?depth:0];
  };
  const quad=(a,b,c,d)=>{
    faces.push(...a,...b,...c,...a,...c,...d);
    uvs.push(0,0,1,0,1,1,0,0,1,1,0,1);
  };
  for(let i=0;i<sides;i++){
    const j=i+1, a=rim(i,false,false), b=rim(j,false,false), c=rim(j,false,true), d=rim(i,false,true);
    const e=rim(i,true,false), f=rim(j,true,false), g=rim(j,true,true), h=rim(i,true,true);
    quad(a,b,c,d); quad(e,h,g,f); quad(e,f,b,a); quad(h,d,c,g);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(faces,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, alloy);
  mesh.name = name; mesh.position.set(0, axisY, z - depth / 2);
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh);
}

// 46 x 28 x 25 mm forged reflex sight, with the RMR's raised sloping ears and bottom battery cover.
function rmr(root) {
  foot(root, 0.028, 0.046);
  beveledBox(root, 'bottom battery compartment and forged base', paint, [0.028, 0.010, 0.043], [0, 0.010, 0], 0.0012);
  box(root, 'battery cover seam', rubber, [0.027, 0.001, 0.026], [0, 0.0047, -0.004]);
  for (const side of [-1, 1]) {
    const ear = beveledBox(root, 'sloped protective ear', alloy, [0.004, 0.019, 0.013], [side * 0.014, 0.023, 0.011], 0.0012);
    ear.rotation.x = -0.16;
    box(root, 'side brightness key', rubber, [0.0018, 0.004, 0.006], [side * 0.0149, 0.0125, -0.010]);
    cylinder(root, 'mounting screw', edge, 0.0024, 0.0016, [side * 0.009, 0.016, -0.015], 'y', 10);
  }
  beveledBox(root, 'thick front hood bridge', alloy, [0.031, 0.004, 0.009], [0, 0.034, 0.014]);
  glass(root, 0.024, 0.016, 0.024, 0.012);
  cylinder(root, 'coin elevation adjuster', edge, 0.0033, 0.002, [0, 0.016, -0.017], 'y', 12);
  cylinder(root, 'coin windage adjuster', edge, 0.0033, 0.002, [0.015, 0.0125, -0.003], 'x', 12);
  for (const mesh of root.children) {
    if (mesh.material === paint || mesh.material === alloy) markPaintSurface(mesh, 'optic shell');
  }
  return { eye: [0, 0.024, -0.034], dot: [0, 0.024, 0.012] };
}

// 3x prism: short objective/ocular bells, capped windage and elevation, left illumination and two-height riser.
function prism(root) {
  foot(root, 0.041, 0.075);
  beveledBox(root, 'removable high riser', paint, [0.038, 0.014, 0.060], [0, 0.014, 0]);
  for (const z of [-0.024, 0.024]) cradle(root, 'prism cradle', 0.022, 0.055, 0.021, z, 0.013);
  openTube(root, 'sealed prism housing', paint, 0.022, 0.105, 0.055, 0, 24);
  openTube(root, 'objective bell', alloy, 0.027, 0.024, 0.055, 0.059, 24);
  openTube(root, 'ocular and focus ring', rubber, 0.028, 0.0215, 0.055, -0.06325, 24, 0.0219);
  // J79: the glass sits behind the bell's machined front rim, inside its wall.
  objective(root, 'objective lens', 0.022, 0.055, 0.065);
  objective(root, 'ocular lens', 0.0219, 0.055, -0.071);
  boredHousing(root, 'prism adjustment saddle', 0.022, 0.025, 0.055, -0.008, 0.025);
  cylinder(root, 'capped elevation adjustment', alloy, 0.010, 0.012, [0, 0.086, -0.008], 'y', 18);
  cylinder(root, 'capped right windage adjustment', alloy, 0.009, 0.011, [0.0305, 0.055, -0.008], 'x', 18);
  cylinder(root, 'left illumination and battery dial', rubber, 0.012, 0.012, [-0.031, 0.055, -0.008], 'x', 18);
  box(root, 'elevation cap coin slot', rubber, [0.012, 0.0008, 0.002], [0, 0.0925, -0.008]);
  const focusBand = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.0012, 5, 24), edge);
  focusBand.name = 'ocular focus index ring'; focusBand.position.set(0, 0.055, -0.072);
  focusBand.castShadow = true; root.add(focusBand);
  for (const z of [-0.070, 0.070]) box(root, 'flip-cap hinge', alloy, [0.010, 0.006, 0.006], [0, 0.083, z]);
  return { eye: [0, 0.055, -0.087], dot: [0, 0.055, 0.071] };
}

// 4x32 ACOG: forged housing, top fibre collector, capped controls and two left-side TA51 thumbscrews.
function acog(root) {
  foot(root, 0.047, 0.090);
  beveledBox(root, 'TA51 clamp and interface studs', alloy, [0.042, 0.017, 0.075], [0, 0.017, 0]);
  cradle(root, 'forged lower saddle', 0.025, 0.057, 0.0255, 0, 0.066);
  for (const z of [-0.025, 0.025]) cylinder(root, 'left clamp thumbscrew', edge, 0.007, 0.004, [-0.023, 0.014, z], 'x', 14);
  openTube(root, 'forged four-power optical body', paint, 0.025, 0.126, 0.057, 0, 24);
  openTube(root, 'squared front objective', alloy, 0.030, 0.023, 0.057, 0.070, 24);
  openTube(root, 'rubber eyepiece', rubber, 0.026, 0.020, 0.057, -0.071, 24);
  objective(root, '32 mm objective lens', 0.030 * 0.83, 0.057, 0.078);
  objective(root, 'ocular lens', 0.026 * 0.83, 0.057, -0.078);
  cylinder(root, 'fibre-optic light collector', rubber, 0.004, 0.047, [0, 0.0855, 0.033], 'z', 10);
  boredHousing(root, 'adjustment housing', 0.025, 0.026, 0.057, -0.002, 0.020);
  cylinder(root, 'capped elevation adjuster', alloy, 0.009, 0.010, [0, 0.088, -0.002], 'y', 16);
  cylinder(root, 'capped right windage adjuster', alloy, 0.009, 0.010, [0.031, 0.057, -0.002], 'x', 16);
  cradle(root, 'piggyback sight saddle', 0.025, 0.057, 0.096, -0.033, 0.038);
  beveledBox(root, 'top RMR mounting plate', alloy, [0.030, 0.004, 0.047], [0, 0.098, -0.033]);
  const top = new THREE.Group(); top.name = 'top RMR'; top.position.set(0, 0.100, -0.033); root.add(top);
  const topSight = rmr(top);
  return { eye: [0, 0.057, -0.095], dot: [0, 0.057, 0.082], topEye: [0, topSight.eye[1] + 0.100, topSight.eye[2] - 0.033], topDot: [0, topSight.dot[1] + 0.100, topSight.dot[2] - 0.033] };
}

// 4-32x50 NX8: 340 mm, 30 mm tube, 59 mm objective, exposed ZeroStop and side parallax control.
function nx8(root) {
  // On the issued rifle the root is the rail centre. The teeth rise 11 mm above it.
  beveledBox(root, 'scope rail bridge', paint, [0.042, 0.006, 0.132], [0, 0.014, 0]);
  for (const side of [-1,1]) {
    box(root, 'rail clamp jaw', alloy, [0.003, 0.012, 0.121], [side * 0.020, 0.007, 0]);
  }
  for (const z of [-0.052, 0.052]) {
    cradle(root, 'scope ring saddle', 0.019, 0.054, 0.017, z, 0.012);
    boredHousing(root, '30 mm scope ring', 0.015, 0.019, 0.054, z, 0.012, true);
  }
  // Turn the body, shoulders and bores as one shell. The collars seat around it.
  const outside = [[0.0215,-0.171],[0.0215,-0.117],[0.015,-0.099],[0.015,0.084],[0.0295,0.122],[0.0295,0.171]];
  const inside = outside.slice().reverse().map(([r,z]) => [r-0.0045,z]);
  const section = [...outside,...inside,outside[0]].map(([r,z]) => new THREE.Vector2(r,z));
  const tube = new THREE.Mesh(new THREE.LatheGeometry(section,32), paint);
  tube.name = 'NX8 tapered optical housing'; tube.rotation.x = Math.PI/2; tube.position.y = 0.054;
  tube.castShadow = tube.receiveShadow = true; root.add(tube);
  // J79: 6 mm of objective bell encloses the glass rather than ending flush with it.
  objective(root, '50 mm objective lens', 0.025, 0.054, 0.164);
  objective(root, 'ocular lens', 0.017, 0.054, -0.170);
  boredHousing(root, 'machined turret saddle', 0.015, 0.018, 0.054, -0.006, 0.030);
  cylinder(root, 'exposed ZeroStop elevation turret', alloy, 0.013, 0.024, [0, 0.084, -0.006], 'y', 22);
  cylinder(root, 'right capped windage turret', alloy, 0.011, 0.018, [0.027, 0.054, -0.006], 'x', 18);
  cylinder(root, 'left parallax and illumination dial', rubber, 0.014, 0.018, [-0.027, 0.054, -0.006], 'x', 18);
  boredHousing(root, 'knurled zoom ring', 0.0215, 0.0225, 0.054, -0.131, 0.019, true);
  // J92: tactile zoom grip and marked ZeroStop read in the hand without a texture.
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    const rib = box(root, 'zoom ring knurl', edge, [0.002, 0.002, 0.014], [Math.cos(a) * 0.023, 0.054 + Math.sin(a) * 0.023, -0.131]);
    rib.rotation.z = a;
  }
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    box(root, 'ZeroStop witness tick', rubber, [0.0015, 0.003, 0.0015], [Math.cos(a) * 0.0133, 0.095, -0.006 + Math.sin(a) * 0.0133]);
  }
  cylinder(root, 'low zoom index tab', alloy, 0.0035, 0.007, [0, 0.080, -0.131], 'y', 10);
  boredHousing(root, 'eyepiece lock ring', 0.0215, 0.0225, 0.054, -0.166, 0.006, true);
  return { eye: [0, 0.054, -0.177], dot: [0, 0.054, 0.170] };
}

export function makeOptic(kind) {
  const optic = new THREE.Group();
  optic.name = `optic.${kind}`;
  const sight = kind === 'mini-reflex' ? mini(optic) : kind === 'reflex' ? tube(optic) : kind === 'holo' ? holo(optic)
    : kind === 'rmr' ? rmr(optic) : kind === 'prism' ? prism(optic) : kind === 'acog' ? acog(optic) : kind === 'nx8' ? nx8(optic) : null;
  if (!sight) throw new RangeError(`Unknown optic kind: ${kind}`);
  optic.userData.sight = sight;
  if (kind === 'acog') optic.userData.sightModes = { magnified: { eye: sight.eye, dot: sight.dot }, topRmr: { eye: sight.topEye, dot: sight.topDot } };
  optic.userData.mount = [0, 0, 0];
  return optic;
}
