// The clipping rules' named exceptions (AGENTS.md rule 24; Jerry, J126/J128, D-138/D-140): "the exceptions make sense on
// sight ... or are named with their reason" here. Each: an id, which layers or parts, where (the checks' pose names), how
// far (metres, at most), why, and what retires it. A check consults this list and reports what it excused; nothing
// unnamed passes. Pure data, no imports, so the page, the tests and node all read it.
export const CLIP_EXCEPTIONS = Object.freeze([
  Object.freeze({
    id: 'sleeve-on-carrier-front',
    layers: Object.freeze(['shirt', 'vest']),   // inner, outer (tcc341's pair)
    poses: Object.freeze(['kit: run', 'kit: crouch']),
    max: 0.009,
    reason: 'CC-341 (b), CLAUDE DIRECTOR 11 Nov: with the plate carrier on and a long gun held in a run or a crouch, the support ' +
      'arm\'s upper sleeve lies up to 8 mm into the carrier\'s left front (plate face and mag pouch): cloth pressed on kit, it ' +
      'reads right on sight',
    until: 'CB-291 (Claude 2): the hold IK keeps the support upper arm ~1 cm off the carrier\'s front (carrierClearance(ud) ' +
      'upperArm, studio/marine-body.js); then this entry goes'
  }),
  Object.freeze({
    id: 'training-void-shell',
    layers: Object.freeze(['training-void', 'training-floor']),
    poses: Object.freeze(['training:static']),
    max: 15,
    reason: 'The inward-facing dark backdrop encloses the Training Ground to hide the distant valley; it is not a solid object.',
    until: 'The Training Ground no longer uses the enclosing backdrop.'
  }),
  Object.freeze({
    id: 'training-outer-underlay',
    layers: Object.freeze(['training-outer-underlay', 'training-floor']),
    poses: Object.freeze(['training:static']),
    max: 0.020001, // 1 µm allows float32 world-transform rounding
    reason: 'The dark underlay lies 2 cm beneath the two walkable floor planes to prevent z-fighting at their edges.',
    until: 'The underlay is removed or replaced by the walkable floor.'
  }),
  Object.freeze({
    id: 'training-passage-floor-slab',
    layers: Object.freeze(['training-passage-floor-slab', 'training-floor']),
    poses: Object.freeze(['training:static']),
    max: 0.04,
    reason: 'The 4 cm steel passage slab has its top flush with the walking plane; its underside is below the floor.',
    until: 'The passage floor is rebuilt without a separate slab.'
  }),
  Object.freeze({
    id: 'training-floor-paint-projection',
    layers: Object.freeze(['training-floor-paint', 'training-floor']),
    poses: Object.freeze(['training:decal']),
    max: 0.002,
    reason: 'Flat floor paint lies 1 mm over the tile with polygonOffset so the two surfaces do not z-fight; it has no physical volume.',
    until: 'The floor paint is incorporated into the tile material.'
  }),
  Object.freeze({
    id: 'training-impact-mark-pool',
    layers: Object.freeze(['training-impact-marks', 'training-floor']),
    poses: Object.freeze(['training:effect']),
    max: 0.03,
    reason: 'The zero-draw impact decal pool begins at the local origin and is repositioned to bullet-hit surfaces when used.',
    until: 'The pooled impact mesh is created at each hit surface instead.'
  }),
  Object.freeze({
    id: 'training-char-mark-pool',
    layers: Object.freeze(['training-char-marks', 'training-floor']),
    poses: Object.freeze(['training:effect']),
    max: 0.100001, // 1 µm allows float32 world-transform rounding
    reason: 'The zero-draw flame-char decal pool begins at the local origin and is repositioned to burn surfaces when used.',
    until: 'The pooled char mesh is created at each burn surface instead.'
  })
]);

// The exception that excuses `mm` (metres) between these layers in this pose, or null.
export function clipException(inner, outer, pose, depth) {
  return CLIP_EXCEPTIONS.find((e) => e.layers[0] === inner && e.layers[1] === outer && e.poses.includes(pose) && depth <= e.max) || null;
}
