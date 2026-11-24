// AG-415: Lightweight 3D diegetic floor ring & floating marker beacon for Training Field Orientation.
// Zero shadow casting, minimal draw calls, clean disposal, polygonOffset-safe against floor decals.

const AMBER_HEX = 0xf2c418;
const GREEN_HEX = 0x58e096;

export function createTutorialBeacon(T, parent) {
  const root = new T.Group();
  root.name = 'training-tutorial-beacon';
  root.visible = false;
  if (parent) parent.add(root);

  const owned = [];
  const keep = (x) => { if (x) owned.push(x); return x; };

  const ringMat = keep(new T.MeshBasicMaterial({
    color: AMBER_HEX,
    transparent: true,
    opacity: 0.78,
    side: T.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  }));

  const pulseMat = keep(new T.MeshBasicMaterial({
    color: AMBER_HEX,
    transparent: true,
    opacity: 0.42,
    side: T.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  }));

  const beamMat = keep(new T.MeshBasicMaterial({
    color: AMBER_HEX,
    transparent: true,
    opacity: 0.14,
    side: T.DoubleSide,
    depthWrite: false,
  }));

  const diamondMat = keep(new T.MeshBasicMaterial({
    color: AMBER_HEX,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  }));

  const outerRing = new T.Mesh(keep(new T.RingGeometry(0.62, 0.72, 32)), ringMat);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.012;
  outerRing.castShadow = false;
  outerRing.receiveShadow = false;
  outerRing.renderOrder = 2;
  root.add(outerRing);

  const innerPulse = new T.Mesh(keep(new T.RingGeometry(0.28, 0.44, 32)), pulseMat);
  innerPulse.rotation.x = -Math.PI / 2;
  innerPulse.position.y = 0.014;
  innerPulse.castShadow = false;
  innerPulse.receiveShadow = false;
  innerPulse.renderOrder = 2;
  root.add(innerPulse);

  const beam = new T.Mesh(keep(new T.CylinderGeometry(0.18, 0.56, 2.2, 20, 1, true)), beamMat);
  beam.position.y = 1.12;
  beam.castShadow = false;
  beam.receiveShadow = false;
  beam.renderOrder = 2;
  root.add(beam);

  const diamond = new T.Mesh(keep(new T.OctahedronGeometry(0.16, 0)), diamondMat);
  diamond.position.y = 1.95;
  diamond.castShadow = false;
  diamond.receiveShadow = false;
  diamond.renderOrder = 3;
  root.add(diamond);

  let phase = 0;
  let isArrived = false;
  let active = false;

  function setColor(hex) {
    ringMat.color.setHex(hex);
    pulseMat.color.setHex(hex);
    beamMat.color.setHex(hex);
    diamondMat.color.setHex(hex);
  }

  function setTarget(localPos, { arrived = false, visible = true } = {}) {
    if (!visible || !localPos) {
      active = false;
      root.visible = false;
      return;
    }
    active = true;
    root.visible = true;
    root.position.set(localPos.x, localPos.y || 0, localPos.z);
    if (isArrived !== !!arrived) {
      isArrived = !!arrived;
      setColor(isArrived ? GREEN_HEX : AMBER_HEX);
    }
  }

  function update(dt) {
    if (!active || !root.visible) return;
    const step = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.1) : 0;
    phase += step;
    const p = (phase * 0.9) % 1;
    const scale = 0.72 + p * 0.95;
    innerPulse.scale.set(scale, scale, 1);
    pulseMat.opacity = (1 - p) * (isArrived ? 0.5 : 0.42);
    ringMat.opacity = 0.65 + 0.18 * Math.sin(phase * 3.6);
    beamMat.opacity = isArrived ? 0.08 : 0.12 + 0.04 * Math.sin(phase * 2.4);
    diamond.position.y = 1.92 + Math.sin(phase * 3.0) * 0.14;
    diamond.rotation.y = phase * 1.6;
  }

  function dispose() {
    active = false;
    if (root.parent) root.parent.remove(root);
    for (const x of owned) { try { x.dispose?.(); } catch (_) {} }
    owned.length = 0;
  }

  return {
    group: root,
    setTarget,
    update,
    dispose,
    isVisible: () => root.visible,
  };
}
