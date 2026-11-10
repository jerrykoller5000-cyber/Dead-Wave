// Spent cases in game-world metres, centred on Y with the open mouth at +Y.
// The chamber model can scale the same mesh into its own gun-local units.
const shapes = {
  // length, rim radius, body radius, mouth radius and start of the shoulder, in millimetres
  pistol:   [19, 5.0, 4.95, 4.75],
  revolver: [33, 6.55, 5.80, 5.75],
  m4:       [45, 4.8, 4.78, 3.20, 35],
  ak:       [39, 5.7, 5.62, 4.30, 29],
  minigun:  [51, 6.0, 5.95, 4.30, 39],
  sniper:   [70, 7.45, 7.45, 4.75, 52],
  shotgun:  [70, 11.3, 10.3, 10.2],
  launcher: [46, 21.9, 20.5, 20.1]
};
const sharedShape = { uzi: 'pistol', aa12: 'shotgun', m240: 'minigun' };
const geometryByThree = new WeakMap();

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

export function spentCaseGeometry(THREE, weapon) {
  const kind = sharedShape[weapon] || weapon;
  if (!Object.hasOwn(shapes, kind)) return null;
  let cache = geometryByThree.get(THREE);
  if (!cache) geometryByThree.set(THREE, cache = new Map());
  if (cache.has(kind)) return cache.get(kind);

  const [length, rim, body, mouth, shoulder] = shapes[kind];
  const rimmed = kind === 'revolver' || kind === 'shotgun' || kind === 'launcher';
  const wall = mouth * 0.09;
  const primer = body * 0.38;
  const profile = [
    [0, 0.38], [primer * 0.27, 0], [primer, 0], [primer * 1.05, 0.28],
    [primer * 1.14, 0], [rim, 0], [rim, length * 0.045]
  ];
  if (!rimmed) profile.push([body * 0.83, length * 0.065], [body * 0.83, length * 0.086]);
  profile.push([body, length * 0.105]);
  if (kind === 'shotgun') profile.push([body, 13], [body * 0.986, 13.3]);
  if (shoulder) profile.push([body * 0.91, shoulder], [mouth, length * 0.86]);
  profile.push([mouth, length], [mouth - wall, length], [mouth - wall, length * 0.76],
    [body * 0.76, length * 0.20], [0, length * 0.20]);
  const points = profile.map(([r, y]) => new THREE.Vector2(r * 0.001, (y - length / 2) * 0.001));
  const geometry = new THREE.LatheGeometry(points, 20);
  const position = geometry.attributes.position;
  const colors = [];
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i) * 1000 + length / 2;
    const r = Math.hypot(position.getX(i), position.getZ(i)) * 1000;
    if (kind === 'shotgun' && y > 13.1) colors.push(0.64, 0.033, 0.018);
    else if (kind === 'launcher') colors.push(0.78, 0.75, 0.70);
    else if (y < 0.4 && r <= primer * 1.06) colors.push(0.73, 0.63, 0.49);
    else colors.push(0.88, 0.60, 0.27);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  cache.set(kind, geometry);
  return geometry;
}
