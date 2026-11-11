// GP-20066 / D-123: one combined light and visible laser, mounted for each gun.
// Coordinates are gun-local; +z is the bore direction. The optical points stay
// separate from the muzzle so recoil, first-person projection and the light can
// all originate at their actual front windows.
import {bindModelArtwork} from './weapon-model-hooks.js';
import {createLightSwitch} from './weapon-light-switch.js';

const MOUNTS = Object.freeze({
  pistol:   { kind: 'guard', x: 0, y: -0.035, z: 0.202, length: 0.16, width: 0.045, height: 0.034 },
  revolver: { kind: 'under', x: 0, y: 0.041, z: 0.246, length: 0.105, width: 0.043, height: 0.036 },
  uzi:      { kind: 'under', x: 0, y: -0.036, z: 0.277, scale: 0.72, length: 0.13, width: 0.052, height: 0.047 },
  shotgun:  { kind: 'dualTube', x: 0.066, y: 0.012, z: 0.786, length: 0.16 },
  m4:       { kind: 'peq', x: 0.082, y: 0.056, z: 0.655, length: 0.125, width: 0.063, height: 0.047 },
  ak:       { kind: 'under', x: 0, y: -0.050, z: 0.586, length: 0.13, width: 0.064, height: 0.047 },
  aa12:     { kind: 'tube', x: 0.072, y: 0.041, z: 0.748, length: 0.151 },
  sniper:   { kind: 'peq', x: 0.070, y: 0, z: 0.530, length: 0.125, width: 0.063, height: 0.047 },
  launcher: { kind: 'peq', x: 0.112, y: 0.040, z: 0.550, length: 0.115, width: 0.060, height: 0.047 },   // CL-322: on GP-20060's 3-o'clock rail (was x .087 y .045 z .222, on the receiver bracket)
  minigun:  { kind: 'frame', x: 0.185, y: 0.066, z: 0.168, length: 0.12, width: 0.064, height: 0.050 },
  m240:     { kind: 'peq16', x: 0.093, y: 0.875, z: 0.42, length: 0.11, width: 0.070, height: 0.045 }
});

export function laserLightMount(kind) { return MOUNTS[kind] || null; }

