// core/texture-uv-per-object.js - Claude 7, CG-6 (J153 note 5 / J151 note 4: "the camo resize glitch"). Loan: CLAUDE
// DIRECTOR 14 Nov (core is Claude 2's).
// three r175 (WebGPURenderer, both backends): a material's texture is drawn through one TextureNode that every material
// shares (MaterialNode's cache), and that node points its uv-transform uniform at the current texture's matrix only
// once per RENDER (NodeUpdateType.RENDER), not per object. So within a frame every texture took whichever matrix was
// set last: in Training the range floor's tile repeat (4 x 10.5) landed on the guns' and sleeves' camo, depending on the
// draw order, i.e. the view direction (turn toward the armory and the camo went ~4x dense). Proved in the cloud: the
// floor's repeat alone set the gun's density (1x1 normal, 12x12 dense). This makes the update per OBJECT, so each draw
// points the uniform at its own texture's matrix. Same TextureNode code otherwise; it costs one matrix update per
// textured draw. Install once, right after three is imported, before any material is built.
// Written for three r175. On any other revision, or if TextureNode.setUpdateMatrix is not there, it changes nothing and
// warns once (a library update must not break the game; re-check the bug on the new revision before re-enabling).
export const TEXTURE_UV_PER_OBJECT_FOR = '175';
export function installTextureUvPerObject(THREE) {
  const TN = THREE && THREE.TextureNode, UT = THREE && THREE.NodeUpdateType;
  const ok = !!(TN && TN.prototype && typeof TN.prototype.setUpdateMatrix === 'function' && UT && UT.OBJECT && UT.NONE) && String(THREE.REVISION) === TEXTURE_UV_PER_OBJECT_FOR;
  if (!ok) {
    if (typeof console !== 'undefined') console.warn('Grave Shift: texture uv per-object fix not installed (written for three r' + TEXTURE_UV_PER_OBJECT_FOR + ', this is r' + (THREE && THREE.REVISION) + ', or TextureNode.setUpdateMatrix is missing).');
    return false;
  }
  if (TN.prototype.__ttUvPerObject) return true;
  TN.prototype.setUpdateMatrix = function (value) {
    this.updateMatrix = value;
    this.updateType = value ? UT.OBJECT : UT.NONE;
    return this;
  };
  TN.prototype.__ttUvPerObject = true;
  return true;
}
