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
  })
]);

// The exception that excuses `mm` (metres) between these layers in this pose, or null.
export function clipException(inner, outer, pose, depth) {
  return CLIP_EXCEPTIONS.find((e) => e.layers[0] === inner && e.layers[1] === outer && e.poses.includes(pose) && depth <= e.max) || null;
}
