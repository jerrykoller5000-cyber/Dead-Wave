// GB-154 (Grokbot): test-page-only shim. index.html's sceneCull (line ~1837) now builds a THREE.Frustum, which the
// three stub (tools/tests/fakethree.mjs, Claude's) doesn't have, so the test page can't boot. This re-exports the
// stub and adds a Frustum that culls nothing. Used only by handoffs/2026-10-09-grokbot-GB-154/run-tests.mjs.
export * from '/tools/tests/fakethree.mjs';
import { Box3, Sphere } from '/tools/tests/fakethree.mjs';
// sceneCull also asks a Box3 for its bounding sphere; the stub's Box3 has no getBoundingSphere.
if (Box3 && !Box3.prototype.getBoundingSphere) Box3.prototype.getBoundingSphere = function (t = new Sphere()) {
  const c = this.min.clone().add(this.max).multiplyScalar(0.5); t.center = c; t.radius = this.isEmpty && this.isEmpty() ? -1 : c.distanceTo(this.max); return t; };
export class Frustum {
  constructor() { this.planes = []; }
  setFromProjectionMatrix() { return this; }
  intersectsObject() { return true; }
  intersectsSprite() { return true; }
  intersectsBox() { return true; }
  intersectsSphere() { return true; }
  containsPoint() { return true; }
  copy() { return this; }
  clone() { return new Frustum(); }
}