export function attachLaserLight(gun, kind, ctx) {
  const spec = MOUNTS[kind];
  if (!spec || !gun) return gun;
  const { THREE, gunDark, gunMid, gunPoly, gunTan, gunRubber, glassMat } = ctx;
  const unit = new THREE.Group();
  unit.name = 'laserLightUnit';
  unit.position.set(spec.x, spec.y, spec.z);
  unit.scale.setScalar(spec.scale ?? 1);
  unit.visible = kind === 'm240'; // standard issue on the Watchman's gun
  gun.add(unit);
  const body = kind === 'm240' ? gunTan : gunPoly;
  const metal = kind === 'm240' ? gunTan : gunMid;
  const lens = glassMat || new THREE.MeshStandardMaterial({ color: 0xb7c9d0, roughness: 0.17, metalness: 0.05 });
  const put = (geo, mat, x, y, z, name = '') => {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z); o.name = name;
    o.castShadow = true; o.receiveShadow = true; unit.add(o); return o;
  };
  const box = (w, h, d, mat, x, y, z, name = '') => put(new THREE.BoxGeometry(w, h, d), mat, x, y, z, name);
  const cyl = (r, depth, mat, x, y, z, name = '', n = 14) => {
    const o = put(new THREE.CylinderGeometry(r, r, depth, n), mat, x, y, z, name);
    o.rotation.x = Math.PI / 2; return o;
  };
  const window = (x, y, z, r, which) => {
    // A hollow bezel, dark cavity and inset glass. A solid cylinder behind the
    // glass used to make the front look like a painted-on circle at oblique angles.
    const wall = put(new THREE.CylinderGeometry(r * 1.37, r * 1.37, 0.004, 20, 1, true), metal, x, y, z - 0.0025, which + 'BezelWall');
    wall.rotation.x = Math.PI / 2;
    put(new THREE.RingGeometry(r * 0.98, r * 1.37, 20), metal, x, y, z - 0.0004, which + 'Bezel');
    put(new THREE.RingGeometry(r, r * 1.37, 20), metal, x, y, z - 0.0024, which + 'BezelSeat');
    cyl(r, 0.0008, gunDark, x, y, z - 0.0024, which + 'Cavity');
    cyl(r * 0.91, 0.0006, lens, x, y, z - 0.0016, which + 'Lens');
    return new THREE.Vector3(x, y, z + 0.002);
  };
  const L = spec.length;
  let light, laser;
  if (spec.kind === 'dualTube') {
    // Pump shotgun: a two-tube cluster on a clamp around barrel and magazine.
    box(0.088, 0.010, 0.033, gunDark, -0.027, 0.001, -0.034, 'barrelMagazineClamp');
    box(0.044, 0.065, 0.035, gunDark, -0.019, 0.001, -0.034);
    box(0.038, 0.052, 0.034, metal, 0, 0, -0.033, 'sideRail');
    for (const [y, r] of [[0.019, 0.019], [-0.020, 0.012]]) {
      cyl(r, L, body, 0, y, 0, y > 0 ? 'lightTube' : 'laserTube');
      for (const z of [-0.045, 0, 0.041]) cyl(r * 1.10, 0.007, gunDark, 0, y, z);
    }
    light = window(0, 0.019, L / 2 + 0.003, 0.014, 'light');
    laser = window(0, -0.020, L / 2 + 0.003, 0.007, 'laser');
    cyl(0.006, 0.010, gunMid, 0.018, -0.020, -0.014, 'windageDial'); // seated against the side rail
  } else if (spec.kind === 'tube') {
    // A cantilever shoe on the shroud's right collar carries the lamp and
    // the smaller laser pod. Both front windows have their own bore axis.
    box(0.022, 0.020, 0.024, metal, -0.024, -0.018, 0.002, 'collarClamp');
    put(new THREE.TorusGeometry(0.0195, 0.003, 6, 24), gunDark, 0, 0, 0.002, 'lampBand');
    cyl(0.0175, L - 0.018, body, 0, 0, -0.009, 'lightTube');
    cyl(0.020, 0.018, metal, 0, 0, L / 2 - 0.009, 'lampHead');
    box(0.012, 0.016, 0.060, body, 0, -0.018, 0.030, 'laserBridge');
    cyl(0.009, 0.070, gunDark, 0, -0.024, 0.026, 'laserBarrel');
    box(0.005, 0.009, 0.021, gunRubber, 0.018, 0, -0.046, 'pressureSwitch');
    light = window(0, 0, L / 2 + 0.004, 0.014, 'light');
    laser = window(0, -0.024, 0.065, 0.006, 'laser');
  } else {
    // Guard and under-barrel shells differ in scale; the PEQ family shares the
    // same basic flat face and dual windows on the right side rail.
    const W = spec.width, H = spec.height;
    if (spec.kind === 'under' || spec.kind === 'guard') {
      const clamp = box(W * 0.66, 0.012, L * 0.58, gunDark, 0, H * 0.55, -L * 0.16, 'railClamp');
      if (kind === 'uzi') {
        // This mount meets the sloping face of the Wasp's drawn fore-end.
        // Keep its underside flush with the light's lid and its top flush with that face.
        const vertices = clamp.geometry.attributes.position;
        for (let i = 0; i < vertices.count; i++) {
          const z = spec.z + spec.scale * (vertices.getZ(i) + clamp.position.z);
          const foreEndY = -0.013 - (z - 0.187) * (0.003 / 0.132);
          const top = (foreEndY - spec.y) / spec.scale;
          vertices.setY(i, (vertices.getY(i) > 0 ? top : H / 2) - clamp.position.y);
        }
        clamp.geometry.computeVertexNormals();
      }
      if (spec.kind === 'guard') for (const sx of [-1, 1]) {
        box(0.0065, 0.027, 0.035, body, sx * 0.02575, -0.008, -L * 0.39, 'guardPad');
        box(0.003, 0.016, 0.016, gunRubber, sx * 0.0305, -0.008, -L * 0.39, 'activationPad');
      }
    } else {
      box(0.013, H * 0.8, L * 0.77, gunDark, -W * 0.57, -0.003, -0.008, 'sideRailClamp');
      for (const z of [-0.026, 0.020]) cyl(0.006, 0.008, metal, -W * 0.58, 0, z, 'clampScrew');
    }
    box(W, H, L, body, 0, 0, 0, 'moduleShell');
    box(W * 0.96, H * 0.16, L * 0.82, gunDark, 0, H * 0.38, 0, 'coverSeam');
    if (spec.kind === 'guard') for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
      box(0.002, H * 0.54, 0.004, gunDark, sx * (W / 2 + 0.0002), -0.002, L * (0.21 + i * 0.07), 'noseRib');
    }
    const face = L / 2 + 0.003;
    light = window(-W * 0.22, 0, face, Math.min(H * 0.28, 0.014), 'light');
    laser = window(W * 0.25, 0, face, Math.min(H * 0.13, 0.007), 'laser');
    if (spec.kind === 'peq' || spec.kind === 'peq16') {
      for (const x of [-W * 0.20, W * 0.21]) cyl(0.010, 0.008, metal, x, H * 0.57, -L * 0.19, 'modeDial');
      box(W * 0.55, 0.003, L * 0.35, gunDark, W * 0.02, H * 0.51, L * 0.13, 'topPlate');
    }
    if (spec.kind === 'peq16') {
      // PEQ-16 profile: prominent low white head, raised dual laser housing.
      box(0.002, H * 0.48, L * 0.43, gunDark, W / 2 + 0.0002, -0.002, -L * 0.12, 'blankDataPlate');
      put(new THREE.CylinderGeometry(0.018, 0.018, 0.008, 16), metal, -0.012, H / 2 + 0.003, -L * 0.16, 'selectorDial');
      box(0.029, 0.003, 0.004, gunDark, -0.012, H / 2 + 0.008, -L * 0.16, 'selectorBar');
      put(new THREE.CylinderGeometry(0.008, 0.008, 0.006, 12), metal, W * 0.31, H / 2 + 0.002, -L * 0.3, 'adjusterDial');
      cyl(0.019, 0.023, body, -W * 0.22, -H * 0.12, face + 0.010, 'lightHead');
      light = window(-W * 0.22, -H * 0.12, face + 0.022, 0.014, 'light');
      cyl(0.015, 0.021, body, W * 0.24, H * 0.17, face + 0.009, 'laserHousing');
      laser = window(W * 0.24, H * 0.17, face + 0.021, 0.007, 'laser');
      box(0.015, 0.013, 0.003, gunDark, W * 0.34, 0, -L * 0.53, 'lanyardLoop');
    }
  }
  let pad,axis,faceOffset;
  const padKit=ctx.gunKit(unit);
  if(spec.kind==='guard'){
    pad=unit.children.find(mesh=>mesh.name==='activationPad' && mesh.position.x<0);
    axis=new THREE.Vector3(1,0,0);faceOffset=.0015;
  }else if(kind==='uzi'){
    // The support grip covers the back of this compact light; its near side is exposed.
    faceOffset=.0012;
    pad=padKit.box(2*faceOffset,spec.height*.42,L*.20,gunDark,spec.width/2+faceOffset,-spec.height*.13,-L*.20,0,0,0,unit,.0009);
    pad.name='lightSwitchPad';axis=new THREE.Vector3(-1,0,0);
  }else if(spec.kind==='tube'){
    pad=unit.getObjectByName('pressureSwitch');axis=new THREE.Vector3(-1,0,0);faceOffset=.0025;
  }else if(spec.kind==='dualTube'){
    faceOffset=.0012;
    pad=padKit.lathe([[0,-faceOffset],[.0062,-faceOffset],[.0068,-.00085],[.007,-.00035],[.007,faceOffset],[0,faceOffset]],
      gunDark,{y:.019,z:-L/2-faceOffset,seg:16});
    pad.name='lightSwitchPad';
    axis=new THREE.Vector3(0,0,1);
  }else if(spec.kind==='peq' || spec.kind==='peq16'){
    const plate=unit.getObjectByName('topPlate');faceOffset=.0012;
    pad=padKit.box(spec.width*.34,2*faceOffset,L*.19,gunDark,plate.position.x,plate.position.y+.0015+faceOffset,plate.position.z,
      0,0,0,unit,.0009);
    pad.name='lightSwitchPad';
    axis=new THREE.Vector3(0,-1,0);
  }else{
    faceOffset=.0012;
    pad=padKit.box(spec.width*.42,spec.height*.42,2*faceOffset,gunDark,0,0,-L/2-faceOffset,0,0,0,unit,.0009);
    pad.name='lightSwitchPad';
    axis=new THREE.Vector3(0,0,1);
  }
  const contact=createLightSwitch(THREE,gun,unit,kind,pad,axis,.001,faceOffset);
  bindModelArtwork(gun,'controls','lightSwitch',contact);
  gun.userData.laserLightUnit = unit;
  // Keep the light's local optical points and the held gun's projected origins in sync.
  // The M240's copy follows its elevation pivot; the Wasp's compact module has its own scale.
  unit.userData.laserLens=laser;
  unit.userData.lightLens=light;
  unit.updateMatrix();
  gun.userData.laserLensLocal=laser.clone().applyMatrix4(unit.matrix);
  gun.userData.lightLensLocal=light.clone().applyMatrix4(unit.matrix);
  return gun;
}
